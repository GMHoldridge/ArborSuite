"""Address -> (lat, lon), free and keyless.

Primary: US Census geocoder (no key, great for US street addresses — Max is NY).
Fallback: OpenStreetMap Nominatim (needs a User-Agent; ~1 req/s).
Best-effort: returns None on any failure so callers never break on it.
"""
from __future__ import annotations

import json
import urllib.parse
import urllib.request

_CENSUS = ("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress"
           "?address={addr}&benchmark=Public_AR_Current&format=json")
_NOMINATIM = "https://nominatim.openstreetmap.org/search?q={addr}&format=json&limit=1"
_HEADERS = {"User-Agent": "ArborSuite/1.0 (tree-service app)"}


def _get(url: str):
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=12) as r:
        return json.loads(r.read())


def geocode(address: str) -> tuple[float, float] | None:
    """Return (lat, lon) for a street address, or None if it can't be resolved."""
    if not address or not address.strip():
        return None
    addr = urllib.parse.quote(address.strip())

    # 1) US Census
    try:
        data = _get(_CENSUS.format(addr=addr))
        matches = data.get("result", {}).get("addressMatches", [])
        if matches:
            c = matches[0]["coordinates"]
            return (float(c["y"]), float(c["x"]))  # y=lat, x=lon
    except Exception:
        pass

    # 2) Nominatim (covers non-standard / rural addresses Census misses)
    try:
        data = _get(_NOMINATIM.format(addr=addr))
        if data:
            return (float(data[0]["lat"]), float(data[0]["lon"]))
    except Exception:
        pass

    return None


def backfill_clients(db) -> int:
    """Geocode clients that have an address but no coordinates. Returns count set."""
    rows = db.execute(
        "SELECT id, address FROM clients WHERE address IS NOT NULL AND address != '' "
        "AND (lat IS NULL OR lon IS NULL)"
    ).fetchall()
    n = 0
    for cid, address in rows:
        coords = geocode(address)
        if coords:
            db.execute("UPDATE clients SET lat=?, lon=?, updated_at=datetime('now') WHERE id=?",
                       [coords[0], coords[1], cid])
            n += 1
    if n:
        db.commit()
    return n
