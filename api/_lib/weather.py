import httpx

WEATHER_GOV_BASE = "https://api.weather.gov"
HEADERS = {"User-Agent": "(ArborSuite, contact@arborsuite.app)"}

async def get_forecast(lat: float, lon: float) -> dict:
    """Get weather forecast from Weather.gov for a lat/lon."""
    async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
        # Step 1: Get the grid point for this location
        points_resp = await client.get(f"{WEATHER_GOV_BASE}/points/{lat:.4f},{lon:.4f}")
        points_resp.raise_for_status()
        points_data = points_resp.json()

        forecast_url = points_data["properties"]["forecast"]

        # Step 2: Get the actual forecast
        forecast_resp = await client.get(forecast_url)
        forecast_resp.raise_for_status()
        forecast_data = forecast_resp.json()

        periods = forecast_data["properties"]["periods"]
        if not periods:
            return {"status": "unknown", "detail": "No forecast data"}

        today = periods[0]
        return _analyze_conditions(today)

def _analyze_conditions(period: dict) -> dict:
    """Analyze weather conditions for arborist work safety."""
    wind_speed_str = period.get("windSpeed", "0 mph")
    wind_mph = _parse_wind(wind_speed_str)
    precip_pct = period.get("probabilityOfPrecipitation", {}).get("value") or 0
    temp_f = period.get("temperature", 70)
    forecast_text = period.get("shortForecast", "")

    # Risk assessment
    risks = []
    if wind_mph >= 25:
        risks.append(f"High wind: {wind_speed_str}")
    elif wind_mph >= 15:
        risks.append(f"Moderate wind: {wind_speed_str}")

    if precip_pct >= 60:
        risks.append(f"Rain likely: {precip_pct}%")
    elif precip_pct >= 30:
        risks.append(f"Rain possible: {precip_pct}%")

    if temp_f >= 100:
        risks.append(f"Extreme heat: {temp_f}°F")
    elif temp_f <= 25:
        risks.append(f"Freezing: {temp_f}°F")

    lightning_words = ["thunder", "lightning", "storm"]
    if any(w in forecast_text.lower() for w in lightning_words):
        risks.append("Thunderstorm risk")

    # Overall status
    if wind_mph >= 25 or any("thunder" in r.lower() or "lightning" in r.lower() for r in risks):
        status = "red"
    elif wind_mph >= 15 or precip_pct >= 60 or temp_f >= 100 or temp_f <= 25:
        status = "yellow"
    else:
        status = "green"

    return {
        "status": status,
        "wind_speed": wind_speed_str,
        "wind_mph": wind_mph,
        "precip_pct": precip_pct,
        "temp_f": temp_f,
        "forecast": forecast_text,
        "risks": risks,
        "period_name": period.get("name", "Today"),
    }

def _parse_wind(wind_str: str) -> int:
    """Parse '10 to 15 mph' or '10 mph' into max integer."""
    import re
    numbers = re.findall(r"\d+", wind_str)
    return max(int(n) for n in numbers) if numbers else 0


# ── Sync path (used by the worker + refresh endpoint) ────────────────
import json as _json
import urllib.request as _urlreq


def _fetch_periods(lat: float, lon: float) -> list:
    """Sync fetch of weather.gov forecast periods (no async, no key)."""
    def _get(url):
        req = _urlreq.Request(url, headers=HEADERS)
        with _urlreq.urlopen(req, timeout=12) as r:
            return _json.loads(r.read())
    pts = _get(f"{WEATHER_GOV_BASE}/points/{lat:.4f},{lon:.4f}")
    fc = _get(pts["properties"]["forecast"])
    return fc["properties"].get("periods", [])


def forecast_for_date(lat: float, lon: float, date_str: str | None = None) -> dict:
    """Analyze conditions for a specific job date (YYYY-MM-DD). Picks that day's
    daytime period; falls back to the soonest period. Returns same shape as
    _analyze_conditions, plus 'beyond_forecast' if the date is out of range."""
    periods = _fetch_periods(lat, lon)
    if not periods:
        return {"status": "unknown", "risks": [], "forecast": "No data"}
    chosen = None
    if date_str:
        for p in periods:
            if p.get("isDaytime") and str(p.get("startTime", "")).startswith(date_str):
                chosen = p
                break
        if chosen is None:
            # date not in the 7-day window
            return {"status": "unknown", "risks": [], "forecast": "Beyond 7-day forecast", "beyond_forecast": True}
    if chosen is None:
        chosen = periods[0]
    return _analyze_conditions(chosen)


def refresh_jobs_weather(db) -> list:
    """For every upcoming job (next 7 days) with a location, fetch its day's
    forecast and store weather_status + risk_score. Returns yellow/red alerts.
    Uses the job's own lat/lon, falling back to the client's."""
    rows = db.execute(
        """SELECT j.id, j.title, j.scheduled_date, j.location_lat, j.location_lon, c.lat, c.lon
           FROM jobs j LEFT JOIN clients c ON j.client_id = c.id
           WHERE j.status IN ('quoted','scheduled','in_progress')
             AND j.scheduled_date IS NOT NULL
             AND j.scheduled_date BETWEEN date('now') AND date('now','+7 days')"""
    ).fetchall()
    alerts = []
    for r in rows:
        jid, title, sdate, jlat, jlon, clat, clon = r
        lat = jlat if jlat is not None else clat
        lon = jlon if jlon is not None else clon
        if lat is None or lon is None:
            continue
        try:
            w = forecast_for_date(float(lat), float(lon), sdate)
        except Exception:
            continue
        status = w.get("status", "unknown")
        risk = "; ".join(w.get("risks", [])) or w.get("forecast", "")
        db.execute(
            "UPDATE jobs SET weather_status=?, risk_score=?, updated_at=datetime('now') WHERE id=?",
            [status, risk[:200], jid],
        )
        if status in ("yellow", "red"):
            alerts.append({"job_id": jid, "title": title, "date": sdate, "status": status, "risk": risk})
    db.commit()
    return alerts
