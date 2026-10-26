import { formatMonthLabel, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  PAYMENT_METHOD_LABELS,
  type MonthlyStatementData,
  type StatementLine,
  type TenantStatementData,
} from "@/types/domain";

const PAGE_HEIGHT = 297;
const LEFT = 16;
const RIGHT = 194;
const BOTTOM = 278;

export function paginateRows<T>(rows: T[], rowsPerPage: number): T[][] {
  if (!Number.isInteger(rowsPerPage) || rowsPerPage < 1) {
    throw new Error("Rows per page must be a positive integer.");
  }
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += rowsPerPage) {
    pages.push(rows.slice(index, index + rowsPerPage));
  }
  return pages.length ? pages : [[]];
}

function printable(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

function money(cents: number): string {
  return printable(formatMoney(cents, { showCents: "always" }));
}

function dateLabel(date: string, generatedOn: string): string {
  return printable(formatShortDate(date, generatedOn));
}

type Pdf = import("jspdf").jsPDF;
type TableColumn<Row> = {
  title: string;
  x: number;
  width: number;
  align?: "left" | "right";
  text: (row: Row) => string;
};

async function loadDocument(): Promise<Pdf> {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

function addFooter(pdf: Pdf): void {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.2);
    pdf.line(LEFT, PAGE_HEIGHT - 13, RIGHT, PAGE_HEIGHT - 13);
    pdf.text(`Page ${page} of ${pageCount}`, RIGHT, PAGE_HEIGHT - 8, { align: "right" });
  }
}

function addHeaderLines(pdf: Pdf, lines: string[]): number {
  let y = 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(printable(lines[0] ?? "Statement"), LEFT, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (const line of lines.slice(1)) {
    const wrapped = pdf.splitTextToSize(printable(line), RIGHT - LEFT);
    pdf.text(wrapped, LEFT, y);
    y += wrapped.length * 5;
  }
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.25);
  pdf.line(LEFT, y + 2, RIGHT, y + 2);
  return y + 10;
}

function drawSection(pdf: Pdf, title: string, y: number): number {
  if (y > BOTTOM - 12) {
    pdf.addPage();
    y = 18;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(printable(title), LEFT, y);
  return y + 6;
}

function drawTableHeader<Row>(pdf: Pdf, columns: TableColumn<Row>[], y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.2);
  for (const column of columns) {
    pdf.text(printable(column.title), column.x, y, {
      align: column.align ?? "left",
      maxWidth: column.width,
    });
  }
  pdf.line(LEFT, y + 2, RIGHT, y + 2);
  return y + 8;
}

function drawTable<Row>(
  pdf: Pdf,
  title: string,
  rows: Row[],
  columns: TableColumn<Row>[],
  y: number,
): number {
  y = drawSection(pdf, title, y);
  y = drawTableHeader(pdf, columns, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  for (const row of rows) {
    const cells = columns.map((column) => ({
      column,
      lines: pdf.splitTextToSize(printable(column.text(row)), column.width),
    }));
    const rowHeight = Math.max(5, ...cells.map((cell) => cell.lines.length * 4));
    if (y + rowHeight > BOTTOM) {
      pdf.addPage();
      y = 18;
      y = drawTableHeader(pdf, columns, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
    }
    for (const { column, lines } of cells) {
      pdf.text(lines, column.x, y, {
        align: column.align ?? "left",
        maxWidth: column.width,
      });
    }
    y += rowHeight + 2;
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.12);
    pdf.line(LEFT, y - 1, RIGHT, y - 1);
  }
  return y + 5;
}

function sectionRows<T extends string>(
  values: Record<T, number>,
  labels: Record<T, string>,
): Array<{ label: string; amountCents: number }> {
  return (Object.keys(values) as T[]).map((key) => ({
    label: labels[key],
    amountCents: values[key],
  }));
}

function sumRows(rows: Array<{ amountCents: number }>): number {
  return rows.reduce((total, row) => total + row.amountCents, 0);
}

export async function createMonthlyStatementPdf(data: MonthlyStatementData): Promise<Blob> {
  const pdf = await loadDocument();
  const detail = data.detail;
  const chargeRows = sectionRows(detail.chargedByType, {
    rent: "Rent",
    electricity: "Electricity",
    water: "Water",
    other: "Other",
  });
  const methodRows = sectionRows(detail.receivedByMethod, PAYMENT_METHOD_LABELS);
  const payments = detail.payments;
  const outstanding = data.outstanding.map((row) => ({
    tenant: `${row.tenantName} · ${row.roomName}${row.isCurrent ? "" : " · Moved out"}`,
    amountCents: row.balanceCents,
  }));
  let y = addHeaderLines(pdf, [
    "Monthly statement",
    data.landlordName,
    data.propertyName,
    ...(data.propertyAddress ? [data.propertyAddress] : []),
    formatMonthLabel(data.month),
    `Generated on ${dateLabel(data.generatedOn, data.generatedOn)}`,
  ]);
  const simpleColumns: TableColumn<(typeof chargeRows)[number]>[] = [
    { title: "Type", x: LEFT, width: 110, text: (row) => row.label },
    { title: "Amount", x: RIGHT, width: 48, align: "right", text: (row) => money(row.amountCents) },
  ];
  y = drawTable(
    pdf,
    "Charged by type",
    [...chargeRows, { label: "Total charged", amountCents: sumRows(chargeRows) }],
    simpleColumns,
    y,
  );
  const methodColumns: TableColumn<(typeof methodRows)[number]>[] = [
    { title: "Method", x: LEFT, width: 110, text: (row) => row.label },
    { title: "Amount", x: RIGHT, width: 48, align: "right", text: (row) => money(row.amountCents) },
  ];
  y = drawTable(
    pdf,
    "Received by method",
    [...methodRows, { label: "Total received", amountCents: sumRows(methodRows) }],
    methodColumns,
    y,
  );
  const paymentColumns: TableColumn<(typeof payments)[number]>[] = [
    { title: "Date", x: LEFT, width: 24, text: (row) => dateLabel(row.paidOn, data.generatedOn) },
    {
      title: "Tenant / room",
      x: 43,
      width: 56,
      text: (row) => `${row.tenantName} / ${row.roomName}`,
    },
    { title: "Method", x: 102, width: 27, text: (row) => PAYMENT_METHOD_LABELS[row.method] },
    { title: "Amount", x: 161, width: 19, align: "right", text: (row) => money(row.amountCents) },
    {
      title: "Receipt",
      x: RIGHT,
      width: 14,
      align: "right",
      text: (row) => row.receiptNumber || "—",
    },
  ];
  y = drawTable(pdf, "Payments received", payments, paymentColumns, y);
  const outstandingColumns: TableColumn<(typeof outstanding)[number]>[] = [
    { title: "Tenant", x: LEFT, width: 110, text: (row) => row.tenant },
    {
      title: "Balance",
      x: RIGHT,
      width: 48,
      align: "right",
      text: (row) => money(row.amountCents),
    },
  ];
  drawTable(
    pdf,
    `Outstanding as at ${dateLabel(data.generatedOn, data.generatedOn)}`,
    outstanding,
    outstandingColumns,
    y,
  );
  addFooter(pdf);
  return pdf.output("blob");
}

export async function createTenantStatementPdf(data: TenantStatementData): Promise<Blob> {
  const pdf = await loadDocument();
  let y = addHeaderLines(pdf, [
    "Tenant statement",
    data.landlordName,
    data.landlordPhone,
    data.propertyName,
    ...(data.propertyAddress ? [data.propertyAddress] : []),
    `${data.tenantName} · ${data.roomName}`,
    `Generated on ${dateLabel(data.generatedOn, data.generatedOn)}`,
  ]);
  const lines: StatementLine[] = data.lines.filter((line) => !line.isPending && !line.isVoided);
  const columns: TableColumn<StatementLine>[] = [
    { title: "Date", x: LEFT, width: 24, text: (row) => dateLabel(row.date, data.generatedOn) },
    {
      title: "Description",
      x: 43,
      width: 70,
      text: (row) => `${row.description}${row.note ? ` — ${row.note}` : ""}`,
    },
    {
      title: "Charge",
      x: 127,
      width: 18,
      align: "right",
      text: (row) => (row.kind === "charge" ? money(row.amountCents) : ""),
    },
    {
      title: "Payment",
      x: 151,
      width: 19,
      align: "right",
      text: (row) => (row.kind === "payment" ? money(Math.abs(row.amountCents)) : ""),
    },
    {
      title: "Balance",
      x: RIGHT,
      width: 24,
      align: "right",
      text: (row) => money(row.runningBalanceCents),
    },
  ];
  y = drawTable(pdf, "Statement entries", lines, columns, y);
  const closing = [{ label: "Closing balance", amountCents: data.closingBalanceCents }];
  const closingColumns: TableColumn<(typeof closing)[number]>[] = [
    { title: "", x: LEFT, width: 110, text: (row) => row.label },
    { title: "", x: RIGHT, width: 48, align: "right", text: (row) => money(row.amountCents) },
  ];
  drawTable(pdf, "Balance", closing, closingColumns, y);
  addFooter(pdf);
  return pdf.output("blob");
}

export function statementFileName(
  prefix: "monthly-statement" | "tenant-statement",
  suffix: string,
): string {
  return `${prefix}-${suffix.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}
