import { NextResponse } from "next/server";
import { initDatabase, sql } from "@/lib/db";
import { LOCATIONS, DEFAULT_USERS } from "@/lib/seed-data";

export async function POST() {
  try {
    await initDatabase();

    const { rows: existingLocations } = await sql`SELECT count(*) as c FROM locations`;
    if (Number(existingLocations[0].c) === 0) {
      for (const loc of LOCATIONS) {
        await sql`
          INSERT INTO locations (nom, latitud, longitud, municipi, tipus_eclipsi, inici_eclipsi, inici_totalitat, maxim_eclipsi, final_totalitat, final_eclipsi, durada_totalitat_s, magnitud, obscuracio, distancia_km, distancia_min, google_maps_url, proposat)
          VALUES (${loc.nom}, ${loc.latitud}, ${loc.longitud}, ${loc.municipi}, ${loc.tipus}, ${loc.inici_eclipsi}, ${loc.inici_totalitat}, ${loc.maxim}, ${loc.final_totalitat}, ${loc.final_eclipsi}, ${loc.durada}, ${loc.magnitud}, ${loc.obscuracio}, ${loc.dist_km}, ${loc.dist_min}, ${loc.maps}, false)
        `;
      }
    }

    const { rows: existingUsers } = await sql`SELECT count(*) as c FROM users`;
    if (Number(existingUsers[0].c) === 0) {
      for (const user of DEFAULT_USERS) {
        await sql`
          INSERT INTO users (name, is_admin) VALUES (${user.name}, ${user.is_admin})
        `;
      }
    }

    const { rows: locationIds } = await sql`SELECT id FROM locations`;
    const { rows: userIds } = await sql`SELECT id FROM users`;
    for (const user of userIds) {
      for (const loc of locationIds) {
        await sql`
          INSERT INTO votes (user_id, location_id, rating)
          VALUES (${user.id}, ${loc.id}, 0)
          ON CONFLICT (user_id, location_id) DO NOTHING
        `;
      }
    }

    return NextResponse.json({ success: true, message: "Database initialized" });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
