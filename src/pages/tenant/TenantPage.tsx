import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { InitialsTile } from "@/components/ui/InitialsTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BalanceBlock } from "@/features/charges/components/BalanceBlock";
import { daysLate } from "@/features/charges/balance";
import { PublicTenantReceipts } from "@/features/tenants/components/PublicTenantReceipts";
import { usePublicTenantPage, usePublicTenantReceipts } from "@/features/tenants/hooks";
import type { PublicTenantPage, PublicTenantReceipt } from "@/features/tenants/api";
import { formatShortDate, todayInSA } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { parseSAPhone } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { HowToPay } from "@/features/tenant-page/components/HowToPay";
import { InvalidLink } from "@/features/tenant-page/components/InvalidLink";
import { PaidForm } from "@/features/tenant-page/components/PaidForm";
import { SubmissionsList } from "@/features/tenant-page/components/SubmissionsList";
import { ChargesList } from "@/features/tenant-page/components/ChargesList";
import { usePublicTenantCharges, useTenantPaymentInfo } from "@/features/tenant-page/hooks";
import type { TenantPaymentInfo } from "@/types/domain";
import type { PublicTenantCharge } from "@/features/tenant-page/charges";

const previewTenant: PublicTenantPage = {
  tenant_name: "Ava Ndlovu",
  move_in_date: "2026-01-01",
  move_out_date: null,
  room_name: "Room 2",
  property_name: "Ndlovu Yard",
  monthly_rent_cents: 120_000,
  due_day: 1,
  balance_cents: 60_000,
  overdue_cents: 0,
  paid_this_month_cents: 60_000,
  oldest_unpaid_due_date: "2026-10-01",
  payment_status: "part_paid",
  landlord_name: "Thandi Ndlovu",
  landlord_phone: "+27821234567",
  property_address: "12 Main Road",
};

const previewReceipts: PublicTenantReceipt[] = [
  {
    paid_on: "2026-10-10",
    created_at: "2026-10-10T12:00:00+02:00",
    amount_cents: 60_000,
    method: "eft",
    receipt_number: "YD-00012",
    balance_after_cents: 60_000,
  },
];

const previewPaymentInfo: TenantPaymentInfo = {
  tenantName: "Ava Ndlovu",
  language: "en",
  roomName: "Room 2",
  bankDetails: "Bank: Demo Bank\nAccount holder: Thandi Ndlovu\nAccount number: 123456789",
  landlordName: "Thandi Ndlovu",
  landlordPhone: "+27821234567",
  submissions: [],
};

const previewCharges: PublicTenantCharge[] = [
  {
    id: "rent-preview",
    type: "rent",
    period: "2026-10",
    amountCents: 120_000,
    dueDate: "2026-10-01",
    note: null,
  },
  {
    id: "electricity-preview",
    type: "electricity",
    period: "2026-10",
    amountCents: 36_000,
    dueDate: "2026-10-08",
    note: "Your share of the R1 800 electricity bill for October 2026, split equally between 4 rooms and the main house.",
  },
];

export default function TenantPage() {
  const { token = "" } = useParams({ strict: false });
  const preview = import.meta.env.DEV && token === "preview";
  const [paidFormOpen, setPaidFormOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);
  const tenantQuery = usePublicTenantPage(preview ? "" : token);
  const receiptsQuery = usePublicTenantReceipts(preview ? "" : token);
  const paymentInfoQuery = useTenantPaymentInfo(preview ? "" : token);
  const chargesQuery = usePublicTenantCharges(preview ? "" : token);
  const tenant = preview ? previewTenant : tenantQuery.data;
  const receipts = preview ? previewReceipts : (receiptsQuery.data ?? []);
  const paymentInfo = preview ? previewPaymentInfo : paymentInfoQuery.data;
  const landlordPhone = tenant ? parseSAPhone(tenant.landlord_phone) : null;
  const whatsappHref =
    tenant && landlordPhone?.ok
      ? `https://wa.me/${landlordPhone.phone.whatsapp}?text=${encodeURIComponent(
          `Hello ${tenant.landlord_name}, I have a question about my rent.`,
        )}`
      : null;

  return (
    <>
      <PageHeader title="Your rent" />
      {!preview && !isOnline ? (
        <p role="alert" className="py-6 text-body text-ink">
          You are offline. Connect to the internet to see your balance.
        </p>
      ) : !preview && (tenantQuery.isPending || paymentInfoQuery.isPending) ? (
        <p className="py-6 text-body text-ink-muted">Loading your details...</p>
      ) : !preview && (tenantQuery.isError || paymentInfoQuery.isError) ? (
        <p role="alert" className="py-6 text-body text-ink">
          Your details could not be loaded. Check your connection and try again.
        </p>
      ) : !tenant || !paymentInfo ? (
        <InvalidLink />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <InitialsTile name={tenant.tenant_name} size={48} />
            <p className="text-body font-semibold text-ink">Hello, {tenant.tenant_name}.</p>
          </div>
          <section className="space-y-3 rounded-md border border-line bg-surface p-4">
            <DetailLine label="Property">{tenant.property_name}</DetailLine>
            <DetailLine label="Room">{tenant.room_name}</DetailLine>
            <DetailLine label="Monthly rent">{formatMoney(tenant.monthly_rent_cents)}</DetailLine>
            <DetailLine label="Rent due day">{tenant.due_day} of each month</DetailLine>
            <DetailLine label="Move-in date">{formatShortDate(tenant.move_in_date)}</DetailLine>
            <DetailLine label="Paid this month">
              {formatMoney(tenant.paid_this_month_cents)}
            </DetailLine>
            {tenant.overdue_cents > 0 && (
              <DetailLine label="Overdue">{formatMoney(tenant.overdue_cents)}</DetailLine>
            )}
            {tenant.move_out_date && (
              <DetailLine label="Moved out">{formatShortDate(tenant.move_out_date)}</DetailLine>
            )}
          </section>
          <BalanceBlock
            balanceCents={tenant.balance_cents}
            status={tenant.payment_status}
            daysLate={
              tenant.payment_status === "late"
                ? daysLate(tenant.oldest_unpaid_due_date, todayInSA())
                : 0
            }
          />
          <ChargesList
            charges={preview ? previewCharges : (chargesQuery.data ?? [])}
            isPending={!preview && chargesQuery.isPending}
            isError={!preview && chargesQuery.isError}
          />
          <HowToPay info={paymentInfo} />
          {!preview && (
            <section>
              <Button onClick={() => setPaidFormOpen(true)}>I’ve paid</Button>
              <PaidForm
                open={paidFormOpen}
                onOpenChange={setPaidFormOpen}
                token={token}
                info={paymentInfo}
                balanceCents={tenant.balance_cents}
              />
            </section>
          )}
          <SubmissionsList info={paymentInfo} />
          <section className="space-y-3">
            <SectionHeader title="Contact your landlord" />
            <p className="text-secondary text-ink-muted">
              For questions about your rent, contact {tenant.landlord_name}.
            </p>
            <div className="flex flex-wrap gap-2">
              {whatsappHref && (
                <a
                  className="text-white inline-flex min-h-12 items-center justify-center rounded-sm bg-brand px-4 text-body font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp landlord
                </a>
              )}
              {landlordPhone?.ok && (
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink"
                  href={`tel:${landlordPhone.phone.e164}`}
                >
                  Call landlord
                </a>
              )}
            </div>
          </section>
          <PublicTenantReceipts
            tenant={tenant}
            receipts={receipts}
            isPending={!preview && receiptsQuery.isPending}
            isError={!preview && receiptsQuery.isError}
          />
        </div>
      )}
    </>
  );
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex items-baseline justify-between gap-4 text-body text-ink">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </p>
  );
}
