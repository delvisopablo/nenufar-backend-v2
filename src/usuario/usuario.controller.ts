import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const MAX_PROFILE_PHOTO_SIZE = 3 * 1024 * 1024;
const profilePhotoExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type UploadedProfilePhoto = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

type AuthenticatedRequest = Request & {
  user?: {
    id?: number;
  };
};

@ApiTags('Usuario')
@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  private getOptionalUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    return Number.isInteger(userId) && userId > 0 ? userId : undefined;
  }

  @Post()
  async crearUsuario(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.crearUsuario(dto);
  }

  @Post('me/foto-perfil')
  @UseInterceptors(
    FileInterceptor('fotoPerfil', {
      limits: { fileSize: MAX_PROFILE_PHOTO_SIZE },
      fileFilter: (_req, file: UploadedProfilePhoto, callback) => {
        const mimeType = String(file.mimetype ?? '');

        if (!profilePhotoExtensions[mimeType]) {
          callback(
            new BadRequestException(
              'La foto de perfil debe ser JPG, PNG o WEBP',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async subirFotoPerfil(
    @UploadedFile() file: UploadedProfilePhoto | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    const relativePath = await this.persistProfilePhoto(userId, file);
    const fotoUrl = this.buildPublicUploadUrl(req, relativePath);
    const usuario = await this.usuarioService.actualizarFotoPerfil(
      userId,
      fotoUrl,
    );

    return { ok: true, usuario };
  }

  @Get('by-nickname/:nickname')
  async getPerfilByNickname(@Param('nickname') nickname: string) {
    return this.usuarioService.getPerfilByNickname(nickname);
  }

  @Get(':id/seguidores')
  async getSeguidores(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.getSeguidores(id, this.getOptionalUserId(req));
  }

  @Get(':id/siguiendo')
  async getSiguiendo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.getSiguiendo(id, this.getOptionalUserId(req));
  }

  @Post(':id/seguir')
  async seguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.seguir(id, this.getAuthenticatedUserId(req));
  }

  @Delete(':id/seguir')
  async dejarDeSeguir(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.dejarDeSeguir(
      id,
      this.getAuthenticatedUserId(req),
    );
  }

  @Get(':id')
  async getPerfil(@Param('id', ParseIntPipe) id: number) {
    return this.usuarioService.getPerfil(id);
  }

  @Patch(':id')
  async actualizarPerfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUsuarioDto,
    @Req() req: { user?: { id?: number } },
  ) {
    return this.usuarioService.actualizarPerfil(
      id,
      dto,
      this.getAuthenticatedUserId(req),
    );
  }

  @Delete(':id')
  async borrarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    const actorId = this.getAuthenticatedUserId(req);
    if (actorId !== id) {
      throw new UnauthorizedException('Solo puedes borrar tu propia cuenta');
    }
    return this.usuarioService.borrarUsuario(id);
  }

  private async persistProfilePhoto(
    userId: number,
    file: UploadedProfilePhoto | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Selecciona una foto de perfil');
    }

    if (Number(file.size ?? 0) > MAX_PROFILE_PHOTO_SIZE) {
      throw new BadRequestException('La foto de perfil no puede superar 3 MB');
    }

    const mimeType = String(file.mimetype ?? '');
    const extension = profilePhotoExtensions[mimeType];

    if (!extension) {
      throw new BadRequestException(
        'La foto de perfil debe ser JPG, PNG o WEBP',
      );
    }

    const uploadDir = join(process.cwd(), 'uploads', 'usuarios', 'perfil');
    await mkdir(uploadDir, { recursive: true });

    const filename = `usuario-${userId}-${randomUUID()}.${extension}`;
    await writeFile(join(uploadDir, filename), file.buffer);

    return `uploads/usuarios/perfil/${filename}`;
  }

  private buildPublicUploadUrl(req: AuthenticatedRequest, relativePath: string) {
    const configuredBase =
      process.env.PUBLIC_BACKEND_URL ??
      process.env.BACKEND_PUBLIC_URL ??
      process.env.API_PUBLIC_URL ??
      '';
    const normalizedBase = configuredBase
      .trim()
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '');

    if (normalizedBase) {
      return `${normalizedBase}/${relativePath}`;
    }

    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
    const host = forwardedHost || req.get('host');
    const forwardedProto = req
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim();
    const protocol = forwardedProto || req.protocol || 'http';

    return host ? `${protocol}://${host}/${relativePath}` : `/${relativePath}`;
  }
}
