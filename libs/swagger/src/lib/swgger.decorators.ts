import { applyDecorators, Type } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

export interface ApiResourceOptions {
    name: string;
    summary: string;
    description: string;
    status: number;
    isPublic?: boolean;
    response: Type<unknown>;
}

export const ApiResource = (options: ApiResourceOptions) => {
    const decorators: (MethodDecorator | ClassDecorator)[] = [];
    decorators.push(ApiTags(options.name));
    decorators.push(ApiOperation({ operationId: options.name, summary: options.summary, description: options.description }));
    decorators.push(ApiResponse({ status: options.status, description: options.description, type: options.response }));
    return applyDecorators(...decorators);
};
