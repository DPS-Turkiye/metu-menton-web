import Link from "next/link";

export type UnderlineTab = {
  id: string;
  label: string;
  href: string | null;
  count: number | null;
  active: boolean;
};

/**
 * The Figma "Tab" row: 44 px underline tabs with an optional count. They are page links, so the row is a
 * navigation landmark and the current page is marked with aria-current. A tab without a page yet stays visible but
 * disabled, and says why to screen readers as well as on hover.
 */
export function UnderlineTabs({
  label,
  tabs,
  disabledTitle,
}: {
  label: string;
  tabs: readonly UnderlineTab[];
  disabledTitle: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-border-subtle"
    >
      {tabs.map((tab) => {
        const content = (
          <>
            <span className="flex h-11 items-center gap-2 px-2">
              {tab.label}
              {tab.count != null ? (
                <span className="rounded-full bg-background-selected px-2 py-0.5 type-label-sm text-text-accent">
                  {tab.count}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={`h-0.5 w-full rounded-[1px] ${tab.active ? "bg-action-accent" : ""}`}
            />
          </>
        );
        const className = `flex shrink-0 flex-col items-center rounded-t-lg type-label focus-visible:ring-[3px] focus-visible:ring-border-default focus-visible:outline-none ${
          tab.active ? "text-text-accent" : "text-text-secondary"
        }`;
        return tab.href ? (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <span
            key={tab.id}
            aria-disabled="true"
            title={disabledTitle}
            className={`${className} cursor-not-allowed opacity-60`}
          >
            {content}
            <span className="sr-only">{disabledTitle}</span>
          </span>
        );
      })}
    </nav>
  );
}
