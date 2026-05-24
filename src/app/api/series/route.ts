import { NextResponse } from "next/server";
import sql, { initDB } from "@/lib/db";

interface PlayerRow {
  id: number;
  name: string;
  role: string;
}

interface MatchRow {
  status: string;
  winner: string;
}

interface SeriesRow {
  id: number;
  name: string;
  team_a_name: string;
  team_b_name: string;
  team_a_player_ids: string;
  team_b_player_ids: string;
  common_player_ids?: string;
  overs_limit: number;
  bowler_overs_limit: number;
  single_man?: number;
  single_man_mode: number;
  status: string;
  created_at: string;
  team_a_wins?: string | number;
  team_b_wins?: string | number;
}

// GET /api/series
export async function GET(request: Request) {
  try {
    await initDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const series_id = Number(id);
      const series_rows = await sql`SELECT * FROM series WHERE id = ${series_id}`;
      const series = series_rows[0] as SeriesRow | undefined;

      if (!series) {
        return NextResponse.json({ error: "Series not found" }, { status: 404 });
      }

      const team_a_ids: number[] = JSON.parse(series.team_a_player_ids || "[]");
      const team_b_ids: number[] = JSON.parse(series.team_b_player_ids || "[]");
      const common_ids: number[] = JSON.parse(series.common_player_ids || "[]");

      const all_players = (await sql`SELECT id, name, role FROM players`) as PlayerRow[];
      const team_a_squad = all_players.filter((p: PlayerRow) => team_a_ids.includes(p.id));
      const team_b_squad = all_players.filter((p: PlayerRow) => team_b_ids.includes(p.id));
      const common_squad = all_players.filter((p: PlayerRow) => common_ids.includes(p.id));

      const matches = (await sql`SELECT * FROM matches WHERE series_id = ${series_id} ORDER BY id DESC`) as MatchRow[];

      const team_a_wins = matches.filter((m: MatchRow) => m.status === 'completed' && m.winner === series.team_a_name).length;
      const team_b_wins = matches.filter((m: MatchRow) => m.status === 'completed' && m.winner === series.team_b_name).length;

      return NextResponse.json({
        series,
        team_a_squad,
        team_b_squad,
        common_squad,
        matches,
        team_a_wins,
        team_b_wins
      });
    }

    const seriesList = (await sql`
      SELECT s.*, 
             (SELECT COUNT(*) FROM matches m WHERE m.series_id = s.id AND m.status = 'completed' AND m.winner = s.team_a_name) as team_a_wins,
             (SELECT COUNT(*) FROM matches m WHERE m.series_id = s.id AND m.status = 'completed' AND m.winner = s.team_b_name) as team_b_wins
      FROM series s
      ORDER BY s.id DESC
    `) as SeriesRow[];

    return NextResponse.json(seriesList.map((s: SeriesRow) => ({
      ...s,
      team_a_wins: Number(s.team_a_wins || 0),
      team_b_wins: Number(s.team_b_wins || 0)
    })));
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/series
export async function POST(request: Request) {
  try {
    await initDB();
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { name, team_a_name, team_b_name, team_a_player_ids, team_b_player_ids, common_player_ids, overs_limit, bowler_overs_limit, single_man, single_man_mode } = body;

      if (!name || !team_a_name || !team_b_name || !team_a_player_ids || !team_b_player_ids || !overs_limit) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const result = await sql`
        INSERT INTO series (
          name, team_a_name, team_b_name, team_a_player_ids, team_b_player_ids, common_player_ids, 
          overs_limit, bowler_overs_limit, single_man, single_man_mode, status
        )
        VALUES (
          ${name.trim()}, ${team_a_name.trim()}, ${team_b_name.trim()}, 
          ${JSON.stringify(team_a_player_ids)}, ${JSON.stringify(team_b_player_ids)}, ${JSON.stringify(common_player_ids || [])}, 
          ${Number(overs_limit)}, ${Number(bowler_overs_limit || 0)}, 
          ${single_man ? 1 : 0}, ${Number(single_man_mode || 0)}, 'active'
        )
        RETURNING id
      `;

      return NextResponse.json({ success: true, series_id: result[0].id });
    }

    if (action === "update") {
      const { id, name, team_a_name, team_b_name, team_a_player_ids, team_b_player_ids, common_player_ids, overs_limit, bowler_overs_limit, single_man, single_man_mode, status } = body;

      if (!id || !name || !team_a_name || !team_b_name || !team_a_player_ids || !team_b_player_ids || !overs_limit) {
        return NextResponse.json({ error: "Missing required fields for update" }, { status: 400 });
      }

      await sql`
        UPDATE series
        SET name = ${name.trim()},
            team_a_name = ${team_a_name.trim()},
            team_b_name = ${team_b_name.trim()},
            team_a_player_ids = ${JSON.stringify(team_a_player_ids)},
            team_b_player_ids = ${JSON.stringify(team_b_player_ids)},
            common_player_ids = ${JSON.stringify(common_player_ids || [])},
            overs_limit = ${Number(overs_limit)},
            bowler_overs_limit = ${Number(bowler_overs_limit || 0)},
            single_man = ${single_man ? 1 : 0},
            single_man_mode = ${Number(single_man_mode || 0)},
            status = ${status || 'active'}
        WHERE id = ${Number(id)}
      `;

      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "Series ID is required" }, { status: 400 });
      }

      await sql`DELETE FROM series WHERE id = ${Number(id)}`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
