import { apiFetch } from './api-client';

export async function getSessionUser() {
  try {
    return await apiFetch('/auth/me');
  } catch {
    return null;
  }
}
