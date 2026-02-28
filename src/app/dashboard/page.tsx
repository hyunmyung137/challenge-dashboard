import Header from "@/components/layout/Header";
import PortfolioHero from "@/components/dashboard/PortfolioHero";
import DailyPNLChart from "@/components/dashboard/DailyPNLChart";
import MetricsRow from "@/components/dashboard/MetricsRow";
import PositionCards from "@/components/dashboard/PositionCards";
import PNLHistoryTable from "@/components/dashboard/PNLHistoryTable";

export default function DashboardPage() {
  return (
    <>
      <Header title="PNL Dashboard" />
      <div className="flex-1 p-6 flex flex-col gap-5">
        <PortfolioHero />
        <DailyPNLChart />
        <MetricsRow />
        <PositionCards />
        <PNLHistoryTable />
      </div>
    </>
  );
}
