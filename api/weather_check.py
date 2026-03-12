from fastapi import FastAPI, HTTPException, Header
from _lib.auth import require_auth
from _lib.weather import get_forecast

app = FastAPI()

@app.get("/api/weather")
async def check_weather(lat: float, lon: float, authorization: str | None = Header(None)):
    if not require_auth(authorization):
        raise HTTPException(401, "Unauthorized")
    try:
        return await get_forecast(lat, lon)
    except Exception as e:
        raise HTTPException(502, f"Weather API error: {str(e)}")
