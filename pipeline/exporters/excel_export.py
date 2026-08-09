import json
from pathlib import Path
import pandas as pd
from openpyxl.utils import get_column_letter

from csv_export import flatten

CORE_COLS = [
    "id", "name", "category", "subcategory", "comarca", "municipality",
    "latitude", "longitude", "coordinates_confidence",
    "picnic", "tables", "barbecue", "drinking_water", "toilets", "parking",
    "camping", "caravan", "accessibility",
    "confidence_score", "verification_status", "possible_duplicate",
    "sources", "source_urls", "osm_id", "notes",
]


def export_excel(records, path):
    flat = [flatten(r) for r in records]
    df = pd.DataFrame(flat)
    other_cols = [c for c in df.columns if c not in CORE_COLS]
    ordered = [c for c in CORE_COLS if c in df.columns] + other_cols
    df = df[ordered]

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Espais")
        ws = writer.sheets["Espais"]
        ws.auto_filter.ref = ws.dimensions
        ws.freeze_panes = "A2"
        for i, col in enumerate(df.columns, start=1):
            maxlen = max([len(str(col))] + [len(str(v)) for v in df[col].astype(str).head(200)])
            ws.column_dimensions[get_column_letter(i)].width = min(max(maxlen + 2, 10), 45)

        # Full de cobertura
        cov = df.groupby(["comarca", "category"]).size().reset_index(name="nombre")
        cov.to_excel(writer, index=False, sheet_name="Cobertura")


if __name__ == "__main__":
    recs = json.loads(Path("data/final/espais_lleure_4_comarques.json").read_text())
    export_excel(recs, "data/final/espais_lleure_4_comarques.xlsx")
    print(f"Excel exportat: {len(recs)} files")
