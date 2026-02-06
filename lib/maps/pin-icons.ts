/**
 * Map Pin Icon Generator
 *
 * Generates SVG pin icons with different colors and sizes
 * Uses memoization to avoid regenerating the same icons
 * Provider-agnostic implementation
 */

// Cache for generated pin icons
const iconCache = new Map<string, string>();

export interface PinIconOptions {
  color: string;
  width: number;
  height: number;
  activityId: string;
}

export interface PinIconResult {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Generate a pin icon SVG data URL (provider-agnostic)
 * Results are cached to improve performance
 */
export function generatePinIcon(options: PinIconOptions): PinIconResult {
  const { color, width, height, activityId } = options;
  const cacheKey = `${color}-${width}-${height}`;

  // Check cache first
  let svgDataUrl = iconCache.get(cacheKey);

  if (!svgDataUrl) {
    // Generate SVG only if not cached
    const svg = createPinSVG(color, activityId);
    svgDataUrl = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
    iconCache.set(cacheKey, svgDataUrl);
  }

  return {
    url: svgDataUrl,
    width,
    height,
    anchorX: width / 2,
    anchorY: height - 2,
  };
}

/**
 * Create the SVG markup for a pin icon
 */
function createPinSVG(color: string, activityId: string): string {
  return `
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${activityId}" x1="16" y1="0" x2="16" y2="32">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.8"/>
        </linearGradient>
        <filter id="shadow${activityId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.4"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Shadow ellipse -->
      <ellipse cx="16" cy="38" rx="6" ry="1.5" fill="black" opacity="0.3"/>
      
      <!-- Main pin shape with gradient -->
      <path d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 20 10 20s10-12.5 10-20c0-5.523-4.477-10-10-10z" 
            fill="url(#grad${activityId})" 
            stroke="white" 
            stroke-width="2.5"
            filter="url(#shadow${activityId})"/>
      
      <!-- Inner circle -->
      <circle cx="16" cy="12" r="4.5" fill="white" opacity="0.95"/>
      
      <!-- Shine effect -->
      <path d="M11 7c1-2 3-3.5 5-3.5" 
            stroke="white" 
            stroke-width="2" 
            opacity="0.5" 
            stroke-linecap="round"/>
    </svg>
  `.trim();
}

/**
 * Predefined pin configurations
 */
export const PIN_CONFIGS = {
  default: {
    color: "#0055ffff",
    width: 40,
    height: 50,
  },
  highlighted: {
    color: "#ef4444",
    width: 48,
    height: 60,
  },
} as const;

/**
 * Clear the icon cache (useful for testing or memory management)
 */
export function clearIconCache(): void {
  iconCache.clear();
}
