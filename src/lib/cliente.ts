import { RUTA_API } from "./api";

export interface Respuesta<T> {
  ok: boolean;
  status: number;
  datos: T | null;
  mensaje: string;
}

const SIN_CONEXION = "No pudimos conectar. Revisa tu internet e intenta de nuevo.";

function baseApi(): string {
  return `${document.documentElement.dataset.api ?? ""}${RUTA_API}`;
}

export async function llamarApi<T>(
  ruta: string,
  opciones: { metodo?: "GET" | "POST" | "PATCH"; cuerpo?: unknown } = {},
): Promise<Respuesta<T>> {
  const metodo = opciones.metodo ?? "GET";
  try {
    const respuesta = await fetch(`${baseApi()}${ruta}`, {
      method: metodo,
      credentials: "include",
      mode: "cors",
      headers: {
        Accept: "application/json",
        ...(metodo === "GET" ? {} : { "Content-Type": "application/json", "X-Requested-With": "fetch" }),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
    const texto = await respuesta.text();
    const datos = texto ? (JSON.parse(texto) as unknown) : null;
    const mensaje =
      datos && typeof datos === "object" && "mensaje" in datos && typeof datos.mensaje === "string"
        ? datos.mensaje
        : "";
    const errores =
      datos && typeof datos === "object" && "errores" in datos && Array.isArray(datos.errores)
        ? (datos.errores as string[])
        : [];
    return {
      ok: respuesta.ok,
      status: respuesta.status,
      datos: respuesta.ok ? (datos as T) : null,
      mensaje: errores.length > 0 ? errores.join(" ") : mensaje,
    };
  } catch {
    return { ok: false, status: 0, datos: null, mensaje: SIN_CONEXION };
  }
}

const formatoHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  hour: "numeric",
  minute: "2-digit",
});

export function hora(iso: string): string {
  return formatoHora.format(new Date(iso));
}

export function nodo<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clase?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}
