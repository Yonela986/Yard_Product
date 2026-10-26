/** Every TanStack Query key in the app is defined here. Features add entries as they arrive. */
export const queryKeys = {
  dev: {
    supabaseSession: ["dev", "supabase-session"] as const,
  },
  landlord: {
    all: ["landlord"] as const,
    me: (userId: string) => ["landlord", userId] as const,
  },
  properties: {
    all: ["properties"] as const,
  },
  rooms: {
    all: ["rooms"] as const,
    active: ["rooms", "active"] as const,
    inactive: ["rooms", "inactive"] as const,
    property: ["rooms", "property"] as const,
    room: (roomId: string) => ["rooms", roomId] as const,
  },
  tenants: {
    all: ["tenants"] as const,
    current: ["tenants", "current"] as const,
    room: (roomId: string) => ["tenants", "room", roomId] as const,
    detail: (tenantId: string) => ["tenants", tenantId] as const,
    publicPage: (token: string) => ["tenant-page", token] as const,
    publicReceipts: (token: string) => ["tenant-receipts", token] as const,
    paymentInfo: (token: string) => ["tenant-payment-info", token] as const,
    publicCharges: (token: string) => ["tenant-charges", token] as const,
  },
  charges: {
    all: ["charges"] as const,
    month: (period: string) => ["charges", "month", period] as const,
    tenant: (tenantId: string) => ["charges", "tenant", tenantId] as const,
    statement: (tenantId: string) => ["statement", tenantId] as const,
    balances: ["tenant-balances"] as const,
    generation: (userId: string) => ["rent-charge-generation", userId] as const,
  },
  payments: {
    all: ["payments"] as const,
    tenant: (tenantId: string) => ["payments", "tenant", tenantId] as const,
    payment: (paymentId: string) => ["payments", "detail", paymentId] as const,
    month: (period: string) => ["payments", "month", period] as const,
    proofUrl: (path: string) => ["payments", "proof-url", path] as const,
    pending: ["payments", "pending"] as const,
  },
  messaging: {
    all: ["message-log"] as const,
    recent: ["message-log", "recent"] as const,
  },
  utilities: {
    all: ["utility-bills"] as const,
    bills: (propertyId: string) => ["utility-bills", propertyId] as const,
    bill: (billId: string) => ["utility-bill", billId] as const,
    readings: (type: string, roomIds: string[]) =>
      ["meter-readings", type, ...[...roomIds].sort()] as const,
  },
  reports: {
    all: ["reports"] as const,
    income: ["reports", "income"] as const,
    month: (month: string) => ["reports", "month", month] as const,
  },
} as const;
