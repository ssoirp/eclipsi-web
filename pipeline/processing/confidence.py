"""
Construeix el registre final segons l'esquema del projecte, assignant
confidence_score i verification_status. Com que en aquesta fase la unica font
es OSM (font_cartografica), la confianca es necessariament limitada: alta per
coordenades (venen directes d'OSM), pero mitjana/baixa per verificacio general
i "unknown" explicit per a tots els equipaments no confirmats per cap font.

Aixo es intencionat: no inventem "no" quan no sabem. Quan s'incorporin fonts
oficials/web, aquest modul es el que caldria ampliar per pujar confidence_score
i canviar equipaments de unknown a yes/no amb source explicita.
"""
import json
from pathlib import Path

EQUIPMENT_FIELDS = [
    "picnic", "tables", "benches", "barbecue", "drinking_water", "fountain",
    "toilets", "bins", "parking", "shade", "playground", "sports_area",
    "bathing", "dogs_allowed", "accessibility", "camping", "caravan",
    "electricity", "showers",
]

# Deduccions MOLT conservadores nomes quan el propi tag OSM ho confirma
# explicitament per aquell element (mai per categoria/subcategoria general).
def infer_equipment_from_osm_tags(tags, subcategory):
    eq = {f: "unknown" for f in EQUIPMENT_FIELDS}
    eq_conf = {f"{f}_confidence": "n/a" for f in EQUIPMENT_FIELDS}
    eq_source = {f"{f}_source": None for f in EQUIPMENT_FIELDS}

    def set_yes(field, conf="high"):
        eq[field] = "yes"
        eq_conf[f"{field}_confidence"] = conf
        eq_source[f"{field}_source"] = "OpenStreetMap (tag explicit)"

    if subcategory == "zona_picnic":
        eq["picnic"] = "yes"
        eq_conf["picnic_confidence"] = "high"
        eq_source["picnic_source"] = "OpenStreetMap (tourism=picnic_site)"
    if tags.get("drinking_water") == "yes" or tags.get("amenity") == "drinking_water":
        set_yes("drinking_water")
    if tags.get("amenity") == "fountain":
        set_yes("fountain")
    if tags.get("amenity") == "toilets":
        set_yes("toilets")
    if tags.get("amenity") == "bbq":
        set_yes("barbecue")
    if tags.get("wheelchair") == "yes":
        set_yes("accessibility")
    elif tags.get("wheelchair") == "no":
        eq["accessibility"] = "no"
        eq_conf["accessibility_confidence"] = "high"
        eq_source["accessibility_source"] = "OpenStreetMap (wheelchair=no)"
    if tags.get("parking") or tags.get("amenity") == "parking":
        set_yes("parking")
    if tags.get("shower") == "yes":
        set_yes("showers")
    if tags.get("dog") == "yes" or tags.get("dogs") == "yes":
        set_yes("dogs_allowed")
    elif tags.get("dog") == "no":
        eq["dogs_allowed"] = "no"
        eq_conf["dogs_allowed_confidence"] = "high"
        eq_source["dogs_allowed_source"] = "OpenStreetMap (dog=no)"
    if subcategory in ("camping",):
        eq["camping"] = "yes"
        eq_conf["camping_confidence"] = "high"
        eq_source["camping_source"] = "OpenStreetMap (tourism=camp_site)"
    if subcategory == "area_autocaravanes":
        eq["caravan"] = "yes"
        eq_conf["caravan_confidence"] = "high"
        eq_source["caravan_source"] = "OpenStreetMap (tourism=caravan_site)"
    if tags.get("shelter") == "yes" or subcategory in ("parc", "zona_verda"):
        pass  # no assumim ombra nomes per ser un parc

    return {**eq, **eq_conf, **eq_source}


def build_final_record(rec, idx):
    tags = rec.get("osm_tags", {})
    equipment = infer_equipment_from_osm_tags(tags, rec.get("subcategory"))

    has_name = bool(rec.get("name"))
    coord_conf = rec.get("coordinates_confidence", "high")

    # confidence_score global: nomes OSM com a font -> mitjana com a molt (mai alta,
    # perque "alta" reservem per confirmacio administrativa + coords fiables).
    if has_name and coord_conf == "high":
        confidence_score = "medium"
        verification_status = "verified_geometry_only"
    else:
        confidence_score = "low"
        verification_status = "unverified"

    final = {
        "id": f"REC{idx:05d}",
        "name": rec.get("name") or "(sense nom - OSM)",
        "normalized_name": rec.get("normalized_name", ""),
        "category": rec.get("category"),
        "subcategory": rec.get("subcategory"),
        "description": None,

        "comarca": rec.get("comarca"),
        "municipality": rec.get("municipality"),
        "province": rec.get("province"),

        "latitude": rec.get("latitude"),
        "longitude": rec.get("longitude"),
        "coordinates_source": rec.get("coordinates_source"),
        "coordinates_confidence": coord_conf,

        "address": rec.get("address"),

        **equipment,

        "opening_hours": tags.get("opening_hours", "unknown"),
        "contact": tags.get("phone") or tags.get("contact:phone") or "unknown",
        "website": tags.get("website") or tags.get("contact:website") or "unknown",

        "google_place_id": None,
        "osm_id": rec.get("osm_id"),

        "official_source": "no",
        "sources": rec.get("sources", ["font_cartografica"]),
        "source_urls": rec.get("source_urls", []),

        "verification_status": verification_status,
        "confidence_score": confidence_score,
        "last_verified": "2026-08-09",

        "notes": "Font unica: OpenStreetMap. Equipaments no confirmats per cap font oficial/web encara: marcats 'unknown' fins a contrastar.",
        "possible_duplicate": rec.get("possible_duplicate", False),
        "duplicate_of_candidates": rec.get("duplicate_of_candidates", []),
    }
    return final


if __name__ == "__main__":
    recs = json.loads(Path("data/processed/deduplicated.json").read_text())
    final = [build_final_record(r, i + 1) for i, r in enumerate(recs)]
    out = Path("data/final/espais_lleure_4_comarques.json")
    out.write_text(json.dumps(final, ensure_ascii=False, indent=1))
    print(f"{len(final)} registres finals -> {out}")
