import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { StatusBadge, StatusTone } from "@/components/ia/status-badge";
import type { MentorshipRequestStatus } from "@/interfaces/mentorship-request";
import { PeerTopicCategory } from "@/interfaces/peer-mentoring";
import { PEER_REQUEST_STATUS_TONE } from "@/lib/peer-mentoring";

/*
 * Pieces the İŞKUR screens need that `components/ia` does not have yet: underline tabs with a count, the vertical
 * "Mentor olma adımları" list, the info card, the initials avatar, the 32px tag and the request status badge. They use
 * the kit's tokens, so they can move into `components/ia` unchanged.
 */

/** The kit tone for each of the older status-chip tones, so request statuses keep one table (PEER_REQUEST_STATUS_TONE). */
const KIT_TONE = {
  green: StatusTone.Success,
  amber: StatusTone.Warning,
  red: StatusTone.Error,
  neutral: StatusTone.Neutral,
  blue: StatusTone.Info,
  orange: StatusTone.Warning,
} as const;

/** A peer request's status, with the hourglass while it waits. */
export function RequestStatusBadge({
  status,
}: {
  status: MentorshipRequestStatus;
}) {
  const t = useTranslations("iaIskur.requestStatus");
  const tone = KIT_TONE[PEER_REQUEST_STATUS_TONE[status]];
  return (
    <StatusBadge
      tone={tone}
      icon={
        tone === StatusTone.Warning ? (
          <Image src="/ia/iskur/hourglass.svg" alt="" width={16} height={16} />
        ) : undefined
      }
    >
      {t(status)}
    </StatusBadge>
  );
}

/** A text field in the İŞKUR/ODTÜ student screens (the wizard's inputs). */
export const ISKUR_FIELD_CLASS =
  "w-full rounded-input border border-border-control bg-background-surface px-4 py-3 type-body text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected";

export enum TagTone {
  Neutral = "neutral",
  Success = "success",
  Accent = "accent",
}

const TAG_TONES: Record<TagTone, string> = {
  [TagTone.Neutral]: "bg-status-neutral-bg text-status-neutral-text",
  [TagTone.Success]: "bg-status-success-bg text-status-success-text",
  [TagTone.Accent]: "bg-background-selected text-text-accent",
};

/** A category or expertise label (32px). */
export function Tag({
  tone = TagTone.Neutral,
  children,
}: {
  tone?: TagTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-full px-3 type-label-sm ${TAG_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const AVATAR_SIZES = {
  md: "size-10 type-label",
  profile: "size-14 type-h4",
  lg: "size-[72px] type-h3",
} as const;

export function InitialsAvatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: keyof typeof AVATAR_SIZES;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-background-selected text-text-accent ${
        AVATAR_SIZES[size]
      }`}
    >
      {initials}
    </span>
  );
}

/** Figma draws a row of tabs underlined, or as raised segments for a second row under them (7.1). */
export enum TabLook {
  Underline = "underline",
  Segment = "segment",
}

export type UnderlineTab<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function tabId(prefix: string, id: string) {
  return `${prefix}-tab-${id}`;
}

export function panelId(prefix: string, id: string) {
  return `${prefix}-panel-${id}`;
}

/**
 * Underline tabs (44px) with an optional count, following the WAI-ARIA tabs pattern: one tab in the tab order, arrow
 * keys and Home/End move between tabs. The panels stay rendered (hidden when inactive), so every `aria-controls`
 * points at a real panel.
 */
export function UnderlineTabs<T extends string>({
  label,
  tabs,
  selected,
  onSelect,
  idPrefix,
  look = TabLook.Underline,
}: {
  label: string;
  tabs: readonly UnderlineTab<T>[];
  selected: T;
  onSelect: (id: T) => void;
  idPrefix: string;
  look?: TabLook;
}) {
  const segment = look === TabLook.Segment;
  const buttons = useRef(new Map<T, HTMLButtonElement>());
  const move = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    const tab = target === null ? undefined : tabs[target];
    if (!tab) return;
    event.preventDefault();
    onSelect(tab.id);
    buttons.current.get(tab.id)?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex overflow-x-auto ${segment ? "py-1" : "gap-1"}`}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) buttons.current.set(tab.id, element);
              else buttons.current.delete(tab.id);
            }}
            id={tabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className={`flex min-w-max flex-1 flex-col items-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-selected ${
              segment
                ? `h-9 justify-center rounded-full px-4 ${active ? "bg-background-surface shadow-raised" : ""}`
                : "rounded-t-lg"
            } ${active ? "text-text-accent" : "text-text-secondary"}`}
          >
            <span
              className={`flex items-center gap-2 type-label ${segment ? "" : "h-11 px-2"}`}
            >
              {segment && tab.count !== undefined
                ? `${tab.label} · ${String(tab.count)}`
                : tab.label}
              {segment || tab.count === undefined ? null : (
                <span
                  className={`rounded-full px-2 py-0.5 type-label-sm ${
                    active ? "bg-background-selected" : "bg-background-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {segment ? null : (
              <span
                aria-hidden
                className={`h-0.5 w-full rounded-[1px] ${active ? "bg-action-accent" : ""}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** One tab's panel; inactive panels stay mounted but hidden, so their state (an unsaved draft) survives a switch. */
export function TabPanel({
  idPrefix,
  id,
  selected,
  children,
}: {
  idPrefix: string;
  id: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, id)}
      aria-labelledby={tabId(idPrefix, id)}
      hidden={!selected}
      tabIndex={0}
      className="space-y-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-border-selected"
    >
      {children}
    </div>
  );
}

export type JourneyStep = { key: string; title: string; hint: string };

/** "Mentor olma adımları": a vertical numbered list in a card, the current step filled. */
export function JourneySteps({
  heading,
  steps,
  currentKey,
}: {
  heading: string;
  steps: readonly JourneyStep[];
  currentKey: string;
}) {
  return (
    <div className="w-full rounded-[20px] bg-background-surface p-6 lg:w-[440px] lg:shrink-0">
      <p className="type-overline text-text-muted uppercase">{heading}</p>
      <ol aria-label={heading}>
        {steps.map((step, index) => {
          const active = step.key === currentKey;
          return (
            <li
              key={step.key}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-3.5 py-3.5"
            >
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full type-label-sm ${
                  active
                    ? "bg-brand-mentor-primary text-text-inverse"
                    : "bg-background-muted text-text-muted"
                }`}
              >
                {index + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span
                  className={`type-label ${active ? "text-text-primary" : "text-text-secondary"}`}
                >
                  {step.title}
                </span>
                <span className="type-caption text-text-muted">
                  {step.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Each peer category's sticker, at the size the cards show it: 63 px on the long side, the file's aspect ratio. */
export const CATEGORY_ART: Record<
  PeerTopicCategory,
  { src: string; width: number; height: number }
> = {
  [PeerTopicCategory.CareerInternship]: {
    src: "/ia/iskur/categories/career.png",
    width: 63,
    height: 63,
  },
  [PeerTopicCategory.TechnicalDigital]: {
    src: "/ia/iskur/categories/technical.png",
    width: 63,
    height: 63,
  },
  [PeerTopicCategory.AcademicDevelopment]: {
    src: "/ia/iskur/categories/academic.png",
    width: 63,
    height: 47,
  },
  [PeerTopicCategory.CampusLife]: {
    src: "/ia/iskur/categories/campus.png",
    width: 63,
    height: 61,
  },
  [PeerTopicCategory.ResearchAcademicCareer]: {
    src: "/ia/iskur/categories/research.png",
    width: 59,
    height: 63,
  },
  [PeerTopicCategory.International]: {
    src: "/ia/iskur/categories/international.png",
    width: 63,
    height: 60,
  },
  [PeerTopicCategory.PersonalProfessional]: {
    src: "/ia/iskur/categories/personal.png",
    width: 61,
    height: 63,
  },
  [PeerTopicCategory.Entrepreneurship]: {
    src: "/ia/iskur/categories/entrepreneurship.png",
    width: 63,
    height: 62,
  },
};

export type ViewOption<T extends string> = {
  id: T;
  label: string;
  /** A product-tour anchor on this option. */
  tour?: string;
};

/**
 * A two-or-three way switch drawn as full-width underline tabs (Figma 7.1 "Mentorluk al | Mentorluk ver"): toggle
 * buttons in a group. Not tabs: it swaps whole views, not panels.
 */
export function ViewSwitch<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly ViewOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            data-tour={option.tour}
            onClick={() => onSelect(option.id)}
            className={`flex h-[46px] min-w-0 flex-1 items-center justify-center border-b-2 type-label focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-selected ${
              active
                ? "border-action-accent text-text-accent"
                : "border-transparent text-text-secondary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A two-or-three way segmented switch (Figma "Segment"): toggle buttons in a group, the pressed one raised and
 * accented. Not tabs: it swaps whole views, not panels.
 */
export function Segmented<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly ViewOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-[14px] bg-background-muted p-1"
    >
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            data-tour={option.tour}
            onClick={() => onSelect(option.id)}
            className={`h-9 rounded-full px-4 type-label focus-visible:outline-2 focus-visible:outline-border-selected ${
              active
                ? "bg-background-surface text-text-accent shadow-raised"
                : "text-text-secondary"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
