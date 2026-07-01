/** Normalize a scanned or typed barcode to digits-only UPC/EAN form. */
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

/** Common UPC-A / EAN-13 variants for lookup APIs. */
export function barcodeLookupVariants(upc: string): string[] {
  const variants = new Set<string>([upc]);

  if (upc.length === 12) {
    variants.add(`0${upc}`);
  }
  if (upc.length === 13 && upc.startsWith("0")) {
    variants.add(upc.slice(1));
  }

  return [...variants];
}

export function isValidBarcode(upc: string): boolean {
  return normalizeBarcode(upc) !== null;
}
