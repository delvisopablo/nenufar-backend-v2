import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLogroDto } from './dto/create-logro.dto';
// import { UpdateLogroDto } from './dto/update-logro.dto';

@Injectable()
export class LogroService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLogroDto) {
    const { categoriaId, subcategoriaId, negocioId, productoId } = dto;

    try {
      return await this.prisma.logro.create({
        data: {
          titulo: dto.titulo.trim(),
          descripcion: dto.descripcion?.trim() || null,
          tipo: dto.tipo,
          dificultad: dto.dificultad,
          umbral: dto.umbral,
          recompensaPuntos: dto.recompensaPuntos,
          categoriaId: categoriaId ?? null,
          subcategoriaId: subcategoriaId ?? null,
          negocioId: negocioId ?? null,
          productoId: productoId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'Alguna referencia relacionada no existe',
        );
      }
      throw error;
    }
  }

  async logrosPorUsuario(usuarioId: number) {
    return this.prisma.logroUsuario.findMany({
      where: { usuarioId },
      include: {
        logro: true,
      },
      orderBy: [{ conseguido: 'desc' }, { actualizadoEn: 'desc' }],
    });
  }

  async asignarOIncrementar(usuarioId: number, logroId: number) {
    const [usuario, logro, existente] = await this.prisma.$transaction([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true },
      }),
      this.prisma.logro.findUnique({
        where: { id: logroId },
        select: { id: true },
      }),
      this.prisma.logroUsuario.findUnique({
        where: {
          logroId_usuarioId: {
            logroId,
            usuarioId,
          },
        },
      }),
    ]);

    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (!logro) throw new NotFoundException('Logro no encontrado');

    const now = new Date();

    return this.prisma.logroUsuario.upsert({
      where: {
        logroId_usuarioId: {
          logroId,
          usuarioId,
        },
      },
      create: {
        logroId,
        usuarioId,
        veces: 1,
        conseguido: true,
        conseguidoEn: now,
      },
      update: {
        veces: { increment: 1 },
        conseguido: true,
        conseguidoEn: existente?.conseguidoEn ?? now,
      },
      include: {
        logro: true,
        usuario: {
          select: { id: true, nombre: true, nickname: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.logro.findMany();
  }

  async findOne(id: number) {
    const logro = await this.prisma.logro.findUnique({ where: { id } });
    if (!logro) throw new NotFoundException('Logro no encontrado');
    return logro;
  }

  // async update(id: number, dto: UpdateLogroDto) {
  //   const { categoriaId, subcategoriaId, negocioId, productoId, ...rest } = dto;

  //   return this.prisma.logro.update({
  //     where: { id },
  //     data: {
  //       ...rest,
  //       tipo: dto.tipo !== undefined ? dto.tipo : undefined,
  //       dificultad: dto.dificultad !== undefined ? { set: dto.dificultad } : undefined,
  //       categoriaId: typeof categoriaId === 'number' ? categoriaId : null,
  //       subcategoriaId: typeof subcategoriaId === 'number' ? subcategoriaId : null,
  //       negocioId: typeof negocioId === 'number' ? negocioId : null,
  //       productoId: typeof productoId === 'number' ? productoId : null,
  //     },
  //   });
  // }

  async remove(id: number) {
    return this.prisma.logro.delete({ where: { id } });
  }
}
