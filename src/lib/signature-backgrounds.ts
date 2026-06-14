/** Built-in showcase backgrounds (SVG data URLs — no external assets). */
export interface ShowcasePreset {
  id: string;
  name: string;
  dataUrl: string;
}

function svgBg(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: "parchment",
    name: "Parchment",
    dataUrl: svgBg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f7f0dc"/>
            <stop offset="50%" stop-color="#efe3c8"/>
            <stop offset="100%" stop-color="#e5d5b0"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <rect x="24" y="24" width="752" height="352" fill="none" stroke="#c9b896" stroke-width="1" opacity="0.5"/>
      </svg>`,
    ),
  },
  {
    id: "linen",
    name: "Linen",
    dataUrl: svgBg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
        <rect width="100%" height="100%" fill="#faf8f4"/>
        <rect x="0" y="0" width="800" height="400" fill="url(#n)" opacity="0.08"/>
        <defs>
          <pattern id="n" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="#8a8278"/>
          </pattern>
        </defs>
      </svg>`,
    ),
  },
  {
    id: "marble",
    name: "Marble",
    dataUrl: svgBg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
        <defs>
          <linearGradient id="m" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2a2d32"/>
            <stop offset="100%" stop-color="#1a1c20"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#m)"/>
        <ellipse cx="200" cy="120" rx="180" ry="80" fill="#ffffff" opacity="0.04"/>
        <ellipse cx="600" cy="280" rx="220" ry="90" fill="#ffffff" opacity="0.03"/>
      </svg>`,
    ),
  },
  {
    id: "card",
    name: "Studio card",
    dataUrl: svgBg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
        <rect width="100%" height="100%" fill="#f3efe8"/>
        <rect x="40" y="30" width="720" height="340" rx="12" fill="#fffcf7" stroke="#d4cfc4" stroke-width="2"/>
        <rect x="40" y="30" width="720" height="340" rx="12" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.6"/>
      </svg>`,
    ),
  },
];

export const MAX_BACKGROUND_BYTES = 800_000;
