import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.core.cache_store import load, save

router = APIRouter()


class SyncedLine(BaseModel):
    time: float
    text: str


class LyricsResponse(BaseModel):
    lyrics: list[str]
    synced: list[SyncedLine] | None = None
    source: str


_cache: dict[str, dict] = load("lyrics")
_cache_lock = threading.Lock()
_thread_local = threading.local()

_executor = ThreadPoolExecutor(max_workers=4)

HEADERS = {"User-Agent": "Lingofy/1.0"}
TIMEOUT = 10
WARMUP_WORKERS = 2

_LRC_TIME_RE = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\]")


def _get_session() -> requests.Session:
    if not hasattr(_thread_local, "session"):
        s = requests.Session()
        s.headers.update(HEADERS)
        _thread_local.session = s
    return _thread_local.session


def _parse_plain(raw_text: str) -> list[str]:
    lines = [line.strip() for line in raw_text.split("\n")]
    return [line for line in lines if line]


def _parse_synced(raw_text: str) -> list[dict]:
    result = []
    for line in raw_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        match = _LRC_TIME_RE.match(line)
        if not match:
            continue
        minutes, seconds = match.groups()
        time_sec = int(minutes) * 60 + float(seconds)
        text = line[match.end():].strip()
        if text:
            result.append({"time": time_sec, "text": text})
    return result


def _extract(data: dict) -> dict | None:
    synced_raw = data.get("syncedLyrics")
    plain_raw = data.get("plainLyrics")

    if synced_raw:
        synced = _parse_synced(synced_raw)
        if synced:
            return {"lyrics": [item["text"] for item in synced], "synced": synced}

    if plain_raw:
        plain = _parse_plain(plain_raw)
        if plain:
            return {"lyrics": plain, "synced": None}

    return None


def _fetch_get(track: str, artist: str, error_flag: list) -> dict | None:
    try:
        resp = _get_session().get(
            "https://lrclib.net/api/get",
            params={"track_name": track, "artist_name": artist},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            return _extract(resp.json())
    except (requests.RequestException, ValueError, TypeError) as e:
        print("LYRICS GET ERROR:", repr(e))
        error_flag.append(True)
    return None


def _fetch_search(query: str, error_flag: list) -> dict | None:
    try:
        resp = _get_session().get(
            "https://lrclib.net/api/search",
            params={"q": query},
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            results = resp.json()
            if results:
                return _extract(results[0])
    except (requests.RequestException, ValueError, TypeError) as e:
        print("LYRICS SEARCH ERROR:", repr(e))
        error_flag.append(True)
    return None


def _fetch_parallel(track: str, artist: str) -> tuple[dict | None, bool]:
    """İkinci eleman: ağ/timeout kaynaklı bir hata olup olmadığı.
    True ise 502 (tekrar denenebilir), False ise gerçekten sonuç yok (404)."""
    query = f"{track} {artist}".strip()
    error_flag: list = []
    futures = []

    if artist:
        futures.append(_executor.submit(_fetch_get, track, artist, error_flag))
    futures.append(_executor.submit(_fetch_search, query, error_flag))

    for future in as_completed(futures):
        result = future.result()
        if result:
            return result, False

    return None, len(error_flag) > 0


def warmup() -> None:
    """Backend açılışında LRCLIB'e bağlantıyı önceden ısıtır."""
    def _warm(_):
        try:
            _get_session().get(
                "https://lrclib.net/api/search",
                params={"q": "warmup"},
                timeout=TIMEOUT,
            )
        except requests.RequestException:
            pass

    list(_executor.map(_warm, range(WARMUP_WORKERS)))


@router.get("/lyrics", response_model=LyricsResponse)
def get_lyrics(
    track: str = Query(...),
    artist: str = Query(""),
):
    cache_key = f"{track.lower()}::{artist.lower()}"

    with _cache_lock:
        cached = _cache.get(cache_key)
    if cached:
        return {**cached, "source": "LRCLIB (cache)"}

    data, had_network_error = _fetch_parallel(track, artist)

    if not data:
        if had_network_error:
            raise HTTPException(
                status_code=502,
                detail="Şarkı sözü servisi şu anda yanıt vermiyor. Lütfen tekrar deneyin.",
            )
        raise HTTPException(status_code=404, detail="Bu şarkı için söz bulunamadı.")

    with _cache_lock:
        _cache[cache_key] = data
        save("lyrics", _cache)

    return {**data, "source": "LRCLIB"}
