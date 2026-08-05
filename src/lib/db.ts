import { sql } from "@vercel/postgres";

export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      custom_name TEXT,
      latitud DECIMAL,
      longitud DECIMAL,
      municipi TEXT,
      tipus_eclipsi TEXT,
      inici_eclipsi TEXT,
      inici_totalitat TEXT,
      maxim_eclipsi TEXT,
      final_totalitat TEXT,
      final_eclipsi TEXT,
      durada_totalitat_s DECIMAL,
      magnitud DECIMAL,
      obscuracio TEXT,
      distancia_km DECIMAL,
      distancia_min INTEGER,
      google_maps_url TEXT,
      proposat BOOLEAN DEFAULT false,
      notes TEXT DEFAULT '',
      tipus_entorn TEXT DEFAULT '',
      descartat BOOLEAN DEFAULT false
    )
  `;

  // Migrations for existing tables
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='tipus_entorn') THEN
        ALTER TABLE locations ADD COLUMN tipus_entorn TEXT DEFAULT '';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='locations' AND column_name='descartat') THEN
        ALTER TABLE locations ADD COLUMN descartat BOOLEAN DEFAULT false;
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      location_id INTEGER REFERENCES locations(id),
      rating INTEGER DEFAULT 0,
      UNIQUE(user_id, location_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Migration: add rating column if votes table existed with old schema
  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='votes' AND column_name='rating') THEN
        ALTER TABLE votes ADD COLUMN rating INTEGER DEFAULT 0;
      END IF;
    END $$;
  `;
}

export { sql };
