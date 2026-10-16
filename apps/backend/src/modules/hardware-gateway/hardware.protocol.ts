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
   * Tramas esperadas:
   *  - BTN:RED, BTN:GREEN, BTN:BLUE
   *  - RFID:UID_<VALOR>
   *  - COMP:<CIRCUIT_COMPONENT> (p.ej. COMP:RESISTOR)
   *  - PONG
   */
  public static parseIncoming(raw: string): ParsedSerialFrame | null {
    const frame = raw.trim();
    if (!frame) return null;

    // 1. Botones físicos interactivos
    const btnMatch = frame.match(/^BTN:(RED|GREEN|BLUE)$/i);
    if (btnMatch && btnMatch[1]) {
      const color = btnMatch[1].toUpperCase();
      return { event: `BTN:${color}`, data: color, raw: frame };
    }

    // 2. Tarjetas y tags RFID
    const rfidMatch = frame.match(/^RFID:(UID_\w+|\w+)$/i);
    if (rfidMatch && rfidMatch[1]) {
      return { event: 'RFID', data: rfidMatch[1], raw: frame };
    }

    // 3. Conexión de componentes de circuito (prototipado STEM)
    const compMatch = frame.match(/^COMP:(RESISTOR|CAPACITOR|SENSOR_LDR|LED|WIRE)$/i);
    if (compMatch && compMatch[1]) {
      return { event: 'COMPONENT_ATTACHED', data: compMatch[1].toLowerCase(), raw: frame };
    }

    // 4. Latido / Eco PONG
    if (/^PONG$/i.test(frame)) {
      return { event: 'PONG', data: 'PONG', raw: frame };
    }

    // Trama genérica no catalogada
    return { event: 'RAW', data: frame, raw: frame };
  }

  /**
   * Formatea comandos salientes hacia el Arduino UNO R3.
   */
  public static formatLcdCommand(line1: string, line2 = ''): string {
    const clean1 = line1.replace(/\|/g, ' ').substring(0, 16);
    const clean2 = line2.replace(/\|/g, ' ').substring(0, 16);
    return `LCD:${clean1}|${clean2}\n`;
  }

  public static formatDispenseCommand(): string {
    return 'ACTION:DISPENSE\n';
  }

  public static formatStatusOkCommand(): string {
    return 'STATUS:LINK_OK\n';
  }

  public static formatPingCommand(): string {
    return 'PING\n';
  }
}
