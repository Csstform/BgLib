/**
 * Decode HTML/XML entities in text from external APIs (BGG, etc.).
 * fast-xml-parser decodes some named entities (&apos;, &amp;) but leaves
 * numeric refs like &#39; and &#10; untouched in attribute values and text.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&");
}

/** Strip simple HTML tags then decode entities (BGG descriptions). */
export function cleanBggDescription(html: string): string {
  return decodeHtmlEntities(
    html.replace(/<[^>]+>/g, "").trim()
  );
}
