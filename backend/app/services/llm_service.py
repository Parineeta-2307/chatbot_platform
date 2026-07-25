"""
Single seam between the app and whichever LLM provider is used.

To switch to the OpenAI Responses API instead of OpenRouter, this is the
only file that needs to change — every router calls get_chat_completion()
and knows nothing about the provider underneath it.
"""

import httpx

from app.config import settings


def get_chat_completion(messages: list[dict]) -> str:
    if not settings.openrouter_api_key:
        return (
            "[LLM not configured] Set OPENROUTER_API_KEY in backend/.env "
            "to get real responses from the model."
        )

    url = f"{settings.openrouter_base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    body = {"model": settings.openrouter_model, "messages": messages}

    try:
        response = httpx.post(url, headers=headers, json=body, timeout=30.0)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        return f"[LLM error] {e.response.status_code}: {e.response.text[:300]}"
    except Exception as e:
        return f"[LLM error] {str(e)}"
