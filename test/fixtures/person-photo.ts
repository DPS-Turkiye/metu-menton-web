/** The address a person's avatar asks for their photo. */
export function photoPathOf(personId: string) {
  return `/api/users/${encodeURIComponent(personId)}/photo`;
}

/** Every person photo asked for under `root`, as paths (next/image writes the address out in full). */
export function personPhotosIn(root: ParentNode = document.body) {
  return [...root.querySelectorAll("img")]
    .map((img) => new URL(img.getAttribute("src") ?? "", "http://localhost"))
    .map((url) => url.pathname)
    .filter((path) => /^\/api\/users\/[^/]+\/photo$/.test(path));
}
