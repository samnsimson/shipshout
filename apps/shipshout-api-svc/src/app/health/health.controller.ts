import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly http: HttpHealthIndicator,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    @HealthCheck()
    check() {
        const port = this.configService.get('PORT', 3000);
        return this.health.check([() => this.http.pingCheck('shipshout-api', `http://127.0.0.1:${port}/`)]);
    }
}
