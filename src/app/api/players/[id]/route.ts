import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDB();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // 1. Get Player basic info
    const player_rows = await sql`SELECT * FROM players WHERE id = ${Number(id)}`;
    const player = player_rows[0];
    if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    // 2. Get Match history
    const match_history = await sql`
      SELECT m.id, m.team_a_name, m.team_b_name, m.date, m.winner,
             s.runs_scored, s.balls_faced, s.fours, s.sixes,
             s.wickets_taken, s.runs_conceded, s.balls_bowled, s.dot_balls_bowled, s.wicket_how, s.team_name
      FROM match_player_stats s
      JOIN matches m ON s.match_id = m.id
      WHERE s.player_id = ${Number(id)}
      ORDER BY m.id DESC
    `;

    // 2.5 Calculate Averages
    const dismissals = match_history.filter(m => m.wicket_how !== 'not_out').length;
    const batting_avg = dismissals > 0 ? (player.runs_scored / dismissals).toFixed(2) : (player.runs_scored > 0 ? player.runs_scored.toFixed(2) : "0.00");
    const bowling_avg = player.wickets_taken > 0 ? (player.runs_conceded / player.wickets_taken).toFixed(2) : "0.00";
    
    const enrichedPlayer = {
      ...player,
      batting_avg,
      bowling_avg
    };

    // 3. Achievements / Badges
    const badges = [];
    if (player.runs_scored >= 500) badges.push({ id: 'r500', name: 'Elite Scorer', desc: '500+ Lifetime Runs', icon: '🔥' });
    if (player.wickets_taken >= 20) badges.push({ id: 'w20', name: 'Wicket King', desc: '20+ Lifetime Wickets', icon: '👑' });
    
    // Check for specific match milestones
    const best_score = Math.max(...match_history.map(m => m.runs_scored), 0);
    if (best_score >= 50) badges.push({ id: 'half_century', name: 'Fiftian', desc: 'Scored a fifty in a match', icon: '🏏' });
    
    const best_wkts = Math.max(...match_history.map(m => m.wickets_taken), 0);
    if (best_wkts >= 3) badges.push({ id: 'w3', name: 'Strike Bowler', desc: 'Took 3+ wickets in a single match', icon: '🎯' });

    return NextResponse.json({ player: enrichedPlayer, match_history, badges });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
