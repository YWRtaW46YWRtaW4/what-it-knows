// One picture at the top of each section. The cards underneath carry the detail.

import { deviceArt, icon } from "./icons.js";

const SECTION_ICONS = {
  where: "pin", device: "laptop", inside: "chip", setup: "window", installed: "key", now: "battery",
};

export function sectionIcon(id, profile) {
  if (id === "device" && (profile.os === "iPhone" || profile.os === "Android")) return icon("phone");
  return icon(SECTION_ICONS[id] || "browser");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function where(s, p) {
  const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `
    <div class="hero hero-where">
      <svg class="map" viewBox="0 0 240 140" aria-hidden="true">
        <g class="grid">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 30} 0V140"/>`).join("")}
        ${Array.from({ length: 5 }, (_, i) => `<path d="M0 ${i * 35}H240"/>`).join("")}</g>
        <circle class="ping" cx="120" cy="78" r="10"/>
        <path class="pin" d="M120 80s-22-21-22-38a22 22 0 0 1 44 0c0 17-22 38-22 38z"/>
        <circle class="pin-dot" cx="120" cy="42" r="8"/>
      </svg>
      <p class="hero-big">${escapeHtml(p.city || "Somewhere")}</p>
      <p class="hero-sub">${escapeHtml(time)} on your clock</p>
    </div>`;
}

function device(s, p) {
  const kind = p.os === "iPhone" || p.os === "Android" ? "phone" : "laptop";
  const name = p.model?.chip ? `Android ${p.model.name}` : p.model?.name || p.os || "Your device";
  const age = p.model?.year ? new Date().getFullYear() - p.model.year : null;
  return `
    <div class="hero hero-device">
      <div class="device-art">${deviceArt(kind)}
        ${age >= 2 ? `<span class="badge">${age}+ yrs old</span>` : ""}</div>
      <p class="hero-big">${escapeHtml(name.replace(/^phone like /, "Phone like "))}</p>
      <p class="hero-sub">${escapeHtml([p.version, p.browser].filter(Boolean).join(" · "))}</p>
    </div>`;
}

function inside(s, p) {
  const cores = Math.min(s.cores || 0, 32);
  const memory = s.memory || 0;
  return `
    <div class="hero hero-inside">
      ${cores ? `<div class="chip-art" style="--cols:${Math.ceil(Math.sqrt(cores))}">
        ${Array.from({ length: cores }, () => "<span></span>").join("")}</div>
        <p class="hero-big">${cores} cores</p>` : ""}
      ${memory ? `<div class="mem-bar" aria-hidden="true">${Array.from({ length: Math.min(memory, 32) }, () => "<span></span>").join("")}</div>
        <p class="hero-sub">${memory} GB of memory${p.gpu ? ` · ${escapeHtml(p.gpu)}` : ""}</p>` : ""}
    </div>`;
}

function setup(s, p) {
  if (s.coarse) return "";
  const share = s.win.outerW > 0
    ? Math.min(1, (s.win.outerW * s.win.outerH) / (s.screen.availW * s.screen.availH)) : 1;
  const w = Math.round(200 * Math.sqrt(share));
  const h = Math.round((p.dockHidden ? 112 : 96) * Math.sqrt(share));
  return `
    <div class="hero hero-setup">
      <svg class="screen-art ${s.dark ? "dark" : "light"}" viewBox="0 0 220 150" aria-hidden="true">
        <rect class="bezel" x="2" y="2" width="216" height="136" rx="8"/>
        <rect class="menubar" x="10" y="10" width="200" height="8"/>
        <rect class="win" x="10" y="20" width="${w}" height="${h}" rx="3"/>
        ${p.toolbarHeight > 105 ? `<rect class="bookmarks" x="14" y="28" width="${Math.max(20, w - 8)}" height="4"/>` : ""}
        ${p.dockHidden ? "" : `<rect class="dock" x="70" y="122" width="80" height="10" rx="4"/>`}
      </svg>
      <p class="hero-sub">${[s.dark ? "Dark mode" : "Light mode", p.dockHidden ? "Dock hidden" : null,
        p.fullScreenWindow ? "browser fills the screen" : null].filter(Boolean).join(" · ")}</p>
    </div>`;
}

function now(s, p) {
  const pct = p.batteryPct;
  // Signal bars only when the browser names the connection; speed estimates are too rough.
  const bars = ["wifi", "ethernet", "cellular"].includes(s.connection?.kind) ? 4 : 0;
  if (pct === null && !bars) return "";
  return `
    <div class="hero hero-now">
      ${pct !== null ? `<svg class="battery-art" viewBox="0 0 120 56" aria-hidden="true">
        <rect class="shell" x="2" y="4" width="104" height="48" rx="8"/>
        <rect class="nub" x="108" y="18" width="8" height="20" rx="2"/>
        <rect class="fill ${pct <= 20 ? "low" : ""}" x="8" y="10" width="${Math.round(92 * pct / 100)}" height="36" rx="4"/>
      </svg><p class="hero-big">${pct}%</p>` : ""}
      ${bars ? `<svg class="signal-art" viewBox="0 0 60 40" aria-hidden="true">
        ${[0, 1, 2, 3].map((i) => `<rect class="${i < bars ? "on" : ""}" x="${i * 15}" y="${30 - i * 9}" width="10" height="${10 + i * 9}" rx="2"/>`).join("")}
      </svg>` : ""}
    </div>`;
}

const HEROES = { where, device, inside, setup, now };

export function heroFor(id, s, p) {
  return HEROES[id] ? HEROES[id](s, p) : "";
}
