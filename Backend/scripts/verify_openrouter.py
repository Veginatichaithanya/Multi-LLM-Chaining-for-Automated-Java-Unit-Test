"""
verify_openrouter.py
Perform ONE controlled real API test to OpenRouter with a small prompt.
Logs response metadata, token usage, latency, but NEVER logs the secret API key.
"""
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import asyncio
from app.services.ai.openrouter import OpenRouterProvider

async def test_live_openrouter():
    provider = OpenRouterProvider()
    print("OpenRouter Provider name:", provider.name)
    print("Is configured:", provider.is_configured)
    if not provider.is_configured:
        print("OpenRouter credentials are not configured.")
        return False

    system_prompt = "You are a concise unit testing assistant."
    user_prompt = "Write a one-line comment acknowledging receipt of test request."
    
    try:
        start_time = asyncio.get_event_loop().time()
        res = await provider.generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model="openai/gpt-4o",
            max_tokens=60,
        )
        print("--- OpenRouter Live API Call Result ---")
        print(f"Provider:          {res.provider}")
        print(f"Model:             {res.model}")
        print(f"Prompt Tokens:     {res.prompt_tokens}")
        print(f"Completion Tokens: {res.completion_tokens}")
        print(f"Total Tokens:      {res.total_tokens}")
        print(f"Latency ms:        {res.latency_ms}")
        print(f"Content snippet:   {res.content[:100]!r}")
        print(">> OpenRouter Live API verification: SUCCESS")
        return True
    except Exception as e:
        print(f">> OpenRouter Live API call failed: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_live_openrouter())
    if not success:
        sys.exit(1)
