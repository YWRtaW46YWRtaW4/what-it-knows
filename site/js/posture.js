// Live posture from the phone's tilt. Android Chrome shares tilt with secure pages without asking.
// beta: 0 = flat face up, 90 = upright, near 180 = face down.
// gamma: near 90 = turned on its side.

const FIGURES = {
  back: '<path d="M14 62h92"/><circle cx="26" cy="54" r="7"/><path d="M33 56h60l8 6M60 56v-6"/><rect x="18" y="22" width="18" height="10" rx="2" class="phone"/><path d="M27 33v14" class="gaze"/>',
  side: '<path d="M14 62h92"/><circle cx="24" cy="50" r="7"/><path d="M30 54c12 4 30 4 44 2l20 6M44 56l-6-12"/><rect x="42" y="30" width="7" height="16" rx="2" class="phone"/>',
  sitting: '<circle cx="46" cy="16" r="7"/><path d="M46 23v24l20 0v18M46 47l-6 18M30 66h50"/><path d="M46 32l14 6"/><rect x="58" y="32" width="9" height="15" rx="2" class="phone" transform="rotate(-35 62 40)"/>',
  upright: '<circle cx="56" cy="12" r="7"/><path d="M56 19v28l-6 22M56 47l6 22M56 28l12 6"/><rect x="66" y="22" width="9" height="15" rx="2" class="phone"/>',
  flat: '<path d="M14 54h92M24 54v16M96 54v16"/><rect x="44" y="48" width="30" height="5" rx="2" class="phone"/>',
  walking: '<circle cx="56" cy="12" r="7"/><path d="M56 19v26l-12 22M56 45l12 20M56 28l12 6M56 30l-12 10"/><rect x="66" y="22" width="9" height="15" rx="2" class="phone"/>',
};

function describe(beta, gamma, moving, portraitScreen) {
  const b = Math.abs(beta);
  const g = Math.abs(gamma);
  const late = new Date().getHours() >= 21 || new Date().getHours() < 6;
  if (moving) return { pose: "walking", text: "You're walking. We can count your steps." };
  if (b > 110) return { pose: "back", text: `You're lying on your back, holding your phone above your face.${late ? " In bed?" : ""}` };
  if (g > 55 && b < 45) {
    return portraitScreen
      ? { pose: "side", text: `You're lying on your side. Your phone is sideways but the screen hasn't turned.${late ? " In bed, by the look of it." : ""}` }
      : { pose: "sitting", text: "You're holding your phone sideways. Watching something?" };
  }
  if (b < 12) return { pose: "flat", text: "Your phone is lying flat. On a table, or your lap." };
  if (b > 70) return { pose: "upright", text: "You're holding your phone upright. Standing, or sitting up straight." };
  return { pose: "sitting", text: `You're holding your phone at ${Math.round(b)} degrees. Sitting down, probably.` };
}

export function watchPosture(panel) {
  const phone = panel.querySelector(".tilt-phone");
  const figure = panel.querySelector(".figure");
  const words = panel.querySelector(".posture-text");
  const numbers = panel.querySelector(".posture-numbers");
  let beta = null;
  let gamma = 0;
  let shown = "";

  addEventListener("deviceorientation", (e) => {
    if (e.beta == null) return;
    // Smooth the readings so the words don't flicker.
    beta = beta === null ? e.beta : beta * 0.8 + e.beta * 0.2;
    gamma = gamma * 0.8 + e.gamma * 0.2;
    panel.hidden = false;
    // Drawn as you see your own phone: face-on when upright, edge-on when flat.
    phone.style.transform = `rotateX(${(90 - beta).toFixed(1)}deg) rotateY(${gamma.toFixed(1)}deg)`;
  });

  // Walking shows up as a steady bump in the phone's movement, roughly twice a second.
  // Count bumps over the last 5 seconds and only call it walking if they're regular.
  const bumps = [];
  let last = 0;
  addEventListener("devicemotion", (e) => {
    const a = e.acceleration;
    if (!a || a.x == null) return;
    const now = performance.now();
    const size = Math.hypot(a.x, a.y, a.z);
    if (size > 1.5 && now - last > 300) {
      bumps.push(now);
      last = now;
    }
    while (bumps.length && now - bumps[0] > 5000) bumps.shift();
  });

  const walking = () => {
    if (bumps.length < 6 || beta === null || Math.abs(beta) < 20 || Math.abs(beta) > 110) return false;
    const gaps = bumps.slice(1).map((t, i) => t - bumps[i]);
    const mean = gaps.reduce((n, g) => n + g, 0) / gaps.length;
    const spread = Math.sqrt(gaps.reduce((n, g) => n + (g - mean) ** 2, 0) / gaps.length);
    return mean > 350 && mean < 900 && spread < mean * 0.35;
  };

  setInterval(() => {
    if (beta === null) return;
    const portrait = (screen.orientation?.type || "portrait").startsWith("portrait");
    const now = describe(beta, gamma, walking(), portrait);
    numbers.textContent = `tilted ${Math.round(beta)}° forward, ${Math.round(gamma)}° sideways`;
    if (now.text === shown) return;
    shown = now.text;
    words.textContent = now.text;
    figure.innerHTML = FIGURES[now.pose];
  }, 700);
}
