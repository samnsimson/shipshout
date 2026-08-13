import { ShipshoutApi } from '@/lib/shipshout.api';

export class RepositoriesApi {
    static getClient() {
        return ShipshoutApi.getApiClient();
    }
}
