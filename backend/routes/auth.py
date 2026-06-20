import re

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from backend.core.auth import (
    create_token,
    create_user,
    delete_token,
    get_user_by_email,
    get_user_id_from_token,
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


class AuthResponse(BaseModel):
    token: str
    email: str


class MeResponse(BaseModel):
    email: str


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Giriş yapman gerekiyor.")
    return authorization.removeprefix("Bearer ").strip()


def require_user_id(authorization: str | None = Header(default=None)) -> int:
    token = _extract_token(authorization)
    user_id = get_user_id_from_token(token)
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
    token = create_token(user_id)
    return {"token": token, "email": email}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    row = get_user_by_email(email)

    if not row or not verify_password(payload.password, row[2]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    token = create_token(row[0])
    return {"token": token, "email": email}


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
def logout(authorization: str | None = Header(default=None)):
    token = _extract_token(authorization)
    delete_token(token)
    return {"status": "ok"}