export const WHATSAPP_NUMBER = '255692009222';
export const WHATSAPP_DISPLAY = '+255 692 009 222';

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function orderWhatsApp(productName?: string) {
  if (productName) {
    return whatsappLink(`Habari AfroFurnishers, I want to order: ${productName}`);
  }
  return whatsappLink('Habari AfroFurnishers, I want to place an order / enquire about furniture.');
}
