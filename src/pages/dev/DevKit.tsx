import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ListRow } from "@/components/ui/ListRow";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { StatusTag } from "@/components/ui/StatusTag";
import { formatMoney } from "@/lib/money";
import { queryKeys } from "@/lib/queryKeys";
import { paths } from "@/router/paths";
import { supabase } from "@/lib/supabase";

const sampleAmounts = [0, 5000, 120000, 125050, -5000, 123456789];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line py-6">
      <h2 className="text-body font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function SupabaseLine() {
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.dev.supabaseSession,
    queryFn: async () => {
      const { error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      return "Connected";
    },
    retry: false,
  });
  const text = isPending ? "Checking" : error ? `Error: ${error.message}` : data;
  return (
    <p className="text-body">
      Supabase connection: <span className="font-semibold">{text}</span>
    </p>
  );
}

export default function DevKit() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto max-w-2xl px-gutter pb-16">
      <PageHeader title="Development kit" />
      <p className="text-secondary text-ink-muted">Development builds only.</p>

      <Section title="Connection">
        <SupabaseLine />
        <Link
          className="inline-flex min-h-12 items-center justify-center self-start rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink"
          to={paths.tenant.replace("$token", "preview")}
        >
          Preview tenant page
        </Link>
        <p className="money text-body">
          Money: {sampleAmounts.map((c) => formatMoney(c)).join("  |  ")}
        </p>
        <p className="money text-body">
          Receipt format: {formatMoney(120000, { showCents: "always" })}
        </p>
      </Section>

      <Section title="Typography">
        <p className="text-title font-semibold">Page title 24px</p>
        <p className="money text-title font-semibold">{formatMoney(1250050)}</p>
        <p className="text-body">Body text 16px</p>
        <p className="text-secondary text-ink-muted">Secondary text 14px</p>
      </Section>

      <Section title="Button">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
        <Button disabled>Disabled primary</Button>
        <Button variant="secondary" disabled>
          Disabled secondary
        </Button>
        <Button
          loading={loading}
          loadingLabel="Saving"
          onClick={() => {
            setLoading(true);
            window.setTimeout(() => setLoading(false), 1500);
          }}
        >
          Save (tap to see loading)
        </Button>
        <Button loading loadingLabel="Saving" variant="secondary">
          Save
        </Button>
        <Button variant="secondary" fullWidth>
          Remove tenant
        </Button>
      </Section>

      <Section title="Input">
        <Input label="Room name" placeholder="Room 1" />
        <Input label="Monthly rent" prefix="R" inputMode="decimal" helper="For example 1 200" />
        <Input label="Phone number" inputMode="tel" error="A mobile number has 10 digits" />
        <Input label="Disabled" disabled defaultValue="Not editable" />
      </Section>

      <Section title="Select">
        <Select
          label="Due day"
          defaultValue=""
          placeholder="Choose a day"
          options={[
            { value: "1", label: "1st of the month" },
            { value: "25", label: "25th of the month" },
          ]}
        />
        <Select
          label="With error"
          error="Choose a due day"
          options={[{ value: "1", label: "1st of the month" }]}
        />
      </Section>

      <Section title="Card">
        <Card>
          <p className="text-secondary text-ink-muted">Card</p>
          <p className="money text-title font-semibold">{formatMoney(240000)}</p>
        </Card>
      </Section>

      <Section title="ListRow">
        <ul className="divide-y divide-line border-y border-line">
          <ListRow primary="Primary only" />
          <ListRow primary="With secondary" secondary="Secondary text" />
          <ListRow
            primary="With trailing"
            secondary="Secondary text"
            trailing={<span className="money">{formatMoney(120000)}</span>}
          />
          <ListRow primary="With chevron" chevron onClick={() => undefined} />
          <ListRow
            primary="Everything"
            secondary="Secondary"
            trailing={<StatusTag status="paid" />}
            chevron
            onClick={() => undefined}
          />
        </ul>
      </Section>

      <Section title="StatusTag">
        <div className="flex flex-wrap gap-2">
          <StatusTag status="paid" />
          <StatusTag status="part_paid" />
          <StatusTag status="late" />
          <StatusTag status="not_due" />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          message="There is nothing here yet."
          actionLabel="Add something"
          onAction={() => undefined}
        />
      </Section>

      <Section title="Sheet">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Example sheet"
          description="Bottom sheet on phones, centred on wider screens."
        >
          <div className="flex flex-col gap-4">
            <Input label="Amount" prefix="R" inputMode="decimal" />
            <Button fullWidth onClick={() => setSheetOpen(false)}>
              Done
            </Button>
          </div>
        </Sheet>
      </Section>
    </main>
  );
}
