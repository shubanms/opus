export const THEMES = [
  { id: 'slate', label: 'Slate', bg: '#2C2C2C', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'obsidian', label: 'Black', bg: '#111010', text: '#F7F5F2', sub: '#8A8780' },
  { id: 'chalk', label: 'Light', bg: '#F7F5F2', text: '#1A1A1A', sub: '#8A8780' },
];

export const ACCENTS = [
  { id: 'gold', color: '#C9A84C' },
  { id: 'ember', color: '#D4622A' },
  { id: 'sage', color: '#6B8F71' },
];

export const DEFAULT_THEME = { ...THEMES[0], accent: ACCENTS[0].color };
