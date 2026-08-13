import { ShipshoutApiUtils } from '@/lib/shipshout-api';

export async function getRepositoriesApi() {
    return ShipshoutApiUtils.getApiClient();
}
