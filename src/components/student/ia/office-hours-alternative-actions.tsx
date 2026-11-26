"use client";

import { useLocale, useTranslations } from "next-intl";

import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import {
  useOfficeHoursAlternativeAnswer,
  useOfficeHoursWithdraw,
} from "@/hooks/use-student-office-hours";
import type { Appointment } from "@/interfaces/appointment";
import { formatTurkishTime } from "@/lib/turkey-time";
import { formatDayMonth } from "@/lib/utils";

/**
 * "Reddet" / "Önerilen Saati Kabul Et" on an Office Hours request the academician answered with other times; with
 * more than one time offered, one accept button per time.
 */
export function OfficeHoursAlternativeActions({
  appointment,
}: {
  appointment: Appointment;
}) {
  const t = useTranslations("iaStudent.officeHours.answer");
  const locale = useLocale();
  const answer = useOfficeHoursAlternativeAnswer(appointment);
  const [only] = answer.times;
  return (
    <>
      {answer.canDecline ? (
        <Button
          variant={ButtonVariant.Secondary}
          disabled={answer.isAnswering}
          onClick={() => void answer.decline()}
        >
          {t("decline")}
        </Button>
      ) : null}
      {answer.times.length === 1 && only ? (
        <Button
          disabled={answer.isAnswering}
          onClick={() => void answer.accept(only.startsAt)}
        >
          {t("accept")}
        </Button>
      ) : (
        // TEST UI: placeholder until the design team's screen; replace when it arrives.
        answer.times.map((time) => (
          <Button
            key={time.startsAt}
            disabled={answer.isAnswering}
            onClick={() => void answer.accept(time.startsAt)}
          >
            {t("acceptTime", {
              time: `${formatDayMonth(time.startsAt, locale)} · ${formatTurkishTime(time.startsAt, locale)}`,
            })}
          </Button>
        ))
      )}
    </>
  );
}

/** "Talebi geri çek" on an Office Hours request still waiting for the academician, and its confirmation. */
export function OfficeHoursWithdrawAction({
  appointment,
}: {
  appointment: Appointment;
}) {
  const t = useTranslations("iaStudent.officeHours.withdraw");
  const withdraw = useOfficeHoursWithdraw(appointment);
  const titleId = `office-hours-withdraw-${appointment.id}`;
  return (
    <>
      <Button
        variant={ButtonVariant.Ghost}
        size={ButtonSize.Small}
        onClick={withdraw.open}
      >
        {t("button")}
      </Button>
      {/* TEST UI: placeholder until the design team's screen; replace when it arrives. */}
      {withdraw.isOpen ? (
        <ModalDialog
          labelledBy={titleId}
          onClose={withdraw.close}
          panelClassName="flex w-full max-w-[480px] flex-col gap-5 rounded-[28px] bg-background-surface p-7 shadow-modal outline-none"
        >
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="type-h3 text-text-primary">
              {t("title")}
            </h2>
            <p className="type-body-sm text-text-secondary">
              {t("body", { name: withdraw.counterpartName })}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant={ButtonVariant.Secondary}
              disabled={withdraw.isWithdrawing}
              onClick={withdraw.close}
            >
              {t("keep")}
            </Button>
            <Button
              disabled={withdraw.isWithdrawing}
              onClick={() => void withdraw.confirm()}
            >
              {t("button")}
            </Button>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
