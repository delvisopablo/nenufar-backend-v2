import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: number; sub?: number };
    }>();
    const userId = Number(request.user?.id ?? request.user?.sub);

    if (Number.isInteger(userId) && userId > 0) {
      return true;
    }

    return super.canActivate(context);
  }
}
