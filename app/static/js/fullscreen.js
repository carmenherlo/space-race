// The full-screen button: a tap fills the screen with the page, another tap leaves it.
// Inside a frame that does not allow full screen (e.g. a Home Assistant add-on panel),
// it opens the page in a tab of its own instead, where full screen works.

function fullscreenElement() {
  return document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
}

function canGoFullscreen() {
  const root = document.documentElement;
  const supported = Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
  return supported && Boolean(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);
}

export function setUpFullscreen(button) {
  const inFrame = window.self !== window.top;
  if (!canGoFullscreen() && !inFrame) {
    button.hidden = true; // no way to fill the screen here (e.g. an iPhone)
    return;
  }
  const show = () => button.setAttribute("aria-pressed", String(fullscreenElement() !== null));
  document.addEventListener("fullscreenchange", show);
  document.addEventListener("webkitfullscreenchange", show);
  show();

  button.addEventListener("click", () => {
    if (!canGoFullscreen()) {
      window.open(window.location.href, "_blank", "noopener");
      return;
    }
    const root = document.documentElement;
    if (fullscreenElement()) {
      (document.exitFullscreen ?? document.webkitExitFullscreen).call(document);
    } else {
      (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root);
    }
  });
}
