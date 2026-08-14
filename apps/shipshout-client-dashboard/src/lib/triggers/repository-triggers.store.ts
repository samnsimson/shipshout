'use client';

import { create } from 'zustand';
import type { RepositoryTriggersDto } from '@shipshout/api-client';

type RepositoryTriggersStore = {
    triggers: RepositoryTriggersDto | null;
    hydrate: (triggers: RepositoryTriggersDto) => void;
    setTrigger: (key: keyof RepositoryTriggersDto, enabled: boolean) => void;
};

export const useRepositoryTriggersStore = create<RepositoryTriggersStore>((set) => ({
    triggers: null,
    hydrate: (triggers) => set({ triggers }),
    setTrigger: (key, enabled) =>
        set((state) => {
            if (!state.triggers) return state;
            return { triggers: { ...state.triggers, [key]: enabled } };
        }),
}));
