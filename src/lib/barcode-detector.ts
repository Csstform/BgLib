/** Native BarcodeDetector API (Chrome, Edge, Android; not Safari). */
type BarcodeDetectorFormat =
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128";

type DetectedBarcode = {
  rawValue: string;
  format: string;
};

type BarcodeDetectorInstance = {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats: BarcodeDetectorFormat[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
};

export function getBarcodeDetector():
  | BarcodeDetectorConstructor
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
}

export const BARCODE_FORMATS: BarcodeDetectorFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
];
