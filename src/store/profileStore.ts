import { useMemo } from 'react';
import { create } from 'zustand';
import type { Player, PlayerGroup, PlayerProfile } from '@/types';
import { newId } from '@/lib/id';
import { groupsWithoutProfile, isGroup, isProfile, MAX_GROUP_SIZE, MAX_PROFILE_NAME, MIN_GROUP_SIZE, newProfile, sortProfiles, syncProfilesWithPlayers, withIndex } from '@/lib/profiles';
import { storage, STORAGE_KEYS } from './storage';

interface ProfileState {
  hydrated: boolean;
  profiles: PlayerProfile[];
  groups: PlayerGroup[];
  hydrate(): Promise<void>;
  addProfile(name: string, handicapIndex?: number): PlayerProfile;
  /** Rename and/or set the index. Passing `handicapIndex: undefined` explicitly clears it. */
  updateProfile(id: string, patch: { name?: string; handicapIndex?: number }): void;
  removeProfile(id: string): void;
  /** Create (no id) or replace (with id) a group. Member count is clamped to 2–4. Returns null when it cannot be saved. */
  saveGroup(group: { id?: string; name: string; memberIds: string[] }): PlayerGroup | null;
  removeGroup(id: string): void;
  /** Called by the round store when a round starts. Returns the players with their profile links. */
  syncFromRound(players: Player[], at: string): Player[];
}

export const useProfileStore = create<ProfileState>()((set, get) => {
  const persistProfiles = (profiles: PlayerProfile[]) => void storage.set(STORAGE_KEYS.playerProfiles, profiles);
  const persistGroups = (groups: PlayerGroup[]) => void storage.set(STORAGE_KEYS.playerGroups, groups);
  return {
    hydrated: false,
    profiles: [],
    groups: [],

    async hydrate() {
      try {
        const [profiles, groups] = await Promise.all([storage.get<unknown>(STORAGE_KEYS.playerProfiles), storage.get<unknown>(STORAGE_KEYS.playerGroups)]);
        set({
          profiles: Array.isArray(profiles) ? profiles.filter(isProfile) : [],
          groups: Array.isArray(groups) ? groups.filter(isGroup) : [],
          hydrated: true,
        });
      } catch {
        set({ profiles: [], groups: [], hydrated: true });
      }
    },

    addProfile(name, handicapIndex) {
      const profile = newProfile(newId('pr'), name, handicapIndex, new Date().toISOString());
      const profiles = [...get().profiles, profile];
      set({ profiles });
      persistProfiles(profiles);
      return profile;
    },

    updateProfile(id, patch) {
      const at = new Date().toISOString();
      const profiles = get().profiles.map((p) => {
        if (p.id !== id) return p;
        let next = p;
        if (patch.name != null && patch.name.trim()) next = { ...next, name: patch.name.trim().slice(0, MAX_PROFILE_NAME) };
        if ('handicapIndex' in patch) next = withIndex(next, patch.handicapIndex, at);
        return next;
      });
      set({ profiles });
      persistProfiles(profiles);
    },

    removeProfile(id) {
      const profiles = get().profiles.filter((p) => p.id !== id);
      const groups = groupsWithoutProfile(get().groups, id);
      set({ profiles, groups });
      persistProfiles(profiles);
      persistGroups(groups);
    },

    saveGroup(input) {
      const known = new Set(get().profiles.map((p) => p.id));
      const memberIds = [...new Set(input.memberIds)].filter((id) => known.has(id)).slice(0, MAX_GROUP_SIZE);
      const name = input.name.trim().slice(0, MAX_PROFILE_NAME);
      if (!name || memberIds.length < MIN_GROUP_SIZE) return null;
      const group: PlayerGroup = { id: input.id ?? newId('grp'), name, memberIds };
      const existing = get().groups.some((g) => g.id === group.id);
      const groups = existing ? get().groups.map((g) => (g.id === group.id ? group : g)) : [...get().groups, group];
      set({ groups });
      persistGroups(groups);
      return group;
    },

    removeGroup(id) {
      const groups = get().groups.filter((g) => g.id !== id);
      set({ groups });
      persistGroups(groups);
    },

    syncFromRound(players, at) {
      const r = syncProfilesWithPlayers(get().profiles, players, at, () => newId('pr'));
      set({ profiles: r.profiles });
      persistProfiles(r.profiles);
      return r.players;
    },
  };
});

/** Profiles for pickers: most recently played first. */
export function useSortedProfiles(): PlayerProfile[] {
  const profiles = useProfileStore((s) => s.profiles);
  return useMemo(() => sortProfiles(profiles), [profiles]);
}

export function useProfile(id: string | undefined): PlayerProfile | undefined {
  return useProfileStore((s) => (id ? s.profiles.find((p) => p.id === id) : undefined));
}
