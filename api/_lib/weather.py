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
