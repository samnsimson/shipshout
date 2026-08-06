import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthError } from '@shipshout/auth';

@Catch(AuthError)
export class AuthErrorFilter implements ExceptionFilter {
    catch(exception: AuthError, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>();
        const status =
            exception.code === 'EMAIL_NOT_VERIFIED'
                ? HttpStatus.FORBIDDEN
                : exception.code === 'EMAIL_EXISTS' || exception.code === 'IDENTITY_TAKEN'
                  ? HttpStatus.CONFLICT
                  : HttpStatus.BAD_REQUEST;
        res.status(status).json({ code: exception.code, message: exception.message });
    }
}
