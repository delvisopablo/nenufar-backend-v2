import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { setupApp } from './app.setup';
import { registerProcessErrorHandlers } from './common/process/process-error-handlers';

registerProcessErrorHandlers();

const globalPrefix = 'api';
const bootstrapLogger = new Logger('Bootstrap');
const allowedRouteMethods = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
]);
const defaultAllowedOrigins = [
  'https://www.minenufar.com',
  'https://minenufar.com',
  'https://nenufar-git-main-delvisopablos-projects.vercel.app',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];
const globalPrefixExclusions = new Set(['/health']);

type RouteLayer = {
  route?: {
    path?: string | string[];
    methods?: Record<string, boolean>;
  };
  name?: string;
  handle?: {
    stack?: RouteLayer[];
  };
  regexp?: {
    source?: string;
  };
};

function normalizePath(path: string) {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

function normalizeRoutePaths(path?: string | string[]) {
  if (!path) {
    return [];
  }

  if (Array.isArray(path)) {
    return path.map(normalizePath);
  }

  return [normalizePath(path)];
}

function applyGlobalPrefixToLoggedPath(path: string) {
  const normalizedPath = normalizePath(path);

  if (globalPrefixExclusions.has(normalizedPath)) {
    return normalizedPath;
  }

  if (
    normalizedPath === `/${globalPrefix}` ||
    normalizedPath.startsWith(`/${globalPrefix}/`)
  ) {
    return normalizedPath;
  }

  return normalizePath(`/${globalPrefix}${normalizedPath}`);
}

function extractRouterBase(layer: RouteLayer) {
  const source = layer.regexp?.source;
  if (!source) {
    return '';
  }

  const match = source.match(/\\\/([^\\]+?)(?=\\\/|\(\?=|$)/);
  if (!match?.[1]) {
    return '';
  }

  return `/${match[1].replace(/\\\//g, '/')}`;
}

function collectRoutesFromLayers(
  layers: RouteLayer[] | undefined,
  prefix = '',
): string[] {
  if (!layers?.length) {
    return [];
  }

  const routes: string[] = [];

  for (const layer of layers) {
    if (layer.route?.methods) {
      const methods = Object.entries(layer.route.methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase())
        .sort();
      const paths = normalizeRoutePaths(layer.route.path);

      for (const method of methods) {
        for (const path of paths) {
          routes.push(
            `${method} ${applyGlobalPrefixToLoggedPath(`${prefix}${path}`)}`,
          );
        }
      }

      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const nestedPrefix = `${prefix}${extractRouterBase(layer)}`;
      routes.push(...collectRoutesFromLayers(layer.handle.stack, nestedPrefix));
    }
  }

  return routes;
}

function logRegisteredRoutes(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
) {
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance() as {
    _router?: { stack?: RouteLayer[] };
    router?: { stack?: RouteLayer[] };
  };
  const layers = instance._router?.stack ?? instance.router?.stack ?? [];
  const routes = [...new Set(collectRoutesFromLayers(layers))]
    .filter((route) => {
      const [method, path] = route.split(' ', 2);

      if (path === '/health' && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return false;
      }

      return (
        allowedRouteMethods.has(method) &&
        Boolean(path) &&
        !path.includes('*') &&
        !path.includes('$')
      );
    })
    .sort();

  bootstrapLogger.log(`Global prefix: /${globalPrefix}`);

  if (!routes.length) {
    bootstrapLogger.warn('No se pudieron resolver rutas registradas');
    return;
  }

  bootstrapLogger.log('Registered routes:');
  for (const route of routes) {
    bootstrapLogger.log(`  ${route}`);
  }
}

function getAllowedCorsOrigins() {
  const extraOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...defaultAllowedOrigins, ...(extraOrigins ?? [])])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.setGlobalPrefix(globalPrefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  const corsOrigins = getAllowedCorsOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} no permitido por CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    optionsSuccessStatus: 204,
  });

  const cfg = new DocumentBuilder()
    .setTitle('Nenúfar API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, doc);

  const port = Number(process.env.PORT) || 3000;
  try {
    await app.init();
    logRegisteredRoutes(app);
    await app.listen(port);
  } catch (error) {
    logRegisteredRoutes(app);
    throw error;
  }
}
void bootstrap();
