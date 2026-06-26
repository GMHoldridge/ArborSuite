import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone

def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()

def check_pin(pin: str, pin_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode(), pin_hash.encode())

def create_token(expires_days: int = 30) -> str:
    secret = os.environ["JWT_SECRET"]
    payload = {
        "sub": "owner",
        "exp": datetime.now(timezone.utc) + timedelta(days=expires_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_token(token: str) -> dict | None:
    secret = os.environ["JWT_SECRET"]
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None

def _pin_is_set() -> bool:
    """Is a PIN configured? If not, the app runs open (no login)."""
    try:
        from .db import get_db
        return get_db().execute("SELECT 1 FROM auth WHERE id = 1").fetchone() is not None
    except Exception:
        return False

def require_auth(authorization: str | None) -> bool:
    # Open access until the owner sets a PIN (Settings can lock it later).
    if not _pin_is_set():
        return True
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ", 1)[1]
    return verify_token(token) is not None
