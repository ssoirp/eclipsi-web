"""
Afegeix una comarca nova al dataset existent SENSE trencar els IDs ja
assignats (continua numerant a partir del maxim actual). Fa el mateix
proces que el pipeline principal (normalitzar, dedup intern, confidence)
pero nomes per la comarca nova, i l'afegeix (append) al JSON final.

Us: python3 processing/add_comarca.py "Ribera d'Ebre" data/raw/municipis_riberaebre.json data/raw/comarca_riberaebre.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "collectors"))
from osm import parse_elements
from normalize import (
    normalize_record, load_municipality_polygons, load_comarca_polygons,
    build_municipality_to_comarca,
)
from deduplicate import find_possible_duplicates
from confidence import build_final_record

FINAL_PATH = Path(__file__).parent.parent / "data" / "final" / "espais_lleure_4_comarques.json"


def main():
    comarca = sys.argv[1]
    muni_bounds_path = sys.argv[2]
    comarca_bounds_path = sys.argv[3]
    osm_slug = comarca.lower().replace("'", "").replace(" ", "")

    osm_data = json.loads((Path(__file__).parent.parent / "data" / "raw" / f"osm_{comarca.lower()}.json").read_text())
    recs = parse_elements(osm_data)
    print(f"{comarca}: {len(recs)} elements OSM bruts")

    polys = load_municipality_polygons(muni_bounds_path)
    comarca_polys = load_comarca_polygons(comarca_bounds_path)
    muni_to_comarca = build_municipality_to_comarca(polys, comarca_polys)
    print(f"Municipis carregats: {len(polys)}, mapejats a comarca: {len(muni_to_comarca)}")

    normed = [normalize_record(r, comarca, polys, muni_to_comarca) for r in recs]
    sense_muni = sum(1 for r in normed if r["municipality"] == "desconegut")
    print(f"Sense municipi assignat: {sense_muni}")

    normed, pairs = find_possible_duplicates(normed)
    print(f"Possibles duplicats interns: {sum(1 for r in normed if r['possible_duplicate'])}")

    existing = json.loads(FINAL_PATH.read_text()) if FINAL_PATH.exists() else []
    existing_osm_ids = {r.get("osm_id") for r in existing if r.get("osm_id")}
    max_idx = 0
    for r in existing:
        try:
            max_idx = max(max_idx, int(r["id"].replace("REC", "")))
        except (KeyError, ValueError):
            pass

    new_final = []
    skipped_existing = 0
    for r in normed:
        if r.get("osm_id") in existing_osm_ids:
            skipped_existing += 1
            continue
        max_idx += 1
        new_final.append(build_final_record(r, max_idx))

    print(f"Nous registres afegits: {len(new_final)} (ja existents/omesos: {skipped_existing})")

    combined = existing + new_final
    FINAL_PATH.write_text(json.dumps(combined, ensure_ascii=False, indent=1))
    print(f"Total combinat: {len(combined)} -> {FINAL_PATH}")

    out_new_only = Path(__file__).parent.parent / "data" / "final" / f"nous_{osm_slug}.json"
    out_new_only.write_text(json.dumps(new_final, ensure_ascii=False, indent=1))
    print(f"Nomes els nous (per actualitzar Postgres): {out_new_only}")


if __name__ == "__main__":
    main()
