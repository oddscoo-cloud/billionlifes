"""Extract a deterministic six-country snapshot from UN WPP 2024."""
import argparse
import csv
import gzip
import hashlib
import json
from decimal import Decimal
from pathlib import Path
from shutil import copyfileobj
from urllib.request import urlopen

BASE_URL = (
    "https://population.un.org/wpp/assets/"
    "Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/"
)
ARCHIVES = {
    "births": (
        "WPP2024_Demographic_Indicators_Medium.csv.gz",
        "286ac36bb1415e2e1ade03acfef0a29f0e4c087e2f78e38c48f50c5df89082bc",
    ),
    "life": (
        "WPP2024_Life_Table_Abridged_Medium_1950-2023.csv.gz",
        "3d6e82f23023b5f20e1c190752758f637599974fdcac02d38b94c80c4081f982",
    ),
}
YEAR = 2023
COUNTRIES = {
    "UA": "Украина",
    "IN": "Индия",
    "NG": "Нигерия",
    "MX": "Мексика",
    "BR": "Бразилия",
    "AU": "Австралия",
}
OUTPUT = Path(__file__).resolve().parents[1] / "src/data/wpp2024-2023.json"


def archive(cache, dataset):
    filename, checksum = ARCHIVES[dataset]
    path = cache / filename
    if not path.exists():
        partial = path.with_suffix(".part")
        with urlopen(BASE_URL + filename, timeout=60) as response, partial.open("wb") as file:
            copyfileobj(response, file)
        partial.replace(path)
    with path.open("rb") as file:
        digest = hashlib.file_digest(file, "sha256").hexdigest()
    if digest != checksum:
        raise ValueError(f"Unexpected SHA-256 for {path}: {digest}")
    return path


def selected_rows(path):
    with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            if (
                row["ISO2_code"] in COUNTRIES
                and row["Time"] == str(YEAR)
                and row["Variant"] == "Medium"
            ):
                yield row


def snapshot(cache):
    births = {}
    for row in selected_rows(archive(cache, "births")):
        code = row["ISO2_code"]
        if code in births:
            raise ValueError(f"Duplicate birth row for {code}")
        births[code] = int(Decimal(row["Births"]) * 1000)

    tables = {code: {"male": [], "female": []} for code in COUNTRIES}
    for row in selected_rows(archive(cache, "life")):
        sex = row["Sex"].lower()
        if sex not in ("male", "female"):
            continue
        span = int(row["AgeGrpSpan"])
        tables[row["ISO2_code"]][sex].append({
            "startAge": int(row["AgeGrpStart"]),
            "years": None if span == -1 else span,
            "deathProbability": float(row["qx"]),
            **({"remainingLifeYears": float(row["ex"])} if span == -1 else {}),
        })

    countries = {}
    for code, name in COUNTRIES.items():
        mortality = tables[code]
        for sex, table in mortality.items():
            table.sort(key=lambda row: row["startAge"])
            if [row["startAge"] for row in table] != [0, 1, *range(5, 101, 5)]:
                raise ValueError(f"Unexpected age coverage for {code}/{sex}")
            if [row["years"] for row in table] != [1, 4, *([5] * 19), None]:
                raise ValueError(f"Unexpected age spans for {code}/{sex}")
        countries[code] = {"name": name, "births": births[code], "mortality": mortality}
    return {"version": "wpp2024-2023-v1", "year": YEAR, "countries": countries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True, help="Directory for the original archives")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    contents = json.dumps(snapshot(args.cache), ensure_ascii=False, indent=2, allow_nan=False)
    OUTPUT.write_text(contents + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
