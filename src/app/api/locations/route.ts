import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const { rows: locations } = await sql`
      SELECT l.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', v.id, 'user_id', v.user_id, 'vote', v.vote))
           FROM votes v WHERE v.location_id = l.id), '[]'
        ) as votes,
        COALESCE(
          (SELECT json_agg(json_build_object('id', i.id, 'url', i.url))
           FROM images i WHERE i.location_id = l.id), '[]'
        ) as images
      FROM locations l
      ORDER BY l.id
    `;
    const { rows: users } = await sql`SELECT * FROM users ORDER BY id`;
    return NextResponse.json({ locations, users });
  } catch {
    return NextResponse.json({ locations: [], users: [] });
  }
}
