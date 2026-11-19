const mensajes: Record<string, string> = {
  nombre_invalido: "Escribe tu nombre, de 2 a 60 letras.",
  telefono_invalido: "El teléfono debe tener 10 dígitos.",
  articulos_invalidos: "Algo no cuadra en tu pedido. Recarga la página e inténtalo de nuevo.",
  cerrado_hoy: "Hoy no abrimos, así que no podemos recibir pedidos.",
  hora_fuera_de_horario: "Esa hora ya no está disponible. Elige otra.",
  hora_muy_pronto: "Necesitamos al menos 15 minutos para prepararlo. Elige una hora más tarde.",
  demasiados_pedidos: "Ya tienes 3 pedidos pendientes hoy con este teléfono. Si necesitas algo más, llámanos.",
  saturado: "Estamos recibiendo muchos pedidos. Intenta en unos minutos o escríbenos por WhatsApp.",
  producto_no_disponible: "Uno de tus productos se acaba de agotar. Ya actualizamos tu pedido; revísalo.",
  opcion_invalida: "Una de las opciones que elegiste ya no está disponible. Revisa tu pedido.",
  falta_opcion: "A uno de tus productos le falta elegir una opción.",
  sin_conexion: "No hay conexión. Revisa tu internet e inténtalo otra vez.",
};

export function mensajeDeError(codigo: string): string {
  return mensajes[codigo] ?? "No pudimos enviar tu pedido. Inténtalo otra vez en un momento.";
}
