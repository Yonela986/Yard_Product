import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { parseSAPhone } from "@/lib/phone";
import { PAYMENT_METHOD_LABELS } from "@/types/domain";
import type {
  Landlord,
  Payment,
  Property,
  ReceiptData,
  Room,
  StatementLine,
  Tenant,
} from "@/types/domain";

function dateInSA(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function buildReceiptData(
  payment: Payment,
  tenant: Tenant,
  room: Room,
  property: Property,
  landlord: Landlord,
  statement: StatementLine[],
): ReceiptData {
  if (!payment.receipt_number) throw new Error("This payment does not have a receipt number.");
  const line = statement.find((item) => item.kind === "payment" && item.id === payment.id);
  if (!line) throw new Error("The payment is not present in the tenant statement.");
  const phone = parseSAPhone(landlord.phone);
  return {
    receiptNumber: payment.receipt_number,
    issuedOn: dateInSA(payment.created_at),
    landlordName: landlord.name,
    landlordPhone: phone.ok ? phone.phone.display : landlord.phone,
    propertyName: property.name,
    propertyAddress: property.address,
    tenantName: tenant.name,
    roomName: room.name,
    amountCents: payment.amount_cents,
    paidOn: payment.paid_on,
    method: payment.method,
    balanceAfterCents: line.runningBalanceCents,
  };
}

function plainText(value: string): string {
  return value.replace(/\u00a0/g, " ");
}

function receiptDate(date: string): string {
  return formatShortDate(date, "1900-01-01");
}

function balanceLabel(balanceCents: number): string {
  if (balanceCents < 0)
    return `Credit ${formatMoney(Math.abs(balanceCents), { showCents: "always" })}`;
  if (balanceCents === 0) return formatMoney(0, { showCents: "always" });
  return `Owing ${formatMoney(balanceCents, { showCents: "always" })}`;
}

export async function createReceiptPdf(data: ReceiptData): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const left = 16;
  const right = 132;
  let y = 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text("Receipt", left, y);
  pdf.setFontSize(11);
  pdf.text(data.receiptNumber, right, y, { align: "right" });

  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Issued ${plainText(receiptDate(data.issuedOn))}`, left, y);
  y += 9;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.25);
  pdf.line(left, y, right, y);

  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.text("From", left, y);
  pdf.text("To", 78, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  const fromLines = [
    data.landlordName,
    data.landlordPhone,
    data.propertyName,
    ...(data.propertyAddress ? [data.propertyAddress] : []),
  ];
  const toLines = [data.tenantName, data.roomName];
  pdf.text(pdf.splitTextToSize(plainText(fromLines.join("\n")), 55), left, y);
  pdf.text(pdf.splitTextToSize(plainText(toLines.join("\n")), 54), 78, y);
  y += Math.max(fromLines.length, toLines.length) * 5 + 7;

  const rows: Array<[string, string, boolean]> = [
    ["Amount received", formatMoney(data.amountCents, { showCents: "always" }), true],
    ["Date paid", receiptDate(data.paidOn), false],
    ["Payment method", PAYMENT_METHOD_LABELS[data.method], false],
    ["Balance after this payment", balanceLabel(data.balanceAfterCents), false],
  ];
  for (const [label, value, bold] of rows) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(plainText(label), left, y);
    pdf.text(plainText(value), right, y, { align: "right" });
    y += 9;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("This receipt confirms a payment received. Created with Yard.", left, 198, {
    maxWidth: right - left,
  });
  return pdf.output("blob");
}

export function receiptFileName(receiptNumber: string): string {
  return `receipt-${receiptNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}
