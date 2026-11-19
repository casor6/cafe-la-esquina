import {
  obtenerCatalogo,
  obtenerHorarios,
  opcionesDisponibles,
  sePuedePedir,
  type Categoria,
  type GrupoOpciones,
  type Horario,
  type Opcion,
  type Producto,
} from "../lib/catalogo";
import { buscar, h, icono } from "../lib/dom";
import { mensajeDeError } from "../lib/errores";
import { hora12, pesos, plural } from "../lib/formato";
import { horasParaRecoger, proximaApertura, relojMexico } from "../lib/horario";
import { ErrorApi, llamarFuncion } from "../lib/supabase";

interface Linea {
  producto_id: number;
  opciones: number[];
  cantidad: number;
}

interface PedidoCreado {
  id: string;
  folio: number;
  total: number;
}

const CLAVE_CARRITO = "cle-carrito";
const CLAVE_CLIENTE = "cle-cliente";
const MAXIMO_POR_LINEA = 20;
const MAXIMO_LINEAS = 30;
const ERRORES_DE_CATALOGO = ["producto_no_disponible", "opcion_invalida", "falta_opcion"];
const ERRORES_DE_HORA = ["hora_fuera_de_horario", "hora_muy_pronto", "cerrado_hoy"];

const carta = buscar("#carta");
const lineasTicket = buscar("#ticket-lineas");
const totalTicket = buscar("#ticket-total");
const formulario = buscar<HTMLFormElement>("#formulario");
const campoNombre = buscar<HTMLInputElement>("#nombre");
const campoTelefono = buscar<HTMLInputElement>("#telefono");
const campoHora = buscar<HTMLSelectElement>("#hora");
const avisoHorario = buscar("#aviso-horario");
const cajaError = buscar("#error");
const botonEnviar = buscar<HTMLButtonElement>("#enviar");
const barraMovil = buscar<HTMLAnchorElement>("#barra-movil");
const barraTexto = buscar("#barra-texto");
const anuncio = buscar("#anuncio");

let catalogo: Categoria[] = [];
let productos = new Map<number, Producto>();
let opciones = new Map<number, Opcion & { grupo: GrupoOpciones }>();
let horarios: Horario[] = [];
let horasDisponibles: string[] = [];
let carrito: Linea[] = leerCarrito();
let productoAbierto: number | null = null;
let catalogoListo = false;
let enviando = false;

function leerJson<T>(clave: string, defecto: T): T {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? (JSON.parse(valor) as T) : defecto;
  } catch {
    return defecto;
  }
}

function leerCarrito(): Linea[] {
  const crudo = leerJson<unknown>(CLAVE_CARRITO, []);
  if (!Array.isArray(crudo)) return [];
  return crudo
    .filter(
      (l): l is Linea =>
        typeof l === "object" &&
        l !== null &&
        Number.isInteger(l.producto_id) &&
        Number.isInteger(l.cantidad) &&
        Array.isArray(l.opciones) &&
        l.opciones.every(Number.isInteger),
    )
    .map((l) => ({ ...l, cantidad: Math.min(Math.max(l.cantidad, 1), MAXIMO_POR_LINEA) }))
    .slice(0, MAXIMO_LINEAS);
}

function guardarCarrito() {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch {}
}

const claveLinea = (productoId: number, ids: number[]) => `${productoId}:${[...ids].sort((a, b) => a - b).join(",")}`;

function lineaValida(linea: Linea): boolean {
  const producto = productos.get(linea.producto_id);
  if (!producto || !sePuedePedir(producto)) return false;
  const elegidas = linea.opciones.map((id) => opciones.get(id));
  if (elegidas.some((o) => !o || !o.disponible || !producto.grupos.some((g) => g.id === o.grupo.id))) return false;
  const grupos = elegidas.map((o) => o!.grupo.id);
  if (new Set(grupos).size !== grupos.length) return false;
  return producto.grupos.every((g) => !g.obligatorio || grupos.includes(g.id));
}

function precioUnitario(linea: Linea): number {
  const producto = productos.get(linea.producto_id);
  if (!producto) return 0;
  return producto.precio + linea.opciones.reduce((suma, id) => suma + (opciones.get(id)?.precio ?? 0), 0);
}

const totalCarrito = () => carrito.reduce((suma, l) => suma + precioUnitario(l) * l.cantidad, 0);
const piezasCarrito = () => carrito.reduce((suma, l) => suma + l.cantidad, 0);

function anunciar(texto: string) {
  anuncio.textContent = "";
  requestAnimationFrame(() => (anuncio.textContent = texto));
}

function agregar(productoId: number, ids: number[]) {
  const producto = productos.get(productoId);
  if (!producto) return;
  const clave = claveLinea(productoId, ids);
  const existente = carrito.find((l) => claveLinea(l.producto_id, l.opciones) === clave);
  if (existente) {
    existente.cantidad = Math.min(existente.cantidad + 1, MAXIMO_POR_LINEA);
  } else if (carrito.length < MAXIMO_LINEAS) {
    carrito.push({ producto_id: productoId, opciones: [...ids].sort((a, b) => a - b), cantidad: 1 });
  } else {
    anunciar("Tu pedido ya tiene demasiados productos distintos.");
    return;
  }
  guardarCarrito();
  renderTicket();
  anunciar(`${producto.nombre} agregado. Total ${pesos(totalCarrito())}.`);
}

function cambiarCantidad(indice: number, cambio: number) {
  const linea = carrito[indice];
  if (!linea) return;
  linea.cantidad += cambio;
  if (linea.cantidad <= 0) carrito.splice(indice, 1);
  else linea.cantidad = Math.min(linea.cantidad, MAXIMO_POR_LINEA);
  guardarCarrito();
  renderTicket();
}

function alternarOpciones(productoId: number) {
  productoAbierto = productoAbierto === productoId ? null : productoId;
  renderCarta();
  const fila = carta.querySelector(`[data-producto="${productoId}"]`);
  const destino = productoAbierto === productoId ? fila?.querySelector("input") : fila?.querySelector(".agregar");
  (destino as HTMLElement | null | undefined)?.focus();
}

function radio(nombre: string, valor: string, texto: string, marcado: boolean, requerido: boolean) {
  return h(
    "label",
    { class: "opcion" },
    h("input", { type: "radio", name: nombre, value: valor, checked: marcado, required: requerido }),
    h("span", {}, texto),
  );
}

function renderOpciones(producto: Producto) {
  const grupos = producto.grupos.filter((g) => opcionesDisponibles(g).length > 0);
  return h(
    "form",
    {
      class: "opciones",
      "aria-label": `Opciones de ${producto.nombre}`,
      onsubmit: (evento: Event) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget as HTMLFormElement);
        const ids = grupos.map((g) => Number(datos.get(`grupo-${g.id}`))).filter((id) => id > 0);
        productoAbierto = null;
        agregar(producto.id, ids);
        renderCarta();
        (carta.querySelector(`[data-producto="${producto.id}"] .agregar`) as HTMLElement | null)?.focus();
      },
    },
    grupos.map((grupo) =>
      h(
        "fieldset",
        {},
        h("legend", {}, grupo.nombre, grupo.obligatorio ? h("span", { class: "requerido" }, " · elige una") : null),
        grupo.obligatorio ? null : radio(`grupo-${grupo.id}`, "", `Sin ${grupo.nombre.toLowerCase()}`, true, false),
        opcionesDisponibles(grupo).map((opcion) =>
          radio(
            `grupo-${grupo.id}`,
            String(opcion.id),
            opcion.precio > 0 ? `${opcion.nombre} +${pesos(opcion.precio)}` : opcion.nombre,
            false,
            grupo.obligatorio,
          ),
        ),
      ),
    ),
    h(
      "div",
      { class: "opciones-acciones" },
      h("button", { type: "submit", class: "boton-primario" }, "Agregar al pedido"),
      h("button", { type: "button", class: "boton-texto", onclick: () => alternarOpciones(producto.id) }, "Cancelar"),
    ),
  );
}

function renderProducto(producto: Producto) {
  const pedible = sePuedePedir(producto);
  const conOpciones = producto.grupos.some((g) => opcionesDisponibles(g).length > 0);
  const abierto = productoAbierto === producto.id;
  return h(
    "li",
    { class: pedible ? "producto" : "producto agotado", "data-producto": producto.id },
    h(
      "div",
      {},
      h(
        "div",
        { class: "linea" },
        h("span", { class: "nombre" }, producto.nombre),
        h("span", { class: "puntos", "aria-hidden": "true" }),
        h("span", { class: "precio" }, pedible ? pesos(producto.precio) : "Agotado"),
      ),
      producto.detalle ? h("p", { class: "detalle" }, producto.detalle) : null,
    ),
    pedible
      ? h(
          "button",
          {
            type: "button",
            class: "agregar",
            "aria-label": `${conOpciones ? "Elegir opciones de" : "Agregar"} ${producto.nombre}`,
            "aria-expanded": conOpciones ? String(abierto) : undefined,
            onclick: () => (conOpciones ? alternarOpciones(producto.id) : agregar(producto.id, [])),
          },
          icono("mas"),
          conOpciones ? "Elegir" : "Agregar",
        )
      : null,
    abierto && pedible ? renderOpciones(producto) : null,
  );
}

function renderCarta() {
  carta.replaceChildren(
    ...catalogo.map((categoria) =>
      h(
        "section",
        { class: "categoria" },
        h("h3", {}, categoria.nombre),
        h("ul", {}, categoria.productos.map(renderProducto)),
      ),
    ),
  );
}

function renderTicket() {
  if (carrito.length === 0) {
    lineasTicket.replaceChildren(
      h("p", { class: "vacio" }, "Todavía no agregas nada. Elige del menú y aquí aparece tu pedido."),
    );
  } else {
    lineasTicket.replaceChildren(
      h(
        "ul",
        {},
        carrito.map((linea, indice) => {
          const producto = productos.get(linea.producto_id)!;
          const nombresOpciones = linea.opciones
            .map((id) => opciones.get(id)?.nombre)
            .filter(Boolean)
            .join(", ");
          return h(
            "li",
            { class: "linea-ticket" },
            h(
              "div",
              {},
              h("span", { class: "linea-nombre" }, producto.nombre),
              nombresOpciones ? h("span", { class: "linea-opciones" }, nombresOpciones) : null,
            ),
            h("span", { class: "linea-precio" }, pesos(precioUnitario(linea) * linea.cantidad)),
            h(
              "div",
              { class: "cantidad" },
              h(
                "button",
                {
                  type: "button",
                  "aria-label": linea.cantidad === 1 ? `Quitar ${producto.nombre}` : `Uno menos de ${producto.nombre}`,
                  onclick: () => cambiarCantidad(indice, -1),
                },
                icono(linea.cantidad === 1 ? "quitar" : "menos"),
              ),
              h("span", {}, linea.cantidad),
              h(
                "button",
                {
                  type: "button",
                  "aria-label": `Uno más de ${producto.nombre}`,
                  disabled: linea.cantidad >= MAXIMO_POR_LINEA,
                  onclick: () => cambiarCantidad(indice, 1),
                },
                icono("mas"),
              ),
            ),
          );
        }),
      ),
    );
  }
  const total = totalCarrito();
  totalTicket.textContent = pesos(total);
  barraMovil.hidden = carrito.length === 0;
  barraTexto.textContent = `${plural(piezasCarrito(), "producto", "productos")} · ${pesos(total)}`;
  actualizarBoton();
}

function actualizarHoras() {
  if (!catalogoListo) return;
  horasDisponibles = horasParaRecoger(horarios);
  const anterior = campoHora.value;
  campoHora.replaceChildren(
    h("option", { value: "" }, horasDisponibles.length ? "Elige una hora" : "Sin horas disponibles"),
    ...horasDisponibles.map((hora) => h("option", { value: hora, selected: hora === anterior }, hora12(hora))),
  );
  campoHora.disabled = horasDisponibles.length === 0;
  if (horasDisponibles.length === 0) {
    const abreHoy = horarios.some((h) => h.dia === relojMexico().dia);
    const inicio = abreHoy ? "Por hoy ya no recibimos pedidos en línea." : "Hoy no abrimos.";
    avisoHorario.textContent = `${inicio} ${proximaApertura(horarios) ?? ""}`.trim();
    avisoHorario.hidden = false;
  } else {
    avisoHorario.hidden = true;
  }
  actualizarBoton();
}

function actualizarBoton() {
  botonEnviar.disabled = enviando || !catalogoListo || carrito.length === 0 || horasDisponibles.length === 0;
  if (enviando) botonEnviar.textContent = "Enviando tu pedido…";
  else if (carrito.length === 0) botonEnviar.textContent = "Agrega algo para continuar";
  else if (horasDisponibles.length === 0) botonEnviar.textContent = "Por ahora no recibimos pedidos";
  else botonEnviar.textContent = `Enviar pedido · ${pesos(totalCarrito())}`;
}

function mostrarError(texto: string, campo?: HTMLInputElement | HTMLSelectElement) {
  cajaError.textContent = texto;
  cajaError.hidden = false;
  if (campo) {
    campo.setAttribute("aria-invalid", "true");
    campo.focus();
  }
}

function limpiarError() {
  cajaError.hidden = true;
  for (const campo of [campoNombre, campoTelefono, campoHora]) campo.removeAttribute("aria-invalid");
}

async function cargar() {
  try {
    const [nuevoCatalogo, nuevosHorarios] = await Promise.all([obtenerCatalogo(), obtenerHorarios()]);
    catalogo = nuevoCatalogo;
    horarios = nuevosHorarios;
    productos = new Map(catalogo.flatMap((c) => c.productos).map((p) => [p.id, p]));
    opciones = new Map(
      [...productos.values()].flatMap((p) => p.grupos.flatMap((g) => g.opciones.map((o) => [o.id, { ...o, grupo: g }] as const))),
    );
    const antes = carrito.length;
    carrito = carrito.filter(lineaValida);
    if (carrito.length !== antes) guardarCarrito();
    catalogoListo = true;
    renderCarta();
    renderTicket();
    actualizarHoras();
  } catch {
    carta.replaceChildren(
      h(
        "div",
        { class: "falla" },
        h("p", {}, "No pudimos cargar el menú. Revisa tu conexión."),
        h("button", { type: "button", class: "boton-primario", onclick: () => void cargar() }, "Intentar de nuevo"),
      ),
    );
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (enviando || carrito.length === 0) return;
  limpiarError();

  const nombre = campoNombre.value.trim().replace(/\s+/g, " ");
  const telefono = campoTelefono.value.replace(/\D/g, "");
  const hora = campoHora.value;

  if (nombre.length < 2 || nombre.length > 60) return mostrarError(mensajeDeError("nombre_invalido"), campoNombre);
  if (!/^(52)?\d{10}$/.test(telefono)) return mostrarError(mensajeDeError("telefono_invalido"), campoTelefono);
  if (!hora) return mostrarError("Elige a qué hora pasas por tu pedido.", campoHora);

  enviando = true;
  actualizarBoton();
  try {
    localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ nombre, telefono: campoTelefono.value }));
  } catch {}

  try {
    const pedido = await llamarFuncion<PedidoCreado>("crear_pedido", {
      p_nombre: nombre,
      p_telefono: telefono,
      p_hora: hora,
      p_articulos: carrito.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, opciones: l.opciones })),
    });
    carrito = [];
    guardarCarrito();
    location.assign(`/pedido?id=${encodeURIComponent(pedido.id)}`);
  } catch (error) {
    const codigo = error instanceof ErrorApi ? error.codigo : "";
    enviando = false;
    if (ERRORES_DE_CATALOGO.includes(codigo)) await cargar();
    if (ERRORES_DE_HORA.includes(codigo)) actualizarHoras();
    actualizarBoton();
    mostrarError(mensajeDeError(codigo), ERRORES_DE_HORA.includes(codigo) ? campoHora : undefined);
  }
});

const cliente = leerJson<{ nombre?: string; telefono?: string }>(CLAVE_CLIENTE, {});
if (cliente.nombre) campoNombre.value = cliente.nombre;
if (cliente.telefono) campoTelefono.value = cliente.telefono;

setInterval(actualizarHoras, 30_000);
void cargar();
