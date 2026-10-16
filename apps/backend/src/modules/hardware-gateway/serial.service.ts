import { EventEmitter } from 'events';
import { env } from '../../config/env';
import { HardwareProtocol, ParsedSerialFrame } from './hardware.protocol';
import { HardwareStationStatus } from '@kinestem/shared-types';

export class SerialService extends EventEmitter {
  private static instance: SerialService | null = null;
  private isConnected = false;
  private isMock = false;
  private mockInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private portInstance: any = null;

  private constructor() {
    super();
  }

  public static getInstance(): SerialService {
    if (!SerialService.instance) {
      SerialService.instance = new SerialService();
    }
    return SerialService.instance;
  }

  public async init(): Promise<void> {
    if (env.USE_MOCK_SERIAL) {
      this.initMock();
      return;
    }

    try {
      await this.initRealPort();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SerialService] No se pudo abrir ${env.SERIAL_PORT} (${msg}). Activando emulador Mock.`);
      this.initMock();
    }
  }

  private async initRealPort(): Promise<void> {
    const { SerialPort } = await import('serialport');
    const { ReadlineParser } = await import('@serialport/parser-readline');

    return new Promise((resolve, reject) => {
      console.log(`[SerialService] Abriendo puerto ${env.SERIAL_PORT} @ ${env.BAUD_RATE} baud...`);

      const port = new SerialPort({
        path: env.SERIAL_PORT,
        baudRate: env.BAUD_RATE,
        autoOpen: false,
      });

      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

      port.open((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.portInstance = port;
        this.isConnected = true;
        this.isMock = false;
        console.log(`[SerialService] Puerto serial ${env.SERIAL_PORT} conectado exitosamente.`);
        this.emit('connected', this.getStatus());
        resolve();
      });

      parser.on('data', (line: Buffer | string) => {
        this.handleIncoming(line.toString());
      });

      port.on('error', (err: Error) => {
        console.error(`[SerialService] Error en puerto: ${err.message}`);
        this.isConnected = false;
        this.emit('error', err);
        this.scheduleReconnect();
      });

      port.on('close', () => {
        if (this.isConnected) {
          console.warn('[SerialService] Puerto cerrado. Programando reconexión...');
          this.isConnected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        }
      });
    });
  }

  private initMock(): void {
    this.isMock = true;
    this.isConnected = true;
    console.log(`[SerialService] Emulador serial activo en "${env.SERIAL_PORT}" @ ${env.BAUD_RATE} baud.`);

    // Pulso simulado de botón verde cada 25 segundos
    this.mockInterval = setInterval(() => {
      this.handleIncoming('BTN:GREEN');
    }, 25000);

    this.emit('connected', this.getStatus());
  }

  public handleIncoming(rawLine: string): void {
    const parsed: ParsedSerialFrame | null = HardwareProtocol.parseIncoming(rawLine);
    if (!parsed) return;

    console.log(`[Serial-IN] Trama: ${parsed.raw} -> Evento: ${parsed.event}`);
    this.emit('frame', parsed);
  }

  public sendCommand(cmd: string): boolean {
    const cleanCmd = cmd.trim();
    if (!cleanCmd) return false;

    if (!this.isConnected) {
      console.warn(`[Serial-OUT] Sin enlace activo. Comando omitido: "${cleanCmd}"`);
      return false;
    }

    if (this.isMock) {
      console.log(`[Serial-MOCK] Comando recibido hacia microcontrolador: "${cleanCmd}"`);
      if (cleanCmd === 'PING') {
        setTimeout(() => this.handleIncoming('PONG'), 50);
      }
      return true;
    }

    if (this.portInstance) {
      this.portInstance.write(`${cleanCmd}\n`, 'utf8', (err: Error | null) => {
        if (err) {
          console.error(`[Serial-OUT] Error al enviar comando: ${err.message}`);
        } else {
          console.log(`[Serial-OUT] Enviado -> "${cleanCmd}"`);
        }
      });
      return true;
    }

    return false;
  }

  public injectMockFrame(frame: string): void {
    console.log(`[Serial-MOCK-INJECT] Inyectando trama: "${frame}"`);
    this.handleIncoming(frame);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isMock) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.initRealPort();
      } catch {
        this.scheduleReconnect();
      }
    }, 5000);
  }

  public getStatus(): HardwareStationStatus {
    return {
      connected: this.isConnected,
      mock: this.isMock,
      port: env.SERIAL_PORT,
      baudRate: env.BAUD_RATE,
    };
  }

  public close(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.portInstance && this.isConnected) {
      this.portInstance.close();
      this.portInstance = null;
    }
    this.isConnected = false;
  }
}

export const serialService = SerialService.getInstance();
