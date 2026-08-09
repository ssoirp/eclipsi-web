import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const { user_id, location_id, rating } = await request.json();
    await sql`
      INSERT INTO votes (user_id, location_id, rating)
      VALUES (${user_id}, ${location_id}, ${rating})
      ON CONFLICT (user_id, location_id) DO UPDATE SET rating = ${rating}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
