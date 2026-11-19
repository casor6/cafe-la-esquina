export const ZONA_HORARIA = 'America/Mexico_City';
export const INTERVALO_MINUTOS = 15;
export const ANTICIPACION_MINUTOS = 15;
export const MARGEN_CIERRE_MINUTOS = 15;

interface Turno {
  abre: string;
  cierra: string;
}

export const HORARIO: Record<number, Turno> = {
  0: { abre: '08:00', cierra: '15:00' },
  1: { abre: '07:00', cierra: '20:00' },
  2: { abre: '07:00', cierra: '20:00' },
  3: { abre: '07:00', cierra: '20:00' },
  4: { abre: '07:00', cierra: '20:00' },
  5: { abre: '07:00', cierra: '20:00' },
  6: { abre: '08:00', cierra: '20:00' },
};

interface PartesLocales {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  diaSemana: number;
}

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

export function partesLocales(fecha: Date): PartesLocales {
  const partes = Object.fromEntries(formato.formatToParts(fecha).map((p) => [p.type, p.value]));
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
    diaSemana: DIAS[partes.weekday],
  };
}

function desfaseMinutos(fecha: Date): number {
  const p = partesLocales(fecha);
  const comoUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto);
  const truncada = Math.floor(fecha.getTime() / 60000) * 60000;
  return Math.round((comoUtc - truncada) / 60000);
}

export function instanteLocal(anio: number, mes: number, dia: number, minutosDelDia: number): Date {
  const ingenuo = Date.UTC(anio, mes - 1, dia, 0, minutosDelDia);
  const primero = desfaseMinutos(new Date(ingenuo));
  const ajustado = ingenuo - primero * 60000;
  const segundo = desfaseMinutos(new Date(ajustado));
  return new Date(ingenuo - segundo * 60000);
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function horariosDisponibles(ahora: Date): Date[] {
  const hoy = partesLocales(ahora);
  const turno = HORARIO[hoy.diaSemana];
  if (!turno) return [];

  const primero = aMinutos(turno.abre);
  const ultimo = aMinutos(turno.cierra) - MARGEN_CIERRE_MINUTOS;
  const minimo = ahora.getTime() + ANTICIPACION_MINUTOS * 60000;

  const resultado: Date[] = [];
  for (let m = primero; m <= ultimo; m += INTERVALO_MINUTOS) {
    const instante = instanteLocal(hoy.anio, hoy.mes, hoy.dia, m);
    if (instante.getTime() >= minimo) resultado.push(instante);
  }
  return resultado;
}

export function esHorarioValido(hora: Date, ahora: Date): boolean {
  return horariosDisponibles(ahora).some((h) => h.getTime() === hora.getTime());
}

export function fechaLocal(fecha: Date): string {
  const p = partesLocales(fecha);
  return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`;
}

export function rangoDelDia(fecha: string): { inicio: Date; fin: Date } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));
  return {
    inicio: instanteLocal(anio, mes, dia, 0),
    fin: instanteLocal(siguiente.getUTCFullYear(), siguiente.getUTCMonth() + 1, siguiente.getUTCDate(), 0),
  };
}
