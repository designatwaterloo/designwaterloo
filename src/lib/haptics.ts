let label: HTMLLabelElement | null = null;

function ensureElements() {
  if (label) return;
  if (typeof document === "undefined") return;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "haptic-switch";
  input.style.display = "none";

  label = document.createElement("label");
  label.htmlFor = "haptic-switch";
  label.style.display = "none";

  document.body.appendChild(input);
  document.body.appendChild(label);
}

export function triggerHaptic() {
  if ("vibrate" in navigator) {
    navigator.vibrate(16);
  } else {
    ensureElements();
    label?.click();
  }
}
