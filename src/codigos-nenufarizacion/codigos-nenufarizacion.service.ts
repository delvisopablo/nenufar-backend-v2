import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodigosNenufarizacionService {
  constructor(private readonly prisma: PrismaService) {}

  async validar(codigo: string): Promise<{ valido: boolean; mensaje: string }> {
    const record = await this.prisma.codigoNenufarizacion.findUnique({
      where: { codigo },
      select: { activo: true, usado: true },
    });

    if (!record || !record.activo) {
      return { valido: false, mensaje: 'Código no válido o no activo' };
    }

    if (record.usado) {
      return { valido: false, mensaje: 'Código ya utilizado' };
    }

    return { valido: true, mensaje: 'Código válido' };
  }
}
