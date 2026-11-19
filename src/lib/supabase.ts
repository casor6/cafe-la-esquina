export const SUPABASE_URL = "https://cxmwwlovagyijqbpiimn.supabase.co";
export const SUPABASE_LLAVE_PUBLICA = "sb_publishable_BwajrdP_3aYvSk777veMkQ_mdrx3tie";

export class ErrorApi extends Error {
  constructor(public codigo: string) {
    super(codigo);
  }
}

const cabeceras = {
  apikey: SUPABASE_LLAVE_PUBLICA,
  "Content-Type": "application/json",
};

export async function consultar<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, { headers: cabeceras });
  if (!respuesta.ok) throw new ErrorApi(`http_${respuesta.status}`);
  return respuesta.json() as Promise<T>;
}

export async function llamarFuncion<T>(nombre: string, argumentos: Record<string, unknown>): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombre}`, {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify(argumentos),
    });
  } catch {
    throw new ErrorApi("sin_conexion");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(typeof datos?.message === "string" ? datos.message : `http_${respuesta.status}`);
  return datos as T;
}
