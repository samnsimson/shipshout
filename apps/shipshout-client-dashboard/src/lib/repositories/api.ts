import { ShipshoutApiUtils } from '../shipshout-api';

export async function getRepositoriesApi() {
    return ShipshoutApiUtils.getApiClient();
}
