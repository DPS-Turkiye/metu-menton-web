// TEST UI: placeholder until the design team's screen; replace when it arrives.
"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { ModalDialog } from "@/components/common/modal-dialog";
import { ProgramBlockers } from "@/components/common/program-blockers";
import { Button, ButtonVariant } from "@/components/ia/button";
import { InlineAlert } from "@/components/ia/inline-alert";
import { StatusTone } from "@/components/ia/status-badge";
import type { useStudentProgramMembership } from "@/hooks/use-student-program-membership";
import { MembershipAction } from "@/lib/admin-membership";

type Membership = ReturnType<typeof useStudentProgramMembership>;

/** "Programa ekle" / "Programdan çıkar" for one student: what changes, where to, and what keeps them, then confirm. */
export function StudentProgramDialog({
  membership,
}: {
  membership: Membership;
}) {
  const t = useTranslations("adminStudents.membership");
  const tStatus = useTranslations("odtuAdminPrograms.status");
  const titleId = useId();
  const selectId = useId();
  const target = membership.target;
  if (!target) return null;
  const removing = target.action === MembershipAction.Remove;
  const current = membership.membership?.current ?? null;

  return (
    <ModalDialog labelledBy={titleId} onClose={membership.close}>
      <h2 id={titleId} className="type-h4 text-text-primary">
        {t(removing ? "removeTitle" : "addTitle", {
          name: target.row.fullName,
        })}
      </h2>
      {membership.loading ? (
        <p role="status" className="type-body-sm text-text-muted">
          {t("loading")}
        </p>
      ) : null}
      {membership.loadError ? (
        <InlineAlert tone={StatusTone.Error}>
          {membership.loadError}
        </InlineAlert>
      ) : null}
      {membership.membership ? (
        <div className="space-y-3 type-body-sm text-text-secondary">
          <p>
            {current
              ? t(removing ? "removeNote" : "moveNote", {
                  current: current.name,
                })
              : t("notInSemester")}
          </p>
          {removing ? null : membership.targets.length === 0 ? (
            <p>{t("noTargets")}</p>
          ) : (
            <label htmlFor={selectId} className="block space-y-1.5">
              <span className="type-label text-text-primary">
                {t("target")}
              </span>
              <select
                id={selectId}
                value={membership.selectedId ?? ""}
                onChange={(event) => membership.select(event.target.value)}
                disabled={membership.saving}
                className="w-full rounded-input border border-border-control bg-background-surface px-4 py-3 type-body text-text-primary"
              >
                {membership.targets.map((program) => (
                  <option key={program.id} value={program.id}>
                    {t("targetOption", {
                      name: program.name,
                      status: tStatus(program.status),
                    })}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : null}
      {membership.blockers.length > 0 && current ? (
        <ProgramBlockers
          title={t("blocked", { current: current.name })}
          blockers={membership.blockers}
        />
      ) : null}
      {membership.error ? (
        <InlineAlert tone={StatusTone.Error}>{membership.error}</InlineAlert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant={ButtonVariant.Ghost}
          onClick={membership.close}
          disabled={membership.saving}
        >
          {t("cancel")}
        </Button>
        <Button
          onClick={membership.confirm}
          disabled={!membership.canConfirm || membership.saving}
        >
          {t(target.action)}
        </Button>
      </div>
    </ModalDialog>
  );
}
