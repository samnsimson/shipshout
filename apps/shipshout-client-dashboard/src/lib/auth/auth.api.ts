import { ApiErrorUtils } from '@/lib/api/api-error.utils';
import { ApiClientFactory } from '@/lib/api/api-client.factory';
import { AuthUtils } from './auth.utils';

export class AuthApi {
    static apiBaseUrl(): string {
        return ApiClientFactory.apiBaseUrl();
    }

    static login(body: { login: string; password: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerLogin({ body, redirect: 'manual' }));
    }

    static register(body: { name: string; username: string; email: string; password: string; displayUsername?: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerRegister({ body }));
    }

    static forgotPassword(body: { email: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerForgotPassword({ body }));
    }

    static resendVerification(body: { email: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerResendVerification({ body }));
    }

    static resetPassword(body: { token: string; newPassword: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerResetPassword({ body }));
    }

    static checkUsername(body: { username: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerIsUsernameAvailable({ body }));
    }

    static session() {
        return ApiClientFactory.fetchProtected((api) => api.authControllerSession());
    }

    static refresh() {
        return ApiClientFactory.fetchPublic((api) => api.authControllerRefresh());
    }

    static logout() {
        return ApiClientFactory.fetchProtected((api) => api.authControllerLogout());
    }

    static verifyEmail(body: { token: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerVerifyEmail({ body }));
    }

    static verifyOneTimeToken(body: { token: string }) {
        return ApiClientFactory.fetchPublic((api) => api.authControllerVerifyOneTimeToken({ body }));
    }

    static applySetCookies(response: Response): Promise<void> {
        return AuthUtils.applyToCookieStore(response);
    }

    static readErrorMessage(result: { error?: unknown; response?: Response }): string {
        return ApiErrorUtils.message(result.error, `Request failed (${result.response?.status ?? 'unknown'})`);
    }
}
