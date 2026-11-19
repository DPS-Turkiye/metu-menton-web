import type { IskurSupportActivityInput } from "@/interfaces/iskur-support-activities";
import type { IskurSupportForm } from "@/types/iskur-tasks";

/** The add/edit form as the backend takes it; null while the title is empty. */
export function supportActivityInput(
  form: IskurSupportForm,
): IskurSupportActivityInput | null {
  const title = form.title.trim();
  if (!title) return null;
  const description = form.description.trim();
  return { title, description: description || null, active: form.active };
}

/** The coordinator's placement screen, and the pool screen next to it. */
export function iskurWorkspaceHref(programId: string) {
  return `/coordinator/programs/${encodeURIComponent(programId)}/iskur`;
}

export function iskurSupportActivitiesHref(programId: string) {
  return `${iskurWorkspaceHref(programId)}/support-activities`;
}
