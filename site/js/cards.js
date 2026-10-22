import { icon } from "./icons.js";
import { heroFor, sectionIcon } from "./visuals.js";

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function cardHtml(c, i = 0) {
  return `
    <article class="card" style="animation-delay:${i * 80}ms">
      ${icon(c.icon)}
      <div>
        <p class="says">${escapeHtml(c.says)}</p>
        <span class="tag ${c.sure ? "" : "guess"}">${c.sure ? "we're sure" : "our guess"}</span>
        <details>
          <summary>How we know</summary>
          <p class="how">${escapeHtml(c.how)}</p>
        </details>
      </div>
    </article>`;
}

export function renderCards(container, cards) {
  container.innerHTML = cards.map(cardHtml).join("");
}

export function renderSections(container, sections, signals, profile) {
  container.innerHTML = sections.filter((s) => s.cards.length).map((s) => `
    <section class="section" id="${s.id}">
      <h2><span class="step"></span><span class="section-icon">${sectionIcon(s.id, profile)}</span>${s.title}</h2>
      ${heroFor(s.id, signals, profile)}
      <div class="cards">${s.cards.map(cardHtml).join("")}</div>
    </section>`).join("");
}
