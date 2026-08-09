"""
Deduplicacio: agrupa registres que probablement son el mateix lloc.

Criteri (segons especificacio del projecte):
- distancia geografica < 100m
- noms normalitzats similars (o un conte l'altre, o mateixa categoria+subcat
  amb distancia molt curta < 30m encara que el nom sigui diferent -> igualment
  marcat com a possible duplicat, mai fusionat automaticament sense marca)

NO eliminem res automaticament. Fusionem nomes quan estem raonablement seguixim del
mateix punt EXACTE (mateix osm_id ja es dedup natural, no cal); per a possibles
duplicats entre fonts diferents nomes marquem `possible_duplicate=true` i
enllacem els ids relacionats a `duplicate_of_candidates`.
"""
import json
import math
from pathlib import Path
from difflib import SequenceMatcher


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def name_similarity(a, b):
    if not a or not b:
        return 0.0
    if a in b or b in a:
        return 0.9
    return SequenceMatcher(None, a, b).ratio()


def find_possible_duplicates(records, dist_threshold_m=100, name_sim_threshold=0.55):
    """Assigna un 'dedup_group_id' compartit a registres que semblen el mateix
    lloc. Retorna els mateixos registres amb els camps afegits."""
    n = len(records)
    for r in records:
        r.setdefault("id", None)
        r["possible_duplicate"] = False
        r["duplicate_of_candidates"] = []

    # index espacial simple per graella (evita O(n^2) complet en 3760 punts,
    # tot i que amb aquest volum encara seria factible directament)
    grid = {}
    cell_size = 0.002  # ~200m en graus
    for i, r in enumerate(records):
        key = (int(r["latitude"] / cell_size), int(r["longitude"] / cell_size))
        grid.setdefault(key, []).append(i)

    def neighbors(i):
        r = records[i]
        cx, cy = int(r["latitude"] / cell_size), int(r["longitude"] / cell_size)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in grid.get((cx + dx, cy + dy), []):
                    if j > i:
                        yield j

    pairs = []
    for i in range(n):
        for j in neighbors(i):
            a, b = records[i], records[j]
            if a.get("osm_id") and a.get("osm_id") == b.get("osm_id"):
                continue
            d = haversine_m(a["latitude"], a["longitude"], b["latitude"], b["longitude"])
            if d > dist_threshold_m:
                continue
            sim = name_similarity(a.get("normalized_name", ""), b.get("normalized_name", ""))
            same_subcat = a.get("subcategory") == b.get("subcategory")
            both_named = bool(a.get("name")) and bool(b.get("name"))
            both_unnamed = not a.get("name") and not b.get("name")
            # Criteri principal (segons especificacio): distancia curta + noms
            # similars. Bancs, pistes, ruines, etc. sovint es troben clusteritzats
            # legitimament (10 bancs en un parc, 3 pistes en un poliesportiu) i
            # NO son duplicats nomes per ser del mateix subtipus i estar a prop:
            # exigim sempre similitud de nom, excepte quan cap dels dos te nom i
            # estan pràcticament al mateix punt (possible doble digitalitzacio
            # del mateix objecte fisic).
            is_granular = a.get("category") == "servei_puntual" and b.get("category") == "servei_puntual"
            if both_named:
                is_dup = sim >= name_sim_threshold
            elif both_unnamed and not is_granular:
                is_dup = d < 10 and same_subcat
            else:
                is_dup = False
            if is_dup:
                pairs.append((i, j, d, sim))

    for i, j, d, sim in pairs:
        records[i]["possible_duplicate"] = True
        records[j]["possible_duplicate"] = True
        records[i]["duplicate_of_candidates"].append({
            "index": j, "osm_id": records[j].get("osm_id"), "name": records[j].get("name"),
            "distance_m": round(d, 1), "name_similarity": round(sim, 2),
        })
        records[j]["duplicate_of_candidates"].append({
            "index": i, "osm_id": records[i].get("osm_id"), "name": records[i].get("name"),
            "distance_m": round(d, 1), "name_similarity": round(sim, 2),
        })

    return records, pairs


if __name__ == "__main__":
    recs = json.loads(Path("data/processed/normalized.json").read_text())
    recs, pairs = find_possible_duplicates(recs)
    n_dup = sum(1 for r in recs if r["possible_duplicate"])
    print(f"Registres totals: {len(recs)}")
    print(f"Parelles candidates a duplicat: {len(pairs)}")
    print(f"Registres marcats possible_duplicate: {n_dup}")
    Path("data/processed/deduplicated.json").write_text(json.dumps(recs, ensure_ascii=False, indent=1))
