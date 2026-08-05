import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const { location_id, tipus_entorn } = await request.json();
    await sql`UPDATE locations SET tipus_entorn = ${tipus_entorn} WHERE id = ${location_id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
