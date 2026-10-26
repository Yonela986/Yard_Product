import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type MessageVariable =
  "name" | "room" | "amount" | "due_date" | "days_phrase" | "date" | "receipt_number" | "link";

export type MessageVariables = Partial<Record<MessageVariable, string | number | null | undefined>>;

const knownVariables: readonly MessageVariable[] = [
  "name",
  "room",
  "amount",
  "due_date",
  "days_phrase",
  "date",
  "receipt_number",
  "link",
];

function isMessageVariable(value: string): value is MessageVariable {
  return knownVariables.some((variable) => variable === value);
}

export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  if (!first) throw new Error("A tenant name is required to compose a message");
  return first;
}

function renderValue(variable: MessageVariable, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    throw new Error(`Message is missing the {${variable}} variable`);
  }
  if (variable === "amount") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error("The {amount} variable must be integer cents");
    }
    return formatMoney(value);
  }
  if (variable === "due_date" || variable === "date") {
    if (typeof value !== "string") throw new Error(`The {${variable}} variable must be a date`);
    return formatShortDate(value);
  }
  if (typeof value !== "string") {
    throw new Error(`The {${variable}} variable must be text`);
  }
  return variable === "name" ? firstName(value) : value;
}

export function renderTemplate(template: string, variables: MessageVariables): string {
  const rendered = template.replace(/\{([a-z_]+)\}/g, (placeholder, rawVariable: string) => {
    if (!isMessageVariable(rawVariable)) {
      throw new Error(`Unknown message variable {${rawVariable}}`);
    }
    return renderValue(rawVariable, variables[rawVariable]);
  });
  if (/[{}]/.test(rendered))
    throw new Error("The rendered message contains an unresolved variable");
  return rendered;
}
