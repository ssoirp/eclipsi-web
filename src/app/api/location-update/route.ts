import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const ALLOWED_FIELDS = [
  "distancia_km", "distancia_min", "inici_eclipsi", "inici_totalitat",
  "maxim_eclipsi", "final_totalitat", "final_eclipsi", "durada_totalitat_s",
  "magnitud", "obscuracio", "municipi", "descartat", "tipus_eclipsi",
];

export async function PUT(request: Request) {
  try {
    const { location_id, field, value } = await request.json();
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
    }
    await sql.query(`UPDATE locations SET ${field} = $1 WHERE id = $2`, [value, location_id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
