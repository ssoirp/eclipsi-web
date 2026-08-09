import json
import csv
from pathlib import Path

LIST_FIELDS = {"sources", "source_urls", "duplicate_of_candidates"}


def flatten(rec):
    out = {}
    for k, v in rec.items():
        if k in LIST_FIELDS:
            if k == "duplicate_of_candidates":
                out[k] = json.dumps(v, ensure_ascii=False) if v else ""
            else:
                out[k] = "; ".join(v) if v else ""
        else:
            out[k] = v
    return out


def export_csv(records, path):
    if not records:
        return
    flat = [flatten(r) for r in records]
    fieldnames = list(flat[0].keys())
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(flat)


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    export_csv(recs, "data/final/espais_lleure_4_comarques.csv")
    print(f"CSV exportat: {len(recs)} files")
