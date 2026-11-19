type Hijo = Node | string | number | null | undefined | false;
type Atributo = string | number | boolean | undefined | ((evento: Event) => void);

export function h<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  atributos: Record<string, Atributo> = {},
  ...hijos: (Hijo | Hijo[])[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    if (typeof valor === "function") elemento.addEventListener(nombre.slice(2), valor);
    else elemento.setAttribute(nombre, valor === true ? "" : String(valor));
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    elemento.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return elemento;
}

export function icono(nombre: string): Node {
  const plantilla = document.querySelector<HTMLTemplateElement>(`template[data-icono="${nombre}"]`);
  const svg = plantilla?.content.firstElementChild;
  return svg ? svg.cloneNode(true) : document.createTextNode("");
}

export function buscar<T extends HTMLElement = HTMLElement>(selector: string): T {
  const elemento = document.querySelector<T>(selector);
  if (!elemento) throw new Error(`Falta ${selector}`);
  return elemento;
}
