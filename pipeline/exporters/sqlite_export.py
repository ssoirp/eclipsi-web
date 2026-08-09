import json
import sqlite3
from pathlib import Path

from csv_export import flatten


def export_sqlite(records, path):
    Path(path).unlink(missing_ok=True)
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    flat = [flatten(r) for r in records]
    cols = list(flat[0].keys())
    col_defs = ", ".join(f'"{c}" TEXT' for c in cols)
    cur.execute(f'CREATE TABLE espais ({col_defs}, PRIMARY KEY("id"))')

    placeholders = ", ".join("?" for _ in cols)
    for r in flat:
        values = [json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v for v in r.values()]
        cur.execute(f'INSERT INTO espais VALUES ({placeholders})', values)

    cur.execute('CREATE INDEX idx_comarca ON espais(comarca)')
    cur.execute('CREATE INDEX idx_municipality ON espais(municipality)')
    cur.execute('CREATE INDEX idx_category ON espais(category)')

    conn.commit()
    conn.close()


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    export_sqlite(recs, "data/final/espais_lleure.sqlite")
    print(f"SQLite exportat: {len(recs)} files")
