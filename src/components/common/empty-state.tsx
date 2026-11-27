import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const ACCENTS = {
  orange: "text-[#e86f22]",
  blue: "text-[#26a4ff]",
} as const;

export type EmptyStateAccent = keyof typeof ACCENTS;

/**
 * The dashed "nothing here yet" card: an icon, a title, and an optional picture, line and action. A picture takes the
 * icon's place, so the card never shows two images.
 */
export function EmptyState({
  title,
  media,
  body,
  action,
  accent = "orange",
  className = "mt-5",
}: {
  title: string;
  /** A picture under the title, centred. */
  media?: ReactNode;
  body?: string;
  action?: ReactNode;
  accent?: EmptyStateAccent;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-dashed border-[#d6dade] bg-white p-12 text-center ${className}`}
    >
      {media ? null : (
        <Sparkles
          aria-hidden
          className={`mx-auto mb-4 size-7 ${ACCENTS[accent]}`}
        />
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {media ? <div className="mt-4 flex justify-center">{media}</div> : null}
      {body ? <p className="mt-1 text-sm text-[#676e78]">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
