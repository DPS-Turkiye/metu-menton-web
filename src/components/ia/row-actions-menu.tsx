"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

export type RowAction = {
  id: string;
  label: string;
  onSelect: () => void;
  /** Taking something away ("Rozeti geri al") reads in the error tone. */
  destructive?: boolean | undefined;
};

/**
 * A table row's "⋯" (Figma icon/more): a small menu of the row's other actions. Escape, a click or focus outside, a
 * scroll or a resize closes it; Escape and choosing an action give focus back to the trigger.
 */
export function RowActionsMenu({
  label,
  actions,
}: {
  label: string;
  actions: readonly RowAction[];
}) {
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<{ top: number; right: number } | null>(
    null,
  );
  const open = place !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPlace(null);
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    }
    function onOutside(event: Event) {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target))
        close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("focusin", onOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("focusin", onOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) {
            setPlace(null);
            return;
          }
          const box = trigger.current?.getBoundingClientRect();
          setPlace({
            top: (box?.bottom ?? 0) + 4,
            right: window.innerWidth - (box?.right ?? 0),
          });
        }}
        className="grid size-9 place-items-center rounded-full hover:bg-background-subtle"
      >
        <Image alt="" src="/ia/icons/more.svg" width={18} height={18} />
      </button>
      {place ? (
        <ul
          ref={menu}
          id={menuId}
          style={place}
          className="fixed z-30 w-52 rounded-2xl border border-border-subtle bg-background-surface p-1 text-left shadow-hover"
        >
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => {
                  setPlace(null);
                  trigger.current?.focus();
                  action.onSelect();
                }}
                className={`w-full rounded-xl px-3 py-2 text-left type-body-sm hover:bg-background-subtle ${action.destructive ? "text-status-error-text" : "text-text-primary"}`}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
