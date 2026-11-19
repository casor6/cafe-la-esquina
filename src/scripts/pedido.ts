import { buscar, h } from "../lib/dom";
import { horaDeFecha, pesos } from "../lib/formato";
import { llamarFuncion } from "../lib/supabase";

type Estado = "recibido" | "preparando" | "listo" | "entregado";

interface Pedido {
  id: string;
  folio: number;
  nombre: string;
  recoger_a: string;
  estado: Estado;
  total: number;
  articulos: { nombre: string; opciones: string[]; cantidad: number; precio_unitario: number }[];
}

const pasos: { estado: Estado; titulo: string; mensaje: string }[] = [
  {
    estado: "recibido",
    titulo: "Recibido",
    mensaje: "Tu pedido ya llegó a la barra. Aquí verás cuando lo empecemos a preparar.",
  },
  { estado: "preparando", titulo: "Preparando", mensaje: "Lo estamos preparando." },
  {
    estado: "listo",
    titulo: "Listo",
    mensaje: "Ya está listo. Pasa a la barra y da tu nombre o el número de pedido.",
  },
  { estado: "entregado", titulo: "Entregado", mensaje: "Ya lo recogiste. Gracias por venir." },
];

const contenedor = buscar("#estado-pedido");
const pagina = buscar(".pagina-pedido");
const id = new URLSearchParams(location.search).get("id") ?? "";
const formatoId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let temporizador: number | undefined;

function noEncontrado() {
  contenedor.replaceChildren(
    h(
      "div",
      { class: "falla" },
      h("h1", {}, "No encontramos ese pedido"),
      h(
        "p",
        { class: "resumen" },
        "Revisa que el enlace esté completo. Si hiciste un pedido y no aparece, llámanos al ",
        h("a", { href: `tel:${pagina.dataset.tel}` }, pagina.dataset.telefono ?? ""),
        ".",
      ),
    ),
  );
}

function render(pedido: Pedido) {
  const indice = pasos.findIndex((p) => p.estado === pedido.estado);
  const paso = pasos[indice];
  contenedor.replaceChildren(
    h(
      "div",
      {},
      h("p", { class: "etiqueta" }, "Pedido para recoger"),
    h("h1", {}, `Pedido #${pedido.folio}`),
    h(
      "p",
      { class: "resumen" },
      "A nombre de ",
      h("strong", {}, pedido.nombre),
      " · Pasas a las ",
      h("strong", {}, horaDeFecha(pedido.recoger_a)),
    ),
    h(
      "ol",
      { class: "pasos", "aria-label": "Avance del pedido" },
      pasos.map((p, i) =>
        h(
          "li",
          {
            class: i < indice ? "paso hecho" : i === indice ? "paso actual" : "paso",
            "aria-current": i === indice ? "step" : undefined,
          },
          p.titulo,
        ),
      ),
    ),
    h("p", { class: pedido.estado === "listo" ? "mensaje listo" : "mensaje" }, paso.mensaje),
    pedido.estado === "entregado"
      ? null
      : h("p", { class: "actualiza" }, "Esta página se actualiza sola; puedes dejarla abierta."),
    h(
      "div",
      { class: "comanda" },
      h(
        "ul",
        {},
        pedido.articulos.map((a) =>
          h(
            "li",
            {},
            h(
              "span",
              {},
              `${a.cantidad} × ${a.nombre}`,
              a.opciones.length ? h("small", {}, a.opciones.join(", ")) : null,
            ),
            h("span", {}, pesos(Number(a.precio_unitario) * a.cantidad)),
          ),
        ),
      ),
      h("div", { class: "total" }, h("span", {}, "Total"), h("span", {}, pesos(Number(pedido.total)))),
      h("p", { class: "pago" }, "Pagas en caja al recoger."),
    ),
    ),
  );
  document.title = `Pedido #${pedido.folio}: ${paso.titulo} · Café La Esquina`;
}

async function actualizar() {
  window.clearTimeout(temporizador);
  try {
    const pedido = await llamarFuncion<Pedido | null>("consultar_pedido", { p_id: id });
    if (!pedido) return noEncontrado();
    render(pedido);
    if (pedido.estado !== "entregado") temporizador = window.setTimeout(actualizar, 20_000);
  } catch {
    if (!contenedor.querySelector("h1")) {
      contenedor.replaceChildren(h("p", { class: "falla" }, "No pudimos consultar tu pedido. Reintentando…"));
    }
    temporizador = window.setTimeout(actualizar, 20_000);
  }
}

if (formatoId.test(id)) {
  void actualizar();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void actualizar();
  });
} else {
  noEncontrado();
}
