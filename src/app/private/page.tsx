import Header from "@/components/layout/Header";
import PortfolioHero from "@/components/dashboard/PortfolioHero";
import DailyPNLChart from "@/components/dashboard/DailyPNLChart";
import MetricsRow from "@/components/dashboard/MetricsRow";
import PositionCards from "@/components/dashboard/PositionCards";

export default function PrivateDashboardPage() {
  return (
    <>
      <Header title="Private Portfolio" />
      <div className="flex-1 p-6 flex flex-col gap-5">
        <PortfolioHero apiBase="/api/private" />
        <DailyPNLChart apiBase="/api/private" />
        <MetricsRow />
        <PositionCards apiBase="/api/private" />
      </div>
    </>
  );
}
