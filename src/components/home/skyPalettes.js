// Sky palettes for the Home scene (HANDOFF 9.1). Scene colours only: the
// painting needs exact values per time of day, so they live here, not in
// tokens.css. Everything outside the scene uses tokens.
export const SKY_PALETTES = {
  dawn: {
    skyTop: '#BDB4A6', skyMid: '#D6CDBD', skyBottom: '#EEE5D5', disc: '#D2563F', glow: '#F2A68F',
    enso: '#1A1714', levelInk: '#F7F1E6', mount1: '#A49B8E', mount2: '#8A8176', mount3: '#3A342E', ground: '#2A2520',
    mist: '#FBF7EF', plume: '#6E655B', grass: '#3A342E', figure: '#1A1714', rim: 'none', headerInk: '#1A1714',
    caption: '#14110E', streak: '#D6CDBD', birds: '#2A2420', wind: 'rgba(26,23,20,0.4)', night: false,
  },
  dusk: {
    skyTop: '#140F0D', skyMid: '#2C1C16', skyBottom: '#6A2D1D', disc: '#C8361F', glow: '#E0553B',
    enso: '#EEE6D6', levelInk: '#F7F1E6', mount1: '#2F211B', mount2: '#1C1512', mount3: '#0F0C0A', ground: '#0B0908',
    mist: '#E8B48F', plume: '#9A7346', grass: '#2A1F18', figure: '#090706', rim: 'rgba(224,85,59,0.6)', headerInk: '#EEE6D6',
    caption: '#E9DCC6', streak: '#2C1C16', birds: '#0B0908', wind: 'rgba(238,230,214,0.5)', night: false,
  },
  night: {
    skyTop: '#07080B', skyMid: '#10131B', skyBottom: '#20253A', disc: '#E9E2CF', glow: '#C9C3B0',
    enso: '#EEE6D6', levelInk: '#1A1714', mount1: '#1B1F2B', mount2: '#12151D', mount3: '#0A0B0F', ground: '#07080A',
    mist: '#A9B3C9', plume: '#5E626C', grass: '#16181F', figure: '#050608', rim: 'rgba(233,226,207,0.45)', headerInk: '#EEE6D6',
    caption: '#D8D2C4', streak: '#10131B', birds: '#0B0908', wind: 'rgba(238,230,214,0.4)', night: true,
  },
};

// Blade tops (y of the plume base) for the 24 pampas blades, from the artboard.
export const GRASS_TOPS = [372, 360, 380, 366, 384, 358, 376, 364, 386, 370, 380, 362, 378, 368, 386, 372, 364, 380, 362, 376, 382, 384, 366, 378];
