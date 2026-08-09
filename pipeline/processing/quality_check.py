"""
Control de qualitat + taula de cobertura.

Comprova:
- coordenades dins de Catalunya (bounding box aproximat)
- cada registre te almenys una font
- comptatge de municipis coberts per comarca vs total real
"""
import json
from pathlib import Path
from collections import defaultdict

CATALONIA_BBOX = {"lat_min": 40.5, "lat_max": 42.9, "lon_min": 0.15, "lon_max": 3.35}

MUNICIPIS_TOTALS = {
    "Segrià": 37,
    "Garrigues": 24,
    "Conca de Barberà": 22,
    "Priorat": 23,
}


def run_quality_checks(records):
    issues = []
    for r in records:
        lat, lon = r["latitude"], r["longitude"]
        if not (CATALONIA_BBOX["lat_min"] <= lat <= CATALONIA_BBOX["lat_max"] and
                CATALONIA_BBOX["lon_min"] <= lon <= CATALONIA_BBOX["lon_max"]):
            issues.append({"id": r["id"], "issue": "coordenades_fora_de_catalunya", "lat": lat, "lon": lon})
        if not r.get("sources"):
            issues.append({"id": r["id"], "issue": "sense_font"})
        if r["municipality"] == "desconegut":
            issues.append({"id": r["id"], "issue": "municipi_desconegut"})
    return issues


def coverage_table(records):
    by_comarca = defaultdict(lambda: {"municipis": set(), "llocs": 0, "verificats": 0, "duplicats": 0})
    for r in records:
        c = by_comarca[r["comarca"]]
        c["municipis"].add(r["municipality"])
        c["llocs"] += 1
        if r["confidence_score"] in ("high", "medium"):
            c["verificats"] += 1
        if r["possible_duplicate"]:
            c["duplicats"] += 1

    rows = []
    for comarca, d in by_comarca.items():
        rows.append({
            "comarca": comarca,
            "municipis_totals": MUNICIPIS_TOTALS.get(comarca, "?"),
            "municipis_amb_algun_registre": len(d["municipis"] - {"desconegut"}),
            "fonts_consultades": "OpenStreetMap/Overpass (font_cartografica)",
            "llocs_trobats": d["llocs"],
            "llocs_verificats_geometria": d["verificats"],
            "possibles_duplicats": d["duplicats"],
        })
    return rows


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    issues = run_quality_checks(recs)
    cov = coverage_table(recs)

    print("=== TAULA DE COBERTURA ===")
    for row in cov:
        print(row)

    print(f"\n=== PROBLEMES DETECTATS: {len(issues)} ===")
    from collections import Counter
    c = Counter(i["issue"] for i in issues)
    for k, v in c.items():
        print(f"  {k}: {v}")

    Path("data/final/coverage_report.json").write_text(json.dumps(cov, ensure_ascii=False, indent=1))
    Path("data/final/quality_issues.json").write_text(json.dumps(issues, ensure_ascii=False, indent=1))
