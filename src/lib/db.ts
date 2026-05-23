import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/cricket";
const sql = postgres(connectionString);

// Initialize DB schema for PostgreSQL
export const initDB = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('batsman', 'bowler', 'all_rounder')),
      matches_played INTEGER DEFAULT 0,
      runs_scored INTEGER DEFAULT 0,
      balls_faced INTEGER DEFAULT 0,
      fours INTEGER DEFAULT 0,
      sixes INTEGER DEFAULT 0,
      wickets_taken INTEGER DEFAULT 0,
      runs_conceded INTEGER DEFAULT 0,
      balls_bowled INTEGER DEFAULT 0,
      dot_balls_bowled INTEGER DEFAULT 0,
      hatricks INTEGER DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      team_a_name TEXT NOT NULL,
      team_b_name TEXT NOT NULL,
      overs_limit INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('live', 'completed')),
      winner TEXT,
      date TEXT NOT NULL,
      team_a_runs INTEGER DEFAULT 0,
      team_a_wickets INTEGER DEFAULT 0,
      team_a_balls INTEGER DEFAULT 0,
      team_b_runs INTEGER DEFAULT 0,
      team_b_wickets INTEGER DEFAULT 0,
      team_b_balls INTEGER DEFAULT 0,
      balls_log TEXT,
      single_man INTEGER DEFAULT 1,
      single_man_mode INTEGER DEFAULT 0,
      toss_winner_id INTEGER,
      toss_decision TEXT CHECK(toss_decision IN ('bat', 'bowl')),
      bowler_overs_limit INTEGER DEFAULT 0
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS match_player_stats (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      team_name TEXT NOT NULL,
      runs_scored INTEGER DEFAULT 0,
      balls_faced INTEGER DEFAULT 0,
      fours INTEGER DEFAULT 0,
      sixes INTEGER DEFAULT 0,
      wickets_taken INTEGER DEFAULT 0,
      runs_conceded INTEGER DEFAULT 0,
      balls_bowled INTEGER DEFAULT 0,
      dot_balls_bowled INTEGER DEFAULT 0,
      hatricks INTEGER DEFAULT 0,
      wicket_how TEXT DEFAULT 'not_out'
    );
  `;

  // Migrations for existing tables
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS dot_balls_bowled INTEGER DEFAULT 0`;
  await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS hatricks INTEGER DEFAULT 0`;
  await sql`ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS dot_balls_bowled INTEGER DEFAULT 0`;
  await sql`ALTER TABLE match_player_stats ADD COLUMN IF NOT EXISTS hatricks INTEGER DEFAULT 0`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS single_man_mode INTEGER DEFAULT 0`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS toss_winner_id INTEGER`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS toss_decision TEXT`;
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS bowler_overs_limit INTEGER DEFAULT 0`;
};

export default sql;
