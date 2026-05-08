import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EstadoCuenta, RolGlobal } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RolesRequest = {
  user?: {
    id?: number;
    rolGlobal?: RolGlobal;
    isAdmin?: boolean;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<RolGlobal[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RolesRequest>();
    const userId = Number(request.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        rolGlobal: true,
        estadoCuenta: true,
        eliminadoEn: true,
      },
    });

    if (
      !usuario ||
      usuario.eliminadoEn ||
      usuario.estadoCuenta !== EstadoCuenta.ACTIVA ||
      !requiredRoles.includes(usuario.rolGlobal)
    ) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    request.user = {
      ...request.user,
      id: usuario.id,
      rolGlobal: usuario.rolGlobal,
      isAdmin: usuario.rolGlobal === RolGlobal.ADMIN,
    };

    return true;
  }
}
