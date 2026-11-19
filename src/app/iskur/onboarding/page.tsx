import { getTranslations } from "next-intl/server";

import { IskurOnboardingView } from "@/components/iskur/onboarding-view";

export async function generateMetadata() {
  const t = await getTranslations("iskurOnboarding.steps");
  return { title: t("label") };
}

export default function IskurOnboardingPage() {
  return <IskurOnboardingView />;
}
