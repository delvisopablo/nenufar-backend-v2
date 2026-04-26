import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { StructuredLogger } from '../src/common/logger/structured-logger';

function prismaLogOptions(): Prisma.PrismaClientOptions['log'] {
  const logs: Prisma.PrismaClientOptions['log'] = [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ];

  if (process.env.PRISMA_LOG_QUERIES === 'true') {
    logs.push({ emit: 'event', level: 'query' });
  }

  return logs;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({ log: prismaLogOptions() });

    const onPrismaEvent = this.$on.bind(this) as (
      event: string,
      callback: (event: Prisma.LogEvent | Prisma.QueryEvent) => void,
    ) => void;

    onPrismaEvent('warn', (event) => {
      StructuredLogger.warn('prisma_warn', {
        message: 'message' in event ? event.message : undefined,
      });
    });

    onPrismaEvent('error', (event) => {
      StructuredLogger.error('prisma_error', {
        message: 'message' in event ? event.message : undefined,
      });
    });

    if (process.env.PRISMA_LOG_QUERIES === 'true') {
      onPrismaEvent('query', (event) => {
        if (!('duration' in event)) {
          return;
        }

        const slowQueryMs = Number(process.env.PRISMA_SLOW_QUERY_MS ?? 500);
        const level = event.duration >= slowQueryMs ? 'warn' : 'debug';

        StructuredLogger.log(level, 'prisma_query', {
          query: event.query,
          params: event.params,
          durationMs: event.duration,
          target: event.target,
          slow: event.duration >= slowQueryMs,
        });
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }
}
