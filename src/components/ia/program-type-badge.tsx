import { useTranslations } from "next-intl";
import Image from "next/image";

import { ProgramFeature, ProgramType } from "@/interfaces/program";
import { programFeaturesOf } from "@/lib/program-features";

export const PROGRAM_TYPE_ICONS: Record<ProgramType, string> = {
  [ProgramType.StartupMentoring]: "/ia/icons/startup-mentoring.svg",
  [ProgramType.PeerMentoring]: "/ia/icons/peer-mentoring.svg",
  [ProgramType.OfficeHours]: "/ia/icons/office-hours.svg",
  [ProgramType.Semester]: "/ia/icons/calendar-small.svg",
};

/** The neutral program-type label with its icon (Figma "Program Type Badge"). */
export function ProgramTypeBadge({ type }: { type: ProgramType }) {
  const t = useTranslations("programTypes");
  return (
    <span className="inline-flex h-7 w-fit items-center gap-1 rounded-full bg-background-muted pr-3 pl-2.5 whitespace-nowrap type-label-sm text-text-primary">
      <Image alt="" src={PROGRAM_TYPE_ICONS[type]} width={16} height={16} />
      {t(type)}
    </span>
  );
}

const PROGRAM_FEATURE_ICONS: Record<ProgramFeature, string> = {
  [ProgramFeature.PeerMentoring]: "/ia/icons/peer-mentoring.svg",
  [ProgramFeature.OfficeHours]: "/ia/icons/office-hours.svg",
  [ProgramFeature.Iskur]: "/ia/icons/startup-mentoring.svg",
};

/** One feature of a semester, in the type badge's look. */
export function ProgramFeatureBadge({ feature }: { feature: ProgramFeature }) {
  const t = useTranslations("programFeatures.names");
  return (
    <span className="inline-flex h-7 w-fit items-center gap-1 rounded-full bg-background-muted pr-3 pl-2.5 whitespace-nowrap type-label-sm text-text-primary">
      <Image
        alt=""
        src={PROGRAM_FEATURE_ICONS[feature]}
        width={16}
        height={16}
      />
      {t(feature)}
    </span>
  );
}

/** What a program runs: a semester's feature badges, or the type badge of any other program. */
export function ProgramKindBadges({
  program,
}: {
  program: {
    type: ProgramType;
    features?: readonly ProgramFeature[] | null | undefined;
  };
}) {
  if (program.type !== ProgramType.Semester) {
    return <ProgramTypeBadge type={program.type} />;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {programFeaturesOf(program).map((feature) => (
        <ProgramFeatureBadge key={feature} feature={feature} />
      ))}
    </span>
  );
}
