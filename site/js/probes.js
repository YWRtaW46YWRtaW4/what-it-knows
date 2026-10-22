// Reads what the browser hands over without asking. Nothing leaves the page.

const mq = (q) => matchMedia(q).matches;

export async function readSignals() {
  const n = navigator;
  const s = {
    ua: n.userAgent,
    languages: [...(n.languages || [n.language])],
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    weekStart: weekStart(n.language),
    screen: {
      w: screen.width, h: screen.height, dpr: devicePixelRatio,
      availW: screen.availWidth, availH: screen.availHeight,
      availLeft: screen.availLeft ?? 0, availTop: screen.availTop ?? 0,
    },
    win: { innerW: innerWidth, innerH: innerHeight, outerW: outerWidth, outerH: outerHeight },
    extended: screen.isExtended,
    cores: n.hardwareConcurrency,
    memory: n.deviceMemory,
    touch: n.maxTouchPoints,
    dark: mq("(prefers-color-scheme: dark)"),
    lessMotion: mq("(prefers-reduced-motion: reduce)"),
    moreContrast: mq("(prefers-contrast: more)"),
    vivid: mq("(color-gamut: p3)"),
    hdr: mq("(dynamic-range: high)"),
    coarse: mq("(pointer: coarse)"),
    textSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
    referrer: document.referrer,
    historyLength: history.length,
    gpc: n.globalPrivacyControl,
    dnt: n.doNotTrack === "1",
    connection: n.connection && { kind: n.connection.type, type: n.connection.effectiveType, down: n.connection.downlink },
  };

  const [hints, gpu, battery, adBlock, media, keyboard, bluetooth, refreshHz] = await Promise.all([
    readHints(), readGpu(), readBattery(), detectAdBlock(), readMedia(), readKeyboard(), readBluetooth(),
    readRefreshRate(),
  ]);
  return { ...s, hints, gpu, battery, adBlock, media, keyboard, bluetooth, refreshHz, addOns: readAddOns(), inApp: readInApp(n.userAgent) };
}

function weekStart(lang) {
  try {
    const loc = new Intl.Locale(lang);
    return (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay ?? null;
  } catch {
    return null;
  }
}

// Every check gets 2 seconds. Some browser features never answer in background windows,
// and one slow check mustn't hold up the whole page.
async function safely(fn, ms = 2000) {
  try {
    return await Promise.race([fn(), new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
  } catch {
    return null;
  }
}

function readHints() {
  return safely(() => navigator.userAgentData?.getHighEntropyValues(
    ["architecture", "model", "platformVersion"]));
}

function readGpu() {
  return safely(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
  });
}

function readBattery() {
  return safely(async () => {
    if (!navigator.getBattery) return null;
    const b = await navigator.getBattery();
    return { level: b.level, charging: b.charging, left: b.dischargingTime };
  });
}

function readMedia() {
  return safely(async () => {
    const list = await navigator.mediaDevices.enumerateDevices();
    const count = (kind) => list.filter((d) => d.kind === kind).length;
    return { cameras: count("videoinput"), mics: count("audioinput") };
  });
}

// Which letters sit where on the keyboard: tells QWERTY from AZERTY, QWERTZ and Dvorak.
function readKeyboard() {
  return safely(async () => {
    const map = await navigator.keyboard?.getLayoutMap();
    return map ? ["KeyQ", "KeyW", "KeyY", "KeyZ"].map((k) => map.get(k)).join("") : null;
  });
}

function readBluetooth() {
  return safely(() => navigator.bluetooth?.getAvailability());
}

// Counts screen redraws for about a second. Hidden tabs pause, so give up after 3 s.
function readRefreshRate() {
  return safely(() => new Promise((resolve) => {
    const times = [];
    const step = (ts) => {
      times.push(ts);
      if (times.length < 60) return requestAnimationFrame(step);
      const gaps = times.slice(1).map((x, i) => x - times[i]).sort((a, b) => a - b);
      resolve(Math.round(1000 / gaps[gaps.length >> 1]));
    };
    requestAnimationFrame(step);
  }), 3000);
}

// Extensions that announce themselves to every page.
function readAddOns() {
  const found = [];
  if (window.ethereum?.isMetaMask) found.push("MetaMask");
  else if (window.ethereum) found.push("a crypto wallet");
  if (window.phantom || window.solana) found.push("Phantom");
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) found.push("React Developer Tools");
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) found.push("Vue Developer Tools");
  if (window.__REDUX_DEVTOOLS_EXTENSION__) found.push("Redux DevTools");
  return found;
}

const IN_APP = [
  [/Instagram/, "Instagram"], [/FBAN|FBAV/, "Facebook"], [/LinkedInApp/, "LinkedIn"],
  [/BytedanceWebview|musical_ly/, "TikTok"], [/Snapchat/, "Snapchat"], [/\bLine\//, "LINE"],
];

function readInApp(ua) {
  return IN_APP.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
}

function detectAdBlock() {
  return safely(() => baitAd());
}

function baitAd() {
  const bait = document.createElement("div");
  bait.className = "adsbox ad-banner pub_300x250";
  bait.style.cssText = "position:absolute;left:-999px;height:10px;width:10px";
  document.body.append(bait);
  return new Promise((resolve) => {
    setTimeout(() => {
      const blocked = bait.offsetHeight === 0 || getComputedStyle(bait).display === "none";
      bait.remove();
      resolve(blocked);
    }, 150);
  });
}

export function hasFont(font) {
  const ctx = document.createElement("canvas").getContext("2d");
  const text = "mmmmmmmmmmlli10";
  return ["monospace", "serif", "sans-serif"].some((base) => {
    ctx.font = `72px ${base}`;
    const plain = ctx.measureText(text).width;
    ctx.font = `72px "${font}", ${base}`;
    return ctx.measureText(text).width !== plain;
  });
}

// Extensions that write into the page leave marks we can spot.
const EXTENSION_MARKS = [
  { name: "1Password", test: () => document.querySelector("com-1password-button, [data-com-onepassword-filled]")
    || /1Password menu/.test(document.body.textContent) },
  { name: "LastPass", test: () => document.querySelector("[data-lastpass-icon-root], [data-lastpass-root]") },
  { name: "Bitwarden", test: () => document.querySelector("[data-bwautofill], bitwarden-notification-bar") },
  { name: "Dashlane", test: () => document.querySelector("[data-dashlane-rid], [data-dashlanecreated]") },
  { name: "Grammarly", test: () => document.querySelector("grammarly-desktop-integration, [data-gr-ext-installed]") },
  { name: "Dark Reader", test: () => document.querySelector('meta[name="darkreader"], style.darkreader') },
  { name: "Google Translate", test: () => /translated-(ltr|rtl)/.test(document.documentElement.className) },
];

export function findExtensions() {
  return EXTENSION_MARKS.filter((e) => e.test()).map((e) => e.name);
}
