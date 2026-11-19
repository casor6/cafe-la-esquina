import { esHorarioValido, fechaLocal, horariosDisponibles, rangoDelDia } from './horario.js';

const local = (iso: string) => new Date(`${iso}-06:00`);

describe('horariosDisponibles', () => {
  it('ofrece cada 15 minutos desde 15 minutos después de ahora hasta 15 antes del cierre', () => {
    const horarios = horariosDisponibles(local('2026-11-17T10:05:00'));
    expect(horarios[0]).toEqual(local('2026-11-17T10:30:00'));
    expect(horarios.at(-1)).toEqual(local('2026-11-17T19:45:00'));
    expect(horarios).toHaveLength(38);
  });

  it('respeta la apertura cuando todavía no abre', () => {
    const horarios = horariosDisponibles(local('2026-11-17T05:00:00'));
    expect(horarios[0]).toEqual(local('2026-11-17T07:00:00'));
  });

  it('usa el horario corto del domingo', () => {
    const horarios = horariosDisponibles(local('2026-11-22T09:00:00'));
    expect(horarios.at(-1)).toEqual(local('2026-11-22T14:45:00'));
  });

  it('no ofrece nada cerca del cierre', () => {
    expect(horariosDisponibles(local('2026-11-17T19:40:00'))).toEqual([]);
  });

  it('usa el día de la Ciudad de México aunque en UTC ya sea mañana', () => {
    const horarios = horariosDisponibles(local('2026-11-21T19:00:00'));
    expect(horarios[0]).toEqual(local('2026-11-21T19:15:00'));
  });
});

describe('esHorarioValido', () => {
  const ahora = local('2026-11-17T10:05:00');

  it('acepta un horario de la lista', () => {
    expect(esHorarioValido(local('2026-11-17T11:00:00'), ahora)).toBe(true);
  });

  it('rechaza horas que no caen en intervalos de 15 minutos', () => {
    expect(esHorarioValido(local('2026-11-17T11:07:00'), ahora)).toBe(false);
  });

  it('rechaza horas demasiado próximas o de otro día', () => {
    expect(esHorarioValido(local('2026-11-17T10:15:00'), ahora)).toBe(false);
    expect(esHorarioValido(local('2026-11-18T11:00:00'), ahora)).toBe(false);
  });
});

describe('fechas locales', () => {
  it('calcula la fecha local y el rango del día', () => {
    expect(fechaLocal(new Date('2026-11-18T03:00:00Z'))).toBe('2026-11-17');
    const { inicio, fin } = rangoDelDia('2026-11-17');
    expect(inicio.toISOString()).toBe('2026-11-17T06:00:00.000Z');
    expect(fin.toISOString()).toBe('2026-11-18T06:00:00.000Z');
  });
});
