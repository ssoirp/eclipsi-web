import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const { location_id, custom_name } = await request.json();
    await sql`UPDATE locations SET custom_name = ${custom_name} WHERE id = ${location_id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
