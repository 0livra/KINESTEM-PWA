/**
 * KINESTEM - Protocolo Serial Arduino UNO R3 <-> Node.js
 * Define las tramas exactas de entrada y salida entre el microcontrolador y el gateway.
 */

import type { StationMode } from '@kinestem/shared-types';

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

    // 1. Mensaje de arranque del microcontrolador
    if (/^READY$/i.test(frame)) {
      return { event: 'READY', data: 'READY', raw: frame };
    }

    // 2. Control Infrarrojo: código crudo de calibración, dígito individual o detección sin dígito
    const irRawMatch = frame.match(/^IR_RAW:(.+)$/i);
    if (irRawMatch && irRawMatch[1]) {
      return { event: 'IR_RAW', data: irRawMatch[1].trim(), raw: frame };
    }
    const irMatch = frame.match(/^IR:\s*([0-9])$/i);
    if (irMatch && irMatch[1]) {
      return { event: 'IR_DIGIT', data: irMatch[1], raw: frame };
    }
    if (/^IR:\s*(DETECTED|HIT)$/i.test(frame)) {
      return { event: 'IR_DETECTED', data: 'DETECTED', raw: frame };
    }

    // 3. Veredictos y estados del Arduino Maestro
    if (frame === 'STATUS:PIN_OK') {
      return { event: 'PIN_VALIDATED', data: 'OK', raw: frame };
    }
    if (frame === 'STATUS:PIN_ERROR') {
      return { event: 'PIN_ERROR', data: 'FAIL', raw: frame };
    }
    const statusMatch = frame.match(/^STATUS:(\w+)$/i);
    if (statusMatch && statusMatch[1]) {
      return { event: `STATUS_${statusMatch[1].toUpperCase()}`, data: statusMatch[1].toUpperCase(), raw: frame };
    }

    // 4. Tarjetas y tags RFID (RC522): RFID:UID_XXXX | UID:XXXX | CARD:XXXX
    const rfidMatch = frame.match(/^(?:RFID|UID|CARD):\s*([\w-]+)$/i);
    if (rfidMatch && rfidMatch[1]) {
      return { event: 'RFID', data: rfidMatch[1].trim().toUpperCase(), raw: frame };
    }

    // 5. Botones interactivos (físicos o de control de flujo: BTN:GREEN, BTN:RED, BTN:BLUE)
    const btnMatch = frame.match(/^BTN:(RED|GREEN|BLUE)$/i);
    if (btnMatch && btnMatch[1]) {
      const color = btnMatch[1].toUpperCase();
      return { event: `BTN:${color}`, data: color, raw: frame };
    }

    // 6. Conexión de componentes de circuito (prototipado STEM)
    const compMatch = frame.match(/^COMP:(RESISTOR|CAPACITOR|SENSOR_LDR|LED|WIRE)$/i);
    if (compMatch && compMatch[1]) {
      return { event: 'COMPONENT_ATTACHED', data: compMatch[1].toLowerCase(), raw: frame };
    }

    // 7. Latido / Eco PONG y ACKs
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

  public static formatModeCommand(mode: StationMode): string {
    return `MODE:${mode}\n`;
  }

  public static formatKeyCommand(digit: string): string | null {
    return /^\d$/.test(digit) ? `KEY:${digit}\n` : null;
  }

  public static formatRgbCommand(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
    return `RGB:${clamp(r)},${clamp(g)},${clamp(b)}\n`;
  }

  public static formatDispenseCommand(): string {
    return 'ACTION:DISPENSE\n';
  }

  public static formatPingCommand(): string {
    return 'PING\n';
  }
}