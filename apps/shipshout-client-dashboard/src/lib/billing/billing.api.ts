import { ShipshoutApi } from '@/lib/shipshout.api';

export class BillingApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }
}
