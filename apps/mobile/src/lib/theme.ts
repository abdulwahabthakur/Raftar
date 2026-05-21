export const colors = {
  bg: '#0A0A0A',
  bgCard: '#141414',
  bgElevated: '#1C1C1C',
  border: '#2A2A2A',

  primary: '#FF3B30',
  primaryDim: '#7A1A14',
  accent: '#FF9500',

  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',

  // Map territory colors
  cellFree: 'rgba(255,255,255,0.08)',
  cellMine: 'rgba(255,59,48,0.55)',
  cellHeld: 'rgba(255,149,0,0.55)',
  cellContested: 'rgba(255,214,10,0.55)',
  cellBorder: 'rgba(255,255,255,0.15)',

  zoneOwned: 'rgba(255,59,48,0.20)',
  zoneNeutral: 'rgba(255,255,255,0.04)',

  fog: 'rgba(10,10,10,0.72)',

  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 18,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: '#FFFFFF' },
  h2: { fontSize: 22, fontWeight: '600' as const, color: '#FFFFFF' },
  h3: { fontSize: 17, fontWeight: '600' as const, color: '#FFFFFF' },
  body: { fontSize: 15, fontWeight: '400' as const, color: '#FFFFFF' },
  caption: { fontSize: 13, fontWeight: '400' as const, color: '#8E8E93' },
  label: { fontSize: 11, fontWeight: '500' as const, color: '#8E8E93', letterSpacing: 0.5 },
} as const;
