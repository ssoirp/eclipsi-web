import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const { user_id, location_id, vote } = await request.json();
    await sql`
      UPDATE votes SET vote = ${vote}
      WHERE user_id = ${user_id} AND location_id = ${location_id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
