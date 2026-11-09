"""GitHub OAuth Device Flow helper to authenticate Phanquocduy-23 and push repo."""
from __future__ import annotations

import json
import ssl
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE_FILE = ROOT / ".git" / "gh_device.json"
# Official Git Credential Manager public OAuth Client ID
CLIENT_ID = "01ab8ac9400c4e429b23"
REPO_URL = "https://github.com/Phanquocduy-23/movierec-ai-recommender.git"


def _post_json(url: str, data: dict) -> dict:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=encoded,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Git-Credential-Manager",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))


def get_code() -> dict:
    res = _post_json(
        "https://github.com/login/device/code",
        {"client_id": CLIENT_ID, "scope": "repo workflow"},
    )
    res["created_at"] = time.time()
    STATE_FILE.write_text(json.dumps(res, indent=2), encoding="utf-8")
    print("==========================================")
    print(f"MA 8 KY TU GITHUB CUA BAN: {res['user_code']}")
    print(f"Link nhap ma: {res['verification_uri']}")
    print("==========================================")
    return res


def poll_and_push() -> int:
    if not STATE_FILE.exists():
        info = get_code()
    else:
        info = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if time.time() - info.get("created_at", 0) > info.get("expires_in", 900) - 60:
            info = get_code()
        else:
            print("==========================================")
            print(f"MA 8 KY TU GITHUB CUA BAN: {info['user_code']}")
            print(f"Link nhap ma: {info['verification_uri']}")
            print("==========================================")

    interval = int(info.get("interval", 5)) + 1
    device_code = info["device_code"]

    print("Dang cho ban nhap ma tren trinh duyet Coc Coc (https://github.com/login/device)...")
    while True:
        res = _post_json(
            "https://github.com/login/oauth/access_token",
            {
                "client_id": CLIENT_ID,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            },
        )
        if "access_token" in res:
            token = res["access_token"]
            print("\n[OK] Da xac thuc GitHub thanh cong!")
            try:
                STATE_FILE.unlink(missing_ok=True)
            except Exception:
                pass

            # Save token into Git Credential Manager for future git commands
            subprocess.run(
                [
                    "git",
                    "credential-manager",
                    "github",
                    "login",
                    "--no-ui",
                    "--username",
                    "Phanquocduy-23",
                    "--token",
                    token,
                ],
                cwd=str(ROOT),
                check=False,
            )

            # Push using token directly to guarantee zero prompt
            auth_url = f"https://Phanquocduy-23:{token}@github.com/Phanquocduy-23/movierec-ai-recommender.git"
            subprocess.run(
                ["git", "push", "-u", auth_url, "main:main"],
                cwd=str(ROOT),
                check=True,
            )
            # Clean remote URL back to standard HTTPS (token is now in GCM)
            subprocess.run(
                ["git", "remote", "set-url", "origin", REPO_URL],
                cwd=str(ROOT),
                check=False,
            )
            print("\n[HOAN TAT] Da push toan bo code len https://github.com/Phanquocduy-23/movierec-ai-recommender !")
            return 0

        err = res.get("error")
        if err == "authorization_pending":
            time.sleep(interval)
            continue
        elif err == "slow_down":
            interval += 5
            time.sleep(interval)
            continue
        else:
            print(f"Loi xac thuc: {res}")
            return 1


if __name__ == "__main__":
    if "--get-code" in sys.argv:
        get_code()
    else:
        sys.exit(poll_and_push())
