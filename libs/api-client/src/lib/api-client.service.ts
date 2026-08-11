import { Inject, Injectable } from '@nestjs/common';
import { ApiClient } from './client/index.js';
import { ApiClientModuleOptions } from './api-client.options.js';

@Injectable()
export class ApiClientService extends ApiClient {
    constructor(@Inject(API_CLIENT_OPTIONS) private readonly options: ApiClientModuleOptions) {
        super();
    }
}
