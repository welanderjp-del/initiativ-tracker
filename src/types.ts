export interface MonsterData {
  name: string;
  slug: string;
}

export interface TrackerRow {
  id: string;
  initiative: number | "";
  name: string;
  hp: number | "";
  notes: string;
  monsterSlug?: string;
}

export type Theme = "surface" | "faerun" | "underdark" | "feywild" | "shadowfell" | "nine-hells" | "mount-celestia";

export interface AppState {
  rows: TrackerRow[];
  currentTurnIndex: number;
  round: number;
  theme: Theme;
}
