import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

// GET /api/players
export async function GET() {
  try {
    await initDB();
    const players = await sql`SELECT * FROM players ORDER BY name ASC`;
    
    const enrichedPlayers = await Promise.all(players.map(async (p) => {
      // 1. Highest Score
      const hs_rows = await sql`
        SELECT runs_scored, wicket_how 
        FROM match_player_stats 
        WHERE player_id = ${p.id} 
        ORDER BY runs_scored DESC 
        LIMIT 1
      `;
      const hs = hs_rows[0];

      // 2. Best Bowling
      const bb_rows = await sql`
        SELECT wickets_taken, runs_conceded 
        FROM match_player_stats 
        WHERE player_id = ${p.id} 
        ORDER BY wickets_taken DESC, runs_conceded ASC 
        LIMIT 1
      `;
      const bb = bb_rows[0];

      // 3. Thirties and Fifties
      const thirties_rows = await sql`
        SELECT COUNT(*) as cnt 
        FROM match_player_stats 
        WHERE player_id = ${p.id} AND runs_scored >= 30
      `;
      const thirties = thirties_rows[0];

      const fifties_rows = await sql`
        SELECT COUNT(*) as cnt 
        FROM match_player_stats 
        WHERE player_id = ${p.id} AND runs_scored >= 50
      `;
      const fifties = fifties_rows[0];

      return {
        ...p,
        highest_score: hs ? `${hs.runs_scored}${hs.wicket_how === "not_out" ? "*" : ""}` : "0",
        best_bowling: bb && bb.wickets_taken > 0 ? `${bb.wickets_taken}/${bb.runs_conceded}` : "0/0",
        thirties: thirties ? Number(thirties.cnt) : 0,
        fifties: fifties ? Number(fifties.cnt) : 0,
      };
    }));

    return NextResponse.json(enrichedPlayers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/players
export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();
    const name = body.name;
    const role = body.role || "all_rounder";
    
    if (!name) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 });
    }

    if (!["batsman", "bowler", "all_rounder"].includes(role)) {
      return NextResponse.json({ error: "Invalid player role" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO players (name, role) 
      VALUES (${name.trim()}, ${role}) 
      RETURNING *
    `;

    return NextResponse.json({ success: true, player: result[0] });
  } catch (error: any) {
    if (error.message.includes("unique constraint")) {
      return NextResponse.json({ error: "Player with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
