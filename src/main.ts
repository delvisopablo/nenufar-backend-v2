import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupApp } from './app.setup';
import { registerProcessErrorHandlers } from './common/process/process-error-handlers';

registerProcessErrorHandlers();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const allowedOrigins = [
    'https://www.minenufar.com',
    'https://minenufar.com',
    'https://nenufar-git-main-delvisopablos-projects.vercel.app',
    'http://localhost:4200',
  ];
  const extraOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const corsOrigins = [
    ...new Set([...allowedOrigins, ...(extraOrigins ?? [])]),
  ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const cfg = new DocumentBuilder()
    .setTitle('Nenúfar API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup('docs', app, doc);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
}
void bootstrap();
