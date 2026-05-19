export type FactionSlug = "northern-horde" | "iron-empire" | "sea-republic" | "shadow-guild";

export interface Faction {
  id: string;
  name: string;
  slug: FactionSlug;
  color: string;
  lore_description: string;
  banner_url: string | null;
  current_territory_count: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  faction_id: string;
  rating: number;
  created_at: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  faction?: Faction;
}

export interface Region {
  id: string;
  name: string;
  slug: string;
  owner_faction_id: string | null;
  contested: boolean;
  x_coord: number;
  y_coord: number;
  neighbors: string[];
  lore_description: string;
  owner_faction?: Faction;
}

export type GameResult = "white" | "black" | "draw";
export type GameMode = "tournament" | "training" | "analysis";
export type TimeControl = "blitz" | "rapid" | "classical";

export interface Game {
  id: string;
  white_player_id: string;
  black_player_id: string;
  pgn: string;
  result: GameResult | null;
  time_control: TimeControl;
  mode: GameMode;
  region_id: string | null;
  faction_influence_white: number;
  faction_influence_black: number;
  played_at: string;
  analysis_status: "pending" | "done" | "failed";
}

export interface WeeklyWar {
  id: string;
  region_id: string;
  faction_a_id: string;
  faction_b_id: string;
  start_date: string;
  end_date: string;
  faction_a_points: number;
  faction_b_points: number;
  winner_faction_id: string | null;
  region?: Region;
  faction_a?: Faction;
  faction_b?: Faction;
}

// Chess-specific types
export interface EvaluationBar {
  score: number; // centipawns, positive = white advantage
  mate: number | null;
}

export type HintType = "warning" | "opportunity" | "info";

export interface Hint {
  type: HintType;
  text: string;
}

export interface StockfishResult {
  evaluation: EvaluationBar;
  bestMove: string;
  ponder: string | null;
  threats: string[];
  hints: Hint[];
}
