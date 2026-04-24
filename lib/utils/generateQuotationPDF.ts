import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { normalizeOrderMode, pricedPacketCount, type CartOrderMode } from "@/lib/cart/packetLine";

export const RPT_LOGO_PATH = "/logo.jpeg";

const SELLER = {
  name: "RAJASTHAN PIPE TRADERS",
  address: "SARASPUR, Ahmedabad - 380018, Gujarat, India",
  phone: "080-4784-4816",
  gst: "GSTIN: 24ABCDE1XXXX (update as applicable)",
} as const;

const BANK = {
  accountHolder: "[Account holder name]",
  bankNameAndAccount: "[Bank name & A/c no.]",
  ifsc: "[IFSC code]",
  upi: "[UPI ID]",
} as const;

const NOTE_TEXT =
  "Thank you for your business! Please make payment by the due date.";

const BLUE_RGB: [number, number, number] = [34, 98, 166];
/** Table header: corporate blue, white type (readability). */
const TABLE_HEAD_FILL: [number, number, number] = [41, 98, 180];
const ZEBRA_A: [number, number, number] = [255, 255, 255];
const ZEBRA_B: [number, number, number] = [245, 247, 250];
const GRID_LINE: [number, number, number] = [210, 215, 225];

export interface QuotationPdfOrderSummary {
  basicTotal?: number;
  gstTotal?: number;
  couponDiscount?: number;
  finalTotal?: number;
  [key: string]: unknown;
}

export interface QuotationPdfCartLine {
  productName?: string;
  brand?: string;
  size?: string;
  category?: string;
  quantity?: number;
  orderMode?: CartOrderMode;
  qtyPerBag?: number;
  pricePerUnit?: number;
  basicPricePerUnit?: number;
  comboSubtotalInclGst?: number;
  [key: string]: unknown;
}

export interface QuotationPdfOrderData {
  id: string;
  createdAt: string;
  serialNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  totalPrice: number;
  orderSummary: QuotationPdfOrderSummary;
  cartItems: QuotationPdfCartLine[];
}

function formatInr(n: number) {
  const x = roundMoney(n);
  return "Rs. " + x.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function asLine(x: unknown): QuotationPdfCartLine {
  return (x && typeof x === "object" ? (x as QuotationPdfCartLine) : {}) as QuotationPdfCartLine;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function lineInclAmount(item: QuotationPdfCartLine): number {
  const combo = item.comboSubtotalInclGst;
  if (typeof combo === "number" && combo > 0) return roundMoney(combo);
  const pk = pricedPacketCount({
    orderMode: item.orderMode,
    quantity: Number(item.quantity) || 0,
    qtyPerBag: Number(item.qtyPerBag) || 0,
    pcsPerPacket: 0,
  });
  return roundMoney(pk * (Number(item.pricePerUnit) || 0));
}

const pricingCtx = (item: QuotationPdfCartLine) => ({
  orderMode: item.orderMode,
  quantity: Number(item.quantity) || 0,
  qtyPerBag: Number(item.qtyPerBag) || 0,
  pcsPerPacket: 0,
});

function formatBagsCount(bags: number): string {
  if (!Number.isFinite(bags) || bags < 0) return "0";
  const r = roundMoney(bags);
  if (Number.isInteger(r) || Math.abs(r - Math.round(r)) < 0.001) return String(Math.round(r));
  return String(r);
}

function quantityWebsiteFormat(item: QuotationPdfCartLine): string {
  const ctx = pricingCtx(item);
  const pkts = pricedPacketCount(ctx);
  if (normalizeOrderMode(item.orderMode) === "master_bag") {
    const bags = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const bLabel = formatBagsCount(bags);
    return bLabel + (bags === 1 ? " bag" : " bags") + " (" + pkts + " pkts)";
  }
  const q = Number(item.quantity) || 0;
  const qpb = Number(item.qtyPerBag) || 0;
  if (qpb > 0) {
    const bagsNum = q / qpb;
    const bLabel = formatBagsCount(bagsNum);
    const oneBag = Math.abs(bagsNum - 1) < 0.001;
    return bLabel + (oneBag ? " bag" : " bags") + " (" + pkts + " pkts)";
  }
  return "0 bags (" + pkts + " pkts)";
}

/** Ex-GST unit price (per packet) from `basicPricePerUnit` / cart line. */
function lineUnitPriceExGst(item: QuotationPdfCartLine): number {
  return roundMoney(Number(item.basicPricePerUnit) || 0);
}

function productDetailsText(item: QuotationPdfCartLine): string {
  const name = String(item.productName ?? "").trim() || "—";
  const v = brandVariantLabel(item);
  if (v === "—") return name;
  return name + "\n" + v;
}

function brandVariantLabel(item: QuotationPdfCartLine): string {
  const b = (item.brand ?? "").trim();
  const s = (item.size ?? "").trim();
  if (b && s) return b + " — " + s;
  if (s) return s;
  if (b) return b;
  return "—";
}

function summaryNumbers(orderData: QuotationPdfOrderData) {
  const s = orderData.orderSummary;
  const basic =
    typeof s?.basicTotal === "number" && Number.isFinite(s.basicTotal) ? s.basicTotal : null;
  const gst = typeof s?.gstTotal === "number" && Number.isFinite(s.gstTotal) ? s.gstTotal : null;
  const fromSummary =
    typeof s?.finalTotal === "number" && Number.isFinite(s.finalTotal) ? s.finalTotal : null;
  const grand = fromSummary ?? (Number.isFinite(orderData.totalPrice) ? orderData.totalPrice : 0);
  const discount =
    typeof s?.couponDiscount === "number" && Number.isFinite(s.couponDiscount) ? s.couponDiscount : 0;
  return { basic, gst, grand, discount };
}

async function tryLoadLogoDataUrl(logoPath: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const url = logoPath.startsWith("http")
      ? logoPath
      : window.location.origin.replace(/\/$/, "") + "/" + logoPath.replace(/^\//, "");
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface QuotationPdfResult {
  blob: Blob;
  base64: string;
  dataUrl: string;
}

/**
 * Proforma / invoice PDF (Zenith-style). Totals: `orderData.orderSummary` + `orderData.totalPrice` from API.
 */
export async function generateQuotationPDF(orderData: QuotationPdfOrderData): Promise<QuotationPdfResult> {
  const { basic: basicExGrand, gst: gstGrand, grand: grandTotal, discount: couponDiscount } =
    summaryNumbers(orderData);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = margin;

  const imgData = await tryLoadLogoDataUrl(RPT_LOGO_PATH);
  const logoW = 26;
  const logoH = 26;
  if (imgData) {
    try {
      doc.addImage(imgData, "JPEG", margin, y, logoW, logoH);
    } catch {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("[Logo]", margin, y + 8);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE_RGB[0], BLUE_RGB[1], BLUE_RGB[2]);
    doc.text("RPT", margin, y + 10);
  }

  const textStartX = margin + logoW + 5;
  let ty = y + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(SELLER.name, textStartX, ty);
  ty += 4.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const addrW = pageW - textStartX - 55;
  const addrLines = doc.splitTextToSize(SELLER.address, addrW) as string[];
  for (const ln of addrLines) {
    doc.text(ln, textStartX, ty);
    ty += 3.2;
  }
  doc.text("Phone: " + SELLER.phone, textStartX, ty);
  ty += 3.2;
  const gstLines = doc.splitTextToSize(SELLER.gst, addrW) as string[];
  for (const ln of gstLines) {
    doc.text(ln, textStartX, ty);
    ty += 3.2;
  }
  const headerTextBottom = ty + 1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(BLUE_RGB[0], BLUE_RGB[1], BLUE_RGB[2]);
  doc.text("INVOICE", pageW - margin, y + 6, { align: "right" });

  y = Math.max(margin + logoH, headerTextBottom) + 3;
  doc.setDrawColor(GRID_LINE[0], GRID_LINE[1], GRID_LINE[2]);
  doc.setLineWidth(0.35);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const dateStr = new Date(orderData.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const colGap = 10;
  const colW = (pageW - 2 * margin - colGap) / 2;
  const leftX = margin;
  const rightX = margin + colW + colGap;
  const blockTop = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text("INVOICE TO:", leftX, y);
  doc.text("INVOICE DETAILS:", rightX, y);
  y += 4.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const cName = orderData.customerName?.trim() || "—";
  doc.setFont("helvetica", "bold");
  doc.text(cName, leftX, y);
  doc.setFont("helvetica", "normal");
  y += 3.6;
  doc.text("Phone: " + String(orderData.customerPhone), leftX, y);
  y += 3.6;
  if (orderData.customerEmail?.trim()) {
    doc.text("Email: " + orderData.customerEmail.trim(), leftX, y);
    y += 3.6;
  }
  const leftBlockEnd = y;

  let ry = blockTop + 4.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Quotation ID: " + String(orderData.serialNo), rightX, ry);
  ry += 3.6;
  doc.text("Date: " + dateStr, rightX, ry);
  ry += 3.6;
  const rightBlockEnd = ry;

  y = Math.max(leftBlockEnd, rightBlockEnd) + 6;

  const items = orderData.cartItems.map(asLine);
  const innerW = pageW - 2 * margin;
  const wSr = 9;
  const wQty = 40;
  const wUnit = 28;
  const wTotal = 30;
  const wDesc = innerW - wSr - wQty - wUnit - wTotal;

  const rows: string[][] = items.map((it, i) => [
    String(i + 1),
    productDetailsText(it),
    quantityWebsiteFormat(it),
    formatInr(lineUnitPriceExGst(it)),
    formatInr(lineInclAmount(it)),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Sr.", "Description", "Quantity", "Unit price", "Total"]],
    body: rows,
    theme: "grid",
    showFoot: "never",
    headStyles: {
      fillColor: TABLE_HEAD_FILL,
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.5,
      textColor: [25, 25, 25],
      overflow: "linebreak",
      lineColor: [GRID_LINE[0], GRID_LINE[1], GRID_LINE[2]],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: ZEBRA_B },
    bodyStyles: { fillColor: ZEBRA_A },
    columnStyles: {
      0: { cellWidth: wSr, halign: "center" },
      1: { cellWidth: wDesc, halign: "left" },
      2: { cellWidth: wQty, halign: "left", fontSize: 6.5 },
      3: { cellWidth: wUnit, halign: "right" },
      4: { cellWidth: wTotal, halign: "right" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "head") {
        const i = data.column.index;
        if (i === 0) data.cell.styles.halign = "center";
        else if (i === 1) data.cell.styles.halign = "left";
        else if (i === 2) data.cell.styles.halign = "left";
        else data.cell.styles.halign = "right";
        data.cell.styles.fillColor = TABLE_HEAD_FILL;
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  y = typeof tableEnd === "number" ? tableEnd + 8 : y + 50;

  const sumLabelW = 52;
  const sumX = pageW - margin - sumLabelW - 30;
  const valueRight = pageW - margin;
  const lineH = 5.2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);

  const rightVal = (label: string, value: string) => {
    const w = doc.getTextWidth(value);
    doc.setFont("helvetica", "normal");
    doc.text(label, sumX, y);
    doc.text(value, valueRight - w, y);
    y += lineH;
  };

  if (basicExGrand != null) {
    rightVal("Subtotal", formatInr(basicExGrand));
  } else {
    rightVal("Subtotal", "—");
  }
  if (gstGrand != null) {
    rightVal("Tax (GST 18%)", formatInr(gstGrand));
  } else {
    rightVal("Tax (GST 18%)", "—");
  }
  if (couponDiscount > 0) {
    const val = formatInr(couponDiscount);
    const rightText = "- " + val;
    const w = doc.getTextWidth(rightText);
    doc.setFont("helvetica", "normal");
    doc.text("Discount", sumX, y);
    doc.text(rightText, valueRight - w, y);
    y += lineH;
  }

  y += 1.5;
  doc.setDrawColor(GRID_LINE[0], GRID_LINE[1], GRID_LINE[2]);
  doc.setLineWidth(0.2);
  doc.line(sumX - 2, y, valueRight, y);
  y += 4.5;

  const totalVal = formatInr(grandTotal);
  const totalLabel = "Total Amount";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLUE_RGB[0], BLUE_RGB[1], BLUE_RGB[2]);
  doc.text(totalLabel, sumX, y);
  const tw = doc.getTextWidth(totalVal);
  doc.setFontSize(12);
  doc.text(totalVal, valueRight - tw, y);
  y += lineH + 4;

  doc.setTextColor(30, 30, 30);
  if (y > pageH - 55) {
    doc.addPage();
    y = margin;
  } else {
    y += 4;
  }

  const footColW = (pageW - 2 * margin - colGap) / 2;
  const yFoot = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PAYMENT METHODS", leftX, yFoot);
  doc.text("NOTES:", rightX, yFoot);
  y = yFoot + 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  const payLines = [
    "Account: " + BANK.accountHolder,
    "Bank: " + BANK.bankNameAndAccount,
    "IFSC: " + BANK.ifsc,
    "UPI: " + BANK.upi,
  ];
  for (const pl of payLines) {
    const lines = doc.splitTextToSize(pl, footColW) as string[];
    for (const ln of lines) {
      doc.text(ln, leftX, y);
      y += 3.4;
    }
  }
  const payEndY = y;

  let ny = yFoot + 4.5;
  const noteSplit = doc.splitTextToSize(NOTE_TEXT, footColW) as string[];
  for (const ln of noteSplit) {
    doc.text(ln, rightX, ny);
    ny += 3.4;
  }
  y = Math.max(payEndY, ny) + 8;

  doc.setDrawColor(180, 185, 195);
  doc.setLineWidth(0.5);
  if (y < pageH - 20) {
    doc.line(margin, y, pageW - margin, y);
  }

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const footCenter = SELLER.name + " | " + SELLER.phone + " | " + SELLER.address;
  const ft = doc.splitTextToSize(footCenter, pageW - 2 * margin) as string[];
  for (const line of ft) {
    const lw = doc.getTextWidth(line);
    doc.text(line, (pageW - lw) / 2, y);
    y += 3.2;
  }

  const dataUri = doc.output("datauristring");
  const comma = dataUri.indexOf(",");
  const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri;
  const outBlob = doc.output("blob");
  const safeName = "Invoice-" + orderData.serialNo.replace(/[^a-zA-Z0-9-]+/g, "-") + ".pdf";
  doc.save(safeName);

  return { blob: outBlob, base64, dataUrl: dataUri };
}
