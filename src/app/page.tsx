import { DashboardDataView } from "@/components/dashboard/DashboardDataView";
import { MacroSnapshot } from "@/components/dashboard/MacroSnapshot";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <MacroSnapshot asOf={new Date()} />
      <DashboardDataView layout={DEFAULT_DASHBOARD_LAYOUT} />
    </>
  );
}
