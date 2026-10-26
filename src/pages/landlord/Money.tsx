import { PageHeader } from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/ActionTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChartNoAxesCombined, ClipboardCheck, Droplets } from "lucide-react";
import { paths } from "@/router/paths";

export default function Money() {
  return (
    <>
      <PageHeader title="Money" />
      <section>
        <SectionHeader title="Records and reports" />
        <div className="grid grid-cols-2 gap-3">
          <ActionTile icon={ChartNoAxesCombined} label="Monthly income" to={paths.incomeReport} />
          <ActionTile icon={ClipboardCheck} label="Payments to review" to={paths.pendingPayments} />
          <ActionTile icon={Droplets} label="Utilities" to={paths.utilityList} />
        </div>
      </section>
    </>
  );
}
