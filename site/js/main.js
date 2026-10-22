import { readSignals, findExtensions } from "./probes.js";
import { readProfile, makeReveal, makeSections, makeCombos, extensionCard, nothingFoundCard } from "./guesses.js";
import { renderCards, renderSections } from "./cards.js";
import { deviceArt } from "./icons.js";
import { watchBehaviour } from "./live.js";
import { watchPosture } from "./posture.js";
import { watchAutofill } from "./autofill.js";
import { setUpProviderButton } from "./provider.js";

async function start() {
  setUpProviderButton(document.getElementById("provider"), document.getElementById("provider-result"));
  const [signals, devices] = await Promise.all([
    readSignals(),
    fetch("data/devices.json").then((r) => r.json()),
  ]);
  const profile = readProfile(signals, devices);

  const reveal = makeReveal(signals, profile);
  document.getElementById("reveal-art").innerHTML = deviceArt(reveal.icon);
  document.getElementById("reveal").innerHTML = reveal.html;

  const sections = makeSections(signals, devices, profile);
  renderSections(document.getElementById("sections"), sections, signals, profile);
  document.querySelectorAll(".step").forEach((el, i) => {
    el.textContent = String(i + 1).padStart(2, "0");
  });
  const baseCount = sections.reduce((n, s) => n + s.cards.length, 0);

  let extensions = [];
  const showExtensions = (checked = false) => {
    extensions = findExtensions();
    const cards = extensions.map(extensionCard);
    if (!cards.length && checked) cards.push(nothingFoundCard());
    renderCards(document.getElementById("extension-cards"), cards);
    renderCards(document.getElementById("combos"),
      makeCombos(signals, profile, baseCount + extensions.length, extensions));
  };
  showExtensions();
  watchForExtensions(document.getElementById("bait"), showExtensions);

  watchAutofill(document.getElementById("autofill"), document.getElementById("autofill-result"));
  watchBehaviour(document.getElementById("live"));
  watchPosture(document.getElementById("posture"));
}

// Password managers and writing helpers add things to the page when you tap a box.
// Watch for a few seconds after the tap, then report what turned up.
function watchForExtensions(box, show) {
  box.addEventListener("focus", () => {
    let seen = findExtensions().join();
    const observer = new MutationObserver(() => {
      const now = findExtensions().join();
      if (now !== seen) {
        seen = now;
        show();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
    setTimeout(() => {
      observer.disconnect();
      show(true);
    }, 4000);
  }, { once: true });
}

start().catch((error) => console.error("what_it_knows:", error));
