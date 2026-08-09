import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const VALID_STATUSES = new Set(["pending", "interesting", "not_interesting"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comarca, municipality, category, status } = body as {
      comarca?: string; municipality?: string; category?: string; status: string;
    };

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "status ha de ser pending|interesting|not_interesting" }, { status: 400 });
    }
    if (!comarca && !municipality && !category) {
      return NextResponse.json({ error: "Cal indicar almenys comarca, municipality o category per evitar aplicar-ho a tot" }, { status: 400 });
    }

    const conditions: string[] = [];
    const params: string[] = [status];

    if (comarca) { params.push(comarca); conditions.push(`comarca = $${params.length}`); }
    if (municipality) { params.push(municipality); conditions.push(`municipality = $${params.length}`); }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }

    const query = `
      UPDATE espais_lleure SET curation_status = $1, curation_updated_at = NOW()
      WHERE ${conditions.join(" AND ")}
      RETURNING id
    `;
    const { rows } = await sql.query(query, params);

    return NextResponse.json({ ok: true, status, updated: rows.length, ids: rows.map((r) => r.id) });
  } catch (error) {
    console.error("Bulk curation error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
