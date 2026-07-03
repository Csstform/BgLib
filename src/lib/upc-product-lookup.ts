import { barcodeLookupVariants } from "@/lib/barcode";

const USER_AGENT = "BgLib/1.0 (board game library; https://github.com/Csstform/BgLib)";

export type UpcProductHint = {
  title: string;
  brand?: string;
  source: "upcitemdb" | "openfoodfacts";
};

/** Best-effort product title from free public UPC databases (no API key). */
export async function lookupUpcProductName(
  rawUpc: string
): Promise<UpcProductHint | null> {
  const variants = barcodeLookupVariants(rawUpc);

  for (const upc of variants) {
    const fromUpcItemDb = await lookupUpcItemDb(upc);
    if (fromUpcItemDb) return fromUpcItemDb;

    const fromOff = await lookupOpenFoodFacts(upc);
    if (fromOff) return fromOff;
  }

  return null;
}

async function lookupUpcItemDb(upc: string): Promise<UpcProductHint | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      items?: { title?: string; brand?: string }[];
    };

    const item = data.items?.[0];
    if (!item?.title?.trim()) return null;

    return {
      title: cleanProductTitle(item.title, item.brand),
      brand: item.brand?.trim() || undefined,
      source: "upcitemdb",
    };
  } catch {
    return null;
  }
}

async function lookupOpenFoodFacts(upc: string): Promise<UpcProductHint | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
      };
    };

    if (data.status !== 1 || !data.product?.product_name?.trim()) return null;

    return {
      title: cleanProductTitle(data.product.product_name, data.product.brands),
      brand: data.product.brands?.split(",")[0]?.trim(),
      source: "openfoodfacts",
    };
  } catch {
    return null;
  }
}

/** Strip brand prefix and normalize for BGG search. */
function cleanProductTitle(title: string, brand?: string): string {
  let name = title.trim();
  if (brand) {
    const b = brand.trim();
    if (name.toLowerCase().startsWith(b.toLowerCase())) {
      name = name.slice(b.length).replace(/^[\s:\-–]+/, "").trim();
    }
  }
  return name
    .replace(/\s+board\s*game\s*$/i, "")
    .replace(/\s+expansion\s*$/i, "")
    .trim();
}
