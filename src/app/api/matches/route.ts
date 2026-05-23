import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

// GET /api/matches
export async function GET(request: Request) {
  try {
    await initDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const match_rows = await sql`SELECT * FROM matches WHERE id = ${Number(id)}`;
      const match = match_rows[0];
      
      if (!match) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }

      const stats = await sql`
        SELECT m.*, p.name, p.role 
        FROM match_player_stats m
        JOIN players p ON m.player_id = p.id
        WHERE m.match_id = ${Number(id)}
      `;

      return NextResponse.json({ match, stats });
    }

    const matches = await sql`SELECT * FROM matches ORDER BY id DESC`;
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/matches
export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { team_a_name, team_b_name, overs_limit, single_man, single_man_mode } = body;

      if (!team_a_name || !team_b_name || !overs_limit) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const dateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const result = await sql`
        INSERT INTO matches (team_a_name, team_b_name, overs_limit, status, date, single_man, single_man_mode)
        VALUES (${team_a_name.trim()}, ${team_b_name.trim()}, ${Number(overs_limit)}, 'live', ${dateStr}, ${single_man ? 1 : 0}, ${single_man_mode ? 1 : 0})
        RETURNING id
      `;
      
      return NextResponse.json({ success: true, match_id: result[0].id });
    }

    if (action === "complete") {
      const { 
        match_id, 
        winner, 
        team_a_runs, 
        team_a_wickets, 
        team_a_balls, 
        team_b_runs, 
        team_b_wickets, 
        team_b_balls,
        player_stats,
        balls_log
      } = body;

      if (!match_id) {
        return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
      }

      await sql.begin(async sql => {
        // 0. Check if match is already completed
        const match_rows = await sql`SELECT status FROM matches WHERE id = ${Number(match_id)}`;
        if (match_rows[0]?.status === 'completed') {
          return;
        }

        // 1. Update the match info
        await sql`
          UPDATE matches 
          SET status = 'completed', 
              winner = ${winner}, 
              team_a_runs = ${Number(team_a_runs)}, 
              team_a_wickets = ${Number(team_a_wickets)}, 
              team_a_balls = ${Number(team_a_balls)}, 
              team_b_runs = ${Number(team_b_runs)}, 
              team_b_wickets = ${Number(team_b_wickets)}, 
              team_b_balls = ${Number(team_b_balls)},
              balls_log = ${balls_log ? String(balls_log) : null}
          WHERE id = ${Number(match_id)}
        `;

        // 2. Insert match stats and update aggregate stats
        for (const stat of player_stats) {
          await sql`
            INSERT INTO match_player_stats (
              match_id, player_id, team_name, runs_scored, balls_faced, 
              fours, sixes, wickets_taken, runs_conceded, balls_bowled, wicket_how
            ) VALUES (
              ${Number(match_id)},
              ${Number(stat.player_id)},
              ${stat.team_name},
              ${Number(stat.runs_scored || 0)},
              ${Number(stat.balls_faced || 0)},
              ${Number(stat.fours || 0)},
              ${Number(stat.sixes || 0)},
              ${Number(stat.wickets_taken || 0)},
              ${Number(stat.runs_conceded || 0)},
              ${Number(stat.balls_bowled || 0)},
              ${stat.wicket_how || "not_out"}
            )
          `;

          await sql`
            UPDATE players 
            SET matches_played = matches_played + 1,
                runs_scored = runs_scored + ${Number(stat.runs_scored || 0)},
                balls_faced = balls_faced + ${Number(stat.balls_faced || 0)},
                fours = fours + ${Number(stat.fours || 0)},
                sixes = sixes + ${Number(stat.sixes || 0)},
                wickets_taken = wickets_taken + ${Number(stat.wickets_taken || 0)},
                runs_conceded = runs_conceded + ${Number(stat.runs_conceded || 0)},
                balls_bowled = balls_bowled + ${Number(stat.balls_bowled || 0)}
            WHERE id = ${Number(stat.player_id)}
          `;
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
