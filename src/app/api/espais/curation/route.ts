import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const VALID_STATUSES = new Set(["pending", "interesting", "not_interesting"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body as { id: string; status: string };
    if (!id || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "id i status (pending|interesting|not_interesting) son obligatoris" }, { status: 400 });
    }
    const { rowCount } = await sql`
      UPDATE espais_lleure SET curation_status = ${status}, curation_updated_at = NOW()
      WHERE id = ${id}
    `;
    if (!rowCount) return NextResponse.json({ error: "id no trobat" }, { status: 404 });
    return NextResponse.json({ ok: true, id, status });
  } catch (error) {
    console.error("Curation update error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
