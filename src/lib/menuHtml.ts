import { opcionesDisponibles, type Categoria, type GrupoOpciones, type Producto } from "./catalogo";
import { escapar, pesos } from "./formato";

function textoExtra(grupo: GrupoOpciones): string | null {
  const opciones = opcionesDisponibles(grupo);
  if (grupo.obligatorio || opciones.length === 0) return null;
  const precios = new Set(opciones.map((o) => o.precio));
  if (precios.size === 1) {
    const nombres = opciones.map((o) => o.nombre.toLowerCase());
    const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} o ${nombres.at(-1)}` : nombres[0];
    return `${grupo.nombre}: ${lista} +${pesos(opciones[0].precio)}`;
  }
  return `${grupo.nombre}: ${opciones.map((o) => `${o.nombre.toLowerCase()} +${pesos(o.precio)}`).join(", ")}`;
}

function htmlProducto(producto: Producto): string {
  const extras = producto.grupos
    .map(textoExtra)
    .filter((texto): texto is string => texto !== null)
    .map((texto) => `<span class="extra">${escapar(texto)}</span>`)
    .join("");
  const precio = producto.disponible
    ? `<span class="precio">${pesos(producto.precio)}</span>`
    : `<span class="sello">Agotado hoy</span>`;
  return `<li${producto.disponible ? "" : ' class="agotado"'}>
    <div class="linea">
      <span class="nombre">${escapar(producto.nombre)}</span>
      <span class="puntos" aria-hidden="true"></span>
      ${precio}
    </div>
    ${producto.detalle ? `<span class="detalle">${escapar(producto.detalle)}</span>` : ""}
    ${extras}
  </li>`;
}

export function htmlCategoria(categoria: Categoria): string {
  return `<h3>${escapar(categoria.nombre)}</h3><ul>${categoria.productos.map(htmlProducto).join("")}</ul>`;
}

export function htmlColumnas(categorias: Categoria[]) {
  const [primera, ...resto] = categorias;
  return {
    principal: primera ? htmlCategoria(primera) : "",
    resto: resto.map((c) => `<div class="bloque">${htmlCategoria(c)}</div>`).join(""),
  };
}
