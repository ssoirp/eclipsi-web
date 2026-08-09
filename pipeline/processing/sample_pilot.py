"""
Selecciona una mostra representativa de registres del pilot (Priorat) i els
enriqueix amb municipi via reverse geocoding a Nominatim (1 req/s, ús no
comercial, respectant la política d'ús de OSM).
"""
import json
import time
import requests
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "collectors"))
from osm import parse_elements

HEADERS = {"User-Agent": "inventari-lleure-4-comarques/0.1 (contact: ssoi.ramon@gmail.com)"}


def reverse_geocode(lat, lon):
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {"lat": lat, "lon": lon, "format": "jsonv2", "accept-language": "ca"}
    r = requests.get(url, params=params, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.json()


def main():
    data = json.loads(Path("data/raw/osm_priorat.json").read_text())
    recs = parse_elements(data)
    named = [r for r in recs if r["name"]]

    # Agafem una mostra diversa: intentem cobrir totes les subcategories amb nom
    by_subcat = {}
    for r in named:
        by_subcat.setdefault(r["subcategory"], []).append(r)

    sample = []
    for subcat, items in by_subcat.items():
        sample.extend(items[:3])
    sample = sample[:30]

    print(f"Mostra seleccionada: {len(sample)} registres. Geocodificant municipi...")
    for r in sample:
        try:
            geo = reverse_geocode(r["latitude"], r["longitude"])
            addr = geo.get("address", {})
            municipi = (addr.get("municipality") or addr.get("town") or
                        addr.get("village") or addr.get("city") or
                        addr.get("hamlet") or "desconegut")
            r["municipality"] = municipi
            r["address"] = geo.get("display_name")
        except Exception as e:
            r["municipality"] = "desconegut"
            r["address"] = None
        time.sleep(1.1)

    out = Path("data/pilot/priorat_sample_30.json")
    out.write_text(json.dumps(sample, ensure_ascii=False, indent=1))
    print(f"Guardat a {out}")


if __name__ == "__main__":
    main()
