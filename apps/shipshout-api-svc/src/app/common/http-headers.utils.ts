import { IncomingHttpHeaders } from 'node:http';

export class HttpHeadersUtils {
    static toWebHeaders(incoming: IncomingHttpHeaders): Headers {
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
                for (const item of value) headers.append(key, item);
                continue;
            }
            headers.set(key, value);
        }
        return headers;
    }
}
