import { AlertOctagon, Check, RotateCcw, ScanLine, X } from 'lucide-react';
import type { LedMatrixFace, PairingPhase } from '../../../store/hardware.slice';
import { LedMascot } from '../../components/led-mascot';
import { ArcadeButton } from '../../components/arcade-button';

/* ------------------------------------------------------------------ */
/* Indicador de progreso del emparejamiento (2 fases obligatorias)     */
/* ------------------------------------------------------------------ */

const PHASE_ORDER: PairingPhase[] = [
  'IDLE',
  'WAITING_IR_CODE',
  'IR_CODE_CORRECT',
  'IR_CODE_INCORRECT',
  'WAITING_RFID_SCAN',
  'RFID_DUPLICATED',
  'PAIRING_COMPLETE',
];

export function phaseRank(phase: PairingPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

export function PhaseStepper({ phase }: { phase: PairingPhase }) {
  const rank = phaseRank(phase);
  const phase1Done = rank >= phaseRank('WAITING_RFID_SCAN');
  const phase2Active = rank >= phaseRank('WAITING_RFID_SCAN') && rank < phaseRank('PAIRING_COMPLETE');
  const phase2Done = phase === 'PAIRING_COMPLETE';

  return (
    <ol className="mb-5 grid grid-cols-2 gap-3" aria-label="Progreso de vinculación">
      <li
        className={`flex items-center gap-2 rounded-xl border-[3px] border-ink px-3 py-2 shadow-[3px_3px_0px_#0F172A] ${
          phase1Done ? 'bg-arcade-emerald text-ink' : 'bg-arcade-yellow text-ink'
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-xs font-extrabold ${
            phase1Done ? 'bg-ink text-arcade-emerald' : 'bg-white text-ink'
          }`}
          aria-hidden
        >
          {phase1Done ? <Check className="h-3.5 w-3.5" /> : 1}
        </span>
        <span className="font-display text-[11px] font-extrabold uppercase leading-tight tracking-wider">
          Fase 1 · PIN via IR
        </span>
      </li>
      <li
        className={`flex items-center gap-2 rounded-xl border-[3px] border-ink px-3 py-2 shadow-[3px_3px_0px_#0F172A] ${
          phase2Done ? 'bg-arcade-emerald text-ink' : phase2Active ? 'bg-arcade-yellow text-ink' : 'bg-slate-700 text-slate-400'
        }`}
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-ink font-display text-xs font-extrabold ${
            phase2Done ? 'bg-ink text-arcade-emerald' : phase2Active ? 'bg-white text-ink' : 'bg-slate-500 text-slate-300'
          }`}
          aria-hidden
        >
          {phase2Done ? <Check className="h-3.5 w-3.5" /> : 2}
        </span>
        <span className="font-display text-[11px] font-extrabold uppercase leading-tight tracking-wider">
          Fase 2 · Tarjeta RFID
        </span>
      </li>
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* PIN de 4 dígitos (LCD) y dígitos capturados por IR                  */
/* ------------------------------------------------------------------ */

export function PinDigitTiles({ pin, tone = 'lcd' }: { pin: string | null; tone?: 'lcd' | 'ir' }) {
  const digits = (pin ?? '----').padEnd(4, '-').slice(0, 4).split('');
  return (
    <div className="flex justify-center gap-2" role="img" aria-label={`PIN ${pin ?? 'pendiente'}`}>
      {digits.map((digit, idx) =>
        tone === 'lcd' ? (
          <span
            key={idx}
            className="lcd-screen flex h-14 w-11 items-center justify-center text-2xl font-bold"
          >
            {digit}
          </span>
        ) : (
          <span
            key={idx}
            className="flex h-10 w-8 items-center justify-center rounded-lg border-[3px] border-ink bg-ink text-xl font-extrabold text-arcade-sky-deep shadow-[2px_2px_0px_rgba(15,23,42,0.6)]"
          >
            {digit === '-' ? '' : digit}
          </span>
        )
      )}
    </div>
  );
}

/** LED azul que parpadea en cada pulso recibido del sensor IR. */
export function IrPulseLed({ pulseAt }: { pulseAt: number | null }) {
  if (pulseAt === null) {
    return (
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-slate-600" aria-hidden />
        Sensor IR en espera
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-arcade-sky-deep">
      <span
        key={pulseAt}
        className="h-3.5 w-3.5 animate-ir-blink rounded-full border-2 border-ink bg-arcade-sky-deep"
        aria-hidden
      />
      Pulso IR recibido
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Espejos del hardware: LCD 16x2 I2C y Matriz LED 8x8                 */
/* ------------------------------------------------------------------ */

export function LcdMock({ message }: { message: { line1: string; line2: string } | null }) {
  return (
    <div className="lcd-screen px-3 py-2" role="img" aria-label="Pantalla LCD 16x2">
      <div className="flex h-5 items-center justify-between">
        <span className="text-xs">{message?.line1 ?? 'KINESTEM LISTO'}</span>
        <span className="text-[10px] opacity-60" aria-hidden>
          I2C
        </span>
      </div>
      <div className="flex h-5 items-center">
        <span className="text-xs">{message?.line2 ?? '16x2 OK'}</span>
      </div>
    </div>
  );
}

const MATRIX_FACES: Record<LedMatrixFace, { rows: string[]; color: string; blink?: boolean }> = {
  idle: {
    color: '#EF4444',
    rows: [
      '00000000',
      '00000000',
      '00100100',
      '00000000',
      '00000000',
      '00111100',
      '00000000',
      '00000000',
    ],
  },
  waiting: {
    color: '#F59E0B',
    blink: true,
    rows: [
      '00000000',
      '00000000',
      '01101100',
      '00000000',
      '00011000',
      '00011000',
      '00000000',
      '00000000',
    ],
  },
  happy: {
    color: '#34D399',
    rows: [
      '00000000',
      '00000000',
      '01000010',
      '00100100',
      '00000000',
      '01000010',
      '00111100',
      '00000000',
    ],
  },
  cheer: {
    color: '#34D399',
    rows: [
      '00000000',
      '00000000',
      '01000010',
      '00100100',
      '00000000',
      '00111100',
      '01111110',
      '00000000',
    ],
  },
  confused: {
    color: '#EF4444',
    rows: [
      '00000000',
      '00111100',
      '01100110',
      '00000110',
      '00011100',
      '00000000',
      '00011000',
      '00000000',
    ],
  },
  error: {
    color: '#EF4444',
    rows: [
      '00000000',
      '00000000',
      '01000010',
      '00100100',
      '00011000',
      '00100100',
      '01000010',
      '00000000',
    ],
  },
};

/** Matriz LED 8x8 que refleja la cara mostrada por la consola física. */
export function LedMatrixFaceMock({ face }: { face: LedMatrixFace }) {
  const config = MATRIX_FACES[face] ?? MATRIX_FACES.idle!;
  return (
    <div className="rounded-lg border-[3px] border-ink bg-ink p-1.5" role="img" aria-label={`Matriz LED 8x8: cara ${face}`}>
      <div className={`grid grid-cols-8 gap-[2px] ${config.blink ? 'animate-pulse' : ''}`}>
        {config.rows.flatMap((row, y) =>
          row.split('').map((cell, x) => (
            <span
              key={`${x}-${y}`}
              className="h-[7px] w-[7px] rounded-[2px]"
              style={{
                backgroundColor: cell === '1' ? config.color : 'rgba(148,163,184,0.14)',
                boxShadow: cell === '1' ? `0 0 5px ${config.color}` : undefined,
              }}
              aria-hidden
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FASE 2: panel de escaneo RFID                                       */
/* ------------------------------------------------------------------ */

export function RfidScanVisual({ scanning }: { scanning: boolean }) {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center" aria-hidden>
      {scanning ? (
        <>
          <span className="absolute inset-0 animate-scan-pulse rounded-2xl border-[3px] border-arcade-sky-deep" />
          <span className="absolute inset-0 animate-scan-pulse rounded-2xl border-[3px] border-arcade-sky-deep [animation-delay:0.5s]" />
        </>
      ) : null}
      <span className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-ink bg-arcade-sky shadow-[4px_4px_0px_#0F172A]">
        <ScanLine className={`h-9 w-9 text-ink ${scanning ? 'animate-pulse' : ''}`} />
      </span>
    </div>
  );
}

/** Banner de error explícito para RFID duplicado en la partida actual. */
export function DuplicateRfidBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="animate-pop-in mt-4 rounded-xl border-[3px] border-ink bg-arcade-red p-3 text-white shadow-[4px_4px_0px_#0F172A]"
    >
      <div className="flex items-start gap-2.5">
        <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-sm font-extrabold uppercase leading-snug tracking-wide">{message}</p>
          <ArcadeButton variant="dark" size="sm" icon={RotateCcw} className="mt-2.5" onClick={onRetry}>
            Reintentar con otra tarjeta
          </ArcadeButton>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback de veredicto del PIN (FASE 1)                              */
/* ------------------------------------------------------------------ */

export function IrVerdictFeedback({ status }: { status: 'correct' | 'incorrect' }) {
  if (status === 'correct') {
    return (
      <div
        role="status"
        className="animate-pop-in mt-4 flex items-center gap-3 rounded-xl border-[3px] border-ink bg-arcade-emerald p-3 text-ink shadow-[4px_4px_0px_#0F172A]"
      >
        <LedMascot color="green" face="happy" className="h-14 w-14 shrink-0" />
        <div className="flex min-w-0 items-center gap-2">
          <Check className="h-7 w-7 shrink-0" aria-hidden />
          <p className="font-display text-base font-extrabold uppercase leading-tight tracking-wide">
            Código correcto
            <span className="mt-0.5 block text-[10px] font-bold tracking-widest opacity-80">
              LCD y matriz LED confirman · habilitando lector RFID
            </span>
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="animate-pop-in mt-4 flex items-center gap-3 rounded-xl border-[3px] border-ink bg-arcade-red p-3 text-white shadow-[4px_4px_0px_#0F172A]"
    >
      <LedMascot color="red" face="confused" className="h-14 w-14 shrink-0" />
      <div className="flex min-w-0 items-center gap-2">
        <X className="h-7 w-7 shrink-0" aria-hidden />
        <p className="font-display text-base font-extrabold uppercase leading-tight tracking-wide">
          Código incorrecto
          <span className="mt-0.5 block text-[10px] font-bold tracking-widest opacity-90">
            Puedes reintentar con el Control IR
          </span>
        </p>
      </div>
    </div>
  );
}
