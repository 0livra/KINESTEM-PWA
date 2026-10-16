/**
 * KINESTEM Engine - Tipos y Metadatos de Componentes de Circuito
 */

export type CircuitComponentType =
  | 'resistor'
  | 'capacitor'
  | 'sensor_ldr'
  | 'led'
  | 'wire';

export type ComponentVisualState = 'idle' | 'warning' | 'success' | 'fail';

export interface ComponentMetadata {
  type: CircuitComponentType;
  label: string;
  symbol: string;
  defaultResistanceOhms?: number;
  capacitanceFarads?: number;
  colorScheme: {
    idle: number;
    warning: number;
    success: number;
    fail: number;
  };
}

export const COMPONENT_METADATA: Record<CircuitComponentType, ComponentMetadata> = {
  resistor: {
    type: 'resistor',
    label: 'Resistencia (R)',
    symbol: 'Ω',
    defaultResistanceOhms: 220,
    colorScheme: {
      idle: 0x94a3b8,
      warning: 0xf59e0b,
      success: 0x10b981,
      fail: 0xef4444,
    },
  },
  capacitor: {
    type: 'capacitor',
    label: 'Capacitor (C)',
    symbol: 'µF',
    capacitanceFarads: 0.0001,
    colorScheme: {
      idle: 0x60a5fa,
      warning: 0xf59e0b,
      success: 0x10b981,
      fail: 0xef4444,
    },
  },
  sensor_ldr: {
    type: 'sensor_ldr',
    label: 'Fotoresistencia LDR',
    symbol: 'LDR',
    colorScheme: {
      idle: 0xfbbf24,
      warning: 0xf59e0b,
      success: 0x10b981,
      fail: 0xef4444,
    },
  },
  led: {
    type: 'led',
    label: 'Diodo LED',
    symbol: 'LED',
    colorScheme: {
      idle: 0xf87171,
      warning: 0xf59e0b,
      success: 0x10b981,
      fail: 0xef4444,
    },
  },
  wire: {
    type: 'wire',
    label: 'Cable Conductor',
    symbol: '—',
    colorScheme: {
      idle: 0x475569,
      warning: 0xf59e0b,
      success: 0x10b981,
      fail: 0xef4444,
    },
  },
};
