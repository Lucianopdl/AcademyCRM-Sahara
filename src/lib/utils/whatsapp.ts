/**
 * Generates a WhatsApp link to send a message to a student.
 */
export const getWhatsAppLink = (phone: string, message: string) => {
    // Basic phone cleaning (keep numbers only)
    const cleanedPhone = phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
};

export const createPaymentMessage = (studentName: string, month: string, year: number, amount: number) => {
    return `¡Hola ${studentName}! 👋 Te enviamos el comprobante de pago correspondiente al mes de ${month} ${year}.\n\nMonto: $${amount.toLocaleString("es-AR")}\n\n¡Gracias por confiar en nosotros! ✨`;
};
