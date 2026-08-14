import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { PublicTweetDto } from '../dtos/public-tweet.dto';
import { PublicGenerateService } from '../services/public-generate.service';

@Controller('public')
export class PublicController {
    constructor(private svc: PublicGenerateService) {}

    @Post('tweet')
    async tweet(@Req() req: Request, @Body() dto: PublicTweetDto) {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : (req.ip ?? 'unknown')).trim();
        try {
            return await this.svc.generateTweet(ip, dto.releaseNotes);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            if (/rate/i.test(message)) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
            throw e;
        }
    }
}
