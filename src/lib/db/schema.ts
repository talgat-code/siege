import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  real,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

export const factions = pgTable("factions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull(),
  lore_description: text("lore_description").notNull().default(""),
  banner_url: text("banner_url"),
  current_territory_count: integer("current_territory_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  faction_id: uuid("faction_id").references(() => factions.id),
  rating: integer("rating").notNull().default(1200),
  created_at: timestamp("created_at").notNull().defaultNow(),
  total_games: integer("total_games").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
});

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  owner_faction_id: uuid("owner_faction_id").references(() => factions.id),
  contested: boolean("contested").notNull().default(false),
  x_coord: real("x_coord").notNull(),
  y_coord: real("y_coord").notNull(),
  neighbors: jsonb("neighbors").$type<string[]>().notNull().default([]),
  lore_description: text("lore_description").notNull().default(""),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  white_player_id: uuid("white_player_id")
    .notNull()
    .references(() => users.id),
  black_player_id: uuid("black_player_id")
    .notNull()
    .references(() => users.id),
  pgn: text("pgn").notNull().default(""),
  result: text("result").$type<"white" | "black" | "draw">(),
  result_reason: text("result_reason").$type<"checkmate" | "resign" | "timeout" | "draw" | "stalemate">(),
  time_control: text("time_control")
    .$type<"blitz" | "rapid" | "classical">()
    .notNull()
    .default("rapid"),
  mode: text("mode")
    .$type<"tournament" | "training" | "analysis">()
    .notNull()
    .default("tournament"),
  region_id: uuid("region_id").references(() => regions.id),
  faction_influence_white: integer("faction_influence_white").notNull().default(0),
  faction_influence_black: integer("faction_influence_black").notNull().default(0),
  played_at: timestamp("played_at").notNull().defaultNow(),
  analysis_status: text("analysis_status")
    .$type<"pending" | "done" | "failed">()
    .notNull()
    .default("pending"),
  // Timer state
  white_time_ms: integer("white_time_ms"),
  black_time_ms: integer("black_time_ms"),
  last_move_at: timestamp("last_move_at"),
  // ELO changes
  white_rating_before: integer("white_rating_before"),
  black_rating_before: integer("black_rating_before"),
  white_rating_after: integer("white_rating_after"),
  black_rating_after: integer("black_rating_after"),
});

export const matchmaking_queue = pgTable("matchmaking_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  time_control: text("time_control")
    .$type<"blitz" | "rapid" | "classical">()
    .notNull(),
  mode: text("mode")
    .$type<"tournament" | "training">()
    .notNull()
    .default("tournament"),
  joined_at: timestamp("joined_at").notNull().defaultNow(),
  game_id: uuid("game_id"),
  color: text("color").$type<"white" | "black">(),
});

export const game_analysis = pgTable("game_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  game_id: uuid("game_id")
    .notNull()
    .references(() => games.id),
  stockfish_evaluations: jsonb("stockfish_evaluations")
    .$type<number[]>()
    .notNull()
    .default([]),
  key_moments: jsonb("key_moments")
    .$type<
      Array<{
        move_number: number;
        type: "blunder" | "mistake" | "inaccuracy" | "brilliant";
        eval_before: number;
        eval_after: number;
        best_move: string;
      }>
    >()
    .notNull()
    .default([]),
  ai_narrative_text: text("ai_narrative_text"),
  llm_provider_used: text("llm_provider_used"),
  generated_at: timestamp("generated_at").notNull().defaultNow(),
});

export const weekly_wars = pgTable("weekly_wars", {
  id: uuid("id").primaryKey().defaultRandom(),
  region_id: uuid("region_id")
    .notNull()
    .references(() => regions.id),
  faction_a_id: uuid("faction_a_id")
    .notNull()
    .references(() => factions.id),
  faction_b_id: uuid("faction_b_id")
    .notNull()
    .references(() => factions.id),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  faction_a_points: integer("faction_a_points").notNull().default(0),
  faction_b_points: integer("faction_b_points").notNull().default(0),
  winner_faction_id: uuid("winner_faction_id").references(() => factions.id),
});

export const faction_contributions = pgTable("faction_contributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id),
  faction_id: uuid("faction_id")
    .notNull()
    .references(() => factions.id),
  war_id: uuid("war_id")
    .notNull()
    .references(() => weekly_wars.id),
  points_contributed: integer("points_contributed").notNull().default(0),
  games_played: integer("games_played").notNull().default(0),
  wins_in_war: integer("wins_in_war").notNull().default(0),
});

export const player_stats = pgTable("player_stats", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  opening_preferences: jsonb("opening_preferences")
    .$type<string[]>()
    .notNull()
    .default([]),
  tactical_win_rate: real("tactical_win_rate").notNull().default(0),
  positional_win_rate: real("positional_win_rate").notNull().default(0),
  blunder_frequency: real("blunder_frequency").notNull().default(0),
  average_game_length: real("average_game_length").notNull().default(0),
  aggression_score: real("aggression_score").notNull().default(0),
  dna_description_text: text("dna_description_text"),
  last_calculated_at: timestamp("last_calculated_at").notNull().defaultNow(),
});

export const ai_cache = pgTable("ai_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  prompt_hash: text("prompt_hash").notNull().unique(),
  response_text: text("response_text").notNull(),
  provider_used: text("provider_used").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  hit_count: integer("hit_count").notNull().default(0),
});
