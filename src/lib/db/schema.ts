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
  gold_coins: integer("gold_coins").notNull().default(100),
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
    .$type<"tournament" | "training" | "analysis" | "bot">()
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
  white_time_ms: integer("white_time_ms"),
  black_time_ms: integer("black_time_ms"),
  last_move_at: timestamp("last_move_at"),
  white_rating_before: integer("white_rating_before"),
  black_rating_before: integer("black_rating_before"),
  white_rating_after: integer("white_rating_after"),
  black_rating_after: integer("black_rating_after"),
  // Bot game support
  is_bot_game: boolean("is_bot_game").notNull().default(false),
  bot_color: text("bot_color").$type<"white" | "black">(),
  bot_difficulty: integer("bot_difficulty"),
  // Friend room
  invite_code: text("invite_code").unique(),
  // Hint usage in this game
  hints_used_white: integer("hints_used_white").notNull().default(0),
  hints_used_black: integer("hints_used_black").notNull().default(0),
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

/* ─── New tables (Stage 2 iteration) ───────────────────────── */

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  starts_at: timestamp("starts_at").notNull(),
  ends_at: timestamp("ends_at").notNull(),
  is_active: boolean("is_active").notNull().default(false),
  prize_description: text("prize_description").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const season_scores = pgTable("season_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  season_id: uuid("season_id").notNull().references(() => seasons.id),
  user_id: uuid("user_id").notNull().references(() => users.id),
  faction_id: uuid("faction_id").references(() => factions.id),
  points: integer("points").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  games_played: integer("games_played").notNull().default(0),
  rank: integer("rank"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const fronts = pgTable("fronts", {
  id: uuid("id").primaryKey().defaultRandom(),
  faction_a_id: uuid("faction_a_id").notNull().references(() => factions.id),
  faction_b_id: uuid("faction_b_id").notNull().references(() => factions.id),
  region_id: uuid("region_id").notNull().references(() => regions.id),
  season_id: uuid("season_id").references(() => seasons.id),
  is_active: boolean("is_active").notNull().default(true),
  points_a: integer("points_a").notNull().default(0),
  points_b: integer("points_b").notNull().default(0),
  started_at: timestamp("started_at").notNull().defaultNow(),
  ends_at: timestamp("ends_at"),
  winner_faction_id: uuid("winner_faction_id").references(() => factions.id),
});

export const hints = pgTable("hints", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  game_id: uuid("game_id").notNull().references(() => games.id),
  hint_type: text("hint_type").$type<"best_move" | "eval" | "plan">().notNull().default("best_move"),
  move_number: integer("move_number").notNull(),
  cost_gold: integer("cost_gold").notNull().default(10),
  best_move_uci: text("best_move_uci"),
  eval_cp: integer("eval_cp"),
  used_at: timestamp("used_at").notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("🏆"),
  requirement_type: text("requirement_type")
    .$type<"wins" | "games" | "rating" | "streak" | "faction_wins" | "blitz_wins" | "no_blunders">()
    .notNull(),
  requirement_value: integer("requirement_value").notNull().default(1),
  reward_gold: integer("reward_gold").notNull().default(50),
  is_hidden: boolean("is_hidden").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const user_achievements = pgTable("user_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  achievement_id: uuid("achievement_id").notNull().references(() => achievements.id),
  unlocked_at: timestamp("unlocked_at").notNull().defaultNow(),
  gold_claimed: boolean("gold_claimed").notNull().default(false),
});

export const shop_items = pgTable("shop_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  item_type: text("item_type")
    .$type<"season_pass" | "hint_pack" | "board_skin" | "piece_skin" | "title" | "emote">()
    .notNull(),
  price_gold: integer("price_gold"),
  price_usd_cents: integer("price_usd_cents"),
  is_active: boolean("is_active").notNull().default(true),
  is_season_pass: boolean("is_season_pass").notNull().default(false),
  duration_days: integer("duration_days"),
  image_url: text("image_url"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => users.id),
  item_id: uuid("item_id").notNull().references(() => shop_items.id),
  purchased_at: timestamp("purchased_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at"),
  is_active: boolean("is_active").notNull().default(true),
  stripe_payment_intent: text("stripe_payment_intent"),
});
