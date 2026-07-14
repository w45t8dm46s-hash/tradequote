import { Platform, Share } from "react-native";
import type { Invoice } from "@/context/InvoicesContext";
import type { BusinessSettings } from "@/context/SettingsContext";

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function sanitizeColor(c: string | undefined): string {
  const s = String(c ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : "#FF6B35";
}

export function buildInvoiceHtml(invoice: Invoice, settings: BusinessSettings): string {
  const brand = sanitizeColor(settings.brandColor);
  const businessName = settings.businessName || "QuoteForge";
  const dueDate = formatDate(invoice.dueDate);
  const issued = formatDate(invoice.createdAt);
  const outstanding = Math.max(0, invoice.total - invoice.paidAmount);

  const lineItemsHtml = invoice.lineItems.map((li) => `
    <tr>
      <td class="desc"><div class="li-title">${escapeHtml(li.description)}</div></td>
      <td class="num">${li.quantity} ${escapeHtml(li.unit)}</td>
      <td class="num">£${fmt(li.rate)}</td>
      <td class="num strong">£${fmt(li.total)}</td>
    </tr>
  `).join("");

  const bankBlock = (settings.bankName || settings.bankSortCode || settings.bankAccount)
    ? `<div class="footer-block">
         <div class="label">Payment details</div>
         <div class="val">${escapeHtml(settings.bankName || "")}</div>
         ${settings.bankSortCode ? `<div class="val">Sort code: ${escapeHtml(settings.bankSortCode)}</div>` : ""}
         ${settings.bankAccount ? `<div class="val">Account: ${escapeHtml(settings.bankAccount)}</div>` : ""}
       </div>`
    : "";

  const credentialsBits: string[] = [];
  if (settings.companyNumber) credentialsBits.push(`Company No. ${escapeHtml(settings.companyNumber)}`);
  if (settings.vatRegistered && settings.vatNumber) credentialsBits.push(`VAT No. ${escapeHtml(settings.vatNumber)}`);
  if (settings.niceicNumber) credentialsBits.push(`NICEIC ${escapeHtml(settings.niceicNumber)}`);

  const logoHtml = settings.logoDataUri
    ? `<img src="${settings.logoDataUri}" alt="logo" class="logo"/>`
    : `<div class="logo-fallback" style="background:${brand}">${escapeHtml((businessName[0] || "Q").toUpperCase())}</div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Invoice ${escapeHtml(invoice.invoiceNumber)} — ${escapeHtml(invoice.customerName)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  :root { --brand: ${brand}; --ink: #111827; --muted: #6b7280; --line: #e5e7eb; --soft: #f9fafb; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f3f4f6; color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
  .page { max-width: 820px; margin: 24px auto; background: #fff; padding: 56px 56px 48px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .toolbar { max-width: 820px; margin: 0 auto 12px; display: flex; gap: 8px; justify-content: flex-end; padding: 12px 8px 0; }
  .toolbar button { background: var(--brand); color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
  .toolbar button.ghost { background: #fff; color: var(--ink); border: 1px solid var(--line); }
  .top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid var(--brand); margin-bottom: 28px; gap: 24px; }
  .biz { display: flex; gap: 14px; align-items: center; }
  .logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; }
  .logo-fallback { width: 56px; height: 56px; border-radius: 12px; color: #fff; font-weight: 700; font-size: 26px; display: flex; align-items: center; justify-content: center; }
  .biz-text .name { font-size: 20px; font-weight: 700; color: var(--ink); line-height: 1.1; }
  .biz-text .sub { font-size: 12px; color: var(--muted); margin-top: 4px; white-space: pre-line; }
  .invoice-head { text-align: right; }
  .invoice-head .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .invoice-head .num { font-size: 22px; font-weight: 700; color: var(--ink); margin-top: 2px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .meta { font-size: 13px; color: var(--ink); line-height: 1.5; }
  .meta .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 6px; }
  .meta .name { font-weight: 600; }
  .status { background: ${invoice.status === "paid" ? "#ECFDF5" : "#FEF3C7"}; border: 1px solid ${invoice.status === "paid" ? "#BBF7D0" : "#FDE68A"}; padding: 12px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 24px; display: flex; justify-content: space-between; }
  table.items { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.items thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; padding: 10px 8px; border-bottom: 2px solid var(--ink); }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 12px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.items tbody td.num { text-align: right; white-space: nowrap; }
  table.items tbody td.strong { font-weight: 600; color: var(--ink); }
  .li-title { font-weight: 500; color: var(--ink); }
  .totals { margin-top: 16px; margin-left: auto; width: 320px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 0; color: var(--ink); }
  .totals .row .label { color: var(--muted); }
  .totals .grand { border-top: 2px solid var(--ink); margin-top: 6px; padding-top: 12px; font-size: 17px; font-weight: 700; }
  .totals .grand .val { color: var(--brand); }
  .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 12px; line-height: 1.6; color: var(--ink); }
  .footer-block .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 6px; }
  .footer-block .val { color: var(--ink); }
  .credentials { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); text-align: center; line-height: 1.6; }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none; }
    .page { box-shadow: none; margin: 0; padding: 32px; max-width: none; }
    @page { margin: 16mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="ghost" onclick="window.close()">Close</button>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="page">
    <div class="top">
      <div class="biz">
        ${logoHtml}
        <div class="biz-text">
          <div class="name">${escapeHtml(businessName)}</div>
          <div class="sub">${nl2br([settings.tradingAs, settings.address, [settings.phone, settings.email, settings.website].filter(Boolean).join(" · ")].filter(Boolean).join("\n"))}</div>
        </div>
      </div>
      <div class="invoice-head">
        <div class="label">Invoice</div>
        <div class="num">${escapeHtml(invoice.invoiceNumber)}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">Issued ${escapeHtml(issued)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta">
        <div class="label">Billed to</div>
        <div class="name">${escapeHtml(invoice.customerName)}</div>
        ${invoice.customerAddress ? `<div>${nl2br(invoice.customerAddress)}</div>` : ""}
      </div>
      <div class="meta" style="text-align:right">
        <div class="label">Due date</div>
        <div class="name">${escapeHtml(dueDate)}</div>
        <div>Status: ${escapeHtml(invoice.status)}</div>
      </div>
    </div>

    <div class="status">
      <div><strong>Paid:</strong> £${fmt(invoice.paidAmount)}</div>
      <div><strong>Outstanding:</strong> £${fmt(outstanding)}</div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${lineItemsHtml}</tbody>
    </table>

    <div class="totals">
      <div class="row"><div class="label">Subtotal</div><div>£${fmt(invoice.subtotal)}</div></div>
      <div class="row"><div class="label">VAT (${invoice.taxRate}%)</div><div>£${fmt(invoice.taxAmount)}</div></div>
      <div class="row"><div class="label">Paid</div><div>£${fmt(invoice.paidAmount)}</div></div>
      <div class="row grand"><div>Total</div><div class="val">£${fmt(invoice.total)}</div></div>
    </div>

    <div class="footer">
      <div class="footer-block">
        <div class="label">Terms</div>
        <div class="val">${nl2br(settings.paymentTerms || "")}</div>
      </div>
      ${bankBlock}
    </div>

    ${invoice.notes ? `<div class="credentials">${nl2br(invoice.notes)}</div>` : ""}
    ${settings.footerNote ? `<div class="credentials">${nl2br(settings.footerNote)}</div>` : ""}
    ${credentialsBits.length ? `<div class="credentials">${credentialsBits.join(" &middot; ")}</div>` : ""}
  </div>
  <script>
    window.addEventListener("load", function(){
      setTimeout(function(){ try { window.print(); } catch(e){} }, 500);
    });
  </script>
</body>
</html>`;
}

export async function printInvoice(invoice: Invoice, settings: BusinessSettings): Promise<void> {
  const html = buildInvoiceHtml(invoice, settings);

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.location.href = url;
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();
    return;
  }

  const text = `INVOICE ${invoice.invoiceNumber}\n\nBilled to: ${invoice.customerName}\n\nTotal: £${fmt(invoice.total)}\nPaid: £${fmt(invoice.paidAmount)}\nOutstanding: £${fmt(Math.max(0, invoice.total - invoice.paidAmount))}`;
  await Share.share({ message: text, title: `Invoice ${invoice.invoiceNumber}` });
}
