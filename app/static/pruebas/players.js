// Players for the test pages: these names, each with a random avatar from api/avatars,
// drawn like the game's (a see-through picture in a ring of its colour), or with their
// initial when there are no avatars.

export async function randomPlayers(names) {
  let avatars = [];
  try {
    avatars = await (await fetch("../api/avatars", { cache: "no-store" })).json();
  } catch {
    // no avatars: initials
  }
  const shuffled = [...avatars].sort(() => Math.random() - 0.5);
  return names.map((name, index) => ({ name, avatar: avatarOf(shuffled[index], name) }));
}

function avatarOf(avatar, name) {
  const circle = document.createElement("span");
  circle.className = "avatar";
  circle.style.setProperty("--avatar-color", avatar?.color ?? "#c3a6ff");
  if (avatar) {
    circle.style.setProperty("--avatar-inside", "transparent");
    const img = document.createElement("img");
    img.className = "avatar__photo";
    img.alt = "";
    img.src = `../${avatar.url}`; // the page is in pruebas/
    circle.append(img);
  } else {
    circle.style.setProperty("--avatar-inside", "#ede4ff");
    circle.textContent = name.charAt(0);
  }
  return circle;
}
