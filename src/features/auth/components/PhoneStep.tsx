import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { SAPhone } from "@/lib/phone";

import { authErrorMessage, OFFLINE_MESSAGE, sendCode } from "../api";
import { parsePhoneField, PHONE_ERROR } from "../schema";

export function PhoneStep({
  initial,
  onSent,
}: {
  initial: string;
  onSent: (phone: SAPhone, typed: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const phone = parsePhoneField(value);
    if (!phone) {
      setError(PHONE_ERROR);
      return;
    }
    if (!navigator.onLine) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    setError(undefined);
    setSending(true);
    try {
      await sendCode(phone.e164);
      onSent(phone, value);
    } catch (err) {
      setError(authErrorMessage(err, "send"));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Input
        label="Mobile number"
        prefix="+27"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="082 123 4567"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
      />
      <Button type="submit" fullWidth loading={sending} loadingLabel="Sending">
        Send code
      </Button>
    </form>
  );
}
