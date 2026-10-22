// Shows that picking one saved entry fills other boxes in the form, seen or not.
// Only checks whether each box has something in it. Nothing is kept or sent.

const LABELS = {
  name: "your name", email: "your email", tel: "your phone",
  address: "your street", suburb: "your suburb", postcode: "your postcode",
};

function listOf(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0];
}

function isAutofilled(box) {
  try {
    return box.matches(":autofill");
  } catch {
    return box.matches(":-webkit-autofill");
  }
}

export function watchAutofill(form, result) {
  const boxes = [...form.querySelectorAll("input")];
  let touched = null;
  const typed = new Set();

  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("focusin", (e) => { touched = e.target; });

  const check = () => {
    // Boxes filled by something other than you, while you were in a different box.
    const others = boxes.filter((box) => box !== touched && !typed.has(box) && box.value.trim() !== "");
    boxes.forEach((box) => box.classList.toggle("filled", others.includes(box)));
    if (!others.length || !touched) {
      result.textContent = "";
      return;
    }
    const who = others.some(isAutofilled) ? "Your browser" : "Something on your computer";
    result.textContent = `You only touched ${LABELS[touched.name]}. ${who} also filled in ${listOf(others.map((b) => LABELS[b.name]))}.`;
  };

  // Chrome marks autofilled boxes a moment after filling them, so wait before deciding.
  const later = () => setTimeout(check, 250);
  form.addEventListener("input", (e) => {
    // Typing and pasting arrive as text input events. Autofill doesn't, or uses a replacement.
    if (e.inputType && e.inputType !== "insertReplacementText") typed.add(e.target);
    later();
  });
  form.addEventListener("change", later);
}
