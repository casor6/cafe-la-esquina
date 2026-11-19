export const ZONA_HORARIA = "America/Mexico_City";

const formatoEntero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const formatoCentavos = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function pesos(valor: number): string {
  return `$${Number.isInteger(valor) ? formatoEntero.format(valor) : formatoCentavos.format(valor)}`;
}

export function hora12(hhmm: string): string {
  const [horas, minutos] = hhmm.split(":").map(Number);
  const sufijo = horas < 12 ? "a. m." : "p. m.";
  return `${horas % 12 || 12}:${String(minutos).padStart(2, "0")} ${sufijo}`;
}

const formatoHora = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function horaDeFecha(iso: string): string {
  return hora12(formatoHora.format(new Date(iso)));
}

export function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function plural(cantidad: number, singular: string, pluralTexto: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
