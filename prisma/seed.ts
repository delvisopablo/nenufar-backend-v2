import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Nenufar123!';

function dateDaysFromNow(days: number, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateDaysAgo(days: number, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

async function limpiarBaseDeDatos() {
  console.log('Limpiando base de datos...');

  await prisma.like.deleteMany();
  await prisma.comentario.deleteMany();
  await prisma.post.deleteMany();

  await prisma.logroUsuario.deleteMany();
  await prisma.petaloTx.deleteMany();
  await prisma.usuarioSeguimiento.deleteMany();
  await prisma.visitaNegocio.deleteMany();

  await prisma.pago.deleteMany();
  await prisma.compra.deleteMany();
  await prisma.pedidoProducto.deleteMany();
  await prisma.pedido.deleteMany();

  await prisma.reserva.deleteMany();
  await prisma.recursoReserva.deleteMany();

  await prisma.negocioMiembro.deleteMany();

  await prisma.promocion.deleteMany();
  await prisma.resena.deleteMany();
  await prisma.logro.deleteMany();
  await prisma.producto.deleteMany();

  await prisma.negocio.deleteMany();
  await prisma.subcategoria.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.usuario.deleteMany();

  console.log('Base de datos limpia.');
}

async function main() {
  await limpiarBaseDeDatos();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('Creando usuarios...');

  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Pablo Admin',
      nickname: 'pablo_admin',
      email: 'pablo@minenufar.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=12',
      biografia: 'Administrador de Nenúfar. Probando que todo vaya fino.',
      emailVerificado: true,
      verificadoEn: new Date(),
      ultimoLoginEn: dateDaysAgo(1),
      welcomeEmailSentAt: dateDaysAgo(20),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'ADMIN',
    },
  });

  const usuario1 = await prisma.usuario.create({
    data: {
      nombre: 'Lucía Martín',
      nickname: 'lucia_m',
      email: 'lucia@test.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=32',
      biografia:
        'Me encanta descubrir sitios con encanto, cafeterías bonitas y planes tranquilos.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(30),
      ultimoLoginEn: dateDaysAgo(1),
      welcomeEmailSentAt: dateDaysAgo(30),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const usuario2 = await prisma.usuario.create({
    data: {
      nombre: 'Mario Sánchez',
      nickname: 'mario_s',
      email: 'mario@test.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=15',
      biografia: 'Cervecitas, tapeo y buenos sitios locales.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(25),
      ultimoLoginEn: dateDaysAgo(2),
      welcomeEmailSentAt: dateDaysAgo(25),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const usuario3 = await prisma.usuario.create({
    data: {
      nombre: 'Claudia Gómez',
      nickname: 'claudia_g',
      email: 'claudia@test.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=44',
      biografia:
        'Fan de los negocios pequeños, las tiendas bonitas y los cafés largos.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(18),
      ultimoLoginEn: dateDaysAgo(3),
      welcomeEmailSentAt: dateDaysAgo(18),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const usuario4 = await prisma.usuario.create({
    data: {
      nombre: 'Álvaro Ruiz',
      nickname: 'alvaro_r',
      email: 'alvaro@test.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=21',
      biografia: 'Siempre buscando promociones y sitios nuevos.',
      emailVerificado: false,
      estadoCuenta: 'PENDIENTE_VERIFICACION',
      rolGlobal: 'USUARIO',
    },
  });

  const duenaCafe = await prisma.usuario.create({
    data: {
      nombre: 'Carmen López',
      nickname: 'carmen_cafe',
      email: 'carmen@negocio.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=47',
      biografia: 'Dueña de una cafetería local con mucho mimo.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(100),
      ultimoLoginEn: dateDaysAgo(1),
      welcomeEmailSentAt: dateDaysAgo(100),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const duenoBar = await prisma.usuario.create({
    data: {
      nombre: 'Jorge Pérez',
      nickname: 'jorge_bar',
      email: 'jorge@negocio.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=8',
      biografia: 'Hostelero de toda la vida, ahora digitalizando el negocio.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(80),
      ultimoLoginEn: dateDaysAgo(1),
      welcomeEmailSentAt: dateDaysAgo(80),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const duenaTienda = await prisma.usuario.create({
    data: {
      nombre: 'Inés Romero',
      nickname: 'ines_shop',
      email: 'ines@negocio.com',
      password: passwordHash,
      foto: 'https://i.pravatar.cc/300?img=49',
      biografia: 'Pequeño comercio, producto bonito y atención cercana.',
      emailVerificado: true,
      verificadoEn: dateDaysAgo(60),
      ultimoLoginEn: dateDaysAgo(2),
      welcomeEmailSentAt: dateDaysAgo(60),
      estadoCuenta: 'ACTIVA',
      rolGlobal: 'USUARIO',
    },
  });

  const usuarios = [
    admin,
    usuario1,
    usuario2,
    usuario3,
    usuario4,
    duenaCafe,
    duenoBar,
    duenaTienda,
  ];

  console.log('Creando categorías y subcategorías...');

  const categoriaHosteleria = await prisma.categoria.create({
    data: { nombre: 'Hostelería' },
  });

  const categoriaComercio = await prisma.categoria.create({
    data: { nombre: 'Comercio local' },
  });

  const categoriaBelleza = await prisma.categoria.create({
    data: { nombre: 'Belleza y bienestar' },
  });

  const categoriaOcio = await prisma.categoria.create({
    data: { nombre: 'Ocio y cultura' },
  });

  const subCafe = await prisma.subcategoria.create({
    data: {
      nombre: 'Cafetería',
      categoriaId: categoriaHosteleria.id,
    },
  });

  const subBarTapas = await prisma.subcategoria.create({
    data: {
      nombre: 'Bar de tapas',
      categoriaId: categoriaHosteleria.id,
    },
  });

  const subModa = await prisma.subcategoria.create({
    data: {
      nombre: 'Moda y accesorios',
      categoriaId: categoriaComercio.id,
    },
  });

  const subPeluqueria = await prisma.subcategoria.create({
    data: {
      nombre: 'Peluquería',
      categoriaId: categoriaBelleza.id,
    },
  });

  const subLibreria = await prisma.subcategoria.create({
    data: {
      nombre: 'Librería',
      categoriaId: categoriaOcio.id,
    },
  });

  console.log('Creando negocios...');

  const horarioComun = {
    lunes: { abierto: true, apertura: '09:00', cierre: '20:00' },
    martes: { abierto: true, apertura: '09:00', cierre: '20:00' },
    miercoles: { abierto: true, apertura: '09:00', cierre: '20:00' },
    jueves: { abierto: true, apertura: '09:00', cierre: '20:00' },
    viernes: { abierto: true, apertura: '09:00', cierre: '22:00' },
    sabado: { abierto: true, apertura: '10:00', cierre: '22:00' },
    domingo: { abierto: false, apertura: null, cierre: null },
  };

  const cafeRana = await prisma.negocio.create({
    data: {
      nombre: 'Café La Rana',
      historia:
        'Un café pequeño nacido para que la gente del barrio tenga un sitio tranquilo donde desayunar, estudiar o quedar con amigos.',
      descripcionCorta: 'Café de especialidad, tostadas y tartas caseras.',
      fechaFundacion: new Date('2019-03-12'),
      direccion: 'Calle Toro 18',
      ciudad: 'Salamanca',
      codigoPostal: '37002',
      provincia: 'Salamanca',
      latitud: decimal('40.965157'),
      longitud: decimal('-5.664018'),
      categoriaId: categoriaHosteleria.id,
      subcategoriaId: subCafe.id,
      duenoId: duenaCafe.id,
      fotoPerfil:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
      fotoPortada:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
      telefono: '923111222',
      emailContacto: 'hola@caf larana.com'.replace(' ', ''),
      web: 'https://caf larana.com'.replace(' ', ''),
      instagram: '@caf larana'.replace(' ', ''),
      verificado: true,
      activo: true,
      horario: horarioComun,
      intervaloReserva: 30,
    },
  });

  const barCharco = await prisma.negocio.create({
    data: {
      nombre: 'Bar El Charco',
      historia:
        'Bar de tapas de barrio con raciones generosas, cerveza fría y ambiente cercano.',
      descripcionCorta: 'Tapas, cañas y raciones para compartir.',
      fechaFundacion: new Date('2015-06-20'),
      direccion: 'Plaza Mayor 7',
      ciudad: 'Salamanca',
      codigoPostal: '37001',
      provincia: 'Salamanca',
      latitud: decimal('40.965598'),
      longitud: decimal('-5.663540'),
      categoriaId: categoriaHosteleria.id,
      subcategoriaId: subBarTapas.id,
      duenoId: duenoBar.id,
      fotoPerfil:
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b',
      fotoPortada: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      telefono: '923333444',
      emailContacto: 'reservas@barelcharco.com',
      instagram: '@barelcharco',
      verificado: true,
      activo: true,
      horario: {
        lunes: { abierto: false, apertura: null, cierre: null },
        martes: { abierto: true, apertura: '12:00', cierre: '00:00' },
        miercoles: { abierto: true, apertura: '12:00', cierre: '00:00' },
        jueves: { abierto: true, apertura: '12:00', cierre: '01:00' },
        viernes: { abierto: true, apertura: '12:00', cierre: '02:00' },
        sabado: { abierto: true, apertura: '12:00', cierre: '02:00' },
        domingo: { abierto: true, apertura: '12:00', cierre: '18:00' },
      },
      intervaloReserva: 60,
    },
  });

  const tiendaNenufar = await prisma.negocio.create({
    data: {
      nombre: 'La Tiendina Nenúfar',
      historia:
        'Tienda local de regalos, papelería creativa y productos de pequeños artesanos.',
      descripcionCorta: 'Regalos, papelería y accesorios con encanto.',
      fechaFundacion: new Date('2021-09-01'),
      direccion: 'Calle Zamora 24',
      ciudad: 'Salamanca',
      codigoPostal: '37002',
      provincia: 'Salamanca',
      latitud: decimal('40.967242'),
      longitud: decimal('-5.664390'),
      categoriaId: categoriaComercio.id,
      subcategoriaId: subModa.id,
      duenoId: duenaTienda.id,
      fotoPerfil:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8',
      fotoPortada:
        'https://images.unsplash.com/photo-1472851294608-062f824d29cc',
      telefono: '923555666',
      emailContacto: 'hola@latiendinanenufar.com',
      instagram: '@latiendinanenufar',
      verificado: false,
      activo: true,
      horario: horarioComun,
      intervaloReserva: 30,
    },
  });

  const peluRizo = await prisma.negocio.create({
    data: {
      nombre: 'Rizo & Brillo',
      historia:
        'Peluquería de barrio especializada en cortes rápidos, color y tratamientos sencillos.',
      descripcionCorta: 'Peluquería cercana para el día a día.',
      fechaFundacion: new Date('2018-01-15'),
      direccion: 'Avenida Portugal 45',
      ciudad: 'Salamanca',
      codigoPostal: '37005',
      provincia: 'Salamanca',
      latitud: decimal('40.972011'),
      longitud: decimal('-5.668700'),
      categoriaId: categoriaBelleza.id,
      subcategoriaId: subPeluqueria.id,
      duenoId: usuario2.id,
      fotoPerfil: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
      fotoPortada:
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
      telefono: '923777888',
      emailContacto: 'citas@rizobrillo.com',
      instagram: '@rizobrillo',
      verificado: true,
      activo: true,
      horario: {
        lunes: { abierto: true, apertura: '10:00', cierre: '19:00' },
        martes: { abierto: true, apertura: '10:00', cierre: '19:00' },
        miercoles: { abierto: true, apertura: '10:00', cierre: '19:00' },
        jueves: { abierto: true, apertura: '10:00', cierre: '19:00' },
        viernes: { abierto: true, apertura: '10:00', cierre: '20:00' },
        sabado: { abierto: true, apertura: '10:00', cierre: '14:00' },
        domingo: { abierto: false, apertura: null, cierre: null },
      },
      intervaloReserva: 45,
    },
  });

  const libreriaSapo = await prisma.negocio.create({
    data: {
      nombre: 'Librería El Sapo Lector',
      historia:
        'Una librería pequeña con recomendaciones personales, clubes de lectura y libros de segunda mano.',
      descripcionCorta: 'Libros, café y recomendaciones sin postureo.',
      fechaFundacion: new Date('2020-10-05'),
      direccion: 'Calle Libreros 10',
      ciudad: 'Salamanca',
      codigoPostal: '37008',
      provincia: 'Salamanca',
      latitud: decimal('40.961905'),
      longitud: decimal('-5.667290'),
      categoriaId: categoriaOcio.id,
      subcategoriaId: subLibreria.id,
      duenoId: usuario3.id,
      fotoPerfil:
        'https://images.unsplash.com/photo-1526243741027-444d633d7365',
      fotoPortada:
        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
      telefono: '923999000',
      emailContacto: 'hola@sapolector.com',
      instagram: '@sapolector',
      verificado: true,
      activo: true,
      horario: horarioComun,
      intervaloReserva: 30,
    },
  });

  const negocios = [cafeRana, barCharco, tiendaNenufar, peluRizo, libreriaSapo];

  console.log('Creando miembros de negocio...');

  await prisma.negocioMiembro.createMany({
    data: [
      {
        negocioId: cafeRana.id,
        usuarioId: duenaCafe.id,
        rol: 'DUENO',
      },
      {
        negocioId: barCharco.id,
        usuarioId: duenoBar.id,
        rol: 'DUENO',
      },
      {
        negocioId: tiendaNenufar.id,
        usuarioId: duenaTienda.id,
        rol: 'DUENO',
      },
      {
        negocioId: peluRizo.id,
        usuarioId: usuario2.id,
        rol: 'DUENO',
      },
      {
        negocioId: libreriaSapo.id,
        usuarioId: usuario3.id,
        rol: 'DUENO',
      },
      {
        negocioId: cafeRana.id,
        usuarioId: usuario1.id,
        rol: 'EMPLEADO',
      },
    ],
  });

  console.log('Creando productos...');

  const cafeProductos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Café latte',
        descripcion: 'Café con leche cremoso.',
        precio: decimal('2.40'),
        negocioId: cafeRana.id,
        codigoSKU: 'CAF-LATTE',
        stockDisponible: 80,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Tarta de zanahoria',
        descripcion: 'Porción de tarta casera.',
        precio: decimal('3.80'),
        negocioId: cafeRana.id,
        codigoSKU: 'CAF-TARTA-ZAN',
        stockDisponible: 18,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Tostada de aguacate',
        descripcion: 'Pan artesano con aguacate y tomate.',
        precio: decimal('4.50'),
        negocioId: cafeRana.id,
        codigoSKU: 'CAF-TOST-AGU',
        stockDisponible: 25,
      },
    }),
  ]);

  const barProductos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Caña',
        descripcion: 'Cerveza pequeña bien tirada.',
        precio: decimal('1.80'),
        negocioId: barCharco.id,
        codigoSKU: 'BAR-CANA',
        stockDisponible: 200,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Tapa de tortilla',
        descripcion: 'Tortilla jugosa de la casa.',
        precio: decimal('2.50'),
        negocioId: barCharco.id,
        codigoSKU: 'BAR-TORTILLA',
        stockDisponible: 40,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Ración de croquetas',
        descripcion: 'Croquetas caseras variadas.',
        precio: decimal('8.90'),
        negocioId: barCharco.id,
        codigoSKU: 'BAR-CROQ',
        stockDisponible: 35,
      },
    }),
  ]);

  const tiendaProductos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Cuaderno artesanal',
        descripcion: 'Cuaderno de tapa dura hecho a mano.',
        precio: decimal('9.95'),
        negocioId: tiendaNenufar.id,
        codigoSKU: 'SHOP-CUAD-ART',
        stockDisponible: 30,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Lámina decorativa',
        descripcion: 'Lámina ilustrada tamaño A4.',
        precio: decimal('12.00'),
        negocioId: tiendaNenufar.id,
        codigoSKU: 'SHOP-LAM-A4',
        stockDisponible: 20,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Bolsa tote',
        descripcion: 'Bolsa de tela con diseño local.',
        precio: decimal('14.50'),
        negocioId: tiendaNenufar.id,
        codigoSKU: 'SHOP-TOTE',
        stockDisponible: 15,
      },
    }),
  ]);

  const peluProductos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Corte básico',
        descripcion: 'Corte de pelo sencillo.',
        precio: decimal('14.00'),
        negocioId: peluRizo.id,
        codigoSKU: 'PEL-CORTE',
        stockDisponible: 999,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Lavado y peinado',
        descripcion: 'Lavado, secado y peinado.',
        precio: decimal('18.00'),
        negocioId: peluRizo.id,
        codigoSKU: 'PEL-PEINADO',
        stockDisponible: 999,
      },
    }),
  ]);

  const libreriaProductos = await Promise.all([
    prisma.producto.create({
      data: {
        nombre: 'Novela sorpresa',
        descripcion: 'Libro recomendado por el equipo.',
        precio: decimal('11.90'),
        negocioId: libreriaSapo.id,
        codigoSKU: 'LIB-NOV-SORP',
        stockDisponible: 22,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Club de lectura mensual',
        descripcion: 'Entrada para club de lectura.',
        precio: decimal('6.00'),
        negocioId: libreriaSapo.id,
        codigoSKU: 'LIB-CLUB',
        stockDisponible: 40,
      },
    }),
  ]);

  console.log('Creando promociones...');

  const promoCafe = await prisma.promocion.create({
    data: {
      titulo: 'Desayuno rana',
      descripcion: 'Café latte + tostada con descuento especial.',
      negocioId: cafeRana.id,
      tipoDescuento: 'PORCENTAJE',
      descuento: decimal('15.00'),
      fechaInicio: dateDaysAgo(5),
      fechaCaducidad: dateDaysFromNow(20),
      activa: true,
      estado: 'PUBLICADO',
      stockMaximo: 100,
      usosMaximos: 80,
      usosActuales: 14,
      codigo: 'RANA15',
      productoId: cafeProductos[0].id,
      pack: {
        connect: [{ id: cafeProductos[0].id }, { id: cafeProductos[2].id }],
      },
    },
  });

  const promoBar = await prisma.promocion.create({
    data: {
      titulo: '2x1 en cañas',
      descripcion: 'Dos cañas al precio de una de martes a jueves.',
      negocioId: barCharco.id,
      tipoDescuento: 'DOS_X_UNO',
      descuento: decimal('50.00'),
      fechaInicio: dateDaysAgo(3),
      fechaCaducidad: dateDaysFromNow(14),
      activa: true,
      estado: 'PUBLICADO',
      usosMaximos: 120,
      usosActuales: 32,
      codigo: 'CHARCO2X1',
      productoId: barProductos[0].id,
    },
  });

  const promoTienda = await prisma.promocion.create({
    data: {
      titulo: 'Pack creativo',
      descripcion: 'Cuaderno artesanal + lámina decorativa.',
      negocioId: tiendaNenufar.id,
      tipoDescuento: 'PACK',
      descuento: decimal('5.00'),
      fechaInicio: dateDaysAgo(10),
      fechaCaducidad: dateDaysFromNow(30),
      activa: true,
      estado: 'PUBLICADO',
      usosMaximos: 50,
      usosActuales: 8,
      codigo: 'PACKNENUFAR',
      productoId: tiendaProductos[0].id,
      pack: {
        connect: [{ id: tiendaProductos[0].id }, { id: tiendaProductos[1].id }],
      },
    },
  });

  const promoPelu = await prisma.promocion.create({
    data: {
      titulo: 'Primera visita',
      descripcion: '5 euros de descuento en lavado y peinado.',
      negocioId: peluRizo.id,
      tipoDescuento: 'IMPORTE_FIJO',
      descuento: decimal('5.00'),
      fechaInicio: dateDaysAgo(1),
      fechaCaducidad: dateDaysFromNow(25),
      activa: true,
      estado: 'PUBLICADO',
      usosMaximos: 35,
      usosActuales: 5,
      codigo: 'BRILLO5',
      productoId: peluProductos[1].id,
    },
  });

  const promociones = [promoCafe, promoBar, promoTienda, promoPelu];

  console.log('Creando recursos reservables...');

  const recursosCafe = await Promise.all([
    prisma.recursoReserva.create({
      data: {
        negocioId: cafeRana.id,
        nombre: 'Mesa ventana',
        descripcion: 'Mesa para dos junto a la ventana.',
        capacidad: 2,
      },
    }),
    prisma.recursoReserva.create({
      data: {
        negocioId: cafeRana.id,
        nombre: 'Mesa grande',
        descripcion: 'Mesa compartida para grupos.',
        capacidad: 6,
      },
    }),
  ]);

  const recursosBar = await Promise.all([
    prisma.recursoReserva.create({
      data: {
        negocioId: barCharco.id,
        nombre: 'Mesa terraza 1',
        descripcion: 'Mesa exterior.',
        capacidad: 4,
      },
    }),
    prisma.recursoReserva.create({
      data: {
        negocioId: barCharco.id,
        nombre: 'Mesa interior 1',
        descripcion: 'Mesa interior cerca de barra.',
        capacidad: 4,
      },
    }),
  ]);

  const recursosPelu = await Promise.all([
    prisma.recursoReserva.create({
      data: {
        negocioId: peluRizo.id,
        nombre: 'Silla Carmen',
        descripcion: 'Puesto de corte y peinado.',
        capacidad: 1,
      },
    }),
    prisma.recursoReserva.create({
      data: {
        negocioId: peluRizo.id,
        nombre: 'Silla Laura',
        descripcion: 'Puesto de corte y color.',
        capacidad: 1,
      },
    }),
  ]);

  console.log('Creando reservas...');

  await prisma.reserva.createMany({
    data: [
      {
        fecha: dateDaysFromNow(1, 10, 0),
        estado: 'PENDIENTE',
        usuarioId: usuario1.id,
        negocioId: cafeRana.id,
        recursoId: recursosCafe[0].id,
        nota: 'Mesa tranquila para estudiar.',
        duracionMinutos: 60,
        numPersonas: 2,
      },
      {
        fecha: dateDaysFromNow(1, 12, 0),
        estado: 'CONFIRMADA',
        usuarioId: usuario2.id,
        negocioId: cafeRana.id,
        recursoId: recursosCafe[1].id,
        nota: 'Vamos cuatro personas.',
        duracionMinutos: 90,
        numPersonas: 4,
      },
      {
        fecha: dateDaysFromNow(2, 21, 0),
        estado: 'CONFIRMADA',
        usuarioId: usuario3.id,
        negocioId: barCharco.id,
        recursoId: recursosBar[0].id,
        nota: 'Terraza si puede ser.',
        duracionMinutos: 120,
        numPersonas: 4,
      },
      {
        fecha: dateDaysFromNow(3, 13, 30),
        estado: 'PENDIENTE',
        usuarioId: admin.id,
        negocioId: barCharco.id,
        recursoId: recursosBar[1].id,
        nota: 'Comida rápida.',
        duracionMinutos: 60,
        numPersonas: 2,
      },
      {
        fecha: dateDaysFromNow(4, 17, 0),
        estado: 'PENDIENTE',
        usuarioId: usuario1.id,
        negocioId: peluRizo.id,
        recursoId: recursosPelu[0].id,
        nota: 'Corte básico.',
        duracionMinutos: 45,
        numPersonas: 1,
      },
      {
        fecha: dateDaysAgo(2, 18, 0),
        estado: 'COMPLETADA',
        usuarioId: usuario2.id,
        negocioId: peluRizo.id,
        recursoId: recursosPelu[1].id,
        nota: 'Lavado y peinado.',
        duracionMinutos: 45,
        numPersonas: 1,
      },
      {
        fecha: dateDaysAgo(4, 11, 0),
        estado: 'CANCELADA',
        usuarioId: usuario4.id,
        negocioId: cafeRana.id,
        recursoId: recursosCafe[0].id,
        nota: 'Cancelada por el usuario.',
        duracionMinutos: 60,
        numPersonas: 2,
        canceladaEn: dateDaysAgo(4, 9, 0),
        motivoCancelacion: 'Cambio de planes.',
      },
    ],
  });

  console.log('Creando reseñas y posts asociados...');

  const resenasData = [
    {
      usuarioId: usuario1.id,
      negocioId: cafeRana.id,
      contenido:
        'Sitio muy agradable para desayunar. El café está buenísimo y la atención fue muy cercana.',
      puntuacion: 5,
      selloNenufar: true,
      creadoEn: dateDaysAgo(2, 10, 30),
    },
    {
      usuarioId: usuario2.id,
      negocioId: cafeRana.id,
      contenido:
        'Buen ambiente, aunque estaba bastante lleno. La tarta de zanahoria merece la pena.',
      puntuacion: 4,
      selloNenufar: false,
      creadoEn: dateDaysAgo(4, 11, 0),
    },
    {
      usuarioId: usuario3.id,
      negocioId: barCharco.id,
      contenido:
        'Las croquetas están tremendas. Es el típico bar al que vuelves sin pensarlo.',
      puntuacion: 5,
      selloNenufar: true,
      creadoEn: dateDaysAgo(1, 22, 15),
    },
    {
      usuarioId: admin.id,
      negocioId: tiendaNenufar.id,
      contenido:
        'La tienda tiene productos muy cuidados. Buen sitio para comprar regalos diferentes.',
      puntuacion: 5,
      selloNenufar: true,
      creadoEn: dateDaysAgo(6, 18, 0),
    },
    {
      usuarioId: usuario4.id,
      negocioId: peluRizo.id,
      contenido: 'Me atendieron rápido y el corte quedó bien. Repetiría.',
      puntuacion: 4,
      selloNenufar: false,
      creadoEn: dateDaysAgo(8, 17, 0),
    },
    {
      usuarioId: usuario1.id,
      negocioId: libreriaSapo.id,
      contenido:
        'Me recomendaron un libro perfecto. Se nota que conocen lo que venden.',
      puntuacion: 5,
      selloNenufar: true,
      creadoEn: dateDaysAgo(3, 19, 30),
    },
  ];

  const posts: Awaited<ReturnType<typeof prisma.post.create>>[] = [];
  const resenas: Awaited<ReturnType<typeof prisma.resena.create>>[] = [];

  for (const r of resenasData) {
    const resena = await prisma.resena.create({
      data: {
        contenido: r.contenido,
        puntuacion: r.puntuacion,
        selloNenufar: r.selloNenufar,
        usuarioId: r.usuarioId,
        negocioId: r.negocioId,
        estado: 'PUBLICADO',
        creadoEn: r.creadoEn,
      },
    });

    resenas.push(resena);

    const post = await prisma.post.create({
      data: {
        usuarioId: r.usuarioId,
        negocioId: r.negocioId,
        tipo: 'RESENA',
        estado: 'PUBLICADO',
        resenaId: resena.id,
        creadoEn: r.creadoEn,
      },
    });

    posts.push(post);
  }

  console.log('Creando posts de promociones...');

  for (const promo of promociones) {
    const post = await prisma.post.create({
      data: {
        usuarioId:
          promo.negocioId === cafeRana.id
            ? duenaCafe.id
            : promo.negocioId === barCharco.id
              ? duenoBar.id
              : promo.negocioId === tiendaNenufar.id
                ? duenaTienda.id
                : usuario2.id,
        negocioId: promo.negocioId,
        tipo: 'PROMOCION',
        estado: 'PUBLICADO',
        promocionId: promo.id,
        creadoEn: dateDaysAgo(1),
      },
    });

    posts.push(post);
  }

  console.log('Creando logros...');

  const logroPrimeraResena = await prisma.logro.create({
    data: {
      titulo: 'Primera hoja',
      descripcion: 'Publica tu primera reseña en Nenúfar.',
      tipo: 'RESENA',
      dificultad: 'FACIL',
      umbral: 1,
      recompensaPuntos: 20,
    },
  });

  const logroExplorador = await prisma.logro.create({
    data: {
      titulo: 'Rana exploradora',
      descripcion: 'Visita tres negocios diferentes.',
      tipo: 'OTRO',
      dificultad: 'MEDIA',
      umbral: 3,
      recompensaPuntos: 45,
    },
  });

  const logroReserva = await prisma.logro.create({
    data: {
      titulo: 'Mesa reservada',
      descripcion: 'Haz tu primera reserva.',
      tipo: 'RESERVA',
      dificultad: 'FACIL',
      umbral: 1,
      recompensaPuntos: 25,
    },
  });

  const logroCafe = await prisma.logro.create({
    data: {
      titulo: 'Cafetero oficial',
      descripcion: 'Compra o reserva en cafeterías locales.',
      tipo: 'COMPRA',
      dificultad: 'MEDIA',
      umbral: 3,
      recompensaPuntos: 50,
      categoriaId: categoriaHosteleria.id,
      subcategoriaId: subCafe.id,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const logros = [logroPrimeraResena, logroExplorador, logroReserva, logroCafe];

  await prisma.logroUsuario.createMany({
    data: [
      {
        logroId: logroPrimeraResena.id,
        usuarioId: usuario1.id,
        veces: 1,
        conseguido: true,
        conseguidoEn: dateDaysAgo(2),
      },
      {
        logroId: logroPrimeraResena.id,
        usuarioId: usuario2.id,
        veces: 1,
        conseguido: true,
        conseguidoEn: dateDaysAgo(4),
      },
      {
        logroId: logroReserva.id,
        usuarioId: usuario1.id,
        veces: 1,
        conseguido: true,
        conseguidoEn: dateDaysAgo(1),
      },
      {
        logroId: logroExplorador.id,
        usuarioId: usuario3.id,
        veces: 2,
        conseguido: false,
      },
      {
        logroId: logroCafe.id,
        usuarioId: admin.id,
        veces: 3,
        conseguido: true,
        conseguidoEn: dateDaysAgo(6),
      },
    ],
  });

  const logroPost = await prisma.post.create({
    data: {
      usuarioId: usuario1.id,
      tipo: 'LOGRO',
      estado: 'PUBLICADO',
      logroId: logroReserva.id,
      creadoEn: dateDaysAgo(1, 19, 0),
    },
  });

  posts.push(logroPost);

  console.log('Creando comentarios y likes...');

  await prisma.comentario.createMany({
    data: [
      {
        contenido: 'Totalmente, ese café está muy rico.',
        usuarioId: usuario2.id,
        postId: posts[0].id,
        creadoEn: dateDaysAgo(1, 12, 0),
      },
      {
        contenido: 'Me lo apunto para ir esta semana.',
        usuarioId: usuario3.id,
        postId: posts[0].id,
        creadoEn: dateDaysAgo(1, 13, 0),
      },
      {
        contenido: 'Las croquetas son top, doy fe.',
        usuarioId: usuario1.id,
        postId: posts[2].id,
        creadoEn: dateDaysAgo(1, 23, 0),
      },
      {
        contenido: 'Buena promo, habrá que probarla.',
        usuarioId: admin.id,
        postId: posts[6].id,
        creadoEn: dateDaysAgo(1, 15, 0),
      },
    ],
  });

  const likesData = [
    { usuarioId: usuario1.id, postId: posts[1].id },
    { usuarioId: usuario2.id, postId: posts[0].id },
    { usuarioId: usuario3.id, postId: posts[0].id },
    { usuarioId: admin.id, postId: posts[2].id },
    { usuarioId: usuario4.id, postId: posts[2].id },
    { usuarioId: usuario1.id, postId: posts[6].id },
    { usuarioId: usuario2.id, postId: posts[7].id },
    { usuarioId: usuario3.id, postId: posts[8].id },
    { usuarioId: admin.id, postId: logroPost.id },
  ];

  await prisma.like.createMany({
    data: likesData,
    skipDuplicates: true,
  });

  console.log('Creando pedidos, compras y pagos...');

  async function crearPedidoConCompra(params: {
    negocioId: number;
    usuarioId: number;
    canalVenta: 'WEB' | 'APP' | 'PRESENCIAL' | 'TELEFONO' | 'OTRO';
    estadoPedido: 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';
    estadoCompra: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA';
    estadoPago: 'PENDIENTE' | 'PAGADO' | 'FALLIDO';
    metodoPago: 'TARJETA' | 'BIZUM' | 'EFECTIVO' | 'STRIPE' | 'OTRO';
    lineas: Array<{
      productoId: number;
      cantidad: number;
      precioUnitario: string;
      descuentoAplicado?: string;
      promocionId?: number;
      categoriaIdSnapshot?: number;
    }>;
    creadoEn: Date;
  }) {
    const lineasCalculadas = params.lineas.map((linea) => {
      const bruto = decimal(linea.precioUnitario).mul(linea.cantidad);
      const descuento = linea.descuentoAplicado
        ? decimal(linea.descuentoAplicado)
        : decimal('0');
      const subtotal = bruto.minus(descuento);

      return {
        productoId: linea.productoId,
        cantidad: linea.cantidad,
        precioUnitario: decimal(linea.precioUnitario),
        descuentoAplicado: linea.descuentoAplicado
          ? decimal(linea.descuentoAplicado)
          : null,
        subtotal,
        promocionId: linea.promocionId,
        categoriaIdSnapshot: linea.categoriaIdSnapshot,
      };
    });

    const total = lineasCalculadas.reduce(
      (acc, linea) => acc.plus(linea.subtotal),
      decimal('0'),
    );

    const pedido = await prisma.pedido.create({
      data: {
        negocioId: params.negocioId,
        usuarioId: params.usuarioId,
        canalVenta: params.canalVenta,
        estado: params.estadoPedido,
        totalSnapshot: total,
        creadoEn: params.creadoEn,
        pedidoProductos: {
          create: lineasCalculadas,
        },
      },
    });

    const compra = await prisma.compra.create({
      data: {
        pedidoId: pedido.id,
        usuarioId: params.usuarioId,
        negocioId: params.negocioId,
        total,
        moneda: 'EUR',
        estado: params.estadoCompra,
        creadoEn: params.creadoEn,
      },
    });

    await prisma.pago.create({
      data: {
        compraId: compra.id,
        usuarioId: params.usuarioId,
        metodoPago: params.metodoPago,
        estado: params.estadoPago,
        cantidad: total,
        moneda: 'EUR',
        refExterna: `${params.metodoPago.toLowerCase()}_${pedido.id}_${Date.now()}`,
        creadoEn: params.creadoEn,
      },
    });

    return { pedido, compra };
  }

  await crearPedidoConCompra({
    negocioId: cafeRana.id,
    usuarioId: usuario1.id,
    canalVenta: 'APP',
    estadoPedido: 'COMPLETADO',
    estadoCompra: 'COMPLETADA',
    estadoPago: 'PAGADO',
    metodoPago: 'BIZUM',
    creadoEn: dateDaysAgo(1, 10, 15),
    lineas: [
      {
        productoId: cafeProductos[0].id,
        cantidad: 2,
        precioUnitario: '2.40',
        descuentoAplicado: '0.72',
        promocionId: promoCafe.id,
        categoriaIdSnapshot: categoriaHosteleria.id,
      },
      {
        productoId: cafeProductos[2].id,
        cantidad: 1,
        precioUnitario: '4.50',
        categoriaIdSnapshot: categoriaHosteleria.id,
      },
    ],
  });

  await crearPedidoConCompra({
    negocioId: barCharco.id,
    usuarioId: usuario3.id,
    canalVenta: 'PRESENCIAL',
    estadoPedido: 'COMPLETADO',
    estadoCompra: 'COMPLETADA',
    estadoPago: 'PAGADO',
    metodoPago: 'EFECTIVO',
    creadoEn: dateDaysAgo(2, 21, 10),
    lineas: [
      {
        productoId: barProductos[0].id,
        cantidad: 4,
        precioUnitario: '1.80',
        descuentoAplicado: '1.80',
        promocionId: promoBar.id,
        categoriaIdSnapshot: categoriaHosteleria.id,
      },
      {
        productoId: barProductos[2].id,
        cantidad: 1,
        precioUnitario: '8.90',
        categoriaIdSnapshot: categoriaHosteleria.id,
      },
    ],
  });

  await crearPedidoConCompra({
    negocioId: tiendaNenufar.id,
    usuarioId: admin.id,
    canalVenta: 'WEB',
    estadoPedido: 'COMPLETADO',
    estadoCompra: 'COMPLETADA',
    estadoPago: 'PAGADO',
    metodoPago: 'STRIPE',
    creadoEn: dateDaysAgo(5, 18, 30),
    lineas: [
      {
        productoId: tiendaProductos[0].id,
        cantidad: 1,
        precioUnitario: '9.95',
        categoriaIdSnapshot: categoriaComercio.id,
      },
      {
        productoId: tiendaProductos[1].id,
        cantidad: 1,
        precioUnitario: '12.00',
        descuentoAplicado: '5.00',
        promocionId: promoTienda.id,
        categoriaIdSnapshot: categoriaComercio.id,
      },
    ],
  });

  await crearPedidoConCompra({
    negocioId: peluRizo.id,
    usuarioId: usuario4.id,
    canalVenta: 'APP',
    estadoPedido: 'PENDIENTE',
    estadoCompra: 'PENDIENTE',
    estadoPago: 'PENDIENTE',
    metodoPago: 'TARJETA',
    creadoEn: dateDaysAgo(1, 17, 0),
    lineas: [
      {
        productoId: peluProductos[0].id,
        cantidad: 1,
        precioUnitario: '14.00',
        categoriaIdSnapshot: categoriaBelleza.id,
      },
    ],
  });

  await crearPedidoConCompra({
    negocioId: libreriaSapo.id,
    usuarioId: usuario1.id,
    canalVenta: 'WEB',
    estadoPedido: 'CANCELADO',
    estadoCompra: 'CANCELADA',
    estadoPago: 'FALLIDO',
    metodoPago: 'TARJETA',
    creadoEn: dateDaysAgo(7, 20, 0),
    lineas: [
      {
        productoId: libreriaProductos[0].id,
        cantidad: 1,
        precioUnitario: '11.90',
        categoriaIdSnapshot: categoriaOcio.id,
      },
    ],
  });

  console.log('Creando visitas a negocios...');

  const origenes = [
    'busqueda',
    'directo',
    'instagram',
    'promocion',
    'mapa',
    'feed',
  ];

  const visitasData: Array<{
    negocioId: number;
    usuarioId: number | null;
    origen: string;
    creadoEn: Date;
  }> = [];

  for (let i = 0; i < 80; i++) {
    const negocio = negocios[i % negocios.length];
    const usuario = usuarios[i % usuarios.length];

    visitasData.push({
      negocioId: negocio.id,
      usuarioId: i % 5 === 0 ? null : usuario.id,
      origen: origenes[i % origenes.length],
      creadoEn: dateDaysAgo(i % 20, 9 + (i % 10), 0),
    });
  }

  await prisma.visitaNegocio.createMany({
    data: visitasData,
  });

  console.log('Creando seguimientos...');

  await prisma.usuarioSeguimiento.createMany({
    data: [
      { seguidorId: usuario1.id, seguidoId: usuario2.id },
      { seguidorId: usuario1.id, seguidoId: usuario3.id },
      { seguidorId: usuario2.id, seguidoId: usuario1.id },
      { seguidorId: usuario3.id, seguidoId: usuario1.id },
      { seguidorId: admin.id, seguidoId: usuario1.id },
      { seguidorId: usuario4.id, seguidoId: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log('Creando transacciones de pétalos...');

  const saldos = new Map<number, number>();

  for (const usuario of usuarios) {
    saldos.set(usuario.id, 0);
  }

  async function addPetalos(params: {
    usuarioId: number;
    delta: number;
    motivo:
      | 'RESENA_AUTOR'
      | 'RESENA_NEGOCIO'
      | 'LIKE'
      | 'LOGRO'
      | 'RESERVA'
      | 'OTRO';
    descripcion: string;
    refTipo?: string;
    refId?: number;
    metadata?: Prisma.InputJsonValue;
    creadoEn?: Date;
  }) {
    const saldoAnterior = saldos.get(params.usuarioId) ?? 0;
    const saldoNuevo = saldoAnterior + params.delta;
    saldos.set(params.usuarioId, saldoNuevo);

    await prisma.petaloTx.create({
      data: {
        usuarioId: params.usuarioId,
        delta: params.delta,
        saldoResultante: saldoNuevo,
        motivo: params.motivo,
        descripcion: params.descripcion,
        refTipo: params.refTipo,
        refId: params.refId,
        metadata: params.metadata ?? {},
        creadoEn: params.creadoEn ?? new Date(),
      },
    });
  }

  await addPetalos({
    usuarioId: usuario1.id,
    delta: 20,
    motivo: 'RESENA_AUTOR',
    descripcion: 'Has ganado pétalos por publicar una reseña.',
    refTipo: 'Resena',
    refId: resenas[0].id,
    creadoEn: dateDaysAgo(2),
  });

  await addPetalos({
    usuarioId: usuario1.id,
    delta: 25,
    motivo: 'LOGRO',
    descripcion: 'Logro conseguido: Mesa reservada.',
    refTipo: 'Logro',
    refId: logroReserva.id,
    creadoEn: dateDaysAgo(1),
  });

  await addPetalos({
    usuarioId: usuario2.id,
    delta: 20,
    motivo: 'RESENA_AUTOR',
    descripcion: 'Has ganado pétalos por publicar una reseña.',
    refTipo: 'Resena',
    refId: resenas[1].id,
    creadoEn: dateDaysAgo(4),
  });

  await addPetalos({
    usuarioId: usuario3.id,
    delta: 20,
    motivo: 'RESENA_AUTOR',
    descripcion: 'Has ganado pétalos por publicar una reseña.',
    refTipo: 'Resena',
    refId: resenas[2].id,
    creadoEn: dateDaysAgo(1),
  });

  await addPetalos({
    usuarioId: admin.id,
    delta: 50,
    motivo: 'LOGRO',
    descripcion: 'Logro conseguido: Cafetero oficial.',
    refTipo: 'Logro',
    refId: logroCafe.id,
    creadoEn: dateDaysAgo(6),
  });

  await addPetalos({
    usuarioId: usuario4.id,
    delta: 5,
    motivo: 'LIKE',
    descripcion: 'Has recibido interacción en un post.',
    refTipo: 'Post',
    refId: posts[4].id,
    creadoEn: dateDaysAgo(2),
  });

  for (const [usuarioId, saldo] of saldos.entries()) {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { petalosSaldo: saldo },
    });
  }

  console.log('Seed completado correctamente.');
  console.log('');
  console.log('Usuarios de prueba:');
  console.log(`Admin:    pablo@minenufar.com / ${PASSWORD}`);
  console.log(`Usuario:  lucia@test.com / ${PASSWORD}`);
  console.log(`Usuario:  mario@test.com / ${PASSWORD}`);
  console.log(`Usuario:  claudia@test.com / ${PASSWORD}`);
  console.log(`Negocio:  carmen@negocio.com / ${PASSWORD}`);
  console.log(`Negocio:  jorge@negocio.com / ${PASSWORD}`);
  console.log(`Negocio:  ines@negocio.com / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando seed:', error);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
  });
