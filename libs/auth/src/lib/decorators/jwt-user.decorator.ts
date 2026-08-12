import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayload } from '../contracts/types/jwt-user.types';

export const JwtUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUserPayload;
});
