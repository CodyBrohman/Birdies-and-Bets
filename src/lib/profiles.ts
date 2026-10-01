// Player profiles and groups. Pure: how a round's players map onto saved profiles, and how an index history grows.
import type { HistoryEntry, Player, PlayerGroup, PlayerProfile, RoundSummary, RoundSummaryPlayer, TeeBoxId } from '@/types';

export const MIN_GROUP_SIZE = 2;
export const MAX_GROUP_SIZE = 4;
export const MAX_PROFILE_NAME = 24;

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function sameName(a: string, b: string): boolean {
  const n = normalizeName(a);
  return n !== '' && n === normalizeName(b);
}

export function findProfileByName(profiles: PlayerProfile[], name: string): PlayerProfile | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  return profiles.find((p) => normalizeName(p.name) === n);
}

/** Indexes are entered to one decimal; treat anything closer than that as unchanged. */
export function sameIndex(a: number | undefined, b: number | undefined): boolean {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) < 0.05;
}

export function newProfile(id: string, name: string, handicapIndex: number | undefined, at: string): PlayerProfile {
  return {
    id,
    name: name.trim().slice(0, MAX_PROFILE_NAME),
    handicapIndex,
    indexHistory: handicapIndex == null ? [] : [{ at, index: handicapIndex }],
    createdAt: at,
  };
}

/** Set the current index. A change is appended to the history; the same value is a no-op. */
export function withIndex(profile: PlayerProfile, handicapIndex: number | undefined, at: string): PlayerProfile {
  if (sameIndex(profile.handicapIndex, handicapIndex)) return profile;
  return { ...profile, handicapIndex, indexHistory: [...profile.indexHistory, { at, index: handicapIndex ?? null }] };
}

/** Most recently played first, never-played profiles after, alphabetical within each. */
export function sortProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return [...profiles].sort((a, b) => {
    if (a.lastPlayedAt !== b.lastPlayedAt) {
      if (!a.lastPlayedAt) return 1;
      if (!b.lastPlayedAt) return -1;
      return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
    }
    return a.name.localeCompare(b.name);
  });
}

/** A round-player seeded from a profile: carries the current index and a link back. */
export function playerFromProfile(profile: PlayerProfile, id: string, teeBoxId: TeeBoxId): Player {
  return { id, name: profile.name, handicapIndex: profile.handicapIndex, teeBoxId, profileId: profile.id };
}

/**
 * When a round starts: link each player to a profile (by id, then by name, else a new one), record a changed
 * index and the date played. A player typed by name with no index leaves the profile's index alone.
 */
export function syncProfilesWithPlayers(profiles: PlayerProfile[], players: Player[], at: string, makeId: () => string): { profiles: PlayerProfile[]; players: Player[] } {
  let next = [...profiles];
  const linked = players.map((player) => {
    let profile = player.profileId ? next.find((p) => p.id === player.profileId) : undefined;
    if (!profile) profile = findProfileByName(next, player.name);
    if (!profile) {
      profile = { ...newProfile(makeId(), player.name, player.handicapIndex, at), lastPlayedAt: at };
      next.push(profile);
    } else {
      const explicit = player.profileId === profile.id || player.handicapIndex != null;
      const updated = { ...(explicit ? withIndex(profile, player.handicapIndex, at) : profile), lastPlayedAt: at };
      next = next.map((p) => (p.id === updated.id ? updated : p));
      profile = updated;
    }
    return { ...player, profileId: profile.id };
  });
  return { profiles: next, players: linked };
}

/** Members that still exist, in seat order. */
export function groupMembers(group: PlayerGroup, profiles: PlayerProfile[]): PlayerProfile[] {
  return group.memberIds.map((id) => profiles.find((p) => p.id === id)).filter((p): p is PlayerProfile => p != null);
}

/** Drop a deleted profile from every group; a group that falls below the minimum goes too. */
export function groupsWithoutProfile(groups: PlayerGroup[], profileId: string): PlayerGroup[] {
  return groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== profileId) })).filter((g) => g.memberIds.length >= MIN_GROUP_SIZE);
}

export interface ProfileRound {
  summary: RoundSummary;
  player: RoundSummaryPlayer;
}

/** Finished rounds this profile played in: linked by id where the round recorded it, else by name. Newest first. */
export function roundsForProfile(profile: PlayerProfile, entries: HistoryEntry[]): ProfileRound[] {
  const out: ProfileRound[] = [];
  for (const entry of entries) {
    const byId = entry.round?.players.find((p) => p.profileId === profile.id);
    const player = byId ? entry.summary.players.find((p) => p.id === byId.id) : entry.summary.players.find((p) => sameName(p.name, profile.name));
    if (player) out.push({ summary: entry.summary, player });
  }
  return out.sort((a, b) => b.summary.completedAt.localeCompare(a.summary.completedAt));
}

export function isProfile(v: unknown): v is PlayerProfile {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && Array.isArray(o.indexHistory) && typeof o.createdAt === 'string';
}

export function isGroup(v: unknown): v is PlayerGroup {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.name === 'string' && Array.isArray(o.memberIds) && o.memberIds.every((m) => typeof m === 'string');
}
