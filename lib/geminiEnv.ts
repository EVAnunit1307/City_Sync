/**
 * Server-side only: get Gemini API key for use in API routes.
 * Reads GEMINI_API_KEY first; falls back to NEXT_PUBLIC_GEMINI_API_KEY
 * so it works if the key is set in either env var.
 */
export function getGeminiApiKey(): string {
  return (
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GEMINI_API_KEY) ||
    ""
  );
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}
