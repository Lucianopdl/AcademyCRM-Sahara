import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ReceiptData {
  studentName: string;
  studentDni?: string;
  amount: number;
  month: string;
  year: number;
  paymentMethod: string;
  receiptNumber: string;
  academyName: string;
}

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // Receipt size
  });

  // Colors
  const primaryColor = "#E67E22";
  const textColor = "#2D241E";
  const grayColor = "#847365";

  // Header
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 148, 20, "F");
  
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.academyName.toUpperCase(), 10, 13);
  
  doc.setFontSize(10);
  doc.text("COMPROBANTE DE PAGO", 140, 13, { align: "right" });

  // Body
  doc.setTextColor(textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBIDO DE:", 10, 40);
  doc.setFont("helvetica", "normal");
  doc.text(data.studentName, 45, 40);
  
  if (data.studentDni) {
    doc.setFont("helvetica", "bold");
    doc.text("DNI:", 10, 48);
    doc.setFont("helvetica", "normal");
    doc.text(data.studentDni, 45, 48);
  }

  doc.setFont("helvetica", "bold");
  doc.text("CONCEPTO:", 10, 56);
  doc.setFont("helvetica", "normal");
  doc.text(`Cuota Mensual - ${data.month} ${data.year}`, 45, 56);

  doc.setFont("helvetica", "bold");
  doc.text("FECHA:", 10, 64);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es }), 45, 64);

  doc.setFont("helvetica", "bold");
  doc.text("MÉTODO:", 10, 72);
  doc.setFont("helvetica", "normal");
  const methodMap: any = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
  doc.text(methodMap[data.paymentMethod] || data.paymentMethod, 45, 72);

  // Divider
  doc.setDrawColor(grayColor);
  doc.setLineWidth(0.1);
  doc.line(10, 85, 138, 85);

  // Amount Wrapper
  doc.setFillColor("#FDFCFB");
  doc.roundedRect(80, 95, 58, 20, 3, 3, "F");
  doc.setDrawColor(primaryColor);
  doc.roundedRect(80, 95, 58, 20, 3, 3, "S");
  
  doc.setTextColor(primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAGADO", 85, 102);
  
  doc.setFontSize(18);
  doc.text(`$${data.amount.toLocaleString("es-AR")}`, 133, 110, { align: "right" });

  // Footer
  doc.setTextColor(grayColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`N° Recibo: ${data.receiptNumber}`, 10, 135);
  doc.text("Este es un comprobante digital generado por Academia CRM.", 10, 140);

  // Add a nice bottom border
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.line(0, 210, 148, 210);

  // Return as Blob for further use
  return doc.output("blob");
};
