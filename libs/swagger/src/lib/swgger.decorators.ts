import { applyDecorators, Type } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

export interface ApiResourceParamOptions {
    name: string;
    description?: string;
}

export interface ApiResourceQueryOptions {
    name: string;
    required?: boolean;
    description?: string;
}

export interface ApiResourceErrorOptions {
    status: number;
    description: string;
}

export interface ApiResourceOptions {
    /** OpenAPI tag; omit when @ApiTags is on the controller */
    name?: string;
    tag?: string;
    operationId: string;
    status: number;
    isPublic?: boolean;
    response?: Type<unknown>;
    body?: Type<unknown>;
    params?: ApiResourceParamOptions[];
    queries?: ApiResourceQueryOptions[];
    errors?: ApiResourceErrorOptions[];
}

export function humanizeOperationId(operationId: string): string {
    return operationId
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (character) => character.toUpperCase())
        .trim();
}

export const ApiResource = (options: ApiResourceOptions) => {
    const decorators: (MethodDecorator | ClassDecorator)[] = [];
    const tag = options.tag ?? options.name;
    const summary = humanizeOperationId(options.operationId);

    if (tag) decorators.push(ApiTags(tag));

    decorators.push(
        ApiOperation({
            operationId: options.operationId,
            summary,
            description: summary,
        }),
    );

    decorators.push(
        ApiResponse({
            status: options.status,
            description: summary,
            ...(options.response ? { type: options.response } : {}),
        }),
    );

    if (options.body) decorators.push(ApiBody({ type: options.body }));

    for (const param of options.params ?? []) decorators.push(ApiParam({ name: param.name, description: param.description }));

    for (const query of options.queries ?? []) decorators.push(ApiQuery({ name: query.name, required: query.required, description: query.description }));

    for (const error of options.errors ?? []) decorators.push(ApiResponse({ status: error.status, description: error.description }));

    return applyDecorators(...decorators);
};
