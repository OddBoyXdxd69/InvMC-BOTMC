import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

export async function GET() {
  try {
    await initDB();

    // 1. Highest Career Runs
    const topRuns = await sql`SELECT id, name, runs_scored FROM players ORDER BY runs_scored DESC LIMIT 5`;
    
    // 2. Highest Career Wickets
    const topWickets = await sql`SELECT id, name, wickets_taken FROM players ORDER BY wickets_taken DESC LIMIT 5`;

    // 3. Highest Individual Score (Match)
    const bestScore = await sql`
      SELECT s.runs_scored, p.name, m.date, p.id as player_id
      FROM match_player_stats s
      JOIN players p ON s.player_id = p.id
      JOIN matches m ON s.match_id = m.id
      ORDER BY s.runs_scored DESC
      LIMIT 1
    `;

    // 4. Best Bowling Figures (Match)
    const bestBowling = await sql`
      SELECT s.wickets_taken, s.runs_conceded, p.name, m.date, p.id as player_id
      FROM match_player_stats s
      JOIN players p ON s.player_id = p.id
      JOIN matches m ON s.match_id = m.id
      ORDER BY s.wickets_taken DESC, s.runs_conceded ASC
      LIMIT 1
    `;

    // 5. Career Best Average (Min 3 matches)
    const bestAvg = await sql`
      SELECT id, name, (runs_scored::float / NULLIF((SELECT COUNT(*) FROM match_player_stats WHERE player_id = p.id AND wicket_how != 'not_out'), 0)) as avg
      FROM players p
      WHERE matches_played >= 3
      ORDER BY avg DESC
      LIMIT 1
    `;

    // 6. Career Best Economy (Min 10 overs / 60 balls)
    const bestEcon = await sql`
      SELECT id, name, (runs_conceded::float / (balls_bowled::float / 6)) as econ
      FROM players
      WHERE balls_bowled >= 60
      ORDER BY econ ASC
      LIMIT 1
    `;

    return NextResponse.json({
      topRuns,
      topWickets,
      allTimeBest: {
        score: bestScore[0],
        bowling: bestBowling[0],
        avg: bestAvg[0],
        econ: bestEcon[0]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
