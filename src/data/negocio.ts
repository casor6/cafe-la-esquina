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
