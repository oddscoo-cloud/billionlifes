"""Extract a deterministic 193-country snapshot from UN WPP 2024."""
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
    "AF": "Афганистан", "AL": "Албания", "DZ": "Алжир", "AD": "Андорра", "AO": "Ангола",
    "AG": "Антигуа и Барбуда", "AR": "Аргентина", "AM": "Армения", "AU": "Австралия",
    "AT": "Австрия", "AZ": "Азербайджан", "BS": "Багамы", "BH": "Бахрейн",
    "BD": "Бангладеш", "BB": "Барбадос", "BY": "Беларусь", "BE": "Бельгия",
    "BZ": "Белиз", "BJ": "Бенин", "BT": "Бутан", "BO": "Боливия",
    "BA": "Босния и Герцеговина", "BW": "Ботсвана", "BR": "Бразилия", "BN": "Бруней",
    "BG": "Болгария", "BF": "Буркина-Фасо", "BI": "Бурунди", "CV": "Кабо-Верде",
    "KH": "Камбоджа", "CM": "Камерун", "CA": "Канада", "CF": "Центральноафриканская Республика",
    "TD": "Чад", "CL": "Чили", "CN": "Китай", "CO": "Колумбия", "KM": "Коморы",
    "CG": "Республика Конго", "CR": "Коста-Рика", "CI": "Кот-д’Ивуар", "HR": "Хорватия",
    "CU": "Куба", "CY": "Кипр", "CZ": "Чехия", "CD": "Демократическая Республика Конго",
    "DK": "Дания", "DJ": "Джибути", "DM": "Доминика", "DO": "Доминиканская Республика",
    "EC": "Эквадор", "EG": "Египет", "SV": "Сальвадор", "GQ": "Экваториальная Гвинея",
    "ER": "Эритрея", "EE": "Эстония", "SZ": "Эсватини", "ET": "Эфиопия",
    "FJ": "Фиджи", "FI": "Финляндия", "FR": "Франция", "GA": "Габон",
    "GM": "Гамбия", "GE": "Грузия", "DE": "Германия", "GH": "Гана",
    "GR": "Греция", "GD": "Гренада", "GT": "Гватемала", "GN": "Гвинея",
    "GW": "Гвинея-Бисау", "GY": "Гайана", "HT": "Гаити", "HN": "Гондурас",
    "HU": "Венгрия", "IS": "Исландия", "IN": "Индия", "ID": "Индонезия",
    "IR": "Иран", "IQ": "Ирак", "IE": "Ирландия", "IL": "Израиль",
    "IT": "Италия", "JM": "Ямайка", "JP": "Япония", "JO": "Иордания",
    "KZ": "Казахстан", "KE": "Кения", "KI": "Кирибати", "KP": "КНДР",
    "KR": "Республика Корея", "KW": "Кувейт", "KG": "Кыргызстан", "LA": "Лаос",
    "LV": "Латвия", "LB": "Ливан", "LS": "Лесото", "LR": "Либерия",
    "LY": "Ливия", "LI": "Лихтенштейн", "LT": "Литва", "LU": "Люксембург",
    "MG": "Мадагаскар", "MW": "Малави", "MY": "Малайзия", "MV": "Мальдивы",
    "ML": "Мали", "MT": "Мальта", "MH": "Маршалловы Острова", "MR": "Мавритания",
    "MU": "Маврикий", "MX": "Мексика", "FM": "Микронезия", "MC": "Монако",
    "MN": "Монголия", "MD": "Молдова", "ME": "Черногория", "MA": "Марокко", "MZ": "Мозамбик",
    "MM": "Мьянма", "NA": "Намибия", "NR": "Науру", "NP": "Непал",
    "NL": "Нидерланды", "NZ": "Новая Зеландия", "NI": "Никарагуа", "NE": "Нигер",
    "NG": "Нигерия", "MK": "Северная Македония", "NO": "Норвегия", "OM": "Оман",
    "PK": "Пакистан", "PW": "Палау", "PA": "Панама", "PG": "Папуа — Новая Гвинея",
    "PY": "Парагвай", "PE": "Перу", "PH": "Филиппины", "PL": "Польша",
    "PT": "Португалия", "QA": "Катар", "RO": "Румыния", "RU": "Россия",
    "RW": "Руанда", "KN": "Сент-Китс и Невис", "LC": "Сент-Люсия",
    "VC": "Сент-Винсент и Гренадины", "WS": "Самоа", "SM": "Сан-Марино",
    "ST": "Сан-Томе и Принсипи", "SA": "Саудовская Аравия", "SN": "Сенегал",
    "RS": "Сербия", "SC": "Сейшелы", "SL": "Сьерра-Леоне", "SG": "Сингапур",
    "SK": "Словакия", "SI": "Словения", "SB": "Соломоновы Острова", "SO": "Сомали",
    "ZA": "Южно-Африканская Республика", "SS": "Южный Судан", "ES": "Испания",
    "LK": "Шри-Ланка", "SD": "Судан", "SR": "Суринам", "SE": "Швеция",
    "CH": "Швейцария", "SY": "Сирия", "TJ": "Таджикистан", "TZ": "Танзания",
    "TH": "Таиланд", "TL": "Восточный Тимор", "TG": "Того", "TO": "Тонга",
    "TT": "Тринидад и Тобаго", "TN": "Тунис", "TR": "Турция", "TM": "Туркменистан",
    "TV": "Тувалу", "UG": "Уганда", "UA": "Украина", "AE": "Объединённые Арабские Эмираты",
    "GB": "Великобритания", "US": "Соединённые Штаты Америки", "UY": "Уругвай",
    "UZ": "Узбекистан", "VU": "Вануату", "VE": "Венесуэла", "VN": "Вьетнам",
    "YE": "Йемен", "ZM": "Замбия", "ZW": "Зимбабве",
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
    return {"version": "wpp2024-193-v1", "year": YEAR, "countries": countries}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True, help="Directory for the original archives")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    contents = json.dumps(snapshot(args.cache), ensure_ascii=False, indent=2, allow_nan=False)
    OUTPUT.write_text(contents + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
