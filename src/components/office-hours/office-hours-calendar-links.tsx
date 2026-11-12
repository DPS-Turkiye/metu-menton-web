"use client";

import { useTranslations } from "next-intl";

import {
  CopyState,
  useOfficeHoursCalendarLink,
} from "@/hooks/use-office-hours-calendar-link";
import {
  OfficeHoursCalendarFeed,
  OfficeHoursRole,
} from "@/interfaces/office-hours";

const COPY_TEXT: Record<CopyState, "copied" | "copyFailed" | null> = {
  [CopyState.Idle]: null,
  [CopyState.Copied]: "copied",
  [CopyState.Failed]: "copyFailed",
};

const BUTTON =
  "rounded-full border border-[#d4d8dd] px-[14px] py-2 text-[12.5px] font-medium text-[#22262b] hover:bg-[#f8f9fa] disabled:opacity-60";

function CalendarLinkRow({
  feed,
  courseId,
  canReset,
}: {
  feed: OfficeHoursCalendarFeed;
  courseId: string;
  canReset: boolean;
}) {
  const t = useTranslations("officeHours.calendar");
  const link = useOfficeHoursCalendarLink(feed, courseId);
  const copyText = COPY_TEXT[link.copy];
  const fieldId = `office-hours-calendar-${feed}`;

  return (
    <li className="rounded-xl border border-[#e4e7ea] bg-white px-4 py-3 text-sm">
      <p className="font-medium text-[#22262b]">{t(`${feed}.title`)}</p>
      <p className="mt-0.5 text-[12.5px] text-[#676e78]">
        {t(`${feed}.description`)}
      </p>
      {link.open ? null : (
        <button type="button" className={`${BUTTON} mt-3`} onClick={link.show}>
          {t("show")}
        </button>
      )}
      {link.isLoading ? (
        <p className="mt-3 text-[12.5px] text-[#676e78]">{t("loading")}</p>
      ) : null}
      {link.loadFailed ? (
        <p role="alert" className="mt-3 text-[12.5px] text-[#c0392b]">
          {t("loadFailed")}{" "}
          <button type="button" className="underline" onClick={link.retry}>
            {t("retry")}
          </button>
        </p>
      ) : null}
      {link.url ? (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-[12px] text-[#676e78]">
            {t("linkLabel")}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={fieldId}
              readOnly
              value={link.url}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-[#d4d8dd] bg-[#f8f9fa] px-3 py-2 font-mono text-[12px] text-[#22262b]"
            />
            <button
              type="button"
              className={BUTTON}
              onClick={() => void link.copyLink()}
            >
              {t("copy")}
            </button>
          </div>
          {copyText ? (
            <p role="status" className="text-[12px] text-[#676e78]">
              {t(copyText)}
            </p>
          ) : null}
          {canReset ? <ResetLink link={link} /> : null}
        </div>
      ) : null}
    </li>
  );
}

function ResetLink({
  link,
}: {
  link: ReturnType<typeof useOfficeHoursCalendarLink>;
}) {
  const t = useTranslations("officeHours.calendar");

  if (!link.confirmingReset) {
    return (
      <button
        type="button"
        className="self-start text-[12px] text-[#676e78] underline"
        onClick={link.askReset}
      >
        {t("reset")}
      </button>
    );
  }
  return (
    <div className="rounded-lg bg-[#fff8f2] px-3 py-2 text-[12.5px] text-[#22262b]">
      <p>{t("resetConfirm")}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className={BUTTON}
          disabled={link.isResetting}
          onClick={link.confirmReset}
        >
          {t("resetYes")}
        </button>
        <button
          type="button"
          className={BUTTON}
          disabled={link.isResetting}
          onClick={link.cancelReset}
        >
          {t("resetNo")}
        </button>
      </div>
      {link.resetFailed ? (
        <p role="alert" className="mt-2 text-[#c0392b]">
          {t("resetFailed")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Links Moodle's calendar can subscribe to (FR-OH-23): the person's own meetings, and the course's office hours.
 * Everyone may take the course link, but only an academic resets it, since the whole class shares it.
 */
export function OfficeHoursCalendarLinks({
  courseId,
  viewer,
}: {
  courseId: string;
  viewer: OfficeHoursRole;
}) {
  const t = useTranslations("officeHours.calendar");

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-[#22262b]">{t("title")}</h2>
      <p className="mt-1 max-w-[620px] text-[12.5px] leading-5 text-[#676e78]">
        {t("hint")}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        <CalendarLinkRow
          feed={OfficeHoursCalendarFeed.Personal}
          courseId={courseId}
          canReset
        />
        <CalendarLinkRow
          feed={OfficeHoursCalendarFeed.Course}
          courseId={courseId}
          canReset={viewer === OfficeHoursRole.Instructor}
        />
      </ul>
    </section>
  );
}
