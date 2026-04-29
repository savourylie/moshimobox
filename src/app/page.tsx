import { DashboardDataView } from "@/components/dashboard/DashboardDataView";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/domain/seeds";

export default function HomePage() {
  return <DashboardDataView layout={DEFAULT_DASHBOARD_LAYOUT} />;
}
