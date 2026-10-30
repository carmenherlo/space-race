// The full-screen button: a tap fills the screen, another tap leaves it.
// Inside the app's frame (app.html) it fills the screen with the frame, so it stays on from
// one page to the next. Inside a frame that does not allow full screen (e.g. a Home
// Assistant add-on panel), it opens the app in a tab of its own instead, where it works.

// The window to fill the screen with: app.html around this page, else this page.
function appWindow() {
  try {
    if (window.parent !== window && window.parent.spaceRaceFrame) {
      return window.parent;
    }
  } catch {
    // a parent from another site (e.g. Home Assistant): not ours
  }
  return window;
}

const target = appWindow();
const doc = target.document;
const root = doc.documentElement;

function fullscreenElement() {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function canGoFullscreen() {
  const supported = Boolean(root.requestFullscreen ?? root.webkitRequestFullscreen);
  return supported && Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
}

export function setUpFullscreen(button) {
  const inFrame = target.self !== target.top;
  if (!canGoFullscreen() && !inFrame) {
    button.hidden = true; // no way to fill the screen here (e.g. an iPhone)
    return;
  }
  const show = () => button.setAttribute("aria-pressed", String(fullscreenElement() !== null));
  doc.addEventListener("fullscreenchange", show);
  doc.addEventListener("webkitfullscreenchange", show);
  // The frame outlives this page: leaving it, stop listening there.
  window.addEventListener("pagehide", () => {
    doc.removeEventListener("fullscreenchange", show);
    doc.removeEventListener("webkitfullscreenchange", show);
  });
  show();

  button.addEventListener("click", () => {
    if (!canGoFullscreen()) {
      window.open(new URL("app.html", window.location.href).href, "_blank", "noopener");
      return;
    }
    if (fullscreenElement()) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen).call(doc);
    } else {
      (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root);
    }
  });
}
