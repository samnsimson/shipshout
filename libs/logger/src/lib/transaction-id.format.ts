import { RequestContext } from '@shipshout/core';
import * as winston from 'winston';

export const transactionIdFormat = winston.format((info) => {
    const transactionId = RequestContext.getTransactionId();
    if (!transactionId) return info;

    info.transactionId = transactionId;

    if (typeof info.message === 'string') {
        const prefix = `[${transactionId}]`;
        if (!info.message.startsWith(prefix)) info.message = `${prefix} ${info.message}`;
    }

    return info;
});
