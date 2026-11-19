import type { Horario } from "./catalogo";
import { ZONA_HORARIA, hora12 } from "./formato";

export const MINUTOS_ANTICIPACION = 15;
export const MINUTOS_CIERRE_PEDIDOS = 30;
export const INTERVALO_MINUTOS = 15;

const diasSemana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatoReloj = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function relojMexico(fecha = new Date()) {
  const partes = formatoReloj.formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    dia: diasSemana.indexOf(valor("weekday")),
    minutos: Number(valor("hour")) * 60 + Number(valor("minute")),
    fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
  };
}

const aMinutos = (hhmm: string) => {
  const [horas, minutos] = hhmm.split(":").map(Number);
  return horas * 60 + minutos;
};

const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

export function horasParaRecoger(horarios: Horario[], fecha = new Date()): string[] {
  const { dia, minutos } = relojMexico(fecha);
  const hoy = horarios.find((h) => h.dia === dia);
  if (!hoy) return [];
  const ultima = aMinutos(hoy.cierra) - MINUTOS_CIERRE_PEDIDOS;
  const minima = minutos + MINUTOS_ANTICIPACION + 1;
  const horas: string[] = [];
  for (let m = Math.ceil(aMinutos(hoy.abre) / INTERVALO_MINUTOS) * INTERVALO_MINUTOS; m <= ultima; m += INTERVALO_MINUTOS) {
    if (m >= minima) horas.push(aHora(m));
  }
  return horas;
}

const nombresDias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function proximaApertura(horarios: Horario[], fecha = new Date()): string | null {
  const { dia } = relojMexico(fecha);
  for (let salto = 1; salto <= 7; salto++) {
    const siguiente = (dia + salto) % 7;
    const horario = horarios.find((h) => h.dia === siguiente);
    if (horario) {
      const cuando = salto === 1 ? "mañana" : `el ${nombresDias[siguiente]}`;
      return `Puedes pedir para ${cuando} a partir de las ${hora12(horario.abre)}, el mismo día.`;
    }
  }
  return null;
}
