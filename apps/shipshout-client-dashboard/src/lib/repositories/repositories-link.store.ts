'use client';

import { create } from 'zustand';
import type { GithubRepoDto } from '@shipshout/api-client';

export type VisibilityFilter = 'all' | 'public' | 'private';

type RepositoriesLinkStore = {
    selected: number[];
    search: string;
    ownerFilter: string;
    visibilityFilter: VisibilityFilter;
    setSearch: (search: string) => void;
    setOwnerFilter: (owner: string) => void;
    setVisibilityFilter: (visibility: VisibilityFilter) => void;
    toggleRow: (repo: GithubRepoDto, checked: boolean, isSelectable: (repo: GithubRepoDto) => boolean) => void;
    toggleAll: (checked: boolean, visibleIds: number[]) => void;
    clearSelected: () => void;
};

export const useRepositoriesLinkStore = create<RepositoriesLinkStore>((set) => ({
    selected: [],
    search: '',
    ownerFilter: 'all',
    visibilityFilter: 'all',
    setSearch: (search) => set({ search }),
    setOwnerFilter: (ownerFilter) => set({ ownerFilter }),
    setVisibilityFilter: (visibilityFilter) => set({ visibilityFilter }),
    toggleRow: (repo, checked, isSelectable) => {
        if (!isSelectable(repo)) return;
        const githubId = repo.githubId;
        set((state) => {
            if (checked) {
                if (state.selected.includes(githubId)) return state;
                return { selected: [...state.selected, githubId] };
            }
            return { selected: state.selected.filter((id) => id !== githubId) };
        });
    },
    toggleAll: (checked, visibleIds) => {
        set((state) => {
            if (checked) return { selected: [...new Set([...state.selected, ...visibleIds])] };
            return { selected: state.selected.filter((id) => !visibleIds.includes(id)) };
        });
    },
    clearSelected: () => set({ selected: [] }),
}));
