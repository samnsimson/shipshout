'use client';

import { create } from 'zustand';
import type { ShoutoutDetailDto } from './shoutouts.api';

type ShoutoutDetailStore = {
    shoutout: ShoutoutDetailDto | null;
    hydrate: (shoutout: ShoutoutDetailDto) => void;
    setShoutout: (shoutout: ShoutoutDetailDto) => void;
};

export const useShoutoutDetailStore = create<ShoutoutDetailStore>((set) => ({
    shoutout: null,
    hydrate: (shoutout) => set({ shoutout }),
    setShoutout: (shoutout) => set({ shoutout }),
}));
