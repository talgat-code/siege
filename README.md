# Siege — Faction Chess Platform

Siege is a competitive chess platform where every game matters beyond the board. Players choose a faction, climb its ranks through wins, and contribute to weekly Faction Wars — a persistent metagame layer that turns individual matches into a collective battle for dominance.

## What we built

A full-stack chess platform on top of standard chess rules, extended with:

- **Faction Wars** — weekly team-vs-team conflicts where every win earns influence points for your faction
- **Faction Ranks** — 5-tier progression system per faction (e.g. Warrior → Great Khan), unlocked by cumulative wins
- **Daily Quests** — 3 fresh objectives each day (easy / medium / hard) with gold rewards for completing them
- **Streak System** — play consecutive days to maintain your streak; hit milestones (3 / 7 / 30 days) for bonus gold
- **Achievements** — 25 unlockable achievements across wins, games played, rating, streaks, and faction progress
- **Gold Economy** — earn gold from quests, streaks, and achievements; spend it in the in-game shop
- **Interactive War Map** — visual world map showing active faction territories and ongoing wars

## For whom

Chess players who want more than a rating number — people who enjoy RPG-style progression, faction identity, and the satisfaction of contributing to something larger than a single game.

## Why it's valuable

Most chess platforms are purely individual. Siege adds a social and strategic metagame layer: your wins matter to your faction, your daily habits are rewarded, and your rank within a faction reflects your dedication. It turns chess into a living, faction-based campaign.

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Database & Auth:** Supabase (PostgreSQL + Row Level Security)
- **Chess engine:** chess.js + react-chessboard
- **AI opponent:** Stockfish (via Web Worker)
- **Deployment:** Vercel

## Contributors

- Sarsenbay
- Meyirman
- Claude
