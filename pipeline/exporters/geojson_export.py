import json
from pathlib import Path


def export_geojson(records, path):
    features = []
    for r in records:
        props = {k: v for k, v in r.items() if k not in ("latitude", "longitude")}
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [r["longitude"], r["latitude"]]},
            "properties": props,
        })
    fc = {"type": "FeatureCollection", "features": features}
    Path(path).write_text(json.dumps(fc, ensure_ascii=False))


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    export_geojson(recs, "data/final/espais_lleure_4_comarques.geojson")
    print(f"GeoJSON exportat: {len(recs)} features")
