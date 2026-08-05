import { BadRequestException, Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicTweetSchema } from '@shipshout/contracts';
import { PublicGenerateService } from './public-generate.service';

@Controller('public')
export class PublicController {
    constructor(private svc: PublicGenerateService) {}

    @Post('tweet')
    async tweet(@Req() req: Request, @Body() body: unknown) {
        const parsed = PublicTweetSchema.safeParse(body);
        if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : (req.ip ?? 'unknown')).trim();
        try {
            return await this.svc.generateTweet(ip, parsed.data.releaseNotes);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            if (/rate/i.test(message)) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
            throw e;
        }
    }
}
