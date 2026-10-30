export function catalogWhatsAppLink(phone: string | null | undefined, itemName?: string): string | null {
    const digits = (phone ?? '').replace(/\D/g, '');
    const number = digits.length === 10 || digits.length === 11
        ? `55${digits}`
        : /^(55)\d{10,11}$/.test(digits) ? digits : null;
    if (!number) return null;
    const message = itemName
        ? `Olá! Tenho interesse no item "${itemName}" do catálogo. Poderia me passar mais informações?`
        : 'Olá! Gostaria de saber mais sobre os produtos e as condições de locação.';
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
