// Turns raw browser signals into plain sentences, grouped so each section digs a level deeper.

import { hasFont } from "./probes.js";
import { SOURCES as WHERE_FROM } from "./sources.js";

const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });
const MAC_NAMES = { 11: "Big Sur", 12: "Monterey", 13: "Ventura", 14: "Sonoma", 15: "Sequoia", 26: "Tahoe" };
const LAYOUTS = { qwyz: null, azyw: "French (AZERTY)", qwzy: "German (QWERTZ)", "',fv": "Dvorak" };
const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
// Apple, WWDC 2025: Tahoe is the last macOS for Intel Macs, with security fixes for about 3 years.
const INTEL_FIXES_END = 2028;

function card(icon, says, sure, how, from) {
  return { icon, says, sure, how, from: WHERE_FROM[from] };
}

function withArticle(word) {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}

function near(a, b, slack = 24) {
  return Math.abs(a - b) <= slack;
}

export function osName(s) {
  const ua = s.ua;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && s.touch > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux";
  return null;
}

function browserName(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return null;
}

function guessModel(s, devices, os) {
  const w = Math.max(s.screen.w, s.screen.h);
  const h = Math.min(s.screen.w, s.screen.h);
  if (os === "Mac") {
    const arch = s.hints?.architecture || null;
    return devices.mac.find((d) => near(d.w, w) && near(d.h, h, 40)
      && (d.arch === "any" || !arch || d.arch === arch));
  }
  if (os === "iPhone") return devices.iphone.find((d) => d.w === h && d.h === w);
  if (os === "Android" && s.hints?.model) {
    // Longest code first, so "A142P" isn't read as "A142".
    const known = Object.keys(devices.android).sort((a, b) => b.length - a.length)
      .find((k) => s.hints.model.startsWith(k));
    return { name: known ? devices.android[known] : `phone with the model code ${s.hints.model}`, code: s.hints.model };
  }
  if (os === "Android" && s.gpu) {
    // Chrome hides the model on plain pages, but the graphics chip names the processor family.
    const hit = devices.gpus.find((g) => new RegExp(g.match).test(s.gpu));
    if (hit) return { name: `phone like ${hit.like}`, chip: hit.chip, short: hit.like.replace(/^an? /, "") };
  }
  return null;
}

function osVersion(os, version) {
  if (!version) return null;
  const major = parseInt(version, 10);
  if (os === "Mac") return MAC_NAMES[major] ? `macOS ${MAC_NAMES[major]}` : `macOS ${version}`;
  if (os === "Windows") return major >= 13 ? "Windows 11" : major > 0 ? "Windows 10" : null;
  if (os === "Android") return `Android ${major}`;
  return null;
}

function cityFrom(timeZone) {
  const part = timeZone?.split("/").pop();
  return part && part !== "UTC" ? part.replace(/_/g, " ") : null;
}

function localTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function gpuName(renderer) {
  if (!renderer) return null;
  const m = renderer.match(/ANGLE \([^,]+, (?:ANGLE Metal Renderer: )?([^,]+?)(?:,| Direct3D|$)/);
  const name = (m ? m[1] : renderer).replace(/\(R\)|\(TM\)/g, "").trim();
  return /Apple GPU|SwiftShader|llvmpipe/.test(name) ? null : name;
}

// Everything worked out once, so sections and combinations share it.
export function readProfile(s, devices) {
  const os = osName(s);
  const langs = [...new Set(s.languages.map((l) => l.split("-")[0]))];
  return {
    os,
    browser: browserName(s.ua),
    model: guessModel(s, devices, os),
    version: osVersion(os, s.hints?.platformVersion),
    intelMac: os === "Mac" && s.hints?.architecture === "x86",
    city: cityFrom(s.timeZone),
    langs,
    otherLangs: langs.filter((l) => l !== "en"),
    layout: s.keyboard ? LAYOUTS[s.keyboard] : null,
    gpu: gpuName(s.gpu),
    hour: new Date().getHours(),
    batteryPct: s.battery ? Math.round(s.battery.level * 100) : null,
    dockHidden: os === "Mac" && s.screen.availTop > 0
      && s.screen.availTop + s.screen.availH >= s.screen.h - 4 && s.screen.availW === s.screen.w,
    dockSide: s.screen.availLeft > 0 ? "left" : s.screen.availW < s.screen.w ? "right" : null,
    fullScreenWindow: !s.coarse && s.win.outerW > 0 && near(s.win.outerW, s.screen.availW, 8) && near(s.win.outerH, s.screen.availH, 8),
    toolbarHeight: s.win.outerH - s.win.innerH,
  };
}

export function makeReveal(s, p) {
  const device = p.model?.chip ? `Android ${p.model.name}` : p.model?.name || p.os || "device";
  let line = `You're on <strong>${withArticle(device)}</strong>`;
  if (p.city) line += ` in or near <strong>${p.city}</strong>`;
  line += `. It's <strong>${localTime()}</strong>`;
  if (p.batteryPct !== null && p.batteryPct < 100 && !s.battery.charging) {
    line += ` and you're on <strong>${p.batteryPct}% battery</strong>`;
  }
  return { html: line + ".", icon: p.os === "iPhone" || p.os === "Android" ? "phone" : "laptop" };
}

function whereYouAre(s, p) {
  const out = [];
  if (p.city) {
    out.push(card("pin", `You're in or near ${p.city}`, false,
      `Your device's time zone is "${s.timeZone}". Most people set it to where they live.`, "timezone"));
  }
  out.push(card("clock", `It's ${localTime()} where you are`, true, `Time zone ${s.timeZone}.`, "clock"));
  const named = p.langs.map((l) => LANGUAGE_NAMES.of(l));
  out.push(card("speech", named.length > 1
    ? `You read ${named.slice(0, -1).join(", ")} and ${named.at(-1)}`
    : `You speak ${named[0]}`, true, `Language settings: ${s.languages.join(", ")}`, "languages"));
  if (p.layout) {
    out.push(card("keyboard", `Your keyboard is set up ${p.layout === "Dvorak" ? "as Dvorak" : `for ${p.layout}`}`, true,
      `The key next to Tab types "${s.keyboard[0]}".`, "keyboard"));
  }
  if (s.weekStart) {
    out.push(card("calendar", `Your calendar starts on ${DAYS[s.weekStart]}`, true,
      "Region settings for your language.", "region"));
  }
  return out;
}

function yourDevice(s, p) {
  const out = [];
  if (p.model) {
    out.push(p.model.chip
      ? card("phone", `You're on an Android ${p.model.name}`, false,
        `Your graphics chip is ${s.gpu}, which comes in the ${p.model.chip}.`, "gpu")
      : p.model.code ? card("phone", `You're on ${withArticle(p.model.name)}`, true,
        `Model code ${p.model.code}`, "hints")
      : card(p.os === "Mac" ? "laptop" : "phone", `You're on ${withArticle(p.model.name)}`, false,
        `Screen ${s.screen.w}×${s.screen.h}${s.hints?.architecture ? `, ${s.hints.architecture} chip` : ""}. Only a few models report that size.`, "screen"));
    // The newest model with this screen size sets the minimum age.
    const age = p.model.latest ? new Date().getFullYear() - p.model.latest : 0;
    if (age >= 2) {
      out.push(card("clock", `Your ${p.os === "Mac" ? "computer" : "phone"} model is at least ${age} years old`, false,
        `The newest model with this screen size came out in ${p.model.latest}.`, "screen"));
    }
  } else if (p.os) {
    out.push(card(p.os === "iPhone" || p.os === "Android" ? "phone" : "laptop",
      `You're on ${withArticle(p.os)}`, true, s.ua, "ua"));
  }
  if (p.version) {
    out.push(card("laptop", `You're running ${p.version}`, true,
      `Chrome's device hints: version ${s.hints.platformVersion}.`, "hints"));
  }
  if (p.browser) out.push(card("browser", `You're using ${p.browser}`, true, s.ua, "ua"));
  return out;
}

function insideIt(s, p) {
  const out = [];
  if (s.hints?.architecture && p.os === "Mac") {
    out.push(card("chip", `Your Mac has ${p.intelMac ? "an Intel chip" : "an Apple chip"}`, true,
      `Chrome's device hints: architecture "${s.hints.architecture}".`, "hints"));
  }
  if (s.cores) out.push(card("chip", `Your processor has ${s.cores} cores`, true, `hardwareConcurrency = ${s.cores}`, "cores"));
  if (s.memory) out.push(card("memory", `It has ${s.memory} GB of memory`, true, `deviceMemory = ${s.memory}`, "memory"));
  if (p.gpu) out.push(card("chip", `Your graphics chip is ${withArticle(p.gpu)}`, true, s.gpu, "gpu"));
  if (s.hdr) {
    out.push(card("screen", "Your screen does HDR", true, "dynamic-range: high", "display"));
  } else if (s.vivid) {
    out.push(card("screen", "Your screen shows extra-vivid colours", true, "color-gamut: p3", "display"));
  }
  if (s.refreshHz >= 100) {
    out.push(card("screen", `Your screen redraws ${Math.round(s.refreshHz / 10) * 10} times a second, faster than the usual 60`, true,
      `Counted ${s.refreshHz} frames a second while this page was on screen.`, "frames"));
  }
  if (s.bluetooth) out.push(card("bluetooth", "Your device has Bluetooth", true, "navigator.bluetooth.getAvailability() = true", "bluetooth"));
  if (s.media?.cameras) {
    out.push(card("camera", s.media.cameras > 1 ? `You have ${s.media.cameras} cameras` : "You have a camera", true,
      "The browser lists your cameras and microphones before asking to use them.", "media"));
  }
  if (s.media?.mics > 1) {
    out.push(card("mic", `You have ${s.media.mics} microphones`, true, "Often a headset or headphones plugged in.", "media"));
  }
  return out;
}

function yourSetup(s, p) {
  const out = [];
  if (s.dark) {
    // Automatic dark mode only switches on around sunset, so dark at midday means it's always on.
    const daytime = p.hour >= 10 && p.hour < 16;
    out.push(card("moon", daytime ? "You keep dark mode on all the time" : "You use dark mode", daytime,
      daytime ? "Dark mode is on in the middle of the day, so it isn't on a sunset timer." : "prefers-color-scheme: dark", "settings"));
  }
  if (p.dockHidden) {
    out.push(card("window", "You've hidden your Dock", false,
      `Your screen is ${s.screen.h} px tall and apps can use all of it below the ${s.screen.availTop} px menu bar.`, "screenEdges"));
  } else if (p.dockSide) {
    out.push(card("window", `Your Dock is on the ${p.dockSide}`, false, "The usable screen is narrower on that side.", "screenEdges"));
  }
  if (p.fullScreenWindow) {
    out.push(card("window", "Your browser fills the whole screen", true,
      `Window ${s.win.outerW}×${s.win.outerH}, usable screen ${s.screen.availW}×${s.screen.availH}.`, "window"));
  } else if (!s.coarse && s.win.outerW > 0) {
    const share = (s.win.outerW * s.win.outerH) / (s.screen.availW * s.screen.availH);
    out.push(card("window", `This window fills ${Math.round(share * 100)}% of your screen`, true,
      `Window ${s.win.outerW}×${s.win.outerH}, usable screen ${s.screen.availW}×${s.screen.availH}.`, "window"));
  }
  if (p.browser === "Chrome" && !s.coarse && s.win.outerH > 0 && p.toolbarHeight > 105 && p.toolbarHeight < 160) {
    out.push(card("browser", "You keep your bookmarks bar showing", false,
      `The browser's top bars take ${p.toolbarHeight} px. Plain Chrome is about 87.`, "window"));
  }
  if (s.extended) out.push(card("screens", "You've got a second screen plugged in", true, "screen.isExtended = true", "screens"));
  if (s.lessMotion) out.push(card("still", "You've turned animations down", true, "prefers-reduced-motion: reduce", "settings"));
  if (s.moreContrast) out.push(card("still", "You've turned contrast up", true, "prefers-contrast: more", "settings"));
  if (s.textSize > 16) {
    out.push(card("font", "You've made your text bigger than normal", true, `Default text is ${s.textSize}px, not 16px.`, "settings"));
  }
  return out;
}

function installed(s, devices) {
  s.fonts = devices.fonts.filter((f) => hasFont(f.font));
  const out = [];
  for (const f of s.fonts) out.push(card("font", f.says, false, `The font "${f.font}" is installed.`, "fonts"));
  if (s.adBlock) out.push(card("shield", "You use an ad blocker", false, "A fake ad on this page was hidden.", "adbait"));
  for (const name of s.addOns) {
    out.push(card(/Developer|DevTools/.test(name) ? "chip" : "key",
      /wallet|MetaMask|Phantom/.test(name) ? `You have a crypto wallet (${name})` : `You have ${name} installed. You build websites`,
      true, `${name} announces itself to every page you visit.`, "globals"));
  }
  return out;
}

export function nothingFoundCard() {
  return card("shield", "Nothing jumped in. That's good. A password manager or writing helper would have added its own marks to that box, and this page could see them", false,
    "We looked for marks left by 1Password, LastPass, Bitwarden, Dashlane, Grammarly, Dark Reader and Google Translate.", "pagemarks");
}

export function extensionCard(name) {
  return card("key", `You use ${name}`, true, `${name} added its own marks to this page.`, "pagemarks");
}

const SOURCES = [
  [/(^|\.)reddit\.com$/, "Reddit"], [/^t\.co$|(^|\.)x\.com$|twitter\.com$/, "X (Twitter)"],
  [/facebook\.com$|^fb\.me$/, "Facebook"], [/instagram\.com$/, "Instagram"], [/linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/^news\.ycombinator\.com$/, "Hacker News"], [/bsky\.app$/, "Bluesky"], [/(^|\.)google\./, "a Google search"],
  [/(^|\.)bing\.com$/, "a Bing search"], [/duckduckgo\.com$/, "a DuckDuckGo search"], [/(^|\.)youtube\.com$/, "YouTube"],
  [/mastodon|infosec\.exchange/, "Mastodon"], [/threads\.(net|com)$/, "Threads"], [/mail\.google\.com$/, "Gmail"],
];

function cameFrom(s) {
  if (!s.referrer) {
    return card("link", "You came here directly. Typed it, used a bookmark, or tapped a link in an app that hides where you came from", false,
      "Your browser didn't say which page sent you here.", "referrer");
  }
  const host = new URL(s.referrer).hostname.replace(/^www\./, "");
  const named = SOURCES.find(([pattern]) => pattern.test(host))?.[1];
  const searchNote = /search/.test(named || "") ? " We can't see what you searched for." : "";
  return card("link", `You came here from ${named || host}.${searchNote}`, true,
    `Your browser told us the site that sent you: ${host}. Browsers stopped sharing the exact page a few years ago.`, "referrer");
}

// Android Chrome names the connection type. Elsewhere there's only a rough, capped speed
// estimate from the last few downloads, which is too jumpy to call anything slow.
function connectionKind(s) {
  const c = s.connection;
  if (!c) return null;
  if (c.kind === "wifi") return { says: "You're on wifi", sure: true, how: "Your browser said: wifi." };
  if (c.kind === "cellular") return { says: "You're on mobile data", sure: true, how: "Your browser said: cellular." };
  if (c.kind === "ethernet") return { says: "You're plugged into a network cable", sure: true, how: "Your browser said: ethernet." };
  if (c.down >= 10) return { says: "You're on a fast connection", sure: false, how: "Chrome's speed estimate is at its 10 Mbps cap." };
  return null;
}

function rightNow(s, p) {
  const out = [];
  if (s.battery) {
    const says = p.batteryPct === 100 ? "Your battery is full"
      : s.battery.charging ? `You're plugged in, at ${p.batteryPct}%`
      : `You're on ${p.batteryPct}% and not charging`;
    out.push(card("battery", says, true, "navigator.getBattery()", "battery"));
    if (p.batteryPct < 100 && !s.battery.charging && Number.isFinite(s.battery.left) && s.battery.left > 0) {
      const hrs = s.battery.left / 3600;
      out.push(card("battery", hrs >= 1 ? `About ${Math.round(hrs)} hours of battery left`
        : `About ${Math.round(hrs * 60)} minutes of battery left`, true, `dischargingTime = ${Math.round(s.battery.left)} s`, "battery"));
    }
  }
  const link = connectionKind(s);
  if (link) out.push(card("wifi", link.says, link.sure, link.how, "connection"));
  out.push(cameFrom(s));
  if (s.historyLength > 2) {
    out.push(card("link", `You visited ${s.historyLength - 1} pages in this tab before this one`, true,
      `history.length = ${s.historyLength}`, "history"));
  }
  if (s.gpc || s.dnt) {
    out.push(card("hand", "You've asked websites not to track you", true,
      `${s.gpc ? "Global Privacy Control" : "Do Not Track"} is on. It's a request, not a lock.`, "dnt"));
  }
  return out;
}

export function makeSections(s, devices, p) {
  return [
    { id: "where", title: "Where you are", cards: whereYouAre(s, p) },
    { id: "device", title: "What you're on", cards: yourDevice(s, p) },
    { id: "inside", title: "Inside it", cards: insideIt(s, p) },
    { id: "setup", title: "How you've set it up", cards: yourSetup(s, p) },
    { id: "installed", title: "What you've installed", cards: installed(s, devices) },
    { id: "now", title: "Right now", cards: rightNow(s, p) },
  ];
}

// Pieces that mean more together. Called again when new clues arrive.
export function makeCombos(s, p, total, extensions) {
  const out = [];
  if (p.hour >= 22 || p.hour < 5) {
    const bits = [`It's ${localTime()}`];
    if (p.batteryPct !== null && p.batteryPct < 100) bits.push(`you're on ${p.batteryPct}%`);
    out.push(card("moon", `${bits.join(", ")}. Go to bed.`, false, "Your clock, battery and display settings.", "combo"));
  }
  if (p.intelMac && p.version === "macOS Tahoe") {
    out.push(card("shield", `Your Mac is on its last macOS. Apple's security fixes for it stop around ${INTEL_FIXES_END}.`, true,
      "Apple at WWDC 2025: Tahoe \"will be the final release for Intel Macs\". Apple told reporters those Macs get security updates for three years after it.", "apple"));
  }
  if (p.city && (p.otherLangs.length || p.layout)) {
    const extra = p.otherLangs.length ? `read ${p.otherLangs.map((l) => LANGUAGE_NAMES.of(l)).join(" and ")}`
      : `type on a ${p.layout} keyboard`;
    out.push(card("pin", `You live near ${p.city} but you ${extra}. Moved here, or family overseas?`, false,
      "Your time zone against your language and keyboard settings.", "combo"));
  }
  const techSignals = [
    s.memory >= 32 && "32 GB of memory",
    extensions.some((e) => ["1Password", "Bitwarden"].includes(e)) && "a password manager",
    s.dark && "dark mode",
    (s.dnt || s.gpc) && "a do-not-track request",
    s.addOns.some((a) => /Developer|DevTools/.test(a)) && "developer tools",
    s.fonts?.some((f) => /code/i.test(f.says)) && "a coding font",
    p.dockHidden && "a hidden Dock",
    s.extended && "a second screen",
  ].filter(Boolean);
  if (techSignals.length >= 3) {
    out.push(card("laptop", `Odds are you work in tech. ${techSignals.slice(0, 4).join(", ").replace(/^./, (c) => c.toUpperCase())}.`, false,
      "Settings that are far more common among people who work with computers.", "combo"));
  }

  const careful = [];
  if (s.dnt || s.gpc) careful.push("asked not to be tracked");
  const manager = extensions.find((e) => ["1Password", "LastPass", "Bitwarden", "Dashlane"].includes(e));
  if (manager) careful.push(`use ${manager}`);
  if (s.adBlock) careful.push("block ads");
  if (careful.length) {
    out.push(card("hand", `You ${careful.join(", ")}. Good habits. We still worked all of this out about you.`, true,
      "Everything on this page.", "combo"));
  } else {
    out.push(card("hand", "We worked all of this out about you, and you haven't clicked anything.", true,
      "Everything on this page.", "combo"));
  }
  return out;
}
