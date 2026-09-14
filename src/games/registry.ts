// The ONLY file that changes when adding a game: import it, add it to the list.
import type { GameMode } from '../types/game';
import { skins } from './skins';
import { matchPlay } from './matchPlay';
import { nassau } from './nassau';
import { strokePlay } from './strokePlay';
import { vegas } from './vegas';
import { bingoBangoBongo } from './bingoBangoBongo';
import { stableford } from './stableford';
import { hotSeat } from './hotSeat';
import { wolf } from './wolf';

export const GAME_MODES: readonly GameMode[] = [skins, matchPlay, nassau, strokePlay, vegas, bingoBangoBongo, hotSeat, stableford, wolf];

export function getGame(id: string): GameMode | undefined {
  return GAME_MODES.find((g) => g.id === id);
}

export function bettingGames(): GameMode[] {
  return GAME_MODES.filter((g) => g.category === 'betting');
}

export function socialGames(): GameMode[] {
  return GAME_MODES.filter((g) => g.category === 'social');
}
