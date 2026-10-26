import { parseSAPhone } from "@/lib/phone";

export function buildWhatsAppUrl(e164Phone: string, text: string): string {
  const parsed = parseSAPhone(e164Phone);
  if (!parsed.ok) throw new Error(`Cannot open WhatsApp: ${parsed.error}`);
  const url = `https://wa.me/${parsed.phone.whatsapp}?text=${encodeURIComponent(text)}`;
  if (url.length >= 2000) throw new Error("The WhatsApp message is too long to open");
  return url;
}
