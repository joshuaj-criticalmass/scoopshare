import { useId } from "react";
import type { FlavorId } from "@/lib/types";
import { FLAVORS } from "@/lib/flavors";

interface IceCreamConeProps {
  /** [top, middle, bottom] */
  scoops: [FlavorId, FlavorId, FlavorId];
  /** Width in px — height scales proportionally (~2.79×) */
  size?: number;
  className?: string;
}

/** SVG pattern definitions for non-solid flavors */
function FlavorPatterns({ uid, flavors }: { uid: string; flavors: FlavorId[] }) {
  return (
    <>
      {flavors.map((flavor) => {
        const { color, pattern } = FLAVORS[flavor];
        const id = `p-${uid}-${flavor}`;

        if (pattern === "swirl") {
          // Diagonal cream-pink stripes
          return (
            <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="44" height="44" patternTransform="rotate(40)">
              <rect width="44" height="44" fill={color} />
              <rect x="0" y="0" width="16" height="44" fill="#e8849a" fillOpacity="0.45" />
            </pattern>
          );
        }

        if (pattern === "chips") {
          // Chocolate chip-shaped ovals
          return (
            <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="52" height="52">
              <rect width="52" height="52" fill={color} />
              <ellipse cx="13" cy="13" rx="6" ry="3.5" fill="#6B4226" transform="rotate(-30 13 13)" />
              <ellipse cx="38" cy="28" rx="6" ry="3.5" fill="#6B4226" transform="rotate(20 38 28)" />
              <ellipse cx="20" cy="42" rx="5" ry="3" fill="#6B4226" transform="rotate(10 20 42)" />
              <ellipse cx="44" cy="8" rx="5" ry="3" fill="#6B4226" transform="rotate(-15 44 8)" />
            </pattern>
          );
        }

        if (pattern === "dots") {
          // Dark cookie-crumb dots (Cookies & Cream)
          return (
            <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="36" height="36">
              <rect width="36" height="36" fill={color} />
              <circle cx="9" cy="9" r="5.5" fill="#2d2d2d" />
              <circle cx="27" cy="27" r="5.5" fill="#2d2d2d" />
              <circle cx="27" cy="9" r="3.5" fill="#555" />
              <circle cx="9" cy="27" r="3.5" fill="#555" />
            </pattern>
          );
        }

        if (pattern === "sprinkles") {
          // Colourful candy sprinkle bars
          return (
            <pattern key={id} id={id} patternUnits="userSpaceOnUse" width="64" height="64">
              <rect width="64" height="64" fill={color} />
              <rect x="4"  y="6"  width="13" height="4.5" rx="2.25" fill="#FF6B6B" transform="rotate(30 10 8)" />
              <rect x="28" y="16" width="13" height="4.5" rx="2.25" fill="#FFE66D" transform="rotate(-45 34 18)" />
              <rect x="10" y="38" width="13" height="4.5" rx="2.25" fill="#6BCB77" transform="rotate(60 16 40)" />
              <rect x="44" y="44" width="13" height="4.5" rx="2.25" fill="#4D96FF" transform="rotate(-20 50 46)" />
              <rect x="40" y="4"  width="13" height="4.5" rx="2.25" fill="#FF6B6B" transform="rotate(75 46 6)" />
              <rect x="0"  y="24" width="13" height="4.5" rx="2.25" fill="#FFE66D" transform="rotate(15 6 26)" />
              <rect x="50" y="24" width="13" height="4.5" rx="2.25" fill="#6BCB77" transform="rotate(-30 56 26)" />
              <rect x="22" y="50" width="13" height="4.5" rx="2.25" fill="#4D96FF" transform="rotate(45 28 52)" />
            </pattern>
          );
        }

        // solid — no pattern needed
        return null;
      })}
    </>
  );
}

function fillFor(uid: string, flavor: FlavorId): string {
  return FLAVORS[flavor].pattern === "solid"
    ? FLAVORS[flavor].color
    : `url(#p-${uid}-${flavor})`;
}

export function IceCreamCone({ scoops, size = 160, className = "" }: IceCreamConeProps) {
  const rawId = useId();
  // useId returns values like ":r0:" — strip colons for valid SVG IDs
  const uid = rawId.replace(/:/g, "");
  const [top, middle, bottom] = scoops;
  const uniqueFlavors = Array.from(new Set([top, middle, bottom])) as FlavorId[];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 363.29 1014.28"
      width={size}
      height={Math.round(size * (1014.28 / 363.29))}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <FlavorPatterns uid={uid} flavors={uniqueFlavors} />
      </defs>

      {/* ── Waffle cone (shadow layer) ── */}
      <path
        fill="#ff9933"
        d="m175.68 782.56-39.04-38.73-27.55 26.76 9.45 30.54 19.43 18.12zM139.34 868.37l16.68 53.91 19.78-18.87zM84.94 692.54l11.34 36.65 12.9-12.61zM231.99 596.56h-68.55l34 33.77zM110.67 599.35l-2.92-2.79h-52.5l11.36 36.73 6.79 6.48zM311.21 596.56h-22.38l16.94 17.96zM166.54 956.31l6.82 22.04 17.21 15.85 17.99-59.3-9.06-8.71zM159.33 721.8l39.78 37.97 39.61-38.53-39.81-37.89zM134.89 622.4l-39.6 38.27L131.26 695l39.42-38.53zM225.16 657.85l38.96 38.69 23.78-23.13 6.69-22.04-30.73-31.1zM161.69 841.37l40.02 37.32 33.65-32.1 1.12-3.7-37.59-37.3zM222.91 782.49l24.73 23.61 17.98-59.26-2.83-2.69z"
      />
      {/* ── Waffle cone (highlight layer) ── */}
      <path
        fill="#f8ad48"
        d="m184.48 1014.28 6.09-20.08-17.21-15.85zM288.83 596.56h-56.84l-34.55 33.76-34-33.76h-55.7l2.93 2.79-37.28 40.42-6.79-6.48 18.33 59.25 24.24 24.05-12.9 12.6 12.81 41.4 27.55-26.76 39.04 38.73-37.71 36.69-19.43-18.12 20.8 67.24 36.46 35.04-19.78 18.87 10.53 34.03 32.96-30.12 9.06 8.71 26.79-88.31-33.65 32.1-40.02-37.32 37.2-35.78 37.59 37.29 11.16-36.79-24.73-23.61 39.87-38.34 2.83 2.7 22.28-73.43-23.78 23.13-38.96-38.69 38.7-37.59 30.72 31.1 11.18-36.85-16.94-17.95ZM131.26 695l-35.97-34.33 39.59-38.27 35.8 34.08-39.42 38.53Zm107.46 26.24-39.61 38.53-39.78-37.98 39.59-38.45 39.81 37.89Z"
      />

      {/* ── Scoops — rendered bottom→top so SVG stacking is correct ── */}
      <path
        id="bottom-scoop"
        fill={fillFor(uid, bottom)}
        d="M328.92 545.08c4.92-13.39 7.82-27.5 8.38-42.02 3.02-79.1-64.55-140.24-150.96-136.53-86.41 3.7-158.88 70.84-161.92 149.95-.55 14.51 1.29 28.43 5.18 41.44C12.86 564.96.69 580.39.03 597.8c-.88 23.17 18.9 41.06 44.2 39.96 20.66-.89 38.59-14.16 44.95-31.62 5.06 16.97 22.02 28.75 42.69 27.87 21.35-.92 39.74-15.06 45.51-33.38 4.39 17.88 21.76 30.49 43.1 29.58 20.67-.89 38.6-14.17 44.96-31.63 5.04 16.99 22 28.76 42.68 27.87 25.29-1.09 46.51-20.73 47.4-43.9.66-17.41-10.35-31.83-26.61-37.47"
      />
      <path
        id="middle-scoop"
        fill={fillFor(uid, middle)}
        d="M336.65 361.89c4.92-13.39 7.82-27.5 8.38-42.02 3.02-79.1-64.55-140.24-150.96-136.53-86.41 3.7-158.88 70.84-161.92 149.95-.55 14.51 1.29 28.43 5.18 41.44-16.74 7.04-28.91 22.47-29.57 39.88-.88 23.17 18.9 41.06 44.2 39.96 20.66-.89 38.59-14.16 44.95-31.62 5.06 16.97 22.02 28.75 42.69 27.87 21.35-.92 39.74-15.06 45.51-33.38 4.39 17.88 21.76 30.49 43.1 29.58 20.67-.89 38.6-14.17 44.96-31.63 5.04 16.99 22 28.76 42.68 27.87 25.29-1.09 46.51-20.73 47.4-43.9.66-17.41-10.35-31.83-26.61-37.47"
      />
      <path
        id="top-scoop"
        fill={fillFor(uid, top)}
        d="M336.65 178.71c4.92-13.39 7.82-27.5 8.38-42.02C348.05 57.59 280.48-3.55 194.07.16 107.66 3.86 35.18 71 32.15 150.11c-.55 14.51 1.29 28.43 5.18 41.44-16.74 7.04-28.91 22.47-29.57 39.88-.88 23.17 18.9 41.06 44.2 39.96 20.66-.89 38.59-14.16 44.95-31.62 5.06 16.97 22.02 28.75 42.69 27.87 21.35-.92 39.74-15.06 45.51-33.38 4.39 17.88 21.76 30.49 43.1 29.58 20.67-.89 38.6-14.17 44.96-31.63 5.04 16.99 22 28.76 42.68 27.87 25.29-1.09 46.51-20.73 47.4-43.9.66-17.41-10.35-31.83-26.61-37.47"
      />
    </svg>
  );
}
