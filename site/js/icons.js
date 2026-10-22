// Small line icons, drawn on a 48x48 grid in the current text colour.

const paths = {
  laptop: '<rect x="10" y="11" width="28" height="19" rx="2"/><path d="M5 35h38l-3 4H8z"/>',
  phone: '<rect x="15" y="5" width="18" height="38" rx="3"/><path d="M22 38h4"/>',
  chip: '<rect x="14" y="14" width="20" height="20" rx="2"/><rect x="20" y="20" width="8" height="8"/><path d="M19 9v5M24 9v5M29 9v5M19 34v5M24 34v5M29 34v5M9 19h5M9 24h5M9 29h5M34 19h5M34 24h5M34 29h5"/>',
  browser: '<rect x="6" y="9" width="36" height="30" rx="3"/><path d="M6 16h36M11 12.5h1M15 12.5h1M19 12.5h1"/>',
  pin: '<path d="M24 42s13-12 13-22a13 13 0 0 0-26 0c0 10 13 22 13 22z"/><circle cx="24" cy="20" r="5"/>',
  clock: '<circle cx="24" cy="24" r="17"/><path d="M24 14v10l7 5"/>',
  speech: '<path d="M8 11h32v20H22l-8 7v-7H8z"/>',
  memory: '<rect x="6" y="16" width="36" height="14" rx="2"/><path d="M12 30v5M18 30v5M24 30v5M30 30v5M36 30v5M12 21h4M20 21h4M28 21h4"/>',
  battery: '<rect x="6" y="15" width="32" height="18" rx="3"/><path d="M38 21h4v6h-4"/><rect x="10" y="19" width="10" height="10"/>',
  disk: '<rect x="8" y="12" width="32" height="24" rx="3"/><path d="M8 28h32"/><circle cx="34" cy="32" r="1"/>',
  mask: '<path d="M6 18c6-4 30-4 36 0 0 8-5 13-11 13-4 0-5-4-7-4s-3 4-7 4c-6 0-11-5-11-13z"/>',
  screens: '<rect x="4" y="10" width="22" height="16" rx="2"/><rect x="22" y="18" width="22" height="16" rx="2"/><path d="M15 26v6M33 34v5"/>',
  window: '<rect x="6" y="8" width="36" height="28" rx="2"/><rect x="10" y="14" width="18" height="14" rx="1"/>',
  moon: '<path d="M33 31a13 13 0 0 1-16-20 14 14 0 1 0 16 20z"/>',
  still: '<circle cx="24" cy="24" r="17"/><path d="M19 17v14M29 17v14"/>',
  font: '<path d="M12 38 22 10h4l10 28M16 28h16"/>',
  shield: '<path d="M24 6 39 12v11c0 9-7 16-15 19C16 39 9 32 9 23V12z"/><path d="M17 24l5 5 9-10"/>',
  wifi: '<path d="M6 19a26 26 0 0 1 36 0M12 25a17 17 0 0 1 24 0M18 31a8 8 0 0 1 12 0"/><circle cx="24" cy="37" r="1.5"/>',
  link: '<path d="M21 27a7 7 0 0 0 10 0l6-6a7 7 0 0 0-10-10l-2 2M27 21a7 7 0 0 0-10 0l-6 6a7 7 0 0 0 10 10l2-2"/>',
  hand: '<path d="M16 26V12a3 3 0 0 1 6 0v10V9a3 3 0 0 1 6 0v13-9a3 3 0 0 1 6 0v17c0 7-5 12-11 12-5 0-8-3-11-8l-5-8a3 3 0 0 1 5-3z"/>',
  camera: '<rect x="5" y="14" width="28" height="20" rx="3"/><path d="M33 21l10-6v18l-10-6"/>',
  mic: '<rect x="18" y="6" width="12" height="22" rx="6"/><path d="M11 23a13 13 0 0 0 26 0M24 36v6M18 42h12"/>',
  keyboard: '<rect x="4" y="13" width="40" height="22" rx="3"/><path d="M10 19h2M16 19h2M22 19h2M28 19h2M34 19h4M10 24h2M16 24h2M22 24h2M28 24h2M34 24h4M14 29h20"/>',
  calendar: '<rect x="7" y="10" width="34" height="30" rx="3"/><path d="M7 18h34M15 6v8M33 6v8M13 25h4M22 25h4M31 25h4M13 32h4M22 32h4"/>',
  screen: '<rect x="5" y="8" width="38" height="25" rx="2"/><path d="M18 40h12M24 33v7"/><path d="M11 27c5-9 11-13 26-14" opacity=".6"/>',
  bluetooth: '<path d="M15 15l18 17-9 8V8l9 8-18 17"/>',
  key: '<circle cx="15" cy="24" r="8"/><path d="M23 24h19M36 24v6M41 24v4"/>',
};

const devices = {
  laptop: '<rect x="26" y="14" width="148" height="96" rx="8"/><rect x="34" y="22" width="132" height="80" rx="2" opacity=".35"/><path d="M6 118h188l-10 12H16z"/><path d="M88 118h24"/>',
  phone: '<rect x="70" y="6" width="60" height="124" rx="12"/><rect x="76" y="16" width="48" height="100" rx="3" opacity=".35"/><path d="M92 11h16"/>',
};

export function deviceArt(kind) {
  return `<svg viewBox="0 0 200 136" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true">${devices[kind] || devices.laptop}</svg>`;
}

export function icon(name) {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.browser}</svg>`;
}
