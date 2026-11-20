import { useTranslations } from "next-intl";
import Link from "next/link";

/**
 * The "hocam by menton" wordmark every workspace header uses (Figma "Logo / menton" in 452:6748). The design draws
 * it as Manrope text, not an image, so it stays live text here too.
 */
export function MentonWordmark({ href = "/" }: { href?: string }) {
  const t = useTranslations("sharedUi");
  return (
    <Link
      href={href}
      aria-label={t("homeLabel")}
      className="flex w-[104px] shrink-0 flex-col items-end font-display font-bold"
    >
      <span className="w-full text-[32px] leading-[25px] tracking-[-0.48px] text-status-error-icon">
        {t("wordmark")}
      </span>
      <span className="text-[10.33px] leading-[13px] tracking-[-0.15px] text-border-strong">
        {t.rich("wordmarkBy", {
          light: (chunks) => <span className="font-light">{chunks}</span>,
        })}
      </span>
    </Link>
  );
}
