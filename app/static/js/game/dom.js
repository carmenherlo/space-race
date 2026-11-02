// Finding a part's elements in the page. Each part of the screen (the board, the turn bar,
// a card…) says which elements it uses, by id; each one is looked up the first time it is
// used, so a page with only some parts (a test page with just the board) works, and a
// missing one says which.

// { name: "id" } → an object whose `name` is the element with that id. A function instead
// of an id finds something else (several elements, say), also the first time.
export function elementsOf(ids) {
  const found = {};
  for (const [name, id] of Object.entries(ids)) {
    let element;
    Object.defineProperty(found, name, {
      enumerable: true,
      get() {
        element ??= typeof id === "function" ? id() : document.getElementById(id);
        if (element === null) {
          throw new Error(`This page has no #${id} (${name}).`);
        }
        return element;
      },
    });
  }
  return found;
}
