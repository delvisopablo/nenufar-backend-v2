import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function count(label: string, fn: () => Promise<number>) {
  try {
    const n = await fn();
    console.log(label.padEnd(16), n); // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    console.log(label.padEnd(16), 'ERR');
  }
}

async function main() {
  await count('Usuario', () => prisma.usuario.count());
  await count('Categoria', () => prisma.categoria.count());
  await count('Subcategoria', () => prisma.subcategoria.count());
  await count('Negocio', () => prisma.negocio.count());
  await count('NegocioMiembro', () => prisma.negocioMiembro.count());
  await count('Producto', () => prisma.producto.count());
  await count('Resena', () => prisma.resena.count());
  await count('Post', () => prisma.post.count());
  await count('Comentario', () => prisma.comentario.count());
  await count('Like', () => prisma.like.count());
  await count('Reserva', () => prisma.reserva.count());
  await count('Promocion', () => prisma.promocion.count());
  await count('Pedido', () => prisma.pedido.count());
  await count('PedidoProducto', () => prisma.pedidoProducto.count());
  await count('Compra', () => prisma.compra.count());
  await count('Pago', () => prisma.pago.count());
  await count('Logro', () => prisma.logro.count());
  await count('LogroUsuario', () => prisma.logroUsuario.count());
  await count('PetaloTx', () => prisma.petaloTx.count());
  await prisma.$disconnect();
}
void main();
