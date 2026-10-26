import { useNavigate, useParams } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentForm } from "@/features/payments/components/PaymentForm";
import { useTenantBalances } from "@/features/charges/hooks";
import { useTenantPayments } from "@/features/payments/hooks";
import { useLandlord } from "@/features/auth/hooks";
import { useTenant } from "@/features/tenants/hooks";
import { paths } from "@/router/paths";

export default function RecordPayment() {
  const { tenantId = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const tenant = useTenant(tenantId);
  const landlord = useLandlord();
  const balances = useTenantBalances();
  const payments = useTenantPayments(tenantId);
  const balance = (balances.data ?? []).find((item) => item.tenantId === tenantId);

  if (tenant.isPending || landlord.isPending || balances.isPending || payments.isPending) {
    return (
      <>
        <PageHeader
          title="Record payment"
          backTo={paths.tenantDetail.replace("$tenantId", tenantId)}
        />
        <p className="py-6 text-body text-ink-muted">Loading payment details...</p>
      </>
    );
  }
  if (
    tenant.isError ||
    !tenant.data ||
    landlord.isError ||
    !landlord.data ||
    balances.isError ||
    payments.isError
  ) {
    return (
      <>
        <PageHeader
          title="Record payment"
          backTo={paths.tenantDetail.replace("$tenantId", tenantId)}
        />
        <p role="alert" className="py-6 text-body text-ink">
          Payment details could not be loaded. Check your connection and try again.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Record payment"
        backTo={paths.tenantDetail.replace("$tenantId", tenantId)}
      />
      <p className="mb-4 text-body text-ink">{tenant.data.name}</p>
      <PaymentForm
        tenantId={tenantId}
        landlordId={landlord.data.id}
        balanceCents={balance?.balanceCents ?? 0}
        payments={payments.data ?? []}
        onSaved={(payment) => {
          void navigate({
            to: paths.paymentDetail
              .replace("$tenantId", tenantId)
              .replace("$paymentId", payment.id),
            search: { recorded: "1" },
          });
        }}
      />
    </>
  );
}
