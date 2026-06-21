import re

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from backend.core.auth import (
    create_token_pair,
    create_user,
    decode_access_token,
    get_user_by_email,
    revoke_refresh_token,
    rotate_refresh_token,
    verify_password,
)
from backend.core.db import get_conn, get_lock

router = APIRouter(prefix="/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    email: str


class MeResponse(BaseModel):
    email: str


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Giriş yapman gerekiyor.")
    return authorization.removeprefix("Bearer ").strip()


def require_user_id(authorization: str | None = Header(default=None)) -> int:
    token = _extract_token(authorization)
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Oturum süresi dolmuş, tekrar giriş yap.")
    return user_id


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()

    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Geçerli bir e-posta adresi gir.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Şifre en az 8 karakter olmalı.")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")

    user_id = create_user(email, payload.password)
    access_token, refresh_token = create_token_pair(user_id, email)
    return {"access_token": access_token, "refresh_token": refresh_token, "email": email}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    row = get_user_by_email(email)

    if not row or not verify_password(payload.password, row[2]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    access_token, refresh_token = create_token_pair(row[0], email)
    return {"access_token": access_token, "refresh_token": refresh_token, "email": email}


@router.post("/refresh", response_model=AuthResponse)
def refresh(payload: RefreshRequest):
    result = rotate_refresh_token(payload.refresh_token)
    if not result:
        raise HTTPException(status_code=401, detail="Oturum süresi dolmuş, tekrar giriş yap.")
    access_token, refresh_token, email = result
    return {"access_token": access_token, "refresh_token": refresh_token, "email": email}


@router.get("/me", response_model=MeResponse)
def me(authorization: str | None = Header(default=None)):
    user_id = require_user_id(authorization)
    conn = get_conn()
    with get_lock():
        cur = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    return {"email": row[0]}


@router.post("/logout")
def logout(payload: LogoutRequest, authorization: str | None = Header(default=None)):
    require_user_id(authorization)
    revoke_refresh_token(payload.refresh_token)
    return {"status": "ok"}
