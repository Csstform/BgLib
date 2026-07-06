import { Dices } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
};

const sizes = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-40 w-full",
  hero: "h-full w-full",
};

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
  hero: "h-12 w-12",
};

export function GameCover({
  src,
  alt,
  size = "md",
  className = "",
}: Props) {
  const isFull = size === "lg" || size === "hero";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-muted ${
        sizes[size]
      } ${isFull ? "rounded-none" : ""} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Dices className={iconSizes[size]} />
      )}
    </div>
  );
}
