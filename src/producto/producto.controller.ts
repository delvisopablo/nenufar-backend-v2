/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstadoSolicitudProducto } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { UpdateProductoStockDto } from './dto/update-producto-stock.dto';
import {
  AprobarSolicitudProductoDto,
  CreateSolicitudProductoDto,
} from './dto/create-solicitud-producto.dto';
import { RechazarSolicitudProductoDto } from './dto/rechazar-solicitud-producto.dto';
import {
  UploadedImageLike,
  assertValidImageUpload,
  imageFileFilter,
} from '../common/uploads/image-upload.util';
import { createImageTooLargeFilter } from '../common/uploads/image-too-large.filter';

const MAX_PRODUCT_PHOTO_SIZE = 5 * 1024 * 1024;
const PRODUCT_PHOTO_TOO_LARGE_MESSAGE =
  'La foto del producto no puede superar 5 MB.';

@Controller()
export class ProductoController {
  constructor(private service: ProductoService) {}

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

  @Get('negocios/:id/productos')
  listByNegocio(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query('q') q?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ) {
    return this.service.listByNegocio(
      negocioId,
      q,
      page,
      limit,
      this.getOptionalUserId(req ?? {}),
    );
  }

  @Post('negocios/:id/productos')
  create(
    @Param('id', ParseIntPipe) negocioId: number,
    @Body() dto: CreateProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.create(negocioId, dto, currentUserId, isAdmin);
  }

  @Post('negocios/:negocioId/productos/:productoId/foto')
  @UseFilters(
    createImageTooLargeFilter('foto', PRODUCT_PHOTO_TOO_LARGE_MESSAGE),
  )
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: MAX_PRODUCT_PHOTO_SIZE },
      fileFilter: imageFileFilter('foto'),
    }),
  )
  async subirFoto(
    @Param('negocioId', ParseIntPipe) negocioId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @UploadedFile() file: UploadedImageLike | undefined,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    const relativePath = await this.persistProductPhoto(productoId, file);
    const fotoUrl = this.buildPublicUploadUrl(req, relativePath);

    return this.service.actualizarFoto(
      negocioId,
      productoId,
      fotoUrl,
      currentUserId,
      isAdmin,
    );
  }

  @Post('negocios/:id/solicitudes-producto')
  crearSolicitud(
    @Param('id', ParseIntPipe) negocioId: number,
    @Body() dto: CreateSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    return this.service.crearSolicitud(negocioId, dto, currentUserId);
  }

  @Get('negocios/:id/solicitudes-producto')
  listarSolicitudes(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query('estado') estado: EstadoSolicitudProducto | undefined,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.listarSolicitudes(
      negocioId,
      currentUserId,
      isAdmin,
      estado,
    );
  }

  @Get('productos/favoritos')
  listFavoritos(@Req() req: any) {
    return this.service.listFavoritos(this.getAuthenticatedUserId(req));
  }

  @Get('productos/buscar')
  search(
    @Query('q') q = '',
    @Query('limit') limit?: number,
    @Query('categoriaId') categoriaId?: number,
    @Query('subcategoriaId') subcategoriaId?: number,
    @Query('negocioId') negocioId?: number,
    @Req() req?: any,
  ) {
    return this.service.search(q, limit, this.getOptionalUserId(req ?? {}), {
      categoriaId,
      subcategoriaId,
      negocioId,
    });
  }

  @Get('productos/:id')
  get(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    return this.service.getById(id, this.getOptionalUserId(req ?? {}));
  }

  @Post('productos/:productoId/favorito')
  addFavorito(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Req() req: any,
  ) {
    return this.service.addFavorito(
      productoId,
      this.getAuthenticatedUserId(req),
    );
  }

  @Delete('productos/:productoId/favorito')
  removeFavorito(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Req() req: any,
  ) {
    return this.service.removeFavorito(
      productoId,
      this.getAuthenticatedUserId(req),
    );
  }

  @Patch('productos/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.update(id, dto, currentUserId, isAdmin);
  }

  @Patch('productos/:id/stock')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoStockDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.adjustStock(id, dto, currentUserId, isAdmin);
  }

  @Delete('productos/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.remove(id, currentUserId, isAdmin);
  }

  @Patch('solicitudes-producto/:id/aprobar')
  aprobarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.aprobarSolicitud(id, dto, currentUserId, isAdmin);
  }

  @Patch('solicitudes-producto/:id/rechazar')
  rechazarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarSolicitudProductoDto,
    @Req() req: any,
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.rechazarSolicitud(id, dto, currentUserId, isAdmin);
  }

  private async persistProductPhoto(
    productoId: number,
    file: UploadedImageLike | undefined,
  ) {
    const extension = assertValidImageUpload(file, {
      field: 'foto',
      maxSize: MAX_PRODUCT_PHOTO_SIZE,
      missingMessage: 'Selecciona una foto de producto.',
      tooLargeMessage: PRODUCT_PHOTO_TOO_LARGE_MESSAGE,
    });

    const uploadDir = join(process.cwd(), 'uploads', 'productos', 'foto');
    await mkdir(uploadDir, { recursive: true });

    const filename = `producto-${productoId}-${randomUUID()}.${extension}`;
    await writeFile(join(uploadDir, filename), file!.buffer!);

    return `uploads/productos/foto/${filename}`;
  }

  private buildPublicUploadUrl(req: Request, relativePath: string) {
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
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol || 'http';

    return host ? `${protocol}://${host}/${relativePath}` : `/${relativePath}`;
  }
}
