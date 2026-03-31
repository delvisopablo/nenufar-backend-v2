import { INestApplication } from '@nestjs/common';
import { MetodoPago, PagoEstado } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import request from 'supertest';
import {
  createNegocio,
  createTestApp,
  registerAndLogin,
  resetDatabase,
  seedMinimo,
} from './helpers';

describe('Pedido -> Compra -> Pago E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function setupPedidoFlow() {
    const { categoria, subcategoria } = await seedMinimo(prisma);
    const { cookie, usuarioId } = await registerAndLogin(
      app,
      'pedido@example.com',
      'secreta123',
    );

    const negocio = await createNegocio(app, cookie, {
      nombre: 'Negocio Pedidos',
      fechaFundacion: '2020-01-01',
      categoriaId: categoria.id,
      subcategoriaId: subcategoria.id,
    });

    const productoResponse = await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/productos`)
      .set('Cookie', cookie)
      .send({
        nombre: 'Producto Test',
        descripcion: 'Producto para pedido',
        precio: 12.5,
      })
      .expect(201);

    const pedidoResponse = await request(app.getHttpServer())
      .post(`/negocios/${negocio.id}/pedidos`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/pedidos/${pedidoResponse.body.id}/items`)
      .send({
        productoId: productoResponse.body.id,
        cantidad: 2,
      })
      .expect(201);

    return {
      cookie,
      usuarioId,
      negocio,
      producto: productoResponse.body,
      pedido: pedidoResponse.body,
      total: 25,
    };
  }

  it('POST /pedidos crea pedido con productos', async () => {
    const { pedido, producto, negocio } = await setupPedidoFlow();

    const response = await request(app.getHttpServer())
      .get(`/pedidos/${pedido.id}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: pedido.id,
        negocioId: negocio.id,
      }),
    );
    expect(response.body.pedidoProductos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productoId: producto.id,
          cantidad: 2,
        }),
      ]),
    );
  });

  it('POST /compras asocia compra al pedido y al usuario', async () => {
    const { pedido, negocio, cookie, usuarioId } = await setupPedidoFlow();

    const response = await request(app.getHttpServer())
      .post(`/pedidos/${pedido.id}/compras`)
      .set('Cookie', cookie)
      .send({})
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        pedidoId: pedido.id,
        negocioId: negocio.id,
        usuarioId,
        estado: 'PENDIENTE',
      }),
    );
  });

  it('POST /pagos registra pago y cambia estado de la compra a COMPLETADA', async () => {
    const { pedido, cookie, usuarioId, total } = await setupPedidoFlow();

    const compraResponse = await request(app.getHttpServer())
      .post(`/pedidos/${pedido.id}/compras`)
      .set('Cookie', cookie)
      .send({})
      .expect(201);

    const pagoResponse = await request(app.getHttpServer())
      .post(`/compras/${compraResponse.body.id}/pagos`)
      .send({
        metodoPago: MetodoPago.TARJETA,
        cantidad: total,
        estado: PagoEstado.PAGADO,
      })
      .expect(201);

    expect(pagoResponse.body).toEqual(
      expect.objectContaining({
        compraId: compraResponse.body.id,
        usuarioId,
        cantidad: total,
        estado: 'PAGADO',
      }),
    );

    const compraState = await request(app.getHttpServer())
      .get(`/compras/${compraResponse.body.id}`)
      .expect(200);

    expect(compraState.body).toEqual(
      expect.objectContaining({
        id: compraResponse.body.id,
        estado: 'COMPLETADA',
      }),
    );
  });

  it('GET /pedidos/:id devuelve el pedido con sus productos y su compra', async () => {
    const { pedido, cookie, total } = await setupPedidoFlow();

    const compraResponse = await request(app.getHttpServer())
      .post(`/pedidos/${pedido.id}/compras`)
      .set('Cookie', cookie)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/compras/${compraResponse.body.id}/pagos`)
      .send({
        metodoPago: MetodoPago.TARJETA,
        cantidad: total,
        estado: PagoEstado.PAGADO,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/pedidos/${pedido.id}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: pedido.id,
      }),
    );
    expect(response.body.pedidoProductos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cantidad: 2,
          producto: expect.objectContaining({
            nombre: 'Producto Test',
          }),
        }),
      ]),
    );
    expect(response.body.compras).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: compraResponse.body.id,
          estado: 'COMPLETADA',
        }),
      ]),
    );
  });
});
