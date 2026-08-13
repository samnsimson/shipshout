import { ShipshoutApi } from '@/lib/shipshout.api';
import { AuthUtils } from './auth.utils';

export class AuthApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }

    static apiBaseUrl(): string {
        return ShipshoutApi.apiBaseUrl();
    }

    static login(body: { login: string; password: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerLogin({ ...requestOptions, body, redirect: 'manual' }));
    }

    static register(body: { name: string; username: string; email: string; password: string; displayUsername?: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerRegister({ ...requestOptions, body }));
    }

    static forgotPassword(body: { email: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerForgotPassword({ ...requestOptions, body }));
    }

    static resendVerification(body: { email: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerResendVerification({ ...requestOptions, body }));
    }

    static resetPassword(body: { token: string; newPassword: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerResetPassword({ ...requestOptions, body }));
    }

    static checkUsername(body: { username: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerIsUsernameAvailable({ ...requestOptions, body }));
    }

    static session() {
        return AuthApi.withClient((api, requestOptions) => api.authControllerSession(requestOptions));
    }

    static refresh() {
        return AuthApi.withClient((api, requestOptions) => api.authControllerRefresh(requestOptions));
    }

    static logout() {
        return AuthApi.withClient((api, requestOptions) => api.authControllerLogout(requestOptions));
    }

    static verifyEmail(body: { token: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerVerifyEmail({ ...requestOptions, body }));
    }

    static verifyOneTimeToken(body: { token: string }) {
        return AuthApi.withClient((api, requestOptions) => api.authControllerVerifyOneTimeToken({ ...requestOptions, body }));
    }

    static applySetCookies(response: Response): Promise<void> {
        return AuthUtils.applyToCookieStore(response);
    }

    static readErrorMessage(result: { error?: unknown; response?: Response }): string {
        return ShipshoutApi.errorMessage(result.error, `Request failed (${result.response?.status ?? 'unknown'})`);
    }

    private static async withClient<T>(call: (api: Awaited<ReturnType<typeof ShipshoutApi.getApiClient>>['api'], requestOptions: Awaited<ReturnType<typeof ShipshoutApi.getApiClientOptions>>) => T) {
        const { api, requestOptions } = await AuthApi.getClient();
        return call(api, requestOptions);
    }
}
