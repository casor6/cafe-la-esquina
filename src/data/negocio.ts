export interface Platillo {
  nombre: string;
  detalle: string;
  precio: number;
}

export interface SeccionMenu {
  titulo: string;
  platillos: Platillo[];
}

export interface Turno {
  abre: string;
  cierra: string;
}

export interface FilaHorario {
  dias: string;
  indices: number[];
  turno: Turno;
}

const telefono = "5500000000";
const mensaje = "Hola, quiero hacer un pedido en Café La Esquina.";

export const negocio = {
  nombre: "Café La Esquina",
  telefonoVisible: "55 0000 0000",
  telefonoTel: `+52${telefono}`,
  whatsapp: `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`,
  instagram: "@cafelaesquina.roma",
  direccion: {
    calle: "Colima esq. Córdoba",
    colonia: "Roma Norte, Cuauhtémoc",
    ciudad: "Ciudad de México",
    cp: "06700",
    referencia: "La esquina del toldo rayado, frente a la papelería.",
    mapa: "https://www.google.com/maps/search/?api=1&query=Colima+y+C%C3%B3rdoba,+Roma+Norte,+CDMX",
  },
  zonaHoraria: "America/Mexico_City",
};

export const horario: FilaHorario[] = [
  { dias: "Lunes a viernes", indices: [1, 2, 3, 4, 5], turno: { abre: "07:00", cierra: "20:00" } },
  { dias: "Sábado", indices: [6], turno: { abre: "08:00", cierra: "20:00" } },
  { dias: "Domingo", indices: [0], turno: { abre: "08:00", cierra: "15:00" } },
];

export const menu: SeccionMenu[] = [
  {
    titulo: "Café",
    platillos: [
      { nombre: "Americano", detalle: "Pluma Hidalgo, Oaxaca", precio: 45 },
      { nombre: "Espresso", detalle: "Doble, mezcla de la casa", precio: 40 },
      { nombre: "Cortado", detalle: "Mitad espresso, mitad leche", precio: 50 },
      { nombre: "Capuchino", detalle: "Coatepec, Veracruz", precio: 58 },
      { nombre: "Café de olla", detalle: "Canela y piloncillo", precio: 48 },
      { nombre: "Cold brew", detalle: "Reposado 18 horas", precio: 62 },
    ],
  },
  {
    titulo: "Para acompañar",
    platillos: [
      { nombre: "Concha de nata", detalle: "De la panadería de al lado", precio: 35 },
      { nombre: "Pan de elote", detalle: "Rebanada gruesa, tibia", precio: 42 },
      { nombre: "Molletes", detalle: "Frijol, queso y pico de gallo", precio: 85 },
      { nombre: "Chilaquiles verdes", detalle: "Con huevo o pollo", precio: 110 },
    ],
  },
];

export const extraLeche = 10;
