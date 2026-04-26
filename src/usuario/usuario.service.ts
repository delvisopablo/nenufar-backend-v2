import { Injectable, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Usuario } from '@prisma/client';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async crearUsuario(dto: CreateUsuarioDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedNickname = dto.nickname.trim();

    const existe = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { nickname: normalizedNickname }],
      },
      select: { id: true, email: true, nickname: true },
    });

    if (existe) {
      throw new ConflictException('El email o nickname ya está en uso');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nombre: dto.nombre.trim(),
          nickname: normalizedNickname,
          email: normalizedEmail,
          password: hash,
          foto: dto.fotoPerfil?.trim() || undefined,
          biografia: dto.biografia?.trim() || undefined,
        },
        select: {
          id: true,
          nombre: true,
          nickname: true,
          email: true,
          foto: true,
          biografia: true,
        },
      });

      return usuario;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email o nickname ya está en uso');
      }
      throw error;
    }
  }

  async getPerfil(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        resenas: true,
        // Si tienes logros o promociones relacionadas, añádelas aquí
      },
    });
    return usuario;
  }

  async buscarPorEmail(email: string): Promise<any> {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nickname: true,
        email: true,
        password: true,
        nombre: true,
      },
    });
  }

  async borrarUsuario(id: number) {
    return this.prisma.usuario.delete({
      where: { id: Number(id) },
    });
  }
}
