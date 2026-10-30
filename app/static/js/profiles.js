// The players' profiles, kept on the server (api/profiles, app/profiles.py): each avatar's
// name and level, the same on every device. Used by the game's setup and the profiles page.
// Without the server they are simply not shared: nothing stops the game.

const NAME_WAIT_MS = 600; // a name is saved once typing stops for a moment

// avatar id → { name, level }, or null if the server could not be reached.
export async function loadProfiles() {
  try {
    const response = await fetch("api/profiles", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("The profiles could not be loaded.", error);
    return null;
  }
}

const pending = new Map(); // avatar id → { timer, send }, while a name is being typed

// Saves one avatar's profile; with `later`, once typing stops.
export function saveProfile(avatar, { name, level }, { later = false } = {}) {
  cancel(avatar);
  const send = () => {
    pending.delete(avatar);
    return request("PUT", avatar, { name: name.trim(), level });
  };
  if (later) {
    pending.set(avatar, { timer: setTimeout(send, NAME_WAIT_MS), send });
    return Promise.resolve();
  }
  return send();
}

export function deleteProfile(avatar) {
  cancel(avatar);
  return request("DELETE", avatar);
}

function cancel(avatar) {
  clearTimeout(pending.get(avatar)?.timer);
  pending.delete(avatar);
}

// Leaving the page while typing: the name goes now, not lost.
window.addEventListener("pagehide", () => {
  for (const { timer, send } of [...pending.values()]) {
    clearTimeout(timer);
    send();
  }
});

async function request(method, avatar, body) {
  try {
    const response = await fetch(`api/profiles/${encodeURIComponent(avatar)}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      keepalive: true, // so it is still sent when the page is left right after
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error(`The profile of ${avatar} could not be saved.`, error);
    return false;
  }
}
