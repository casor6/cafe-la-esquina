import { ErrorDeNegocio } from '../common/error-de-negocio.js';
import { calcularPedido, ProductoCatalogo } from './calculo.js';

const leche = {
  nombre: 'Leche',
  obligatorio: false,
  opciones: [
    { id: 1, nombre: 'Entera', precioExtraCentavos: 0, porDefecto: true },
    { id: 2, nombre: 'Avena', precioExtraCentavos: 1000, porDefecto: false },
  ],
};

const proteina = {
  nombre: 'Proteína',
  obligatorio: true,
  opciones: [
    { id: 3, nombre: 'Huevo', precioExtraCentavos: 0, porDefecto: false },
    { id: 4, nombre: 'Pollo', precioExtraCentavos: 0, porDefecto: false },
  ],
};

const catalogo = new Map<number, ProductoCatalogo>([
  [10, { id: 10, nombre: 'Americano', precioCentavos: 4800, grupo: null }],
  [11, { id: 11, nombre: 'Capuchino', precioCentavos: 5800, grupo: leche }],
  [12, { id: 12, nombre: 'Chilaquiles verdes', precioCentavos: 11000, grupo: proteina }],
]);

describe('calcularPedido', () => {
  it('suma precios de catálogo con el extra de leche vegetal', () => {
    const r = calcularPedido(
      [
        { productoId: 11, cantidad: 2, opcionId: 2 },
        { productoId: 10, cantidad: 1 },
      ],
      catalogo,
    );
    expect(r.totalCentavos).toBe((5800 + 1000) * 2 + 4800);
    expect(r.lineas[0]).toMatchObject({ nombreOpcion: 'Avena', precioOpcionCentavos: 1000, subtotalCentavos: 13600 });
  });

  it('pone leche entera sin costo cuando no se elige', () => {
    const r = calcularPedido([{ productoId: 11, cantidad: 1 }], catalogo);
    expect(r.lineas[0]).toMatchObject({ nombreOpcion: 'Entera', subtotalCentavos: 5800 });
  });

  it('exige proteína en los chilaquiles', () => {
    expect(() => calcularPedido([{ productoId: 12, cantidad: 1 }], catalogo)).toThrow(ErrorDeNegocio);
    const r = calcularPedido([{ productoId: 12, cantidad: 1, opcionId: 4 }], catalogo);
    expect(r.lineas[0]).toMatchObject({ nombreOpcion: 'Pollo', subtotalCentavos: 11000 });
  });

  it('rechaza opciones de otro grupo o en productos sin opciones', () => {
    expect(() => calcularPedido([{ productoId: 12, cantidad: 1, opcionId: 2 }], catalogo)).toThrow(
      'Esa opción no está disponible',
    );
    expect(() => calcularPedido([{ productoId: 10, cantidad: 1, opcionId: 2 }], catalogo)).toThrow(
      'no lleva opciones',
    );
  });

  it('rechaza productos que no existen o están inactivos', () => {
    expect(() => calcularPedido([{ productoId: 99, cantidad: 1 }], catalogo)).toThrow('ya no está disponible');
  });

  it('limita el número total de piezas', () => {
    const items = Array.from({ length: 4 }, () => ({ productoId: 10, cantidad: 10 }));
    expect(() => calcularPedido(items, catalogo)).toThrow('máximo');
  });
});
