import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { geocodePlace } from "@/lib/geocode";
import { computeEclipseLocal, drivingDistanceFromAgramunt, mapsLink } from "@/lib/eclipse";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nom = (body.nom || "").trim();
    if (!nom) {
      return NextResponse.json({ error: "Cal indicar un nom" }, { status: 400 });
    }

    let latitud: number | null = body.latitud != null && body.latitud !== "" ? Number(body.latitud) : null;
    let longitud: number | null = body.longitud != null && body.longitud !== "" ? Number(body.longitud) : null;
    let municipi = "";

    if (latitud == null || longitud == null || Number.isNaN(latitud) || Number.isNaN(longitud)) {
      const geocoded = await geocodePlace(nom);
      if (!geocoded) {
        return NextResponse.json(
          { error: "No s'ha trobat la ubicació. Introdueix les coordenades manualment." },
          { status: 404 }
        );
      }
      latitud = geocoded.latitud;
      longitud = geocoded.longitud;
      municipi = geocoded.municipi;
    }

    const eclipse = computeEclipseLocal(latitud, longitud);
    const { distancia_km, distancia_min } = await drivingDistanceFromAgramunt(latitud, longitud);
    const googleMapsUrl = mapsLink(latitud, longitud);

    const { rows } = await sql`
      INSERT INTO locations (
        nom, latitud, longitud, municipi,
        tipus_eclipsi, inici_eclipsi, inici_totalitat, maxim_eclipsi,
        final_totalitat, final_eclipsi, durada_totalitat_s, magnitud, obscuracio,
        distancia_km, distancia_min, google_maps_url
      ) VALUES (
        ${nom}, ${latitud}, ${longitud}, ${municipi},
        ${eclipse.tipus_eclipsi}, ${eclipse.inici_eclipsi}, ${eclipse.inici_totalitat}, ${eclipse.maxim_eclipsi},
        ${eclipse.final_totalitat}, ${eclipse.final_eclipsi}, ${eclipse.durada_totalitat_s}, ${eclipse.magnitud}, ${eclipse.obscuracio},
        ${distancia_km}, ${distancia_min}, ${googleMapsUrl}
      )
      RETURNING *
    `;
    const newLocation = rows[0];

    const { rows: users } = await sql`SELECT id FROM users`;
    const { rows: votes } = await sql.query(
      users.length
        ? `INSERT INTO votes (user_id, location_id, rating)
           VALUES ${users.map((_, i) => `($${i + 1}, $${users.length + 1}, 0)`).join(", ")}
           ON CONFLICT (user_id, location_id) DO NOTHING
           RETURNING id, user_id, rating`
        : `SELECT NULL WHERE false`,
      users.length ? [...users.map((u) => u.id), newLocation.id] : []
    );

    return NextResponse.json({ location: { ...newLocation, votes, images: [] } });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { rows: locations } = await sql`
      SELECT l.*,
        COALESCE(
          (SELECT json_agg(json_build_object('id', v.id, 'user_id', v.user_id, 'rating', COALESCE(v.rating, 0)))
           FROM votes v WHERE v.location_id = l.id), '[]'
        ) as votes,
        COALESCE(
          (SELECT json_agg(json_build_object('id', i.id, 'url', i.url))
           FROM images i WHERE i.location_id = l.id), '[]'
        ) as images
      FROM locations l
      ORDER BY l.id
    `;
    const { rows: users } = await sql`SELECT * FROM users ORDER BY id`;
    return NextResponse.json({ locations, users });
  } catch {
    return NextResponse.json({ locations: [], users: [] });
  }
}
