export type HttpErrorResponse = {
    statusCode: number;
    message: string | string[];
    error: string;
    transactionId: string | null;
    path: string;
    timestamp: string;
};
