import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get(['health', 'api/health'])
  health() {
    return { ok: true };
  }
}
