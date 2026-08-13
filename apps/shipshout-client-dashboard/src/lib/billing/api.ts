import { ShipshoutApiUtils } from '@/lib/shipshout-api';

export async function getBillingApi() {
    return ShipshoutApiUtils.getApiClient();
}
