export interface TrackerRow {
  id: string;
  initiative: number | "";
  name: string;
  hp: number | "";
  notes: string;
  monsterSlug?: string;
  imageError?: boolean;
}

export type Theme = "surface" | "faerun" | "underdark" | "feywild" | "shadowfell" | "nine-hells" | "mount-celestia" | "cormanthor";

export interface AppState {
  rows: TrackerRow[];
  currentTurnIndex: number;
  round: number;
  theme: Theme;
}
