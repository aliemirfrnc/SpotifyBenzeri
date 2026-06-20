import json
import threading
from pathlib import Path

_LOCK = threading.Lock()
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _path_for(name: str) -> Path:
    return _DATA_DIR / f"{name}.json"


def load(name: str) -> dict:
    path = _path_for(name)
    if not path.exists():
        return {}
    try:
        with _LOCK:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save(name: str, data: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = _path_for(name)
    with _LOCK:
        tmp_path = path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f)
        tmp_path.replace(path)