import { SetMetadata } from '@nestjs/common';
import { RolGlobal } from '@prisma/client';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: RolGlobal[]) => SetMetadata(ROLES_KEY, roles);
