import { OfficeHoursBookingView } from "@/components/student/office-hours-booking-view";

export default async function StudentOfficeHoursBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ academicianId: string }>;
  searchParams: Promise<{ slot?: string | string[] }>;
}) {
  const { academicianId } = await params;
  const { slot } = await searchParams;
  return (
    <OfficeHoursBookingView
      academicianId={academicianId}
      slot={typeof slot === "string" ? slot : null}
    />
  );
}
