import { Init1785733057155 } from '../migrations/1785733057155-Init.js';
import { Ingestion1785734410746 } from '../migrations/1785734410746-Ingestion.js';
import { Drafts1785734598224 } from '../migrations/1785734598224-Drafts.js';
import { Dispatch1785734986934 } from '../migrations/1785734986934-Dispatch.js';
import { Billing1785735200000 } from '../migrations/1785735200000-Billing.js';
import { RepositoryWebhookStatus1785735300000 } from '../migrations/1785735300000-RepositoryWebhookStatus.js';

export const MIGRATIONS = [
    Init1785733057155,
    Ingestion1785734410746,
    Drafts1785734598224,
    Dispatch1785734986934,
    Billing1785735200000,
    RepositoryWebhookStatus1785735300000,
];
