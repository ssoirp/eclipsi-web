import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, selected } = body as { id: string; selected: boolean };
    if (!id || typeof selected !== "boolean") {
      return NextResponse.json({ error: "id i selected (boolean) son obligatoris" }, { status: 400 });
    }
    const { rowCount } = await sql`
      UPDATE espais_lleure SET selected = ${selected}, curation_updated_at = NOW()
      WHERE id = ${id}
    `;
    if (!rowCount) return NextResponse.json({ error: "id no trobat" }, { status: 404 });
    return NextResponse.json({ ok: true, id, selected });
  } catch (error) {
    console.error("Selected update error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
