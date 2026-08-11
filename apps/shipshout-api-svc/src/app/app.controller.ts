import { Controller, Get } from '@nestjs/common';
import { ApiResource } from '@shipshout/swagger';
import { AppService } from './app.service';
import { HelloResponseDto } from './dto/hello-response.dto';

@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @ApiResource({
        name: 'app',
        operationId: 'getHello',
        status: 200,
        isPublic: true,
        response: HelloResponseDto,
    })
    getData(): HelloResponseDto {
        return this.appService.getData();
    }
}
