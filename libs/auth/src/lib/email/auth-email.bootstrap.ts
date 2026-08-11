import { Injectable, OnModuleInit } from '@nestjs/common';
import { EmailAdapter } from './email-adapter';
import { AuthUtils } from '../utils/auth-http';

/** Wires the Nest-managed EmailAdapter into AuthUtils for Better Auth callbacks. */
@Injectable()
export class AuthEmailBootstrap implements OnModuleInit {
    constructor(private readonly emailAdapter: EmailAdapter) {}

    onModuleInit(): void {
        AuthUtils.configureEmailAdapter(this.emailAdapter);
    }
}
