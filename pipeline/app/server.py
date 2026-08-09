"""
Servidor local per al visor d'inventari (mapa + llista + curacio).

No es un servei web public: pensat per executar-se en local
(`python3 app/server.py`) i obrir http://127.0.0.1:5050 al navegador.
Llegeix i escriu directament sobre data/final/espais_lleure.sqlite, que es
la font de veritat (les exportacions CSV/XLSX/GeoJSON/KML son derivades i
no es regeneren automaticament en curar punts).
"""
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).parent
DB_PATH = BASE_DIR.parent / "data" / "final" / "espais_lleure.sqlite"

app = Flask(__name__, static_folder=str(BASE_DIR / "static"))

LIST_FIELDS_JSON = {"sources", "source_urls", "duplicate_of_candidates"}

FIELDS_FOR_VIEWER = [
    "id", "name", "category", "subcategory", "comarca", "municipality",
    "latitude", "longitude",
    "picnic", "tables", "barbecue", "drinking_water", "toilets", "parking",
    "camping", "caravan", "accessibility", "bathing", "playground", "sports_area",
    "confidence_score", "possible_duplicate", "sources", "source_urls",
    "osm_id", "notes", "curation_status", "curation_updated_at", "selected",
]

VALID_STATUSES = {"pending", "interesting", "not_interesting"}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    d = dict(row)
    # 'sources' i 'source_urls' es van exportar a sqlite com a text separat
    # per "; " (no JSON); 'duplicate_of_candidates' si que es JSON real.
    for k in ("sources", "source_urls"):
        if d.get(k):
            d[k] = [s.strip() for s in str(d[k]).split(";") if s.strip()]
        else:
            d[k] = []
    if d.get("duplicate_of_candidates"):
        try:
            import json as _json
            d["duplicate_of_candidates"] = _json.loads(d["duplicate_of_candidates"])
        except Exception:
            pass
    if "possible_duplicate" in d:
        d["possible_duplicate"] = str(d["possible_duplicate"]) in ("1", "True", "true")
    if "selected" in d:
        d["selected"] = bool(d["selected"])
    for k in ("latitude", "longitude"):
        if d.get(k) is not None:
            d[k] = float(d[k])
    return d


@app.get("/api/records")
def list_records():
    conn = get_db()
    cols = ", ".join(f'"{c}"' for c in FIELDS_FOR_VIEWER)
    query = f"SELECT {cols} FROM espais WHERE 1=1"
    params = []

    comarca = request.args.get("comarca")
    municipality = request.args.get("municipality")
    category = request.args.get("category")
    curation_status = request.args.get("curation_status")
    selected_only = request.args.get("selected")

    if comarca:
        query += " AND comarca = ?"
        params.append(comarca)
    if municipality:
        query += " AND municipality = ?"
        params.append(municipality)
    if category:
        query += " AND category = ?"
        params.append(category)
    if curation_status:
        query += " AND curation_status = ?"
        params.append(curation_status)
    if selected_only == "1":
        query += " AND selected = 1"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.get("/api/facets")
def facets():
    conn = get_db()
    comarques = [r[0] for r in conn.execute("SELECT DISTINCT comarca FROM espais ORDER BY comarca")]
    municipis = [r[0] for r in conn.execute("SELECT DISTINCT municipality FROM espais ORDER BY municipality")]
    categories = [r[0] for r in conn.execute("SELECT DISTINCT category FROM espais ORDER BY category")]
    conn.close()
    return jsonify({"comarques": comarques, "municipis": municipis, "categories": categories})


@app.post("/api/records/<record_id>/curation")
def update_curation(record_id):
    payload = request.get_json(force=True) or {}
    status = payload.get("status")
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status ha de ser un de {sorted(VALID_STATUSES)}"}), 400

    conn = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        "UPDATE espais SET curation_status = ?, curation_updated_at = ? WHERE id = ?",
        (status, now, record_id),
    )
    conn.commit()
    updated = cur.rowcount
    conn.close()
    if updated == 0:
        return jsonify({"error": "id no trobat"}), 404
    return jsonify({"ok": True, "id": record_id, "curation_status": status, "curation_updated_at": now})


@app.post("/api/records/<record_id>/selected")
def update_selected(record_id):
    payload = request.get_json(force=True) or {}
    selected = payload.get("selected")
    if not isinstance(selected, bool):
        return jsonify({"error": "selected ha de ser true/false"}), 400

    conn = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        "UPDATE espais SET selected = ?, curation_updated_at = ? WHERE id = ?",
        (1 if selected else 0, now, record_id),
    )
    conn.commit()
    updated = cur.rowcount
    conn.close()
    if updated == 0:
        return jsonify({"error": "id no trobat"}), 404
    return jsonify({"ok": True, "id": record_id, "selected": selected})


@app.get("/")
def index():
    return send_from_directory(str(BASE_DIR / "static"), "index.html")


if __name__ == "__main__":
    if not DB_PATH.exists():
        raise SystemExit(f"No trobo la base de dades a {DB_PATH}")
    app.run(host="127.0.0.1", port=5050, debug=True)
