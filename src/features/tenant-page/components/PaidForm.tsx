import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { composeTenantPaymentNotice } from "@/features/messaging/compose";
import { buildWhatsAppUrl } from "@/features/messaging/whatsapp";
import { Sheet } from "@/components/ui/Sheet";
import { formatMoney, toCents } from "@/lib/money";
import { todayInSA } from "@/lib/dates";
import type { TenantPaymentInfo } from "@/types/domain";

import { TenantNoticeError } from "../api";
import { useSubmitTenantPayment } from "../hooks";
import { createTenantPaymentSchema, type TenantPaymentFormValues } from "../schema";

const methodOptions = [
  { value: "eft", label: "EFT" },
  { value: "ewallet", label: "eWallet" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

export function PaidForm({
  open,
  onOpenChange,
  token,
  info,
  balanceCents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  info: TenantPaymentInfo;
  balanceCents: number;
}) {
  const today = todayInSA();
  const submitNotice = useSubmitTenantPayment();
  const [values, setValues] = useState<TenantPaymentFormValues>(() => ({
    amount: balanceCents > 0 ? (balanceCents / 100).toFixed(2) : "",
    paidOn: today,
    method: "eft",
    proof: null,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [sentValues, setSentValues] = useState<{ amountCents: number; paidOn: string } | null>(
    null,
  );
  const amountResult = createTenantPaymentSchema(today).shape.amount.safeParse(values.amount);
  const parsedAmount = amountResult.success ? toCents(amountResult.data) : null;
  const amountCents = parsedAmount?.ok ? parsedAmount.cents : 0;
  const whatsapp = useMemo(() => {
    if (!sentValues) return { url: "", error: "" };
    try {
      const message = composeTenantPaymentNotice(info, sentValues.amountCents, sentValues.paidOn);
      return { url: buildWhatsAppUrl(info.landlordPhone, message.text), error: "" };
    } catch (error) {
      return {
        url: "",
        error: error instanceof Error ? error.message : "The message could not be prepared.",
      };
    }
  }, [info, sentValues]);

  useEffect(() => {
    setValues((current) => ({
      ...current,
      amount: balanceCents > 0 ? (balanceCents / 100).toFixed(2) : current.amount,
    }));
  }, [balanceCents]);

  function updateField<K extends keyof TenantPaymentFormValues>(
    field: K,
    value: TenantPaymentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    setErrors({});
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setErrors({ root: "Could not send. Check your connection and try again." });
      return;
    }
    const result = createTenantPaymentSchema(today).safeParse(values);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && nextErrors[field] === undefined) {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }
    const parsedAmount = toCents(result.data.amount);
    if (!parsedAmount.ok) {
      setErrors({ amount: parsedAmount.error });
      return;
    }
    const amount = parsedAmount.cents;
    try {
      await submitNotice.mutateAsync({
        token,
        amountCents: amount,
        paidOn: result.data.paidOn,
        method: result.data.method,
        proof: result.data.proof,
      });
      setSentValues({ amountCents: amount, paidOn: result.data.paidOn });
      setSuccess(true);
    } catch (error) {
      setErrors({
        root:
          error instanceof TenantNoticeError
            ? error.message
            : "Could not send. Check your connection and try again.",
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="I’ve paid">
      <div className="space-y-4">
        {success ? (
          <div className="space-y-3">
            <p role="status" className="text-body text-ink">
              Thank you. Your landlord will check and confirm this payment.
            </p>
            {whatsapp.url ? (
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-sm border border-line-strong bg-ground px-4 text-body font-semibold text-ink"
                href={whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tell your landlord on WhatsApp
              </a>
            ) : (
              whatsapp.error && (
                <p role="alert" className="text-secondary text-ink">
                  {whatsapp.error}
                </p>
              )
            )}
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <Input
              label="Amount"
              prefix="R"
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              error={errors["amount"]}
            />
            {amountCents > 0 && (
              <p className="text-secondary text-ink-muted">Amount: {formatMoney(amountCents)}</p>
            )}
            <Input
              label="Date paid"
              type="date"
              max={today}
              value={values.paidOn}
              onChange={(event) => updateField("paidOn", event.target.value)}
              error={errors["paidOn"]}
            />
            <Select
              label="Method"
              value={values.method}
              onChange={(event) =>
                updateField("method", event.target.value as TenantPaymentFormValues["method"])
              }
              options={methodOptions}
              error={errors["method"]}
            />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="tenant-payment-proof"
                className="text-secondary font-semibold text-ink"
              >
                Proof (optional)
              </label>
              <input
                id="tenant-payment-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => updateField("proof", event.currentTarget.files?.[0] ?? null)}
                className="min-h-12 w-full rounded-sm border border-line bg-surface p-2 text-body text-ink"
              />
              {errors["proof"] && (
                <p className="text-secondary font-semibold text-ink">{errors["proof"]}</p>
              )}
              <p className="text-secondary text-ink-muted">
                Choose a photo or PDF under 2 MB after preparation.
              </p>
            </div>
            {errors["root"] && (
              <p role="alert" className="text-secondary font-semibold text-ink">
                {errors["root"]}
              </p>
            )}
            <Button fullWidth type="submit" loading={submitNotice.isPending} loadingLabel="Sending">
              Tell my landlord
            </Button>
          </form>
        )}
      </div>
    </Sheet>
  );
}
