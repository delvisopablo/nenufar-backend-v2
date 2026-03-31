/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  PrismaClient,
  PedidoEstado,
  CompraEstado,
  PagoEstado,
  MetodoPago,
  LikeTipo,
  LogroTipo,
  Dificultad,
  PostTipo,
  RolNegocio,
} from '@prisma/client';
const prisma = new PrismaClient();

// Helper: upsert “a mano” por nombre (no es unique en Negocio)
async function upsertNegocioByNombre({ nombre, dataCreate, dataUpdate = {} }) {
  const existing = await prisma.negocio.findFirst({ where: { nombre } });
  if (existing) {
    if (Object.keys(dataUpdate).length === 0) return existing;
    return prisma.negocio.update({
      where: { id: existing.id },
      data: dataUpdate,
    });
  }
  return prisma.negocio.create({ data: dataCreate });
}

async function main() {
  // ----- Usuarios (idempotente por email) -----
  const pablo = await prisma.usuario.upsert({
    where: { email: 'pablo@example.com' },
    update: {},
    create: {
      nombre: 'Pablo',
      nickname: 'topo',
      email: 'pablo@example.com',
      password: '123456',
    },
  });
  const maria = await prisma.usuario.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      nombre: 'María',
      nickname: 'mlopez',
      email: 'maria@example.com',
      password: '123456',
    },
  });
  const pedro = await prisma.usuario.upsert({
    where: { email: 'pedro@example.com' },
    update: {},
    create: {
      nombre: 'Pedro',
      nickname: 'pedro',
      email: 'pedro@example.com',
      password: '123456',
    },
  });

  // ----- Categorías + Subcategorías (idempotente por nombre) -----
  const cats = [
    { nombre: 'Restauración', subs: ['Bar de tapas', 'Cafetería', 'Pizzería'] },
    { nombre: 'Tecnología', subs: ['Informática', 'Reparación de móviles'] },
    { nombre: 'Salud', subs: ['Clínica dental', 'Óptica'] },
  ];
  const catByName = {};
  for (const c of cats) {
    const cat = await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: { nombre: c.nombre },
    });
    catByName[c.nombre] = cat.id;
    for (const s of c.subs) {
      await prisma.subcategoria.upsert({
        where: {
          categoriaId_nombre: {
            categoriaId: cat.id,
            nombre: s,
          },
        },
        update: { categoriaId: cat.id },
        create: { nombre: s, categoriaId: cat.id },
      });
    }
  }

  const subBar = await prisma.subcategoria.findUnique({
    where: {
      categoriaId_nombre: {
        categoriaId: catByName['Restauración'],
        nombre: 'Bar de tapas',
      },
    },
  });
  const subCafe = await prisma.subcategoria.findUnique({
    where: {
      categoriaId_nombre: {
        categoriaId: catByName['Restauración'],
        nombre: 'Cafetería',
      },
    },
  });
  const subRep = await prisma.subcategoria.findUnique({
    where: {
      categoriaId_nombre: {
        categoriaId: catByName['Tecnología'],
        nombre: 'Reparación de móviles',
      },
    },
  });

  // ----- Negocios (helper por nombre, porque nombre NO es unique) -----
  const bar = await upsertNegocioByNombre({
    nombre: 'Bar Nenúfar',
    dataUpdate: { direccion: 'C/ Mayor 1' },
    dataCreate: {
      nombre: 'Bar Nenúfar',
      historia: 'Bar clásico del barrio',
      fechaFundacion: new Date('2010-01-01'),
      direccion: 'C/ Mayor 1',
      categoriaId: catByName['Restauración'],
      subcategoriaId: subBar?.id ?? null,
      duenoId: pablo.id,
      intervaloReserva: 30,
    },
  });

  const cafe = await upsertNegocioByNombre({
    nombre: 'Café Nenúfar',
    dataUpdate: { direccion: 'Plaza Central 3' },
    dataCreate: {
      nombre: 'Café Nenúfar',
      historia: 'Café de especialidad',
      fechaFundacion: new Date('2018-05-10'),
      direccion: 'Plaza Central 3',
      categoriaId: catByName['Restauración'],
      subcategoriaId: subCafe?.id ?? null,
      duenoId: pablo.id,
      intervaloReserva: 30,
    },
  });

  for (const negocio of [bar, cafe]) {
    await prisma.negocioMiembro.upsert({
      where: {
        negocioId_usuarioId: {
          negocioId: negocio.id,
          usuarioId: pablo.id,
        },
      },
      update: { rol: RolNegocio.DUENO },
      create: {
        negocioId: negocio.id,
        usuarioId: pablo.id,
        rol: RolNegocio.DUENO,
      },
    });
  }

  // ----- Productos (idempotente por (negocioId, nombre) a nuestra manera) -----
  async function ensureProducto(negocioId, nombre, precio, descripcion) {
    const existing = await prisma.producto.findFirst({
      where: { negocioId, nombre },
    });
    if (existing) return existing;
    return prisma.producto.create({
      data: { negocioId, nombre, precio, descripcion },
    });
  }

  // const bravas = await ensureProducto(bar.id, 'Ración de bravas', 5.0, 'Patatas bravas con salsa especial');
  // const torti = await ensureProducto(bar.id, 'Tortilla pincho', 3.2, 'Pincho de tortilla casera');
  // const latte = await ensureProducto(cafe.id, 'Café latte', 2.1, 'Café con leche cremoso');
  // await ensureProducto(cafe.id, 'Capuccino', 2.4, 'Capuccino con espuma de leche');
  // await ensureProducto(repair.id, 'Cambio de pantalla', 79, 'Reemplazo de pantalla para móviles');
  // await ensureProducto(repair.id, 'Batería nueva', 39, 'Instalación de batería nueva');

  // ----- Promoción (idempotente: busca por titulo+negocio) -----
  // async function ensurePromo(negocioId, titulo, dataCreate) {
  //   const existing = await prisma.promocion.findFirst({
  //     where: { negocioId, titulo },
  //   });
  //   if (existing) return existing;
  //   return prisma.promocion.create({
  //     data: { negocioId, titulo, ...dataCreate },
  //   });
  // }

  // if (bravas) {
  //   await ensurePromo(bar.id, '2x1 Bravas', {
  //     descripcion: 'Martes tarde',
  //     descuento: 50,
  //     fechaCaducidad: new Date('2030-12-31'),
  //     productoId: bravas.id,
  //   });
  // }

  // ----- Reseñas + Post (one-of) -----
  async function reseñaConPost(usuarioId, negocioId, contenido, puntuacion) {
    return prisma.$transaction(async (tx) => {
      const r = await tx.resena.create({
        data: { usuarioId, negocioId, contenido, puntuacion },
      });
      await tx.post.create({
        data: {
          usuarioId,
          tipo: PostTipo.RESENA,
          negocioId,
          resenaId: r.id,
        },
      });
      return r;
    });
  }

  if ((await prisma.resena.count()) === 0) {
    await reseñaConPost(maria.id, bar.id, 'Bravas top y gente maja', 5);
    await reseñaConPost(pedro.id, bar.id, 'Tortilla jugosa, local petado', 4);
    await reseñaConPost(maria.id, cafe.id, 'Café de 10, volveré', 5);
  }

  // ----- Comentarios / Likes tolerantes a duplicados -----
  const posts = await prisma.post.findMany({
    where: { resenaId: { not: null } },
  });
  for (const p of posts) {
    await prisma.comentario
      .create({
        data: {
          postId: p.id,
          usuarioId: pedro.id,
          contenido: 'Totalmente de acuerdo 👌',
        },
      })
      .catch(() => {});
    await prisma.like
      .create({
        data: { postId: p.id, usuarioId: pedro.id, tipo: LikeTipo.LIKE },
      })
      .catch(() => {});
    await prisma.like
      .create({
        data: { postId: p.id, usuarioId: maria.id, tipo: LikeTipo.LIKE },
      })
      .catch(() => {});
  }

  // ----- Reserva mínima -----
  if ((await prisma.reserva.count()) === 0) {
    await prisma.reserva.create({
      data: {
        usuarioId: maria.id,
        negocioId: bar.id,
        fecha: new Date(Date.now() + 24 * 60 * 60 * 1000),
        nota: 'Mesa alta si puede ser',
      },
    });
  }

  // ----- Pedido/Compra/Pago (demostración) -----
  // if ((await prisma.pedido.count()) === 0 && bravas) {
  //   const pedido = await prisma.pedido.create({
  //     data: { negocioId: bar.id, estado: PedidoEstado.PENDIENTE },
  //   });
  //   if (torti) {
  //     await prisma.pedidoProducto.createMany({
  //       data: [
  //         {
  //           pedidoId: pedido.id,
  //           productoId: bravas.id,
  //           cantidad: 2,
  //           precioUnitario: 5.0,
  //         },
  //         {
  //           pedidoId: pedido.id,
  //           productoId: torti.id,
  //           cantidad: 1,
  //           precioUnitario: 3.2,
  //         },
  //       ],
  //       skipDuplicates: true,
  //     });
  //   }
  //   const total = 2 * 5.0 + 3.2;
  //   const compra = await prisma.compra.create({
  //     data: {
  //       pedidoId: pedido.id,
  //       usuarioId: maria.id,
  //       negocioId: bar.id,
  //       total,
  //       estado: CompraEstado.PENDIENTE,
  //     },
  //   });
  //   await prisma.pago.create({
  //     data: {
  //       compraId: compra.id,
  //       usuarioId: maria.id,
  //       metodoPago: MetodoPago.TARJETA,
  //       estado: PagoEstado.PAGADO,
  //       cantidad: total,
  //     },
  //   });
  // }

  // ----- Logros base -----
  if ((await prisma.logro.count()) === 0) {
    await prisma.logro.createMany({
      data: [
        {
          titulo: 'Primera reseña',
          descripcion: 'Publica tu primera reseña',
          tipo: LogroTipo.RESENA,
          dificultad: Dificultad.FACIL,
          umbral: 1,
          recompensaPuntos: 10,
        },
        {
          titulo: 'Fan del bar',
          descripcion: '5 reseñas en Restauración',
          tipo: LogroTipo.RESENA,
          dificultad: Dificultad.MEDIA,
          umbral: 5,
          recompensaPuntos: 30,
        },
        {
          titulo: 'Primera compra',
          descripcion: 'Completa tu primera compra',
          tipo: LogroTipo.COMPRA,
          dificultad: Dificultad.FACIL,
          umbral: 1,
          recompensaPuntos: 15,
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('✅ Seed idempotente OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
