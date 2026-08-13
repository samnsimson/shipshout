import { ShipshoutApiUtils } from '../shipshout-api';

export async function getBillingApi() {
    return ShipshoutApiUtils.getApiClient();
}
