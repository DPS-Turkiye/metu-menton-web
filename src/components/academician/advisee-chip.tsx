import { useTranslations } from "next-intl";

/** "Danışanın": the student is one of the academician's advisees in ODTÜ's record. */
export function AdviseeChip() {
  const t = useTranslations("iaAcademician.common");
  return (
    <span className="inline-flex h-8 items-center rounded-full bg-background-selected px-3 type-label-sm text-text-accent">
      {t("advisee")}
    </span>
  );
}
