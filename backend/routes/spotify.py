import secrets
import threading
import time
from urllib.parse import urlencode
import logging

import requests

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from backend.core.config import (
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI,
    FRONTEND_URL,
)
from backend.core.db import get_conn, get_lock
from backend.routes.auth import require_user_id

router = APIRouter(prefix="/spotify")


SCOPE = (
    "user-read-currently-playing user-read-playback-state "
    "user-modify-playback-state playlist-read-private playlist-read-collaborative"
)

CONNECT_TOKEN_TTL_SECONDS = 120
SPOTIFY_TIMEOUT_SECONDS = 10

NO_ACTIVE_DEVICE_MESSAGE = (
    "Spotify açık bir cihazda çalmıyor. Telefonunda veya bilgisayarında "
    "Spotify uygulamasını aç, bir şarkı başlat, sonra tekrar dene."
)

# user_id -> threading.Lock, eşzamanlı token yenilemesini önlemek için
_refresh_locks: dict[int, threading.Lock] = {}
_refresh_locks_guard = threading.Lock()


def _spotify_request(method: str, url: str, **kwargs) -> requests.Response:
    max_retries = 2
    for attempt in range(max_retries):
        try:
            resp = requests.request(
                method,
                url,
                timeout=SPOTIFY_TIMEOUT_SECONDS,
                **kwargs,
            )
            if resp.status_code == 429 and attempt < max_retries - 1:
                time.sleep(1)
                continue
            return resp
        except requests.RequestException as exc:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            logger.error(f"SPOTIFY NETWORK ERROR: {repr(exc)}")
            raise HTTPException(
                status_code=502,
                detail="Spotify servisine şu anda ulaşılamıyor. Lütfen tekrar dene.",
            ) from exc


def _get_refresh_lock(user_id: int) -> threading.Lock:
    with _refresh_locks_guard:
        if user_id not in _refresh_locks:
            _refresh_locks[user_id] = threading.Lock()
        return _refresh_locks[user_id]


class CurrentTrackResponse(BaseModel):
    is_playing: bool
    track_name: str | None = None
    artist: str | None = None
    album_image: str | None = None
    progress_ms: int | None = None
    duration_ms: int | None = None


class QueueResponse(BaseModel):
    track_name: str | None = None
    artist: str | None = None


class StatusResponse(BaseModel):
    connected: bool


class ConnectTokenResponse(BaseModel):
    connect_token: str


def _save_spotify_tokens(user_id: int, access_token: str, refresh_token: str, expires_in: int) -> None:
    conn = get_conn()
    now = time.time()
    with get_lock():
        conn.execute(
            """
            INSERT INTO spotify_accounts (user_id, access_token, refresh_token, expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
            """,
            (user_id, access_token, refresh_token, now + expires_in, now),
        )
        conn.commit()


def _get_spotify_row(user_id: int):
    conn = get_conn()
    with get_lock():
        cur = conn.execute(
            "SELECT access_token, refresh_token, expires_at FROM spotify_accounts WHERE user_id = ?",
            (user_id,),
        )
        return cur.fetchone()


@router.get("/status", response_model=StatusResponse)
def spotify_status(user_id: int = Depends(require_user_id)):
    row = _get_spotify_row(user_id)
    return {"connected": row is not None}


@router.get("/connect-token", response_model=ConnectTokenResponse)
def connect_token(user_id: int = Depends(require_user_id)):
    """Tam sayfa yönlendirmesi gerektiren /spotify/login adımı için
    tek kullanımlık, kısa ömürlü bir token üretir. Gerçek JWT access
    token'ın tarayıcı geçmişine/loglara düz metin yazılmasını önler."""
    token = secrets.token_urlsafe(24)
    conn = get_conn()
    with get_lock():
        conn.execute(
            "INSERT INTO spotify_connect_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, time.time()),
        )
        conn.commit()
    return {"connect_token": token}


@router.get("/login")
def spotify_login(token: str = Query(...)):
    conn = get_conn()
    with get_lock():
        cur = conn.execute(
            "SELECT user_id, created_at FROM spotify_connect_tokens WHERE token = ?",
            (token,),
        )
        row = cur.fetchone()
        if row:
            conn.execute("DELETE FROM spotify_connect_tokens WHERE token = ?", (token,))
            conn.commit()

    if not row:
        raise HTTPException(status_code=401, detail="Bağlantı isteği geçersiz, sayfayı yenileyip tekrar dene.")

    user_id, created_at = row
    if time.time() - created_at > CONNECT_TOKEN_TTL_SECONDS:
        raise HTTPException(status_code=401, detail="Bağlantı isteğinin süresi doldu, tekrar dene.")

    state = secrets.token_urlsafe(24)
    with get_lock():
        conn.execute(
            "INSERT INTO oauth_states (state, user_id, created_at) VALUES (?, ?, ?)",
            (state, user_id, time.time()),
        )
        conn.commit()

    params = {
        "client_id": SPOTIFY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIFY_REDIRECT_URI,
        "scope": SCOPE,
        "state": state,
    }
    return RedirectResponse(f"https://accounts.spotify.com/authorize?{urlencode(params)}")


@router.get("/callback")
def spotify_callback(code: str = Query(...), state: str = Query(...)):
    conn = get_conn()
    with get_lock():
        cur = conn.execute("SELECT user_id FROM oauth_states WHERE state = ?", (state,))
        row = cur.fetchone()
        if row:
            conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            conn.commit()

    if not row:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş bağlantı isteği.")

    user_id = row[0]

    resp = _spotify_request(
        "POST",
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": SPOTIFY_REDIRECT_URI,
            "client_id": SPOTIFY_CLIENT_ID,
            "client_secret": SPOTIFY_CLIENT_SECRET,
        },
    )

    if resp.status_code != 200:
        logger.error(f"SPOTIFY TOKEN ERROR: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=400, detail="Token alınamadı.")

    data = resp.json()
    _save_spotify_tokens(user_id, data["access_token"], data["refresh_token"], data["expires_in"])

    return RedirectResponse(f"{FRONTEND_URL}?spotify_connected=1")


def _delete_spotify_tokens(user_id: int) -> None:
    conn = get_conn()
    with get_lock():
        conn.execute("DELETE FROM spotify_accounts WHERE user_id = ?", (user_id,))
        conn.commit()

def _get_valid_token(user_id: int) -> str:
    lock = _get_refresh_lock(user_id)
    with lock:
        row = _get_spotify_row(user_id)
        if not row:
            raise HTTPException(status_code=404, detail="Spotify bağlantısı bulunamadı.")

        access_token, refresh_token, expires_at = row

        if time.time() < expires_at - 30:
            return access_token

        resp = _spotify_request(
            "POST",
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": SPOTIFY_CLIENT_ID,
                "client_secret": SPOTIFY_CLIENT_SECRET,
            },
        )
        if resp.status_code != 200:
            logger.error(f"SPOTIFY REFRESH ERROR: {resp.status_code} {resp.text}")
            _delete_spotify_tokens(user_id)
            raise HTTPException(status_code=404, detail="Spotify yetkisi iptal edilmiş. Sayfayı yenileyip tekrar bağlanın.")

        data = resp.json()
        new_refresh = data.get("refresh_token", refresh_token)
        _save_spotify_tokens(user_id, data["access_token"], new_refresh, data["expires_in"])
        return data["access_token"]


@router.get("/current-track", response_model=CurrentTrackResponse)
def current_track(user_id: int = Depends(require_user_id)):
    token = _get_valid_token(user_id)

    resp = _spotify_request(
        "GET",
        "https://api.spotify.com/v1/me/player/currently-playing",
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.status_code == 204 or not resp.content:
        return {"is_playing": False}

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Spotify verisi alınamadı.")

    data = resp.json()
    item = data.get("item")
    if not item:
        return {"is_playing": False}

    images = item.get("album", {}).get("images", [])

    return {
        "is_playing": data.get("is_playing", False),
        "track_name": item.get("name"),
        "artist": ", ".join(a["name"] for a in item.get("artists", [])),
        "album_image": images[0]["url"] if images else None,
        "progress_ms": data.get("progress_ms"),
        "duration_ms": item.get("duration_ms"),
    }


@router.get("/queue", response_model=QueueResponse)
def get_queue(user_id: int = Depends(require_user_id)):
    token = _get_valid_token(user_id)

    resp = _spotify_request(
        "GET",
        "https://api.spotify.com/v1/me/player/queue",
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.status_code != 200:
        return {"track_name": None, "artist": None}

    data = resp.json()
    queue = data.get("queue", [])
    if not queue:
        return {"track_name": None, "artist": None}

    next_item = queue[0]
    return {
        "track_name": next_item.get("name"),
        "artist": ", ".join(a["name"] for a in next_item.get("artists", [])),
    }


def _player_command(method: str, user_id: int, path: str) -> dict:
    token = _get_valid_token(user_id)
    resp = _spotify_request(
        method,
        f"https://api.spotify.com/v1/me/player/{path}",
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.status_code in (200, 204):
        return {"status": "ok"}

    reason = ""
    try:
        reason = resp.json().get("error", {}).get("reason", "")
    except ValueError:
        pass

    if reason == "NO_ACTIVE_DEVICE" or resp.status_code == 404:
        raise HTTPException(status_code=404, detail=NO_ACTIVE_DEVICE_MESSAGE)

    raise HTTPException(status_code=resp.status_code, detail="Komut başarısız oldu.")


@router.put("/play")
def play(user_id: int = Depends(require_user_id)):
    return _player_command("PUT", user_id, "play")


@router.put("/pause")
def pause(user_id: int = Depends(require_user_id)):
    return _player_command("PUT", user_id, "pause")


@router.post("/next")
def next_track(user_id: int = Depends(require_user_id)):
    return _player_command("POST", user_id, "next")


@router.post("/previous")
def previous_track(user_id: int = Depends(require_user_id)):
    return _player_command("POST", user_id, "previous")

# ─── Playlist endpoints ────────────────────────────────────────────────────

class PlaylistItem(BaseModel):
    id: str
    name: str
    image: str | None = None
    track_count: int


class PlaylistsResponse(BaseModel):
    playlists: list[PlaylistItem]


class TrackItem(BaseModel):
    id: str
    name: str
    artist: str
    album_image: str | None = None
    duration_ms: int


class PlaylistTracksResponse(BaseModel):
    tracks: list[TrackItem]


@router.get("/playlists", response_model=PlaylistsResponse)
def get_playlists(user_id: int = Depends(require_user_id)):
    token = _get_valid_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}
    items = []

    # limit'i başlangıç URL'ine göm — next URL'leri zaten parametreleri taşıyor
    url = "https://api.spotify.com/v1/me/playlists?limit=50"

    while url:
        resp = _spotify_request("GET", url, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Playlist listesi alınamadı.")

        data = resp.json()
        for pl in data.get("items", []):
            if not pl:
                continue
            images = pl.get("images") or []
            
            # Spotify API bazen "tracks" yerine "items" objesinde total dönebiliyor
            tracks_data = pl.get("tracks") or pl.get("items") or {}
            track_count = tracks_data.get("total", 0)

            items.append({
                "id": pl["id"],
                "name": pl["name"],
                "image": images[0]["url"] if images else None,
                "track_count": track_count,
            })

        url = data.get("next")  # None ise döngü biter

    return {"playlists": items}


@router.get("/playlist/{playlist_id}", response_model=PlaylistTracksResponse)
def get_playlist_tracks(playlist_id: str, user_id: int = Depends(require_user_id)):
    token = _get_valid_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}

    url = f"https://api.spotify.com/v1/playlists/{playlist_id}/items"
    
    tracks = []
    
    while url:
        resp = _spotify_request("GET", url, params={"limit": 50} if "?" not in url else None, headers=headers)
        if resp.status_code != 200:
            break
            
        data = resp.json()
        items = data.get("items", [])
        
        for obj in items:
            track = obj.get("track") or obj.get("item")
            if not track:
                continue
                
            track_id = track.get("id")
            if not track_id:
                track_id = track.get("uri") or secrets.token_hex(8)
                
            artists_str = ", ".join(a.get("name", "") for a in track.get("artists", []) if a.get("name"))
            album_images = track.get("album", {}).get("images", [])
            album_image = album_images[0].get("url") if album_images else None
            
            tracks.append({
                "id": track_id,
                "name": track.get("name", "Unknown Track"),
                "artist": artists_str,
                "album_image": album_image,
                "duration_ms": track.get("duration_ms", 0)
            })
            
        url = data.get("next")
        
    return {"tracks": tracks}

class PlayTrackRequest(BaseModel):
    uri: str


@router.put("/play-track")
def play_track(body: PlayTrackRequest, user_id: int = Depends(require_user_id)):
    """Belirli bir şarkıyı çalmaya başlar (Spotify Premium gerektirir)."""
    token = _get_valid_token(user_id)

    if not body.uri:
        raise HTTPException(status_code=400, detail="Şarkı URI'si gerekli.")

    resp = _spotify_request(
        "PUT",
        "https://api.spotify.com/v1/me/player/play",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"uris": [body.uri]},
    )

    if resp.status_code in (200, 204):
        return {"status": "ok"}

    reason = ""
    try:
        reason = resp.json().get("error", {}).get("reason", "")
    except ValueError:
        pass

    if reason == "NO_ACTIVE_DEVICE" or resp.status_code == 404:
        raise HTTPException(status_code=404, detail=NO_ACTIVE_DEVICE_MESSAGE)

    raise HTTPException(status_code=resp.status_code, detail="Şarkı çalınamadı.")
