import { EventEmitter } from 'events';
import { env } from '../../config/env';
import { HardwareProtocol, ParsedSerialFrame } from './hardware.protocol';
import { HardwareStationStatus } from '@kinestem/shared-types';

export class SerialService extends EventEmitter {
  private static instance: SerialService | null = null;
  private isConnected = false;
  private isMock = false;
  private activePort = env.SERIAL_PORT;
  private isReadyAfterDtr = false;
  private queuedCommands: string[] = [];
  private dtrTimer: NodeJS.Timeout | null = null;
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
      console.error(`[SerialService] Error al conectar puerto físico ${this.activePort}: ${msg}.`);
      console.warn(`[SerialService] Verifique que el Arduino esté conectado en ${this.activePort} y que el Serial Monitor esté cerrado. Reintentando en 5s...`);
      this.isConnected = false;
      this.isMock = false;
      this.isReadyAfterDtr = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Resuelve el puerto serial a utilizar consultando SerialPort.list().
   * Prioriza autodetección de Arduino Uno oficial (VID: 2341, PID: 0043) o COM6.
   */
  private async resolvePort(): Promise<string> {
    try {
      const { SerialPort } = await import('serialport');
      const availablePorts = await SerialPort.list();

      // 1. Autodetección por VID/PID oficial de Arduino Uno (VID: 2341, PID: 0043)
      const officialArduino = availablePorts.find(
        (p) =>
          (p.vendorId?.toLowerCase() === '2341' && p.productId?.toLowerCase() === '0043') ||
          p.manufacturer?.toLowerCase().includes('arduino')
      );
      if (officialArduino) {
        console.log(
          `[SerialService] Puerto físico detectado y conectado en "${officialArduino.path}" (VID:${officialArduino.vendorId ?? '2341'} PID:${officialArduino.productId ?? '0043'}) @ ${env.BAUD_RATE} baud.`
        );
        return officialArduino.path;
      }

      // 2. Verificar si el puerto configurado (ej. COM6) está en la lista de puertos del sistema
      const configuredMatch = availablePorts.find(
        (p) => p.path.toUpperCase() === env.SERIAL_PORT.toUpperCase()
      );
      if (configuredMatch) {
        return configuredMatch.path;
      }

      // 3. Verificar si COM6 existe específicamente en la lista
      const com6Match = availablePorts.find((p) => p.path.toUpperCase() === 'COM6');
      if (com6Match) {
        return com6Match.path;
      }

      // 4. Si hay algún puerto COM detectado, seleccionar el primero disponible
      if (availablePorts.length > 0 && availablePorts[0]?.path) {
        console.log(`[SerialService] Seleccionando puerto disponible: "${availablePorts[0].path}"`);
        return availablePorts[0].path;
      }
    } catch (err) {
      console.warn('[SerialService] Error al enumerar puertos con SerialPort.list():', err);
    }

    // Fallback al puerto configurado por entorno (COM6 por defecto)
    return env.SERIAL_PORT;
  }

  private async initRealPort(): Promise<void> {
    const { SerialPort } = await import('serialport');
    const { ReadlineParser } = await import('@serialport/parser-readline');

    const targetPort = await this.resolvePort();
    this.activePort = targetPort;

    return new Promise((resolve, reject) => {
      if (this.portInstance && this.portInstance.isOpen) {
        try {
          this.portInstance.close();
        } catch { }
      }

      console.log(`[SerialService] Abriendo puerto ${targetPort} @ ${env.BAUD_RATE} baud...`);

      const port = new SerialPort({
        path: targetPort,
        baudRate: env.BAUD_RATE,
        autoOpen: false,
      });

      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

      port.open((err) => {
        if (err) {
          this.isConnected = false;
          this.isReadyAfterDtr = false;
          reject(err);
          return;
        }

        this.portInstance = port;
        this.isConnected = true;
        this.isMock = false;
        console.log(`[SerialService] Puerto serial ${targetPort} abierto exitosamente.`);

        // Tiempo de estabilización tras DTR (el Arduino Uno se reinicia al abrir la conexión serial ~1500ms)
        this.isReadyAfterDtr = false;
        if (this.dtrTimer) clearTimeout(this.dtrTimer);
        this.dtrTimer = setTimeout(() => {
          this.isReadyAfterDtr = true;
          console.log(`[SerialService] Enlace DTR estabilizado en "${targetPort}". Listo para enviar tramas.`);
          // Despachar comandos que hayan quedado en cola durante el reinicio
          while (this.queuedCommands.length > 0) {
            const nextCmd = this.queuedCommands.shift();
            if (nextCmd) this.sendCommand(nextCmd);
          }
        }, 1800);

        this.emit('connected', this.getStatus());
        resolve();
      });

      parser.on('data', (line: Buffer | string) => {
        this.handleIncoming(line.toString());
      });

      port.on('error', (err: Error) => {
        console.error(`[SerialService] Error en puerto ${targetPort}: ${err.message}`);
        this.isConnected = false;
        this.isReadyAfterDtr = false;
        this.emit('error', err);
        this.scheduleReconnect();
      });

      port.on('close', () => {
        if (this.isConnected) {
          console.warn(`[SerialService] Puerto ${targetPort} cerrado. Programando reconexión...`);
          this.isConnected = false;
          this.isReadyAfterDtr = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        }
      });
    });
  }

  private initMock(): void {
    this.isMock = true;
    this.isConnected = true;
    this.isReadyAfterDtr = true;
    console.log(`[SerialService] Emulador serial activo en "${this.activePort}" @ ${env.BAUD_RATE} baud.`);

    // Pulso simulado de botón verde cada 25 segundos exclusivamente en modo mock
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

    if (this.isMock) {
      console.log(`[Serial-MOCK] Comando recibido hacia microcontrolador: "${cleanCmd}"`);
      if (cleanCmd === 'PING') {
        setTimeout(() => this.handleIncoming('PONG'), 50);
      }
      return true;
    }

    if (!this.isConnected || !this.portInstance || !this.portInstance.isOpen) {
      console.warn(`[Serial-OUT] Sin enlace activo en ${this.activePort}. Comando omitido: "${cleanCmd}"`);
      return false;
    }

    // Si aún está en la ventana de reinicio por DTR tras abrir el puerto, encolar para no perder la trama
    if (!this.isReadyAfterDtr) {
      console.log(`[Serial-OUT] Esperando estabilización DTR en ${this.activePort}. Encolando: "${cleanCmd}"`);
      this.queuedCommands.push(cleanCmd);
      return true;
    }

    this.portInstance.write(`${cleanCmd}\n`, 'utf8', (err: Error | null) => {
      if (err) {
        console.error(`[Serial-OUT] Error al enviar comando a ${this.activePort}: ${err.message}`);
      } else {
        console.log(`[Serial-OUT] Comando enviado a ${this.activePort}: "${cleanCmd}"`);
      }
    });
    return true;
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SerialService] Reintento fallido en ${this.activePort} (${msg}). Reintentando en 5s...`);
        this.scheduleReconnect();
      }
    }, 5000);
  }

  public getStatus(): HardwareStationStatus {
    return {
      connected: this.isConnected,
      mock: this.isMock,
      port: this.activePort,
      baudRate: env.BAUD_RATE,
    };
  }

  public close(): void {
    if (this.dtrTimer) {
      clearTimeout(this.dtrTimer);
      this.dtrTimer = null;
    }
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
    this.isReadyAfterDtr = false;
  }
}

export const serialService = SerialService.getInstance();
