import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatMoney, toCents } from "@/lib/money";
import { todayInSA } from "@/lib/dates";
import type { Payment } from "@/types/domain";

import { useCreatePayment } from "../hooks";
import { createPaymentSchema, paymentPayload, type PaymentFormValues } from "../schema";

interface PaymentFormProps {
  tenantId: string;
  landlordId: string;
  balanceCents: number;
  payments: Payment[];
  onSaved: (payment: Payment) => void;
}

const methodOptions = [
  { value: "cash", label: "Cash" },
  { value: "eft", label: "EFT" },
  { value: "ewallet", label: "eWallet" },
  { value: "other", label: "Other" },
];

export function PaymentForm({
  tenantId,
  landlordId,
  balanceCents,
  payments,
  onSaved,
}: PaymentFormProps) {
  const today = todayInSA();
  const schema = createPaymentSchema(today);
  const create = useCreatePayment();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceCents > 0 ? String(balanceCents / 100) : "",
      paidOn: today,
      method: "cash",
      proof: null,
    },
  });
  const amount = form.watch("amount");
  const paidOn = form.watch("paidOn");
  const amountCents = toCents(amount);
  const warningBalance =
    balanceCents < 0 ? `credit ${formatMoney(Math.abs(balanceCents))}` : formatMoney(balanceCents);
  const duplicate =
    amountCents.ok &&
    payments.some(
      (payment) =>
        payment.status === "confirmed" &&
        payment.voided_at === null &&
        payment.amount_cents === amountCents.cents &&
        payment.paid_on === paidOn,
    );

  async function submit(values: PaymentFormValues) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      form.setError("root", {
        message: "You are offline. Connect to the internet to record a payment.",
      });
      return;
    }
    try {
      const payload = paymentPayload(values);
      const payment = await create.mutateAsync({
        tenantId,
        landlordId,
        amountCents: payload.amount_cents,
        paidOn: payload.paid_on,
        method: payload.method,
        proof: values.proof,
      });
      onSaved(payment);
    } catch {
      form.setError("root", {
        message:
          typeof navigator !== "undefined" && !navigator.onLine
            ? "You are offline. Connect to the internet to record a payment."
            : "Could not save the payment. Try again.",
      });
    }
  }

  const proofRegistration = form.register("proof");
  return (
    <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
      <Input
        label="Amount"
        inputMode="decimal"
        prefix="R"
        autoComplete="off"
        {...form.register("amount")}
        error={form.formState.errors.amount?.message}
      />
      {amountCents.ok && amountCents.cents > Math.max(0, balanceCents) && (
        <p className="text-secondary text-ink">
          This is more than the balance of {warningBalance}. The extra will show as credit.
        </p>
      )}
      {duplicate && (
        <p className="text-secondary text-ink">
          A payment of this amount on this date is already recorded.
        </p>
      )}
      <Input
        label="Date paid"
        type="date"
        max={today}
        {...form.register("paidOn")}
        error={form.formState.errors.paidOn?.message}
      />
      <Select
        label="Method"
        options={methodOptions}
        {...form.register("method")}
        error={form.formState.errors.method?.message}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="payment-proof" className="text-secondary font-semibold text-ink">
          Proof (optional)
        </label>
        <input
          {...proofRegistration}
          id="payment-proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => {
            form.setValue("proof", event.currentTarget.files?.[0] ?? null, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
          className="min-h-12 w-full rounded-sm border border-line bg-surface p-2 text-body text-ink"
        />
        {form.formState.errors.proof?.message && (
          <p className="text-secondary font-semibold text-ink">
            {form.formState.errors.proof.message}
          </p>
        )}
      </div>
      {form.formState.errors.root?.message && (
        <p role="alert" className="text-secondary font-semibold text-ink">
          {form.formState.errors.root.message}
        </p>
      )}
      <Button fullWidth type="submit" loading={create.isPending} loadingLabel="Saving">
        Save payment
      </Button>
    </form>
  );
}
