// Things a page can notice while you use it. Each one is said once.

export function watchBehaviour(list) {
  const said = new Set();
  const say = (key, text) => {
    if (said.has(key)) return;
    said.add(key);
    const li = document.createElement("li");
    li.textContent = text;
    list.prepend(li);
  };

  const started = Date.now();
  let leftAt = null;

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      leftAt = Date.now();
    } else if (leftAt) {
      const secs = Math.round((Date.now() - leftAt) / 1000);
      say("away", `You left this tab for ${secs} seconds, then came back.`);
    }
  });

  addEventListener("wheel", (e) => {
    const smooth = e.deltaMode === 0 && Math.abs(e.deltaY) % 1 !== 0;
    const small = Math.abs(e.deltaY) < 40;
    say("wheel", smooth || small
      ? "You're scrolling with a trackpad, not a mouse."
      : "You're scrolling with a mouse wheel.");
  }, { passive: true });

  addEventListener("touchstart", () => say("touch", "You're using a touch screen."), { passive: true });

  document.addEventListener("copy", () => say("copy", "You just copied something from this page."));

  addEventListener("scroll", () => {
    const share = (scrollY + innerHeight) / document.body.scrollHeight;
    if (share > 0.5) {
      const secs = Math.round((Date.now() - started) / 1000);
      say("half", `You reached halfway down the page in ${secs} seconds.`);
    }
  }, { passive: true });

  // Android Chrome sends tilt without asking (on https pages). iPhones ask first, so nothing arrives there.
  // beta: 0 = flat face up, 90 = upright, near 180 = face down. gamma: turned on its side.
  const readings = [];
  addEventListener("deviceorientation", (e) => {
    if (e.beta == null) return;
    readings.push({ beta: e.beta, gamma: e.gamma });
    if (readings.length < 20) return;
    const avg = (key) => readings.reduce((n, r) => n + r[key], 0) / readings.length;
    const beta = Math.abs(avg("beta"));
    const gamma = Math.abs(avg("gamma"));
    const late = new Date().getHours() >= 21 || new Date().getHours() < 6;
    if (beta > 110) {
      say("posture", late ? "You're lying on your back, holding your phone above your face. In bed?"
        : "You're lying on your back, holding your phone above your face.");
    } else if (gamma > 55) {
      say("posture", late ? "You're lying on your side. In bed, by the look of it." : "You're lying on your side.");
    } else if (beta < 12) {
      say("posture", "Your phone is lying flat, on a table or your lap.");
    } else if (beta > 70) {
      say("posture", "You're holding your phone upright. Standing up, or sitting up straight.");
    } else {
      say("posture", `You're holding your phone at about ${Math.round(beta)} degrees. Sitting, probably.`);
    }
    readings.length = 0;
  });

  addEventListener("devicemotion", (e) => {
    const a = e.acceleration;
    if (a && Math.hypot(a.x, a.y, a.z) > 2.5) say("moving", "You're moving. Walking, or on a bus?");
  });

  addEventListener("pointerdown", (e) => {
    if (e.pointerType === "pen") say("pen", "You're using a stylus, like an Apple Pencil.");
  });

  let idle;
  const resetIdle = () => {
    clearTimeout(idle);
    idle = setTimeout(() => say("idle", "You've stopped moving for 20 seconds. Reading, or did you look away?"), 20000);
  };
  ["pointermove", "keydown", "scroll", "touchstart"].forEach((t) =>
    addEventListener(t, resetIdle, { passive: true }));
  resetIdle();
}
