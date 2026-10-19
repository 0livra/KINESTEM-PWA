/**
 * KINESTEM - Protocolo Serial Arduino UNO R3 <-> Node.js
 * Define las tramas exactas de entrada y salida entre el microcontrolador y el gateway.
 */

export interface ParsedSerialFrame {
  event: string;
  data: string;
  raw: string;
}

export class HardwareProtocol {
  /**
   * Parsea tramas entrantes desde el puerto serial del Arduino.
   */
  public static parseIncoming(raw: string): ParsedSerialFrame | null {
    const frame = raw.trim();
    if (!frame) return null;

    // 1. Control Infrarrojo (Dígito individual)
    const irMatch = frame.match(/^IR:([0-9])$/i);
    if (irMatch && irMatch[1]) {
      return { event: 'IR_DIGIT', data: irMatch[1], raw: frame };
    }

    // 2. Veredicto del PIN evaluado por el Arduino
    if (frame === 'STATUS:PIN_OK') {
      return { event: 'PIN_VALIDATED', data: 'OK', raw: frame };
    }
    if (frame === 'STATUS:PIN_ERROR') {
      return { event: 'PIN_ERROR', data: 'FAIL', raw: frame };
    }

    // 3. Tarjetas y tags RFID (RC522)
    const rfidMatch = frame.match(/^RFID:(UID_\w+|\w+)$/i);
    if (rfidMatch && rfidMatch[1]) {
      return { event: 'RFID', data: rfidMatch[1], raw: frame };
    }

    // 4. Latido / Eco PONG y ACKs
    if (/^PONG$/i.test(frame)) {
      return { event: 'PONG', data: 'PONG', raw: frame };
    }
    if (/^ACK:DISPENSE$/i.test(frame)) {
      return { event: 'DISPENSE_ACK', data: 'OK', raw: frame };
    }

    // Trama genérica no catalogada
    return { event: 'RAW', data: frame, raw: frame };
  }

  /**
   * Comandos de control para Arduino Maestro
   */
  public static formatSetPinCommand(pin: string): string {
    return `SET_PIN:${pin}\n`;
  }

  public static formatFaceCommand(face: string): string {
    return `FACE:${face}\n`;
  }

  public static formatLcdCommand(line1: string, line2 = ''): string {
    const clean1 = line1.replace(/\|/g, ' ').substring(0, 16);
    const clean2 = line2.replace(/\|/g, ' ').substring(0, 16);
    return `LCD:${clean1}|${clean2}\n`;
  }

  public static formatDispenseCommand(): string {
    return 'ACTION:DISPENSE\n';
  }

  public static formatPingCommand(): string {
    return 'PING\n';
  }
}