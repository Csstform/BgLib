/** Parse a fetch Response as JSON, with a clear error when the server returns HTML. */
export async function parseJsonResponse<T = unknown>(
  res: Response
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();

  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      "Server returned HTML instead of JSON. Set BGG_API_TOKEN in .env.local and restart the app."
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(trimmed.slice(0, 120) || "Invalid response from server");
  }
}
