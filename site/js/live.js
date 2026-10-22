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

  // Automatic dark mode switches by itself at sunset and sunrise. A page can notice.
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    say("autodark", `Your screen just switched to ${e.matches ? "dark" : "light"} mode by itself. It's on a timer.`);
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
