"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

import { ModalDialog } from "@/components/common/modal-dialog";
import { Button, ButtonSize, ButtonVariant } from "@/components/ia/button";
import { useOfficeHoursCancel } from "@/hooks/use-student-office-hours";
import type { Appointment } from "@/interfaces/appointment";

/**
 * "Randevuyu iptal et" on a booked Office Hours meeting, and its confirmation (Figma 2.3.6, 235:3694). The academician
 * is told; the reason is optional for the student.
 */
export function OfficeHoursCancelAction({
  appointment,
}: {
  appointment: Appointment;
}) {
  const t = useTranslations("iaStudent.officeHours.cancel");
  const cancel = useOfficeHoursCancel(appointment);
  if (!cancel.canCancel) return null;
  const titleId = `office-hours-cancel-${appointment.id}`;
  const reasonId = `office-hours-cancel-reason-${appointment.id}`;
  return (
    <>
      <Button
        variant={ButtonVariant.Ghost}
        size={ButtonSize.Small}
        onClick={cancel.open}
      >
        {t("button")}
      </Button>
      {cancel.isOpen ? (
        <ModalDialog
          labelledBy={titleId}
          onClose={cancel.close}
          panelClassName="w-full max-w-[520px] rounded-[28px] bg-background-surface p-8 shadow-modal outline-none"
        >
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void cancel.confirm();
            }}
          >
            <span className="grid size-14 place-items-center rounded-full bg-background-selected">
              <Image
                alt=""
                src="/ia/icons/close-circle.svg"
                width={24}
                height={24}
              />
            </span>
            <div className="flex flex-col gap-2">
              <h2 id={titleId} className="type-h3 text-text-primary">
                {t("title")}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {t("body", { name: cancel.counterpartName })}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor={reasonId}
                className="type-label text-text-primary"
              >
                {t("reasonLabel")}
              </label>
              <textarea
                id={reasonId}
                value={cancel.reason}
                maxLength={cancel.reasonMax}
                rows={3}
                placeholder={t("reasonPlaceholder")}
                onChange={(event) => cancel.setReason(event.target.value)}
                className="w-full rounded-input border border-border-control bg-background-surface px-4 py-3 type-body text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-selected"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={ButtonVariant.Secondary}
                onClick={cancel.close}
                disabled={cancel.isCancelling}
                fullWidth
              >
                {t("keep")}
              </Button>
              <Button type="submit" disabled={cancel.isCancelling} fullWidth>
                {t("confirm")}
              </Button>
            </div>
          </form>
        </ModalDialog>
      ) : null}
    </>
  );
}
