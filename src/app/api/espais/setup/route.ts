import { NextResponse } from "next/server";
import { initDatabase, sql } from "@/lib/db";
import espaisData from "@/data/espais_lleure.json";

interface EspaiSeed {
  id: string;
  name: string | null;
  category: string | null;
  subcategory: string | null;
  comarca: string | null;
  municipality: string | null;
  latitude: number;
  longitude: number;
  picnic: string | null;
  tables: string | null;
  barbecue: string | null;
  drinking_water: string | null;
  toilets: string | null;
  parking: string | null;
  camping: string | null;
  caravan: string | null;
  accessibility: string | null;
  bathing: string | null;
  playground: string | null;
  sports_area: string | null;
  confidence_score: string | null;
  possible_duplicate: boolean;
  sources: string[] | null;
  source_urls: string[] | null;
  osm_id: string | null;
  notes: string | null;
}

export async function POST() {
  try {
    await initDatabase();

    const { rows: existingIdRows } = await sql`SELECT id FROM espais_lleure`;
    const existingIds = new Set(existingIdRows.map((r) => r.id));

    const allData = espaisData as EspaiSeed[];
    const data = allData.filter((r) => !existingIds.has(r.id));

    if (data.length === 0) {
      return NextResponse.json({ success: true, message: "Cap registre nou per afegir", count: existingIds.size });
    }

    const chunkSize = 25;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((r) =>
          sql`
            INSERT INTO espais_lleure (
              id, name, category, subcategory, comarca, municipality, latitude, longitude,
              picnic, tables, barbecue, drinking_water, toilets, parking, camping, caravan,
              accessibility, bathing, playground, sports_area, confidence_score,
              possible_duplicate, sources, source_urls, osm_id, notes
            ) VALUES (
              ${r.id}, ${r.name}, ${r.category}, ${r.subcategory}, ${r.comarca}, ${r.municipality},
              ${r.latitude}, ${r.longitude},
              ${r.picnic}, ${r.tables}, ${r.barbecue}, ${r.drinking_water}, ${r.toilets}, ${r.parking},
              ${r.camping}, ${r.caravan}, ${r.accessibility}, ${r.bathing}, ${r.playground}, ${r.sports_area},
              ${r.confidence_score}, ${r.possible_duplicate},
              ${JSON.stringify(r.sources || [])}, ${JSON.stringify(r.source_urls || [])},
              ${r.osm_id}, ${r.notes}
            )
            ON CONFLICT (id) DO NOTHING
          `
        )
      );
    }

    const { rows: after } = await sql`SELECT count(*) as c FROM espais_lleure`;
    return NextResponse.json({ success: true, count: Number(after[0].c) });
  } catch (error) {
    console.error("Setup espais error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
