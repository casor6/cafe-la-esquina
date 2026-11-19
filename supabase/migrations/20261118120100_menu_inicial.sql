insert into public.categorias (nombre, orden) values
  ('Café', 1),
  ('Para acompañar', 2);

insert into public.productos (categoria_id, nombre, detalle, precio, orden)
select c.id, p.nombre, p.detalle, p.precio, p.orden
from (values
  ('Café', 'Americano', 'Pluma Hidalgo, Oaxaca', 48, 1),
  ('Café', 'Espresso', 'Doble, mezcla de la casa', 40, 2),
  ('Café', 'Cortado', 'Mitad espresso, mitad leche', 50, 3),
  ('Café', 'Capuchino', 'Coatepec, Veracruz', 58, 4),
  ('Café', 'Café de olla', 'Canela y piloncillo', 48, 5),
  ('Café', 'Cold brew', 'Reposado 18 horas', 62, 6),
  ('Para acompañar', 'Concha de nata', 'De la panadería de al lado', 35, 1),
  ('Para acompañar', 'Pan de elote', 'Rebanada gruesa, tibia', 42, 2),
  ('Para acompañar', 'Molletes', 'Frijol, queso y pico de gallo', 85, 3),
  ('Para acompañar', 'Chilaquiles verdes', 'Con huevo o pollo', 110, 4)
) as p (categoria, nombre, detalle, precio, orden)
join public.categorias c on c.nombre = p.categoria;

insert into public.grupos_opciones (nombre, obligatorio) values
  ('Leche vegetal', false),
  ('Acompañados con', true);

insert into public.opciones (grupo_id, nombre, precio, orden)
select g.id, o.nombre, o.precio, o.orden
from (values
  ('Leche vegetal', 'Avena', 10, 1),
  ('Leche vegetal', 'Almendra', 10, 2),
  ('Acompañados con', 'Huevo', 0, 1),
  ('Acompañados con', 'Pollo', 0, 2)
) as o (grupo, nombre, precio, orden)
join public.grupos_opciones g on g.nombre = o.grupo;

insert into public.producto_grupos (producto_id, grupo_id)
select p.id, g.id
from (values
  ('Cortado', 'Leche vegetal'),
  ('Capuchino', 'Leche vegetal'),
  ('Chilaquiles verdes', 'Acompañados con')
) as r (producto, grupo)
join public.productos p on p.nombre = r.producto
join public.grupos_opciones g on g.nombre = r.grupo;

insert into public.horarios (dia, abre, cierra) values
  (0, '08:00', '15:00'),
  (1, '07:00', '20:00'),
  (2, '07:00', '20:00'),
  (3, '07:00', '20:00'),
  (4, '07:00', '20:00'),
  (5, '07:00', '20:00'),
  (6, '08:00', '20:00');
