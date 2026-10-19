import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { serialService, SerialService } from './serial.service';
import { HardwareProtocol, ParsedSerialFrame } from './hardware.protocol';
import { ClientWebSocketMessage, ServerWebSocketMessage } from '@kinestem/shared-types';
import { postgresService } from '../../config/postgres';

export class HardwareGateway {
  private static instance: HardwareGateway | null = null;
  private wss: WebSocketServer | null = null;

  private constructor(private readonly serial: SerialService = serialService) {
    this.setupSerialListeners();
  }

  public static getInstance(): HardwareGateway {
    if (!HardwareGateway.instance) {
      HardwareGateway.instance = new HardwareGateway();
    }
    return HardwareGateway.instance;
  }

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server });
    console.log('[HardwareGateway] Servidor WebSocket inicializado.');

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`[WS] Cliente conectado desde ${clientIp}. Total activos: ${this.wss?.clients.size ?? 0}`);

      const welcomeMsg: ServerWebSocketMessage = {
        type: 'CONNECTED',
        host: clientIp,
        serial: this.serial.getStatus(),
        wsClients: this.wss?.clients.size ?? 0,
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(welcomeMsg));

      ws.on('message', async (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString()) as ClientWebSocketMessage;
          await this.handleClientMessage(ws, parsed);
        } catch {
          ws.send(JSON.stringify({ type: 'ERROR', error: 'Formato JSON inválido', timestamp: Date.now() }));
        }
      });

      ws.on('close', () => {
        console.log(`[WS] Cliente desconectado. Total restantes: ${this.wss?.clients.size ?? 0}`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error en socket: ${err.message}`);
      });
    });
  }

  private async handleClientMessage(ws: WebSocket, msg: ClientWebSocketMessage): Promise<void> {
    switch (msg.type) {
      case 'PING_ARDUINO': {
        this.serial.sendCommand(HardwareProtocol.formatPingCommand());
        const ack: ServerWebSocketMessage = {
          type: 'COMMAND_ACK',
          command: 'PING',
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(ack));
        break;
      }

      case 'DISPENSE_TEST': {
        this.serial.sendCommand(HardwareProtocol.formatDispenseCommand());
        const ack: ServerWebSocketMessage = {
          type: 'COMMAND_ACK',
          command: 'ACTION:DISPENSE',
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(ack));
        break;
      }

      case 'SUBMIT_PIN': {
        const pin = String(msg.pin).trim();
        // El backend instruye al hardware el PIN objetivo
        this.serial.sendCommand(HardwareProtocol.formatSetPinCommand(pin));

        this.broadcast({
          type: 'AUTH_WAITING',
          pin,
          sessionId: null,
          message: 'PIN sincronizado con Arduino Maestro. Esperando ingreso IR...',
          timestamp: Date.now(),
        });
        break;
      }

      case 'SET_LCD': {
        const cmd = HardwareProtocol.formatLcdCommand(msg.line1, msg.line2 ?? '');
        this.serial.sendCommand(cmd);
        break;
      }

      case 'SET_FACE': {
        const cmd = HardwareProtocol.formatFaceCommand(msg.face);
        this.serial.sendCommand(cmd);
        break;
      }

      case 'GET_STATUS': {
        const statusMsg: ServerWebSocketMessage = {
          type: 'STATUS',
          serial: this.serial.getStatus(),
          host: 'gateway',
          wsClients: this.wss?.clients.size ?? 0,
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(statusMsg));
        break;
      }

      case 'PLAYER_ACTION': {
        console.log('[WS] Acción física de jugador recibida:', msg.payload);
        break;
      }
    }
  }

  private setupSerialListeners(): void {
    this.serial.on('frame', async (frame: ParsedSerialFrame) => {
      // Reenviar a todos los clientes frontend conectados
      this.broadcast({
        type: 'HARDWARE_EVENT',
        event: frame.event,
        data: frame.data,
        timestamp: Date.now(),
      });

      // Persistir evento en PostgreSQL si está disponible
      try {
        await postgresService.query(
          'INSERT INTO hardware_events (device_uid, event_type, payload) VALUES ($1, $2, $3)',
          [null, frame.event, JSON.stringify({ data: frame.data, raw: frame.raw })]
        );
      } catch {
        // En caso de que la DB esté degradada, el gateway continúa sin interrumpir el flujo
      }

      if (frame.event === 'RFID') {
        const uid = frame.data;
        this.broadcast({
          type: 'AUTH_LINKED',
          uid,
          message: `Tarjeta ${uid} detectada en estación de juego.`,
          timestamp: Date.now(),
        });
      }
    });

    this.serial.on('connected', (status) => {
      this.broadcast({
        type: 'SYSTEM_EVENT',
        event: 'serial:connected',
        data: { status },
        timestamp: Date.now(),
      });
    });

    this.serial.on('disconnected', () => {
      this.broadcast({
        type: 'SYSTEM_EVENT',
        event: 'serial:disconnected',
        data: {},
        timestamp: Date.now(),
      });
    });
  }

  public broadcast(message: ServerWebSocketMessage): void {
    if (!this.wss) return;
    const serialized = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }

  public close(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const hardwareGateway = HardwareGateway.getInstance();