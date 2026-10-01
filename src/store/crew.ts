import { useMemo } from 'react';
import type { Player, PlayerProfile, Round } from '@/types';
import { newId } from '@/lib/id';
import { playerFromProfile, sortProfiles } from '@/lib/profiles';
import { MAX_PLAYERS, useRoundStore } from './roundStore';
import { useProfileStore } from './profileStore';
import { usePreferences } from './preferencesStore';
import { useCourseStore } from './courseStore';

/** The phone owner's profile (Profile tab) and everyone else (Friends), most recently played first. */
export function useMe(): { me: PlayerProfile | undefined; friends: PlayerProfile[] } {
  const meProfileId = usePreferences((s) => s.meProfileId);
  const profiles = useProfileStore((s) => s.profiles);
  return useMemo(() => {
    const me = meProfileId ? profiles.find((p) => p.id === meProfileId) : undefined;
    return { me, friends: sortProfiles(profiles.filter((p) => p.id !== me?.id)) };
  }, [profiles, meProfileId]);
}

/** Create or rename the owner's profile. Returns its id. */
export function saveMyName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const { meProfileId, update } = usePreferences.getState();
  const store = useProfileStore.getState();
  const existing = meProfileId ? store.profiles.find((p) => p.id === meProfileId) : undefined;
  if (existing) {
    store.updateProfile(existing.id, { name: trimmed });
    return existing.id;
  }
  const created = store.addProfile(trimmed);
  update({ meProfileId: created.id });
  return created.id;
}

/** Whether a profile is in the round being built. */
export function inCrew(players: Player[], profileId: string): boolean {
  return players.some((p) => p.profileId === profileId);
}

/** Add a saved profile to the draft (up to four), or take it out again. Returns false when the group is full. */
export function toggleCrew(profile: PlayerProfile): boolean {
  const { draft, setDraftPlayers } = useRoundStore.getState();
  const named = draft.players.filter((p) => p.name.trim());
  if (inCrew(named, profile.id)) {
    setDraftPlayers(named.filter((p) => p.profileId !== profile.id));
    return true;
  }
  if (named.length >= MAX_PLAYERS) return false;
  setDraftPlayers([...named, playerFromProfile(profile, newId('p'), draft.teeBoxId ?? '')]);
  return true;
}

/** Put the owner first in the draft when nobody has been picked yet. */
export function ensureMeInCrew(me: PlayerProfile | undefined): void {
  if (!me) return;
  const { draft, setDraftPlayers } = useRoundStore.getState();
  const named = draft.players.filter((p) => p.name.trim());
  if (named.length > 0) return;
  setDraftPlayers([playerFromProfile(me, newId('p'), draft.teeBoxId ?? '')]);
}

/** Line up the same course, tees and people as a past round (Friends "Rematch"). */
export function rematch(round: Round): void {
  const { setDraftCourse, setDraftPlayers } = useRoundStore.getState();
  const course = useCourseStore.getState().byId(round.course.id) ?? round.course;
  const teeBoxId = course.teeBoxes.some((t) => t.id === round.teeBoxId) ? round.teeBoxId : course.teeBoxes[0]?.id;
  if (!teeBoxId) return;
  setDraftCourse(course, teeBoxId);
  const profiles = useProfileStore.getState().profiles;
  setDraftPlayers(
    round.players.slice(0, MAX_PLAYERS).map((p) => {
      const profile = p.profileId ? profiles.find((x) => x.id === p.profileId) : undefined;
      return profile ? playerFromProfile(profile, newId('p'), teeBoxId) : { id: newId('p'), name: p.name, handicapIndex: p.handicapIndex, teeBoxId };
    }),
  );
}

/** Replace the crew with a saved group's members. */
export function groupAsCrew(memberIds: string[]): void {
  const { draft, setDraftPlayers } = useRoundStore.getState();
  const profiles = useProfileStore.getState().profiles;
  setDraftPlayers(
    memberIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is PlayerProfile => !!p)
      .slice(0, MAX_PLAYERS)
      .map((p) => playerFromProfile(p, newId('p'), draft.teeBoxId ?? '')),
  );
}
