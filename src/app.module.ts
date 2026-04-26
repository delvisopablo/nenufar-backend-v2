import { CommonModule } from './common/common.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ResenaModule } from './reseña/resena.module';
import { NegocioModule } from './negocio/negocio.module';
import { PrismaService } from '../prisma/prisma.service';
import { PromocionModule } from './promocion/promocion.module';
import { LogroModule } from './logro/logro.module';
import { ReservaModule } from './reserva/reserva.module';
import { ProductoModule } from './producto/producto.module';
import { JwtModule } from '@nestjs/jwt';
import { CategoriaModule } from './categoria/categoria.module';
import { PostModule } from './post/post.module';
import { PetalosModule } from './petalos/petalos.module';
import { PedidoModule } from './pedido/pedido.module';
import { AuthUserMiddleware } from './auth/auth-user.middleware';
import { HealthController } from './health.controller';
import { DashboardModule } from './dashboard/dashboard.module';
import { RecursoModule } from './recurso/recurso.module';
import { SubcategoriaModule } from './subcategoria/subcategoria.module';

@Module({
  imports: [
    AuthModule,
    UsuarioModule,
    ResenaModule,
    CommonModule,
    NegocioModule,
    ReservaModule,
    PromocionModule,
    LogroModule,
    CategoriaModule,
    PostModule,
    ProductoModule,
    PetalosModule,
    PedidoModule,
    DashboardModule,
    RecursoModule,
    SubcategoriaModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, PrismaService, AuthUserMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthUserMiddleware).forRoutes('*');
  }
}
