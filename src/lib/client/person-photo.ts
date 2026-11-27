/** A person's avatar photo from this app's own origin; the initials stand in when there is none to show. */
export function personPhotoPath(personId: string) {
  return `/api/users/${encodeURIComponent(personId)}/photo`;
}
