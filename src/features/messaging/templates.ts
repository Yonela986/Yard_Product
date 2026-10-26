import type { Language, MessageKind } from "@/types/domain";

export type MessageTemplate =
  | "welcome"
  | "friendlyReminder"
  | "gentleLateReminder"
  | "firmReminder"
  | "receipt"
  | "tenantPaymentNotice";
export type LoggedMessageTemplate = Exclude<MessageTemplate, "tenantPaymentNotice">;

export const TRANSLATION_REVIEWED: Record<Language, boolean> = {
  en: true,
  zu: false,
  xh: false,
  st: false,
};

export const MESSAGE_TEMPLATES: Record<MessageTemplate, Record<Language, string>> = {
  welcome: {
    en: "Hi {name}, I’m now using Yard to manage rent for {room}. You can see your balance and receipts here: {link}",
    zu: "Sawubona {name}, manje ngisebenzisa i-Yard ukuphatha irenti ye-{room}. Ungabona ibhalansi yakho namarisidi lapha: {link}",
    xh: "Molo {name}, ngoku ndisebenzisa i-Yard ukulawula irenti ye-{room}. Unokubona ibhalansi yakho neerisidi apha: {link}",
    st: "Dumela {name}, hona joale ke sebelisa Yard ho laola rente ea {room}. U ka bona balanse ea hau le diresiti mona: {link}",
  },
  friendlyReminder: {
    en: "Hi {name}, a reminder that rent of {amount} for {room} is due on {due_date}. Thank you.",
    zu: "Sawubona {name}, ngikukhumbuza ukuthi irenti ye-{amount} ye-{room} kufanele ikhokhwe ngomhla ka-{due_date}. Ngiyabonga.",
    xh: "Molo {name}, ndiyakukhumbuza ukuba irenti ye-{amount} ye-{room} kufuneka ihlawulwe nge-{due_date}. Enkosi.",
    st: "Dumela {name}, ke u hopotsa hore rente ea {amount} bakeng sa {room} e lokela ho lefuoa ka {due_date}. Kea leboha.",
  },
  gentleLateReminder: {
    en: "Hi {name}, a gentle reminder that rent of {amount} for {room} was due on {due_date} and is still unpaid. Thank you.",
    zu: "Sawubona {name}, ngikukhumbuza ngomusa ukuthi irenti ye-{amount} ye-{room} bekufanele ikhokhwe ngomhla ka-{due_date} futhi ayikakhokhwa. Ngiyabonga.",
    xh: "Molo {name}, ndiyakukhumbuza ngembeko ukuba irenti ye-{amount} ye-{room} bekufuneka ihlawulwe nge-{due_date} kwaye ayikahlawulwa. Enkosi.",
    st: "Dumela {name}, ke u hopotsa ka kopo hore rente ea {amount} bakeng sa {room} e ne e lokela ho lefuoa ka {due_date} ‘me ha e e-s’o lefuoa. Kea leboha.",
  },
  firmReminder: {
    en: "Hi {name}, rent of {amount} for {room} is now {days_phrase} late. Please pay or let me know when you can.",
    zu: "Sawubona {name}, irenti ye-{amount} ye-{room} idlulelwe yisikhathi sokukhokha {days_phrase}. Ngicela ukhokhe noma ungazise ukuthi uzokhokha nini.",
    xh: "Molo {name}, irenti ye-{amount} ye-{room} idlulile kwixesha lokuhlawula {days_phrase}. Ndicela uhlawule okanye undazise ukuba uza kuhlawula nini.",
    st: "Dumela {name}, rente ea {amount} bakeng sa {room} e liehile {days_phrase}. Ka kopo lefa kapa u mpolelle hore u tla lefa neng.",
  },
  receipt: {
    en: "Hi {name}, I’ve received {amount} for {room} on {date}. Receipt {receipt_number}: {link}",
    zu: "Sawubona {name}, ngithole i-{amount} ye-{room} ngomhla ka-{date}. Irisidi {receipt_number}: {link}",
    xh: "Molo {name}, ndifumene i-{amount} ye-{room} nge-{date}. Irisidi {receipt_number}: {link}",
    st: "Dumela {name}, ke amohetse {amount} bakeng sa {room} ka {date}. Resiti {receipt_number}: {link}",
  },
  tenantPaymentNotice: {
    en: "Hi, I’ve paid {amount} for {room} on {date}. Please check and confirm. - {name}",
    zu: "Sawubona, ngikhokhile i-{amount} ye-{room} mhla ka-{date}. Ngicela uhlole uqinisekise. - {name}",
    xh: "Molo, ndihlawulile i-{amount} ye-{room} nge-{date}. Ndicela ukhangele uqinisekise. - {name}",
    st: "Dumela, ke lefile {amount} bakeng sa {room} ka {date}. Ka kopo hlahloba ‘me u netefatse. - {name}",
  },
};

export const TEMPLATE_KIND: Record<LoggedMessageTemplate, MessageKind> = {
  welcome: "welcome",
  friendlyReminder: "reminder",
  gentleLateReminder: "reminder",
  firmReminder: "reminder",
  receipt: "receipt",
};

export function daysPhrase(language: Language, days: number): string {
  if (!Number.isInteger(days) || days < 1) throw new Error("Days late must be a positive integer");
  switch (language) {
    case "en":
      return days === 1 ? "1 day" : `${days} days`;
    case "zu":
      return days === 1 ? "ngosuku olulodwa" : `ngezinsuku ezingu-${days}`;
    case "xh":
      return days === 1 ? "ngosuku olunye" : `ngeentsuku ezi-${days}`;
    case "st":
      return days === 1 ? "ka letsatsi le le leng" : `ka matsatsi a ${days}`;
  }
}
