// Opt-in only: the one place this page sends anything. GeoJS (https://www.geojs.io)
// says it keeps no access logs. Its data comes from MaxMind GeoLite2.

const LOOKUP = "https://get.geojs.io/v1/ip/geo.json";

// Company names that mean the address belongs to a privacy service, not a home connection.
const HIDERS = [
  [/akamai|apple/i, "iCloud Private Relay"],
  [/cloudflare/i, "Cloudflare's WARP or a privacy relay"],
  [/mullvad|nordvpn|tefincom|express ?vpn|proton|surfshark|private internet access|m247|datacamp|31173/i, "a VPN"],
  [/amazon|google cloud|microsoft|digitalocean|linode|akamai|ovh|hetzner|vultr|leaseweb/i, "a VPN or cloud server"],
];

function hiderFor(org) {
  const hit = HIDERS.find(([pattern]) => pattern.test(org || ""));
  return hit ? hit[1] : null;
}

function offsetHours(timeZone) {
  try {
    const name = new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(new Date()).find((p) => p.type === "timeZoneName").value;
    const m = name.match(/([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) + Number(m[3] || 0) / 60) : 0;
  } catch {
    return null;
  }
}

function hoursApart(a, b) {
  const x = offsetHours(a);
  const y = offsetHours(b);
  return x === null || y === null ? 0 : Math.abs(x - y);
}

function lines(geo) {
  const out = [];
  const hider = hiderFor(geo.organization_name);
  if (hider) {
    out.push(`You're using ${hider}. Good move. It hides your internet company, but not everything above.`);
  } else if (geo.organization_name) {
    out.push(`Your internet company is ${geo.organization_name}.`);
  }
  const yours = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Lookups can be out by hundreds of kilometres, so only a big clock difference counts.
  if (geo.timezone && yours && !hider && hoursApart(geo.timezone, yours) > 3) {
    out.push(`Your computer says ${yours.split("/").pop().replace(/_/g, " ")}, but your connection comes out near ${geo.timezone.split("/").pop().replace(/_/g, " ")}. A VPN, or are you travelling?`);
  }
  return out.length ? out : ["We couldn't tell which internet company you use. Lucky you."];
}

export function setUpProviderButton(button, result) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    result.textContent = "Looking you up...";
    try {
      const res = await fetch(LOOKUP, { credentials: "omit", referrerPolicy: "no-referrer" });
      if (!res.ok) throw new Error(res.status);
      result.replaceChildren(...lines(await res.json()).map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      }));
    } catch {
      result.textContent = "The lookup didn't work just now. Try again later.";
      button.disabled = false;
    }
  });
}
