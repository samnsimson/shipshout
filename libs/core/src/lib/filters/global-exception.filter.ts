import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequestContext } from '../request-context';
import { HttpErrorResponse } from './http-error-response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const body = this.toErrorResponse(exception, request.url ?? request.path ?? '');
        if (body.statusCode >= 500) this.logger.error(this.logMessage(exception, body), exception instanceof Error ? exception.stack : undefined);
        else this.logger.warn(this.logMessage(exception, body));

        response.status(body.statusCode).json(body);
    }

    private toErrorResponse(exception: unknown, path: string): HttpErrorResponse {
        const transactionId = RequestContext.getTransactionId() ?? null;
        const timestamp = new Date().toISOString();

        if (exception instanceof HttpException) {
            const statusCode = exception.getStatus();
            const raw = exception.getResponse();
            const message = this.extractMessage(raw, exception.message);
            const error = this.extractError(raw, statusCode);
            return { statusCode, message, error, transactionId, path, timestamp };
        }

        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            transactionId,
            path,
            timestamp,
        };
    }

    private extractMessage(raw: string | object, fallback: string): string | string[] {
        if (typeof raw === 'string') return raw;
        if (raw && typeof raw === 'object' && 'message' in raw) {
            const message = (raw as { message: unknown }).message;
            if (typeof message === 'string' || Array.isArray(message)) return message as string | string[];
        }
        return fallback;
    }

    private extractError(raw: string | object, statusCode: number): string {
        if (raw && typeof raw === 'object' && 'error' in raw) {
            const error = (raw as { error: unknown }).error;
            if (typeof error === 'string') return error;
        }
        return this.statusText(statusCode);
    }

    private statusText(statusCode: number): string {
        const key = HttpStatus[statusCode];
        if (typeof key !== 'string') return 'Error';
        return key
            .toLowerCase()
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    private logMessage(exception: unknown, body: HttpErrorResponse): string {
        if (exception instanceof HttpException)
            return `${body.statusCode} ${body.path} ${typeof body.message === 'string' ? body.message : body.message.join('; ')}`;
        if (exception instanceof Error) return `${body.statusCode} ${body.path} ${exception.message}`;
        return `${body.statusCode} ${body.path} Unexpected error`;
    }
}
