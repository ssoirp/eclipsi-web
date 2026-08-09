"""
Collector OpenStreetMap / Overpass API.

Descarrega elements de lleure, natura, acampada i patrimoni per una
comarca catalana, utilitzant el polígon administratiu de la comarca
(area["name"="..."]["admin_level"="7"]) com a filtre espacial.

No inventa dades: es limita a descarregar el que hi ha a OSM tal com hi és,
conservant tags originals com a evidència (osm_id, osm_tags).
"""
import json
import time
import requests
from pathlib import Path

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "inventari-lleure-4-comarques/0.1 (contact: ssoi.ramon@gmail.com)"}

# Mapatge de tags OSM -> categoria interna del nostre esquema.
# S'inclouen variants i tags relacionats, no només els "obvis".
OSM_QUERY_DEFS = [
    # --- Lleure / natura ---
    ("tourism", "picnic_site", "espai_lleure", "zona_picnic"),
    ("leisure", "picnic_table", "espai_lleure", "zona_picnic"),
    ("leisure", "park", "espai_lleure", "parc"),
    ("leisure", "playground", "espai_lleure", "parc_infantil"),
    ("leisure", "garden", "espai_lleure", "zona_verda"),
    ("leisure", "nature_reserve", "espai_lleure", "espai_natural"),
    ("leisure", "bathing_place", "espai_lleure", "zona_bany"),
    ("natural", "beach", "espai_lleure", "zona_bany"),
    ("tourism", "viewpoint", "espai_lleure", "mirador"),
    ("amenity", "bbq", "espai_lleure", "barbacoa"),
    ("leisure", "fitness_station", "espai_lleure", "zona_esportiva"),
    ("leisure", "pitch", "espai_lleure", "pista_esportiva"),
    ("leisure", "sports_centre", "espai_lleure", "zona_esportiva"),
    # --- Aigua / serveis puntuals (per enriquir, no com a lloc principal) ---
    ("amenity", "drinking_water", "servei_puntual", "font"),
    ("natural", "spring", "servei_puntual", "font_natural"),
    ("man_made", "water_well", "servei_puntual", "font_natural"),
    ("amenity", "fountain", "servei_puntual", "font_ornamental"),
    ("amenity", "toilets", "servei_puntual", "wc"),
    ("amenity", "bench", "servei_puntual", "banc"),
    ("amenity", "shelter", "servei_puntual", "refugi_petit"),
    # --- Acampada / turisme ---
    ("tourism", "camp_site", "acampada", "camping"),
    ("tourism", "caravan_site", "acampada", "area_autocaravanes"),
    ("tourism", "wilderness_hut", "acampada", "refugi_lliure"),
    ("tourism", "alpine_hut", "acampada", "refugi"),
    ("tourism", "hostel", "acampada", "alberg"),
    ("amenity", "shelter", "acampada", "refugi_petit"),
    # --- Patrimoni ---
    ("amenity", "place_of_worship", "patrimoni", "esglesia_ermita"),
    ("historic", "wayside_shrine", "patrimoni", "capella"),
    ("historic", "wayside_cross", "patrimoni", "creu_terme"),
    ("historic", "chapel", "patrimoni", "capella"),
    ("historic", "church", "patrimoni", "esglesia"),
    ("historic", "monastery", "patrimoni", "monestir"),
    ("amenity", "grave_yard", "patrimoni", "cementiri"),
    ("landuse", "cemetery", "patrimoni", "cementiri"),
    ("man_made", "watermill", "patrimoni", "moli"),
    ("man_made", "windmill", "patrimoni", "moli_vent"),
    ("historic", "castle", "patrimoni", "castell"),
    ("historic", "fort", "patrimoni", "castell"),
    ("historic", "tower", "patrimoni", "torre"),
    ("man_made", "tower", "patrimoni", "torre"),
    ("historic", "archaeological_site", "patrimoni", "jaciment"),
    ("historic", "ruins", "patrimoni", "ruina"),
    ("historic", "monument", "patrimoni", "monument"),
    ("historic", "memorial", "patrimoni", "memorial"),
    ("tourism", "information", "patrimoni", "punt_informacio"),
]


def build_query(comarca_name, admin_level=7):
    """Construeix una query Overpass per obtenir tots els tags d'interès
    dins de l'àrea administrativa de la comarca."""
    parts = []
    for key, value, *_ in OSM_QUERY_DEFS:
        for elem in ("node", "way", "relation"):
            parts.append(f'{elem}["{key}"="{value}"](area.a);')
    body = "\n  ".join(parts)
    query = f"""
[out:json][timeout:180];
area["name"="{comarca_name}"]["boundary"="administrative"]["admin_level"="{admin_level}"]->.a;
(
  {body}
)->.result;
.result out center tags;
"""
    return query


def fetch_comarca(comarca_name, out_path, admin_level=7, retries=3):
    query = build_query(comarca_name, admin_level=admin_level)
    last_err = None
    for attempt in range(retries):
        try:
            resp = requests.post(OVERPASS_URL, data={"data": query}, headers=HEADERS, timeout=200)
            resp.raise_for_status()
            data = resp.json()
            Path(out_path).write_text(json.dumps(data, ensure_ascii=False, indent=1))
            return data
        except Exception as e:
            last_err = e
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Overpass fetch failed for {comarca_name}: {last_err}")


def tag_to_category(tags):
    for key, value, cat, subcat in OSM_QUERY_DEFS:
        if tags.get(key) == value:
            return cat, subcat
    return "desconegut", "desconegut"


NOISE_INFORMATION_SUBTYPES = {"guidepost", "board", "map"}


def parse_elements(osm_json):
    """Converteix elements crus d'Overpass en registres del nostre esquema
    (parcials: només la part que ve d'OSM).

    Filtra soroll conegut: pals indicadors de senders (tourism=information
    amb information=guidepost/board/map) no son llocs/destinacions, sino
    senyalitzacio de rutes, i inflarien artificialment el recompte de
    "patrimoni/punt_informacio"."""
    records = []
    for el in osm_json.get("elements", []):
        tags = el.get("tags", {})
        if tags.get("tourism") == "information" and tags.get("information") in NOISE_INFORMATION_SUBTYPES:
            continue
        if el["type"] == "node":
            lat, lon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center", {})
            lat, lon = center.get("lat"), center.get("lon")
        if lat is None or lon is None:
            continue
        cat, subcat = tag_to_category(tags)
        name = tags.get("name") or tags.get("name:ca") or tags.get("name:es") or None
        records.append({
            "osm_id": f'{el["type"]}/{el["id"]}',
            "name": name,
            "category": cat,
            "subcategory": subcat,
            "latitude": lat,
            "longitude": lon,
            "coordinates_source": "osm",
            "coordinates_confidence": "high",
            "osm_tags": tags,
            "sources": ["font_cartografica"],
            "source_urls": [f'https://www.openstreetmap.org/{el["type"]}/{el["id"]}'],
        })
    return records


if __name__ == "__main__":
    import sys
    comarca = sys.argv[1] if len(sys.argv) > 1 else "Priorat"
    out = Path(__file__).parent.parent / "data" / "raw" / f"osm_{comarca.lower()}.json"
    print(f"Descarregant OSM per {comarca}...")
    data = fetch_comarca(comarca, out)
    recs = parse_elements(data)
    print(f"{len(recs)} elements trobats per {comarca}")
