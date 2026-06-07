import { MEMORY_FRAGMENTS } from "./config.js";

export function createFragmentSystem({ fragmentLayer, classificationEls, state }) {
  function revealFragment(key, x, y, interrupt = false) {
    state.interactionCount += 1;
    const options = MEMORY_FRAGMENTS[key] ?? [];
    const fragment = options[Math.floor(Math.random() * options.length)];
    if (!fragment) return;

    activateClassification(fragment.perspective);

    const el = document.createElement("div");
    const stain = key !== "gardenia" && state.interactionCount > 3 && Math.random() > 0.42;
    el.className = ["fragment", stain ? "stain" : "", interrupt ? "interrupt" : ""].filter(Boolean).join(" ");
    el.dataset.fragmentKey = key;
    el.textContent = fragment.text;
    el.style.left = `${clamp(x + random(-120, 80), 24, window.innerWidth - 220)}px`;
    el.style.top = `${clamp(y + random(-80, 95), 92, window.innerHeight - 96)}px`;
    el.style.setProperty("--tilt", `${random(-7, 5)}deg`);
    el.style.setProperty("--drift-x", `${random(-14, 12)}px`);
    el.style.setProperty("--drift-y", `${random(-10, 14)}px`);
    fragmentLayer.appendChild(el);

    if (!stain) {
      setTimeout(() => el.remove(), 6200);
    }
    if (state.interactionCount > 5) {
      fragmentLayer.style.filter = `contrast(${1 + state.interactionCount * 0.025})`;
    }
  }

  function activateClassification(perspective) {
    classificationEls.forEach((el) => {
      const active = el.dataset.perspective === perspective;
      el.classList.toggle("active", active);
      el.classList.toggle("failing", state.interactionCount > 4 && !active && Math.random() > 0.35);
      el.style.setProperty("--system-shift", `${random(-5, 5)}px`);
    });
  }

  return {
    revealFragment
  };
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
