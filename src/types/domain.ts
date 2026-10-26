/** App-level types shared across features. */
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type PaymentStatus = "paid" | "part_paid" | "late" | "not_due";
export type RentStatus = PaymentStatus;

export type ChargeType = "rent" | "electricity" | "water" | "other";
export type UtilityType = "electricity" | "water";
export type SplitMethod = "equal" | "by_room" | "custom";
export type PaymentMethod = "cash" | "eft" | "ewallet" | "other";
export type PaymentRecordStatus = "confirmed" | "pending_confirmation" | "declined";
export type PaymentCreatedBy = "landlord" | "tenant";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  eft: "EFT",
  ewallet: "eWallet",
  other: "Other",
};

export const UTILITY_LABELS: Record<UtilityType, string> = {
  electricity: "Electricity",
  water: "Water",
};

export const UTILITY_UNITS: Record<UtilityType, string> = {
  electricity: "kWh",
  water: "kL",
};

export const SPLIT_METHOD_LABELS: Record<SplitMethod, string> = {
  equal: "Split equally",
  by_room: "By usage",
  custom: "Custom amounts",
};

export type Language = "en" | "zu" | "xh" | "st";
export type ReminderTone = "friendly" | "firm";
export type MessageKind = "welcome" | "reminder" | "receipt";
export type MessageLogEntry = Omit<Tables["message_log"]["Row"], "kind" | "language"> & {
  kind: MessageKind;
  language: Language;
};
export type ReminderWording = ReminderTone;

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  zu: "isiZulu",
  xh: "isiXhosa",
  st: "Sesotho",
};

export type Landlord = Omit<Tables["landlords"]["Row"], "language" | "reminder_tone"> & {
  language: Language;
  reminder_tone: ReminderTone;
};
export type Property = Tables["properties"]["Row"];
export type Room = Tables["rooms"]["Row"];
export type Tenant = Omit<Tables["tenants"]["Row"], "language"> & {
  language: Language;
};
export type Charge = Omit<Tables["charges"]["Row"], "type"> & {
  type: ChargeType;
};
export type UtilityShare = {
  roomId: string;
  tenantId: string;
  amountCents: number;
  unitsMilli: number | null;
  previousReading: number | null;
  currentReading: number | null;
  note: string;
};
export type UtilityBill = Omit<
  Tables["utility_bills"]["Row"],
  "type" | "split_method" | "shares"
> & {
  type: UtilityType;
  split_method: SplitMethod;
  shares: UtilityShare[];
};
export type MeterReading = Omit<Tables["meter_readings"]["Row"], "type" | "reading"> & {
  type: UtilityType;
  reading: number;
};
export type Payment = Omit<Tables["payments"]["Row"], "method" | "status" | "created_by"> & {
  method: PaymentMethod;
  status: PaymentRecordStatus;
  created_by: PaymentCreatedBy;
};
export type TenantSubmission = {
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  status: "pending_confirmation" | "declined";
  declineReason: string | null;
  createdAt: string;
};
export type TenantPaymentInfo = {
  tenantName: string;
  language: Language;
  roomName: string;
  bankDetails: string | null;
  landlordName: string;
  landlordPhone: string;
  submissions: TenantSubmission[];
};
export type PendingPaymentRow = {
  paymentId: string;
  tenantId: string;
  tenantName: string;
  roomName: string;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  hasProof: boolean;
  createdAt: string;
};
export type ReceiptData = {
  receiptNumber: string;
  issuedOn: string;
  landlordName: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddress: string | null;
  tenantName: string;
  roomName: string;
  amountCents: number;
  paidOn: string;
  method: PaymentMethod;
  balanceAfterCents: number;
};
export type TenantBalance = {
  tenantId: string;
  roomId: string;
  chargedCents: number;
  paidCents: number;
  balanceCents: number;
  overdueCents: number;
  paidThisMonthCents: number;
  oldestUnpaidDueDate: string | null;
};
export type StatementLine = {
  id: string;
  kind: "charge" | "payment";
  date: string;
  description: string;
  note: string | null;
  amountCents: number;
  runningBalanceCents: number;
  isPending: boolean;
  isVoided: boolean;
};
export type RoomWithTenant = Room & {
  currentTenant: Pick<Tenant, "id" | "name" | "phone"> | null;
};

export type OnboardingRoomInput = {
  name: string;
  monthly_rent_cents: number;
  due_day: number;
};

export type MonthlyIncomeRow = {
  month: string;
  chargedCents: number;
  receivedCents: number;
};

export type MonthDetail = {
  month: string;
  chargedByType: Record<ChargeType, number>;
  receivedByMethod: Record<PaymentMethod, number>;
  payments: Array<{
    paymentId: string;
    tenantId: string;
    paidOn: string;
    tenantName: string;
    roomName: string;
    method: PaymentMethod;
    amountCents: number;
    receiptNumber: string;
  }>;
};

export type OutstandingRow = {
  tenantId: string;
  tenantName: string;
  roomName: string;
  balanceCents: number;
  daysLate: number | null;
  isCurrent: boolean;
};

export type TenantStatementData = {
  generatedOn: string;
  landlordName: string;
  landlordPhone: string;
  propertyName: string;
  propertyAddress: string | null;
  tenantName: string;
  roomName: string;
  lines: StatementLine[];
  closingBalanceCents: number;
};

export type MonthlyStatementData = {
  generatedOn: string;
  landlordName: string;
  propertyName: string;
  propertyAddress: string | null;
  month: string;
  detail: MonthDetail;
  outstanding: OutstandingRow[];
};
