import { daysLate, deriveStatus } from "@/features/charges/balance";
import { tenantLink } from "@/lib/links";
import type {
  Language,
  MessageKind,
  Payment,
  ReminderWording,
  Room,
  Tenant,
  TenantBalance,
  TenantPaymentInfo,
} from "@/types/domain";

import {
  daysPhrase,
  MESSAGE_TEMPLATES,
  TEMPLATE_KIND,
  type LoggedMessageTemplate,
} from "./templates";
import { renderTemplate } from "./render";

export interface ComposedMessage {
  kind: MessageKind;
  language: Language;
  text: string;
  template: LoggedMessageTemplate;
}

export function composeWelcome(
  tenant: Tenant,
  room: Room,
  language: Language = tenant.language,
): ComposedMessage {
  return compose("welcome", language, {
    name: tenant.name,
    room: room.name,
    link: tenantLink(tenant.access_token),
  });
}

export function composeReminder(
  tenant: Tenant,
  room: Room,
  balance: TenantBalance,
  wording: ReminderWording,
  today: string,
  language: Language = tenant.language,
): ComposedMessage {
  if (balance.balanceCents <= 0) throw new Error("A reminder is only available for a balance owed");
  if (!balance.oldestUnpaidDueDate) {
    throw new Error("The next unpaid due date is not available for this tenant");
  }
  const status = deriveStatus(balance);
  if (status === "late") {
    const template = wording === "firm" ? "firmReminder" : "gentleLateReminder";
    return compose(template, language, {
      name: tenant.name,
      room: room.name,
      amount: balance.balanceCents,
      due_date: balance.oldestUnpaidDueDate,
      days_phrase: daysPhrase(language, Math.max(1, daysLate(balance.oldestUnpaidDueDate, today))),
    });
  }
  return compose("friendlyReminder", language, {
    name: tenant.name,
    room: room.name,
    amount: balance.balanceCents,
    due_date: balance.oldestUnpaidDueDate,
  });
}

export function composeReceipt(
  tenant: Tenant,
  room: Room,
  payment: Payment,
  language: Language = tenant.language,
): ComposedMessage {
  if (payment.status !== "confirmed" || payment.voided_at !== null) {
    throw new Error("A receipt message is only available for a confirmed, non-voided payment");
  }
  if (!payment.receipt_number) throw new Error("This payment does not have a receipt number");
  return compose("receipt", language, {
    name: tenant.name,
    room: room.name,
    amount: payment.amount_cents,
    date: payment.paid_on,
    receipt_number: payment.receipt_number,
    link: tenantLink(tenant.access_token),
  });
}

function compose(
  template: LoggedMessageTemplate,
  language: Language,
  variables: Parameters<typeof renderTemplate>[1],
): ComposedMessage {
  return {
    kind: TEMPLATE_KIND[template],
    language,
    text: renderTemplate(MESSAGE_TEMPLATES[template][language], variables),
    template,
  };
}

export function composeTenantPaymentNotice(
  tenant: Pick<TenantPaymentInfo, "tenantName" | "language" | "roomName" | "landlordName">,
  amountCents: number,
  paidOn: string,
): { language: Language; text: string } {
  return {
    language: tenant.language,
    text: renderTemplate(MESSAGE_TEMPLATES.tenantPaymentNotice[tenant.language], {
      name: tenant.tenantName,
      room: tenant.roomName,
      amount: amountCents,
      date: paidOn,
    }),
  };
}
