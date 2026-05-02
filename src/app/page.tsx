import { DashboardDataView } from "@/components/dashboard/DashboardDataView";
import { MacroSnapshot } from "@/components/dashboard/MacroSnapshot";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <MacroSnapshot asOf={new Date()} />
      <DashboardDataView />
    </>
  );
}
