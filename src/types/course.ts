export type TeeBoxId = string;

export interface Hole {
  /** 1–18 */
  number: number;
  par: number;
  /** 1–18 difficulty ranking used for handicap allocation. */
  strokeIndex: number;
  /** Yardage per tee box id. May be missing for user-entered courses. */
  yardage?: Record<TeeBoxId, number>;
}

export interface TeeBox {
  id: TeeBoxId;
  name: string;
  /** Swatch color for the tee marker. */
  color?: string;
  /** Course rating. Missing on incomplete user-entered courses. */
  rating?: number;
  /** Slope rating. Missing on incomplete user-entered courses. */
  slope?: number;
  totalYards?: number;
}

export interface Course {
  id: string;
  name: string;
  location?: string;
  holes: Hole[];
  teeBoxes: TeeBox[];
  /** True when entered by hand or imported; such courses can be edited and deleted. */
  userEntered?: boolean;
  source?: 'bundled' | 'user' | 'api';
  /** Provider name and id when imported from a course service. */
  provider?: string;
  providerId?: string;
  importedAt?: string; // ISO
}
