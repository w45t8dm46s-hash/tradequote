import { Platform, Share } from "react-native";
import type { Quote } from "@/context/QuotesContext";
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
  return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function sanitizeColor(c: string | undefined): string {
  const s = String(c ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : "#FF6B35";
}

export function buildQuoteHtml(quote: Quote, settings: BusinessSettings): string {
  const brand = sanitizeColor(settings.brandColor);
  const businessName = settings.businessName || "QuoteForge";
  const created = formatDate(quote.createdAt);
  const validUntil = addDays(quote.createdAt, quote.validDays);

  const lineItemsHtml = quote.lineItems.map((li) => `
    <tr>
      <td class="desc">
        <div class="li-title">${escapeHtml(li.description)}</div>
      </td>
      <td class="num">${li.quantity} ${escapeHtml(li.unit)}</td>
      <td class="num">£${fmt(li.rate)}</td>
      <td class="num strong">£${fmt(li.total)}</td>
    </tr>
  `).join("");

  const bankBlock = (settings.bankName || settings.bankSortCode || settings.bankAccount)
    ? `<div class="footer-block">
         <div class="label">Payment</div>
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
<title>Quote ${escapeHtml(quote.quoteNumber)} — ${escapeHtml(quote.customerName)}</title>
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
  .quote-head { text-align: right; }
  .quote-head .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .quote-head .num { font-size: 22px; font-weight: 700; color: var(--ink); margin-top: 2px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .meta { font-size: 13px; color: var(--ink); line-height: 1.5; }
  .meta .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 6px; }
  .meta .name { font-weight: 600; }
  .scope { background: var(--soft); padding: 16px 18px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: var(--ink); margin-bottom: 28px; }
  .scope .label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 6px; }
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
  .valid-banner { background: ${brand}10; border: 1px solid ${brand}40; color: var(--ink); padding: 10px 14px; border-radius: 8px; font-size: 12px; margin-top: 16px; text-align: center; }
  @media print {
    html, body { background: #fff; }
    .toolbar { display: none; }
    .page { box-shadow: none; margin: 0; padding: 32px; max-width: none; }
    a { color: inherit; text-decoration: none; }
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
      <div class="quote-head">
        <div class="label">Quotation</div>
        <div class="num">${escapeHtml(quote.quoteNumber)}</div>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">Issued ${escapeHtml(created)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta">
        <div class="label">Prepared for</div>
        <div class="name">${escapeHtml(quote.customerName)}</div>
        ${quote.customerAddress ? `<div>${nl2br(quote.customerAddress)}</div>` : ""}
      </div>
      <div class="meta" style="text-align:right">
        <div class="label">Job</div>
        <div class="name">${escapeHtml(quote.jobTypeLabel)}</div>
        <div>Valid until ${escapeHtml(validUntil)}</div>
      </div>
    </div>

    <div class="scope">
      <div class="label">Scope of work</div>
      <div>${nl2br(quote.customerSummary)}</div>
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
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><div class="label">Subtotal</div><div>£${fmt(quote.subtotal)}</div></div>
      <div class="row"><div class="label">VAT (${quote.taxRate}%)</div><div>£${fmt(quote.taxAmount)}</div></div>
      <div class="row grand"><div>Total</div><div class="val">£${fmt(quote.total)}</div></div>
    </div>

    <div class="valid-banner">This quotation is valid for ${quote.validDays} days from ${escapeHtml(created)}.</div>

    <div class="footer">
      <div class="footer-block">
        <div class="label">Terms</div>
        <div class="val">${nl2br(settings.paymentTerms || "")}</div>
      </div>
      ${bankBlock}
    </div>

    ${settings.footerNote ? `<div class="credentials">${nl2br(settings.footerNote)}</div>` : ""}
    ${credentialsBits.length ? `<div class="credentials">${credentialsBits.join(" &middot; ")}</div>` : ""}
  </div>
  <script>
    // Auto-open print dialog shortly after load.
    window.addEventListener("load", function(){
      setTimeout(function(){ try { window.print(); } catch(e){} }, 500);
    });
  </script>
</body>
</html>`;
}

export async function printQuote(quote: Quote, settings: BusinessSettings): Promise<void> {
  const html = buildQuoteHtml(quote, settings);
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) {
      // Pop-up blocked — fall back to a data URL navigation in same tab.
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
  // Native fallback: share as text. (Adding expo-print would yield true PDF on native.)
  const text = `QUOTE ${quote.quoteNumber}\n\nPrepared for: ${quote.customerName}\n\n${quote.customerSummary}\n\nTotal: £${fmt(quote.total)}\n\nValid for ${quote.validDays} days.`;
  await Share.share({ message: text, title: `Quote ${quote.quoteNumber}` });
}
