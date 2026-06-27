"""Tree photo assessment — delegates to the local (free) vision module.

Previously called the paid Anthropic API; that is banned. Now uses Ollama VLM
via _lib.vision (runs on Geoff's hardware). Signature kept so existing callers
(assess endpoint, client_submit) don't change.
"""
import base64
import urllib.request

from _lib.vision import assess_tree


async def assess_tree_photo(photo_url: str, client_notes: str = "") -> dict:
    """Fetch the image and run a free local arborist assessment."""
    if photo_url.startswith("http"):
        with urllib.request.urlopen(photo_url, timeout=30) as resp:
            image_b64 = base64.b64encode(resp.read()).decode()
    elif photo_url.startswith("data:"):
        image_b64 = photo_url.split(",", 1)[1]
    else:
        image_b64 = photo_url  # assume already base64

    result = assess_tree(image_b64)
    if client_notes:
        result["client_notes"] = client_notes
    return result
