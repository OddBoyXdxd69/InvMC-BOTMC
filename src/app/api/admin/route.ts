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
        await sql`DROP TABLE IF EXISTS match_player_stats CASCADE`;
        await sql`DROP TABLE IF EXISTS matches CASCADE`;
        await sql`DROP TABLE IF EXISTS players CASCADE`;
      });

      // Re-initialize using the central schema definition
      await initDB();

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
