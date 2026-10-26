import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatMoney, toCents } from "@/lib/money";
import { todayInSA } from "@/lib/dates";
import type { Payment, PaymentMethod } from "@/types/domain";

import { createConfirmPaymentSchema } from "../schema";
import { Sheet } from "@/components/ui/Sheet";

const methodOptions = [
  { value: "cash", label: "Cash" },
  { value: "eft", label: "EFT" },
  { value: "ewallet", label: "eWallet" },
  { value: "other", label: "Other" },
];

export function ConfirmSheet({
  payment,
  open,
  saving,
  onOpenChange,
  onConfirm,
}: {
  payment: Payment;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: {
    amountCents: number;
    paidOn: string;
    method: PaymentMethod;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState((payment.amount_cents / 100).toFixed(2));
  const [paidOn, setPaidOn] = useState(payment.paid_on);
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [error, setError] = useState("");
  const today = todayInSA();

  useEffect(() => {
    if (open) {
      setAmount((payment.amount_cents / 100).toFixed(2));
      setPaidOn(payment.paid_on);
      setMethod(payment.method);
      setError("");
    }
  }, [open, payment.amount_cents, payment.method, payment.paid_on]);

  const cents = toCents(amount);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createConfirmPaymentSchema(today).safeParse({ amount, paidOn, method });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the payment details.");
      return;
    }
    if (!cents.ok) {
      setError(cents.error);
      return;
    }
    setError("");
    try {
      await onConfirm({
        amountCents: cents.cents,
        paidOn: result.data.paidOn,
        method: result.data.method,
      });
      onOpenChange(false);
    } catch {
      setError("The payment could not be confirmed. Refresh and try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Confirm payment">
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <p className="text-secondary text-ink-muted">
          Change these if what you received is different.
        </p>
        <Input
          label="Amount"
          prefix="R"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          helper={cents.ok && cents.cents > 0 ? `Current amount: ${formatMoney(cents.cents)}` : ""}
        />
        <Input
          label="Date paid"
          type="date"
          max={today}
          value={paidOn}
          onChange={(event) => setPaidOn(event.target.value)}
        />
        <Select
          label="Method"
          value={method}
          onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          options={methodOptions}
        />
        {error && (
          <p role="alert" className="text-secondary font-semibold text-ink">
            {error}
          </p>
        )}
        <Button fullWidth type="submit" loading={saving} loadingLabel="Confirming">
          Confirm payment
        </Button>
      </form>
    </Sheet>
  );
}
