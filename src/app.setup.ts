import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';

export function setupApp(app: INestApplication) {
  app.use(requestContextMiddleware);
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
}
