import { createClient, type RealtimeChannel, type Session } from "@supabase/supabase-js";
import { buscar, h, icono } from "../lib/dom";
import { horaDeFecha, pesos, plural } from "../lib/formato";
import { relojMexico } from "../lib/horario";
import { SUPABASE_LLAVE_PUBLICA, SUPABASE_URL } from "../lib/supabase";

type Estado = "recibido" | "preparando" | "listo" | "entregado";

interface Articulo {
  id: number;
  nombre: string;
  opciones: string[];
  cantidad: number;
}

interface PedidoPanel {
  id: string;
  folio: number;
  fecha: string;
  nombre: string;
  telefono: string;
  recoger_a: string;
  estado: Estado;
  total: number;
  pedido_articulos: Articulo[];
}

const ESTADOS: Estado[] = ["recibido", "preparando", "listo", "entregado"];

const secciones: { estado: Estado; titulo: string; accion: string; vacio: string }[] = [
  { estado: "recibido", titulo: "Nuevos", accion: "Empezar a preparar", vacio: "No hay pedidos nuevos." },
  { estado: "preparando", titulo: "Preparando", accion: "Marcar como listo", vacio: "Nada en preparación." },
  { estado: "listo", titulo: "Listos para entregar", accion: "Marcar como entregado", vacio: "Nada esperando en barra." },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_LLAVE_PUBLICA);

const vistas = {
  cargando: buscar("#vista-cargando"),
  entrar: buscar("#vista-entrar"),
  "sin-acceso": buscar("#vista-sin-acceso"),
  tablero: buscar("#vista-tablero"),
};
const acciones = buscar("#panel-acciones");
const formEntrar = buscar<HTMLFormElement>("#form-entrar");
const errorEntrar = buscar("#error-entrar");
const tablero = buscar("#tablero");
const resumen = buscar("#resumen");
const avisoPanel = buscar("#aviso-panel");
const botonSonido = buscar<HTMLButtonElement>("#sonido");
const textoSonido = buscar("#sonido-texto");

let usuarioActivo: string | null = null;
let canal: RealtimeChannel | null = null;
let intervalos: number[] = [];
let recargaPendiente: number | undefined;
let pedidos: PedidoPanel[] = [];
let conocidos: Set<string> | null = null;
let recienLlegados = new Set<string>();
let audio: AudioContext | null = null;

function mostrarVista(nombre: keyof typeof vistas) {
  for (const [clave, elemento] of Object.entries(vistas)) elemento.hidden = clave !== nombre;
  acciones.hidden = nombre !== "tablero";
}

function prepararAudio() {
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume().then(actualizarBotonSonido);
  actualizarBotonSonido();
}

function actualizarBotonSonido() {
  const activo = audio?.state === "running";
  botonSonido.classList.toggle("activo", activo);
  textoSonido.textContent = activo ? "Aviso sonoro activo" : "Activar aviso sonoro";
}

function sonar() {
  if (!audio || audio.state !== "running") return;
  const inicio = audio.currentTime;
  [880, 1175, 880].forEach((frecuencia, i) => {
    const oscilador = audio!.createOscillator();
    const volumen = audio!.createGain();
    const t = inicio + i * 0.2;
    oscilador.type = "sine";
    oscilador.frequency.value = frecuencia;
    volumen.gain.setValueAtTime(0.0001, t);
    volumen.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    oscilador.connect(volumen).connect(audio!.destination);
    oscilador.start(t);
    oscilador.stop(t + 0.4);
  });
}

function telefonoLegible(telefono: string) {
  return telefono.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1 $2 $3");
}

function tiempoRelativo(iso: string) {
  const minutos = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const absoluto = Math.abs(minutos);
  const texto = absoluto < 60 ? `${absoluto} min` : `${Math.floor(absoluto / 60)} h ${absoluto % 60} min`;
  if (absoluto === 0) return { texto: "ahora", minutos };
  return { texto: minutos > 0 ? `en ${texto}` : `hace ${texto}`, minutos };
}

async function cambiarEstado(pedido: PedidoPanel, estado: Estado, boton: HTMLButtonElement) {
  const tarjeta = boton.closest(".pedido");
  tarjeta?.querySelectorAll("button").forEach((b) => (b.disabled = true));
  const { error } = await supabase.from("pedidos").update({ estado }).eq("id", pedido.id);
  if (error) {
    avisoPanel.textContent = "No se pudo cambiar el estado. Revisa la conexión e inténtalo otra vez.";
    avisoPanel.hidden = false;
    tarjeta?.querySelectorAll("button").forEach((b) => (b.disabled = false));
    return;
  }
  avisoPanel.hidden = true;
  await cargarPedidos();
}

function tarjeta(pedido: PedidoPanel, hoy: string) {
  const indice = ESTADOS.indexOf(pedido.estado);
  const relativo = tiempoRelativo(pedido.recoger_a);
  const urgente = relativo.minutos <= 10 && (pedido.estado === "recibido" || pedido.estado === "preparando");
  const seccion = secciones[indice];
  return h(
    "li",
    { class: recienLlegados.has(pedido.id) ? "pedido nuevo" : "pedido" },
    h(
      "div",
      { class: "pedido-cabeza" },
      h("span", { class: "folio" }, `#${pedido.folio}`),
      h("span", { class: "cliente" }, pedido.nombre),
      pedido.fecha !== hoy ? h("span", { class: "de-otro-dia" }, "De otro día") : null,
      h(
        "span",
        { class: urgente ? "recoge urgente" : "recoge" },
        icono("reloj"),
        `Pasa ${horaDeFecha(pedido.recoger_a)}`,
        pedido.estado === "entregado" ? null : h("small", {}, relativo.texto),
      ),
    ),
    h(
      "ul",
      { class: "articulos" },
      pedido.pedido_articulos.map((a) =>
        h(
          "li",
          {},
          h("strong", {}, `${a.cantidad} × `),
          a.nombre,
          a.opciones.length ? h("span", { class: "op" }, ` · ${a.opciones.join(", ")}`) : null,
        ),
      ),
    ),
    h(
      "div",
      { class: "pedido-pie" },
      h("a", { class: "tel", href: `tel:+52${pedido.telefono}` }, icono("telefono"), telefonoLegible(pedido.telefono)),
      h("span", { class: "total" }, `${pesos(Number(pedido.total))} en caja`),
      h(
        "div",
        { class: "acciones" },
        indice > 0
          ? h(
              "button",
              {
                type: "button",
                class: "boton-texto",
                "aria-label": `Regresar pedido ${pedido.folio} a ${ESTADOS[indice - 1]}`,
                onclick: (e: Event) => void cambiarEstado(pedido, ESTADOS[indice - 1], e.currentTarget as HTMLButtonElement),
              },
              icono("deshacer"),
              "Regresar",
            )
          : null,
        seccion
          ? h(
              "button",
              {
                type: "button",
                class: "boton-avanzar",
                onclick: (e: Event) => void cambiarEstado(pedido, ESTADOS[indice + 1], e.currentTarget as HTMLButtonElement),
              },
              icono("listo"),
              seccion.accion,
            )
          : null,
      ),
    ),
  );
}

function renderTablero() {
  const { fecha: hoy } = relojMexico();
  const deHoy = pedidos.filter((p) => p.fecha === hoy);
  const entregados = pedidos.filter((p) => p.estado === "entregado").reverse();
  const nuevos = pedidos.filter((p) => p.estado === "recibido").length;

  resumen.textContent = `${plural(deHoy.length, "pedido", "pedidos")} hoy · ${pesos(
    deHoy.reduce((suma, p) => suma + Number(p.total), 0),
  )} · actualizado ${horaDeFecha(new Date().toISOString())}`;
  document.title = `${nuevos ? `(${nuevos}) ` : ""}Pedidos · Café La Esquina`;

  const abierto = tablero.querySelector<HTMLDetailsElement>("details.entregados")?.open ?? false;

  tablero.replaceChildren(
    ...secciones.map((seccion) => {
      const lista = pedidos.filter((p) => p.estado === seccion.estado);
      return h(
        "section",
        { class: `grupo grupo-${seccion.estado}` },
        h("h2", {}, seccion.titulo, h("span", { class: "conteo" }, lista.length)),
        lista.length
          ? h("ul", { class: "lista" }, lista.map((p) => tarjeta(p, hoy)))
          : h("p", { class: "vacio" }, seccion.vacio),
      );
    }),
    h(
      "details",
      { class: "grupo entregados", open: abierto },
      h("summary", {}, `Entregados hoy (${entregados.length})`),
      entregados.length
        ? h("ul", { class: "lista" }, entregados.map((p) => tarjeta(p, hoy)))
        : h("p", { class: "vacio" }, "Todavía no entregas pedidos hoy."),
    ),
  );
}

async function cargarPedidos() {
  const { fecha } = relojMexico();
  const { data, error } = await supabase
    .from("pedidos")
    .select("id,folio,fecha,nombre,telefono,recoger_a,estado,total,pedido_articulos(id,nombre,opciones,cantidad)")
    .or(`fecha.eq.${fecha},estado.neq.entregado`)
    .order("recoger_a")
    .order("id", { referencedTable: "pedido_articulos" });

  if (error) {
    avisoPanel.textContent = "No se pudieron cargar los pedidos. Reintentando…";
    avisoPanel.hidden = false;
    return;
  }

  avisoPanel.hidden = true;
  pedidos = data as PedidoPanel[];
  const ids = new Set(pedidos.map((p) => p.id));
  if (conocidos) {
    recienLlegados = new Set(pedidos.filter((p) => !conocidos!.has(p.id) && p.estado === "recibido").map((p) => p.id));
    if (recienLlegados.size > 0) sonar();
  }
  conocidos = ids;
  renderTablero();
}

function programarRecarga() {
  window.clearTimeout(recargaPendiente);
  recargaPendiente = window.setTimeout(() => void cargarPedidos(), 400);
}

function detener() {
  if (canal) void supabase.removeChannel(canal);
  canal = null;
  intervalos.forEach((i) => window.clearInterval(i));
  intervalos = [];
  usuarioActivo = null;
  conocidos = null;
  pedidos = [];
}

async function iniciarTablero() {
  mostrarVista("tablero");
  actualizarBotonSonido();
  await cargarPedidos();
  canal = supabase
    .channel("pedidos-panel")
    .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, programarRecarga)
    .subscribe((estado) => {
      if (estado === "SUBSCRIBED") programarRecarga();
    });
  intervalos.push(
    window.setInterval(() => void cargarPedidos(), 60_000),
    window.setInterval(() => {
      recienLlegados.clear();
      renderTablero();
    }, 30_000),
  );
}

async function manejarSesion(sesion: Session | null) {
  if (!sesion) {
    detener();
    mostrarVista("entrar");
    return;
  }
  if (usuarioActivo === sesion.user.id) return;
  usuarioActivo = sesion.user.id;
  const { data: esAdmin, error } = await supabase.rpc("es_admin");
  if (error || esAdmin !== true) {
    mostrarVista("sin-acceso");
    return;
  }
  await iniciarTablero();
}

supabase.auth.onAuthStateChange((_evento, sesion) => {
  window.setTimeout(() => void manejarSesion(sesion), 0);
});

formEntrar.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  prepararAudio();
  errorEntrar.hidden = true;
  const datos = new FormData(formEntrar);
  const boton = formEntrar.querySelector("button");
  if (boton) boton.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: String(datos.get("correo") ?? "").trim(),
    password: String(datos.get("contrasena") ?? ""),
  });
  if (boton) boton.disabled = false;
  if (error) {
    errorEntrar.textContent =
      error.status === 400 ? "Correo o contraseña incorrectos." : "No se pudo entrar. Revisa la conexión.";
    errorEntrar.hidden = false;
    return;
  }
  formEntrar.reset();
});

const salir = () => void supabase.auth.signOut();
buscar("#salir").addEventListener("click", salir);
buscar("#salir-sin-acceso").addEventListener("click", salir);

botonSonido.addEventListener("click", () => {
  prepararAudio();
  window.setTimeout(sonar, 50);
});
