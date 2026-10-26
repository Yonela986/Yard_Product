import { useState } from "react";
import { useParams, useSearch } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentDetailView } from "@/features/payments/components/PaymentDetailView";
import type { ReceiptContext } from "@/features/payments/components/ReceiptActions";
import { buildStatement } from "@/features/charges/balance";
import { useTenantCharges } from "@/features/charges/hooks";
import {
  useConfirmPendingPayment,
  useDeclinePendingPayment,
  usePayment,
  useTenantPayments,
  useVoidPayment,
} from "@/features/payments/hooks";
import { useLandlord } from "@/features/auth/hooks";
import { useProperty, useRoom } from "@/features/rooms/hooks";
import { useTenant } from "@/features/tenants/hooks";
import { paths } from "@/router/paths";

export default function PaymentDetail() {
  const { tenantId = "", paymentId = "" } = useParams({ strict: false });
  const search = useSearch({ strict: false });
  const tenant = useTenant(tenantId);
  const payment = usePayment(tenantId, paymentId);
  const charges = useTenantCharges(tenantId);
  const payments = useTenantPayments(tenantId);
  const room = useRoom(tenant.data?.room_id ?? "");
  const property = useProperty();
  const landlord = useLandlord();
  const voidMutation = useVoidPayment(tenantId);
  const confirmMutation = useConfirmPendingPayment(tenantId);
  const declineMutation = useDeclinePendingPayment(tenantId);
  const [voidSheetOpen, setVoidSheetOpen] = useState(false);

  if (
    tenant.isPending ||
    payment.isPending ||
    charges.isPending ||
    payments.isPending ||
    (tenant.data !== null && tenant.data !== undefined && room.isPending) ||
    property.isPending ||
    landlord.isPending
  ) {
    return (
      <>
        <PageHeader title="Payment" backTo={paths.tenantDetail.replace("$tenantId", tenantId)} />
        <p className="py-6 text-body text-ink-muted">Loading payment details...</p>
      </>
    );
  }
  if (
    tenant.isError ||
    !tenant.data ||
    payment.isError ||
    !payment.data ||
    charges.isError ||
    payments.isError ||
    room.isError ||
    !room.data ||
    property.isError ||
    !property.data ||
    landlord.isError ||
    !landlord.data
  ) {
    return (
      <>
        <PageHeader title="Payment" backTo={paths.tenantDetail.replace("$tenantId", tenantId)} />
        <p role="alert" className="py-6 text-body text-ink">
          Payment details could not be loaded. Check your connection or return to the tenant.
        </p>
      </>
    );
  }

  const statement = buildStatement(charges.data ?? [], payments.data ?? []);
  const paymentRecord = payment.data;
  const tenantRecord = tenant.data;
  const roomRecord = room.data;
  const propertyRecord = property.data;
  const landlordRecord = landlord.data;
  const line = statement.find((item) => item.kind === "payment" && item.id === paymentRecord.id);
  const isConfirmed = paymentRecord.status === "confirmed";
  const receiptContext: ReceiptContext | null =
    isConfirmed && line && paymentRecord.receipt_number
      ? {
          payment: paymentRecord,
          tenant: tenantRecord,
          room: roomRecord,
          property: propertyRecord,
          landlord: landlordRecord,
          statement,
        }
      : null;

  return (
    <>
      <PageHeader title="Payment" backTo={paths.tenantDetail.replace("$tenantId", tenantId)} />
      <PaymentDetailView
        payment={paymentRecord}
        receiptContext={receiptContext}
        statement={statement}
        recorded={search.recorded === "1"}
        voidSheetOpen={voidSheetOpen}
        voiding={voidMutation.isPending}
        onVoidSheetOpenChange={setVoidSheetOpen}
        onVoid={async (reason) => {
          await voidMutation.mutateAsync({ paymentId, reason });
        }}
        confirming={confirmMutation.isPending}
        declining={declineMutation.isPending}
        onConfirm={async (input) => {
          await confirmMutation.mutateAsync({ paymentId, ...input });
        }}
        onDecline={async (reason) => {
          await declineMutation.mutateAsync({ paymentId, reason });
        }}
      />
    </>
  );
}
