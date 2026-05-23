import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();
    const { action, passcode } = body;

    // Simple passcode authorization
    if (passcode !== "7777") {
      return NextResponse.json({ error: "Unauthorized. Incorrect passcode." }, { status: 401 });
    }

    if (action === "login") {
      return NextResponse.json({ success: true, message: "Logged in successfully" });
    }

    if (action === "edit_player") {
      const { id, name } = body;
      if (!id || !name || !name.trim()) {
        return NextResponse.json({ error: "Player ID and name are required." }, { status: 400 });
      }

      const result = await sql`
        UPDATE players 
        SET name = ${name.trim()} 
        WHERE id = ${Number(id)}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json({ error: "Player not found." }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: "Player name updated successfully." });
    }

    if (action === "delete_player") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Player ID is required." }, { status: 400 });
      }

      await sql.begin(async sql => {
        await sql`DELETE FROM match_player_stats WHERE player_id = ${Number(id)}`;
        await sql`DELETE FROM players WHERE id = ${Number(id)}`;
      });

      return NextResponse.json({ success: true, message: "Player deleted successfully." });
    }

    if (action === "delete_match") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Match ID is required." }, { status: 400 });
      }

      await sql.begin(async sql => {
        await sql`DELETE FROM match_player_stats WHERE match_id = ${Number(id)}`;
        await sql`DELETE FROM matches WHERE id = ${Number(id)}`;
      });

      return NextResponse.json({ success: true, message: "Match deleted successfully." });
    }

    if (action === "reset_db") {
      await sql.begin(async sql => {
        await sql`DROP TABLE IF EXISTS match_player_stats`;
        await sql`DROP TABLE IF EXISTS matches`;
        await sql`DROP TABLE IF EXISTS players`;

        await sql`
          CREATE TABLE players (
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
            balls_bowled INTEGER DEFAULT 0
          );
        `;

        await sql`
          CREATE TABLE matches (
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
            single_man_mode INTEGER DEFAULT 0
          );
        `;

        await sql`
          CREATE TABLE match_player_stats (
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
            wicket_how TEXT DEFAULT 'not_out'
          );
        `;
      });

      return NextResponse.json({ success: true, message: "Database reset completed successfully." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    if (error.message.includes("unique constraint")) {
      return NextResponse.json({ error: "Player with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
