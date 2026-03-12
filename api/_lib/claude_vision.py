import os
import json
import anthropic
import httpx

SYSTEM_PROMPT = """You are an expert ISA-certified arborist assessing a tree from a photo.
Analyze this image and return ONLY a JSON object with these fields:

- species: string (best guess, "Unknown deciduous" or "Unknown conifer" if unsure)
- height_estimate_ft: number
- dbh_estimate_in: number (diameter at breast height, estimate from visual proportions)
- lean_direction: string | null (e.g. "toward house", "toward street", "none")
- lean_degrees: number | null (0 = perfectly upright)
- visible_decay: boolean
- decay_description: string | null (describe any visible decay, cavities, fungal bodies)
- deadwood_pct: number (0-100, percentage of visible deadwood in canopy)
- canopy_density: "sparse" | "moderate" | "dense"
- hazards: string[] (list all visible hazards: power lines, structures, fences, slopes, roads, etc.)
- access_difficulty: "easy" | "moderate" | "difficult" | "crane_needed"
- equipment_suggested: string[] (e.g. ["bucket truck", "rigging lines", "stump grinder"])
- time_estimate_hours: number (estimated work time for a 2-person crew)
- difficulty_rating: number (1-5 scale, 1=simple trim, 5=complex hazardous removal)
- notes: string (any other observations relevant to quoting this job — root damage, proximity issues, multiple stems, included bark, etc.)

Be practical and specific. If you can see reference objects (people, fences, cars, houses), use them to improve your size estimates. Flag anything that increases risk or cost.

Return ONLY the JSON object, no markdown, no explanation."""

async def assess_tree_photo(photo_url: str, client_notes: str = "") -> dict:
    """Send a tree photo to Claude for arborist assessment."""
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    user_content = []

    # If URL is a data URL or blob URL, fetch the image bytes
    if photo_url.startswith("http"):
        # Fetch the image and send as base64
        async with httpx.AsyncClient() as http:
            resp = await http.get(photo_url)
            resp.raise_for_status()
            import base64
            media_type = resp.headers.get("content-type", "image/jpeg")
            image_data = base64.b64encode(resp.content).decode()
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": image_data,
                }
            })

    prompt = "Assess this tree for an arborist work quote."
    if client_notes:
        prompt += f"\n\nClient's description of what they want: {client_notes}"

    user_content.append({"type": "text", "text": prompt})

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    # Parse the JSON response
    response_text = message.content[0].text.strip()
    # Handle potential markdown wrapping
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(response_text)
