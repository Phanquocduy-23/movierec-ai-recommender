"""Tải MovieLens ml-latest-small, lưu ZIP + SHA-256 + ngày tải vào data/raw/manifest.json.

Chạy:  python ml/download_data.py
(Nếu không có mạng, tải thủ công ZIP từ grouplens.org và giải nén vào data/raw/ml-latest-small)
"""
import json
import shutil
import ssl
import sys
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from recsys.data import sha256_file  # noqa: E402

URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
RAW = ROOT / "data" / "raw"


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    RAW.mkdir(parents=True, exist_ok=True)
    zip_path = RAW / "ml-latest-small.zip"
    if not zip_path.exists():
        print(f"Đang tải {URL} ...")
        try:
            urllib.request.urlretrieve(URL, zip_path)
        except urllib.error.URLError:
            ctx = ssl._create_unverified_context()
            with urllib.request.urlopen(URL, context=ctx) as resp, open(zip_path, "wb") as out_f:
                shutil.copyfileobj(resp, out_f)
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(RAW)
    manifest = {
        "dataset": "MovieLens ml-latest-small",
        "url": URL,
        "zip_sha256": sha256_file(zip_path),
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
        "files": {p.name: sha256_file(p) for p in sorted((RAW / "ml-latest-small").glob("*.csv"))},
        "license_note": "Xem README của GroupLens: dùng cho nghiên cứu, phải trích dẫn F. Maxwell Harper "
                        "and Joseph A. Konstan. 2015. The MovieLens Datasets: History and Context.",
    }
    (RAW / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), "utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
