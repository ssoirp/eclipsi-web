import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const comarca = searchParams.get("comarca");
    const municipality = searchParams.get("municipality");
    const category = searchParams.get("category");
    const curationStatus = searchParams.get("curation_status");
    const selectedOnly = searchParams.get("selected") === "1";

    const conditions: string[] = [];
    const params: (string | boolean)[] = [];

    if (comarca) { params.push(comarca); conditions.push(`comarca = $${params.length}`); }
    if (municipality) { params.push(municipality); conditions.push(`municipality = $${params.length}`); }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
    if (curationStatus) { params.push(curationStatus); conditions.push(`curation_status = $${params.length}`); }
    if (selectedOnly) { conditions.push(`selected = true`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT * FROM espais_lleure ${where} ORDER BY id`;

    const { rows } = await sql.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET espais error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
