"""
Migracio: afegeix columnes de curacio manual a la base de dades sqlite.
Idempotent: es pot re-executar sense duplicar columnes.

curation_status: 'pending' | 'interesting' | 'not_interesting'
"""
import sqlite3

DB_PATH = "data/final/espais_lleure.sqlite"


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cols = [r[1] for r in cur.execute("PRAGMA table_info(espais)").fetchall()]

    if "curation_status" not in cols:
        cur.execute("ALTER TABLE espais ADD COLUMN curation_status TEXT DEFAULT 'pending'")
    if "curation_updated_at" not in cols:
        cur.execute("ALTER TABLE espais ADD COLUMN curation_updated_at TEXT")
    if "selected" not in cols:
        cur.execute("ALTER TABLE espais ADD COLUMN selected INTEGER DEFAULT 0")

    conn.commit()
    conn.close()
    print("Migracio completada (curation_status, curation_updated_at, selected).")


if __name__ == "__main__":
    migrate()
