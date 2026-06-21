import secrets
import time
from urllib.parse import urlencode

import requests
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
from backend.core.auth import decode_access_token
from backend.routes.auth import require_user_id

router = APIRouter(prefix="/spotify")

SCOPE = "user-read-currently-playing user-read-playback-state user-modify-playback-state"

NO_ACTIVE_DEVICE_MESSAGE = (
    "Spotify açık bir cihazda çalmıyor. Telefonunda veya bilgisayarında "
    "Spotify uygulamasını aç, bir şarkı başlat, sonra tekrar dene."
)


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


@router.get("/login")
def spotify_login(token: str = Query(...)):
    # Tam sayfa yönlendirmesi olduğu için Authorization header kullanılamıyor,
    # bu yüzden auth token query parametresiyle geliyor.
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Oturum süresi dolmuş, tekrar giriş yap.")

    state = secrets.token_urlsafe(24)
    conn = get_conn()
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

    resp = requests.post(
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
        raise HTTPException(status_code=400, detail="Spotify yetkilendirme başarısız.")

    data = resp.json()
    _save_spotify_tokens(user_id, data["access_token"], data["refresh_token"], data["expires_in"])

    return RedirectResponse(f"{FRONTEND_URL}?spotify_connected=1")


def _get_valid_token(user_id: int) -> str:
    row = _get_spotify_row(user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Spotify bağlantısı bulunamadı.")

    access_token, refresh_token, expires_at = row

    if time.time() >= expires_at - 30:
        resp = requests.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": SPOTIFY_CLIENT_ID,
                "client_secret": SPOTIFY_CLIENT_SECRET,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Spotify oturumu yenilenemedi, tekrar bağlan.")

        data = resp.json()
        new_refresh = data.get("refresh_token", refresh_token)
        _save_spotify_tokens(user_id, data["access_token"], new_refresh, data["expires_in"])
        return data["access_token"]

    return access_token


@router.get("/current-track", response_model=CurrentTrackResponse)
def current_track(user_id: int = Depends(require_user_id)):
    token = _get_valid_token(user_id)

    resp = requests.get(
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

    resp = requests.get(
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
    resp = requests.request(
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