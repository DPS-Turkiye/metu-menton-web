"use client";

import { useMemo, useState } from "react";

import { useAdminOverview } from "@/hooks/use-admin-overview";
import { useAdminProgramWizard } from "@/hooks/use-admin-program-wizard";
import {
  coordinatorLoads,
  matchesCoordinatorQuery,
  toggleCoordinator,
  type CoordinatorLoad,
} from "@/lib/admin-program-wizard";
import { choiceKey, removeChoice } from "@/lib/coordinator-picker";

/**
 * The ODTÜ "Yeni Program Oluştur" (Figma 152:7171–7375): the shared wizard, with the coordinator step as a list of
 * approved coordinators and how many programs each runs, searched by name or e-mail. New coordinators are added
 * under Kullanıcılar › Koordinatörler, so this list invites nobody.
 */
export function useOdtuProgramWizard() {
  const wizard = useAdminProgramWizard();
  const overview = useAdminOverview();
  const [query, setQuery] = useState("");
  const [moved, setMoved] = useState(false);

  const loads = useMemo(
    () => (overview.data ? coordinatorLoads(overview.data) : []),
    [overview.data],
  );
  const shown = useMemo(
    () => loads.filter((load) => matchesCoordinatorQuery(load, query)),
    [loads, query],
  );
  const chosenKeys = useMemo(
    () => new Set(wizard.draft.coordinators.map(choiceKey)),
    [wizard.draft.coordinators],
  );

  return {
    ...wizard,
    /** True once the admin has moved between steps; from then on each new step's heading takes focus. */
    moved,
    next: () => {
      setMoved(true);
      wizard.next();
    },
    back: () => {
      setMoved(true);
      wizard.back();
    },
    coordinators: {
      query,
      setQuery,
      loading: overview.isLoading,
      loadError: overview.isError,
      shown,
      isChosen: (load: CoordinatorLoad) => chosenKeys.has(load.id),
      toggle: (load: CoordinatorLoad) =>
        wizard.setCoordinators(
          toggleCoordinator(wizard.draft.coordinators, load),
        ),
      remove: (key: string) =>
        wizard.setCoordinators(removeChoice(wizard.draft.coordinators, key)),
    },
  };
}
