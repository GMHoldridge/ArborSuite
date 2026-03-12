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

def require_auth(authorization: str | None) -> bool:
    if not authorization or not authorization.startswith("Bearer "):
        return False
    token = authorization.split(" ", 1)[1]
    return verify_token(token) is not None
