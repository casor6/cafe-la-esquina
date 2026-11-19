const url = "https://cxmwwlovagyijqbpiimn.supabase.co/rest/v1";
const llave = "sb_publishable_BwajrdP_3aYvSk777veMkQ_mdrx3tie";

const pedir = async (ruta, opciones = {}) => {
  const respuesta = await fetch(`${url}${ruta}`, {
    ...opciones,
    headers: { apikey: llave, "Content-Type": "application/json", ...opciones.headers },
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, texto: texto.slice(0, 200) };
};

const rpc = (nombre, cuerpo) => pedir(`/rpc/${nombre}`, { method: "POST", body: JSON.stringify(cuerpo) });

const pruebas = [
  ["Leer catálogo (debe funcionar)", () => pedir("/productos?select=nombre,precio&limit=2"), (r) => r.estado === 200 && r.texto.includes("precio")],
  ["Leer pedidos (debe dar vacío o error)", () => pedir("/pedidos?select=*"), (r) => r.estado >= 400 || r.texto === "[]"],
  ["Leer artículos (debe dar vacío o error)", () => pedir("/pedido_articulos?select=*"), (r) => r.estado >= 400 || r.texto === "[]"],
  ["Leer administradores (debe fallar)", () => pedir("/administradores?select=*"), (r) => r.estado >= 400 || r.texto === "[]"],
  [
    "Insertar pedido directo (debe fallar)",
    () => pedir("/pedidos", { method: "POST", body: JSON.stringify({ fecha: "2026-11-18", folio: 999, nombre: "x", telefono: "5555555555", recoger_a: "2026-11-18T20:00:00Z" }) }),
    (r) => r.estado >= 400,
  ],
  [
    "Cambiar precio (debe fallar)",
    () => pedir("/productos?id=eq.1", { method: "PATCH", body: JSON.stringify({ precio: 1 }), headers: { Prefer: "return=representation" } }),
    (r) => r.estado >= 400 || r.texto === "[]",
  ],
  ["Ejecutar es_admin como público (debe fallar)", () => rpc("es_admin", {}), (r) => r.estado >= 400],
  ["Teléfono inválido", () => rpc("crear_pedido", { p_nombre: "Ana", p_telefono: "123", p_hora: "19:00", p_articulos: [{ producto_id: 1, cantidad: 1 }] }), (r) => r.texto.includes("telefono_invalido")],
  ["Cantidad decimal", () => rpc("crear_pedido", { p_nombre: "Ana", p_telefono: "5512345678", p_hora: "07:00", p_articulos: [{ producto_id: 1, cantidad: 1.5 }] }), (r) => r.estado >= 400],
  ["Hora fuera de horario", () => rpc("crear_pedido", { p_nombre: "Ana", p_telefono: "5512345678", p_hora: "23:00", p_articulos: [{ producto_id: 1, cantidad: 1 }] }), (r) => r.texto.includes("hora_fuera_de_horario") || r.texto.includes("cerrado_hoy")],
  ["Consultar pedido inexistente", () => rpc("consultar_pedido", { p_id: "00000000-0000-0000-0000-000000000000" }), (r) => r.estado === 200 && r.texto === "null"],
];

let fallas = 0;
for (const [nombre, ejecutar, esperado] of pruebas) {
  const resultado = await ejecutar();
  const bien = esperado(resultado);
  if (!bien) fallas++;
  console.log(`${bien ? "OK   " : "FALLA"} ${nombre} -> ${resultado.estado} ${resultado.texto}`);
}
process.exit(fallas ? 1 : 0);
