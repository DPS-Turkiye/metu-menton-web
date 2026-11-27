"use client";

import { useTranslations } from "next-intl";

import {
  TabLook,
  TabPanel,
  UnderlineTabs,
  ViewSwitch,
} from "@/components/student/iskur-ui";
import { PeerMentorDirectory } from "@/components/student/peer-mentor-directory";
import { PeerMentorGiveView } from "@/components/student/peer-mentor-give-view";
import { PeerMentoringRequests } from "@/components/student/peer-mentoring-requests";
import { usePeerMentorGate } from "@/hooks/use-peer-mentor-give";
import {
  usePeerMentoringSide,
  usePeerMentorshipCount,
  usePeerTakeTab,
} from "@/hooks/use-peer-mentoring";
import { AppointmentSide } from "@/interfaces/appointment";
import { PeerMentorGateState } from "@/interfaces/peer-mentoring";
import { PeerTakeTab } from "@/types/iskur-student";

const TAKE_TABS_ID = "peer-take";

/** Akran Mentörlüğü: Mentorluk Al (Keşfet, Aldığım mentorluklar), and Mentorluk Ver for peer mentors and future ones. */
export function PeerMentoringView() {
  const t = useTranslations("iaIskur.take");
  const { side: asked, setSide } = usePeerMentoringSide();
  const gate = usePeerMentorGate();
  // Mentorluk Ver is there for peer mentors and students who may become one; anyone else gets Mentorluk Al.
  const canGive = gate.state !== PeerMentorGateState.Hidden;
  const side = canGive ? asked : AppointmentSide.Mentee;

  return (
    <div className="space-y-6">
      {/* Figma 4.1 and 7.1 open on the tabs; the title stays for screen readers. */}
      <h1 className="sr-only">{t("title")}</h1>
      {canGive ? (
        <ViewSwitch
          label={t("switchLabel")}
          selected={side}
          onSelect={setSide}
          options={[
            { id: AppointmentSide.Mentee, label: t("switch.get") },
            {
              id: AppointmentSide.Mentor,
              label: t("switch.give"),
              tour: "peer-mentoring-give-toggle",
            },
          ]}
        />
      ) : null}
      {side === AppointmentSide.Mentee ? (
        <TakeSide nested={canGive} />
      ) : (
        <PeerMentorGiveView />
      )}
    </div>
  );
}

/**
 * Under the Al | Ver switch, Al's own tabs take Ver's smaller segment look (Figma 7.1), so they read as part of
 * Mentorluk Al rather than a third choice beside it. Without the switch they are the page's only tabs (Figma 4.1).
 */
function TakeSide({ nested }: { nested: boolean }) {
  const t = useTranslations("iaIskur.take.tabs");
  const take = usePeerTakeTab();
  const { tab, setTab } = take;
  const mineCount = usePeerMentorshipCount();
  return (
    <div className="space-y-7">
      <UnderlineTabs
        label={t("label")}
        idPrefix={TAKE_TABS_ID}
        look={nested ? TabLook.Segment : TabLook.Underline}
        selected={tab}
        onSelect={setTab}
        tabs={[
          { id: PeerTakeTab.Discover, label: t("discover") },
          {
            id: PeerTakeTab.Mine,
            label: t("mine"),
            ...(mineCount === undefined ? {} : { count: mineCount }),
          },
        ]}
      />
      <TabPanel
        idPrefix={TAKE_TABS_ID}
        id={PeerTakeTab.Discover}
        selected={tab === PeerTakeTab.Discover}
      >
        <PeerMentorDirectory
          key={take.discoverKey}
          focusSearch={take.focusSearch}
          onSearchFocused={take.searchFocused}
        />
      </TabPanel>
      <TabPanel
        idPrefix={TAKE_TABS_ID}
        id={PeerTakeTab.Mine}
        selected={tab === PeerTakeTab.Mine}
      >
        <PeerMentoringRequests onFindAnother={take.findAnother} />
      </TabPanel>
    </div>
  );
}
