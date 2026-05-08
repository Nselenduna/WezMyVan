// Brand palette
export const BLUE = '#1E7BC4';   // primary blue — headers, buttons, van body
export const PINK = '#F0337A';   // hot pink — Van!! accent, secondary CTAs
export const CREAM = '#FAFAF5';  // page backgrounds
export const GREEN = '#5CB85C';  // confirm, success, route planner
export const AMBER = '#E8943A';  // prices, Van Pro, cone accent
export const SKY = '#87CEEB';    // auth screen background

// Legacy aliases — existing imports continue to resolve correctly
export const ICE = BLUE;
export const CONE = AMBER;
export const DARK = '#1a1a1a';   // dark text (not a background)

const tint = BLUE;

export default {
  light: {
    text: '#1a1a1a',
    background: CREAM,
    tint,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tint,
    card: '#ffffff',
    border: '#e5e7eb',
    error: '#ef4444',
    success: GREEN,
    muted: '#6b7280',
  },
  dark: {
    text: '#f9fafb',
    background: '#0a0a0a',
    tint,
    tabIconDefault: '#6b7280',
    tabIconSelected: tint,
    card: '#1a1a1a',
    border: '#2d2d2d',
    error: '#f87171',
    success: '#4ade80',
    muted: '#9ca3af',
  },
};
