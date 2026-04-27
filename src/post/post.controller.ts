import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post as PostHttp,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { QueryPostDto } from './dto/query-post.dto';

@Controller()
export class PostController {
  constructor(private service: PostService) {}

  private getAuthenticatedUserId(req: { user?: { id?: number } }) {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Autenticación requerida');
    }
    return userId;
  }

  @Get('posts')
  list(@Query() q: QueryPostDto) {
    return this.service.list(q);
  }

  @Get('negocios/:id/posts')
  listByNegocio(
    @Param('id', ParseIntPipe) negocioId: number,
    @Query() q: QueryPostDto,
  ) {
    return this.service.listByNegocio(negocioId, q);
  }

  @Get('posts/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getById(id);
  }

  @Delete('posts/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number; isAdmin?: boolean } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.remove(id, currentUserId, isAdmin);
  }

  // Likes
  @PostHttp('posts/:id/like')
  like(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.service.like(id, userId);
  }

  @Delete('posts/:id/like')
  unlike(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user?: { id?: number } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.service.unlike(id, userId);
  }

  @Get('posts/:id/likes')
  likes(@Param('id', ParseIntPipe) id: number) {
    return this.service.listLikes(id);
  }

  // Comentarios mínimos
  @Get('posts/:id/comentarios')
  comentarios(@Param('id', ParseIntPipe) id: number) {
    return this.service.listComentarios(id);
  }

  @PostHttp('posts/:id/comentarios')
  crearComentario(
    @Param('id', ParseIntPipe) id: number,
    @Body('contenido') contenido: string,
    @Req() req: { user?: { id?: number } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.service.createComentario(id, userId, contenido);
  }

  @Delete('posts/:id/comentarios/:cid')
  borrarComentario(
    @Param('id', ParseIntPipe) postId: number,
    @Param('cid', ParseIntPipe) comentarioId: number,
    @Req() req: { user?: { id?: number; isAdmin?: boolean } },
  ) {
    const currentUserId = this.getAuthenticatedUserId(req);
    const isAdmin = !!req.user?.isAdmin;
    return this.service.removeComentario(
      postId,
      comentarioId,
      currentUserId,
      isAdmin,
    );
  }
}
