// LinenGrass Design System Tokens

export const colors = {
  // Primary (Brand Green)
  primary: {
    DEFAULT: '#2e7d32',
    hover: '#276e2c',
    active: '#1b5e20',
    bg: 'rgba(46, 125, 50, 0.08)',
  },
  
  // Sidebar
  sidebar: {
    DEFAULT: '#2e7d32',
    hover: 'rgba(255, 255, 255, 0.1)',
    active: 'rgba(255, 255, 255, 0.85)',
    header: '#1b5e20',
  },
  
  // Neutrals
  bg: '#f5f5f5',
  surface: '#f9fafb',
  border: '#e5e7eb',
  
  // Text
  text: {
    heading: '#111827',
    body: '#4b5563',
    muted: '#9ca3af',
  },
  
  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
} as const;

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    brand: '"Exo 2", sans-serif',
    mono: 'SF Mono, Consolas, monospace',
  },
  
  heading: {
    h1: 'text-2xl font-bold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-semibold',
    h4: 'text-base font-medium',
  },
  
  body: 'text-sm',
  small: 'text-xs',
  mono: 'font-mono text-sm',
} as const;
