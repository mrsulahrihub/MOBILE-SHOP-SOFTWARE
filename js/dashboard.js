// =====================================================
// BISMILLAH MOBILE ZONE — Dashboard Controller v35.0
// POS Upgrade: Smart Search, Barcode, IMEI Tracking, Rack Location,
// Discount, Tax, Multiple Payments, Customer Management,
// Reports (13 types), Udhar same, All Shortcuts + Enter Nav.
// =====================================================
import { supabase } from './config.js';

// ---------------------------------------------------
// SESSION & GUARD
// ---------------------------------------------------
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
const SHOP_ID = localStorage.getItem('shop_id');
const PERMS_STR = localStorage.getItem('bm_shop_perms');

if (!SHOP_ID && (!SESSION || !SESSION.staff_id)) {
  window.location.replace('./login.html');
  throw new Error('Redirecting to login...');
}

const IS_ADMIN = !SESSION.staff_id || SESSION.staff_id === '01' || SESSION.role === 'Admin';
const CURRENT_STAFF = SESSION.staff_id || '01';
const CURRENT_NAME = SESSION.name || 'Admin';
const SHOP_PERMS = JSON.parse(PERMS_STR || '{}');

document.getElementById('userName').textContent = CURRENT_NAME || localStorage.getItem('owner_name') || 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = (SESSION.role || 'ADMIN').toUpperCase();
document.getElementById('welcomeName').textContent = CURRENT_NAME;
document.getElementById('userAvatar').textContent = (CURRENT_NAME || 'B')[0].toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (!confirm('Are you sure you want to logout?')) return;
  ['bm_staff', 'shop_id', 'shop_name', 'owner_name', 'bm_held_carts', 'bm_shop_perms'].forEach(k => localStorage.removeItem(k));
  window.location.replace('./login.html');
});

// ---------------------------------------------------
// UTILITIES
// ---------------------------------------------------
const $ = id => document.getElementById(id);
const fmt = n => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function checkPermission(action) {
  if (IS_ADMIN) return true;
  if (action === 'edit' && !SESSION.can_edit) { toast('You do not have edit permission!', 'error'); return false; }
  if (action === 'delete' && !SESSION.can_delete) { toast('You do not have delete permission!', 'error'); return false; }
  return true;
}

function toast(msg, type = 'info') {
  const host = $('toastHost'); if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

async function logActivity(action, module, details = '') {
  try {
    const { error } = await supabase.from('activity_log').insert({
      staff_id: CURRENT_STAFF, staff_name: CURRENT_NAME, action, module,
      details: String(details).slice(0, 500)
    });
    if (error) console.warn('Activity log DB error:', error.message);
  } catch (e) { console.warn('Activity log failed:', e.message); }
}

// ---------------------------------------------------
// DYNAMIC LISTS
// ---------------------------------------------------
let CATEGORIES = ['Mobile Phones', 'Mobile Accessories', 'Chargers & Cables', 'Handsfree & Audio', 'Batteries', 'Memory & Storage', 'Mobile Parts', 'Covers', 'Tempered Glass', 'Repairing Tools'];
let BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Nokia', 'Huawei', 'Realme', 'OnePlus', 'Other'];
let ALL_PRODUCTS = [];
let ALL_RACKS = [];

// =====================================================
// SHOP SETTINGS (Tax + defaults added for POS)
// =====================================================
let SHOP = {
  name: 'BM MOBILE ZONE', address: 'Chohan Mobile Market, Zafarwal',
  phone1: '0345-6613232', phone2: '0307-6613232',
  tagline: 'Your Trusted Mobile Shop',
  tax_rate: 0, tax_enabled: false
};

async function loadShopSettings() {
  try {
    const { data } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
    if (data) {
      SHOP = {
        name: data.shop_name || SHOP.name,
        address: data.address || SHOP.address,
        phone1: data.phone1 || SHOP.phone1,
        phone2: data.phone2 || SHOP.phone2,
        tagline: data.tagline || SHOP.tagline,
        tax_rate: Number(data.tax_rate || 0),
        tax_enabled: data.tax_enabled === true
      };
    }
  } catch (e) { console.warn('shop settings fail', e); }
}

// =====================================================
// PRINT FUNCTIONS (Thermal & A4) — tax lines added
// =====================================================
function urduTermsBlock(type = 'sale') {
  const common = `<div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div><div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div><div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div><div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div>`;
  const saleExtra = `<div>• سیل شدہ مال واپس یا تبدیل نہیں ہوگا۔</div><div>• وارنٹی کے لیے رسید لازمی پیش کریں۔</div>`;
  const repairExtra = `<div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div><div>• مرمت شدہ موبائل کی وارنٹی صرف 7 دن ہوگی۔</div>`;
  return `<hr style="border-top:1px dashed #000;margin:6px 0;"><div style="text-align:right;font-size:12px;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;direction:rtl;line-height:1.7">${type === 'repair' ? `<div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:5px">مرمت کی شرائط</div>` : ''}${common}${type === 'repair' ? repairExtra : saleExtra}</div>`;
}

function printThermal80mm(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=340,height=680');
  if (!w) return toast('Popup blocked — allow popups to print', 'error');
  let sub = Number(data.subtotal || 0), tot = Number(data.total || 0);
  const itemsSum = (data.items || []).reduce((s, it) => s + Number(it.line_total || it.total || it.amount || 0), 0);
  if (!sub || isNaN(sub)) sub = itemsSum;
  if (!tot || isNaN(tot)) tot = sub - Number(data.discount || 0) + Number(data.tax || 0);
  const itemRows = (data.items || []).map(it => `
    <tr>
      <td style="text-align:left;font-size:11px">
        ${esc(it.product_name || it.name || it.description)}
        ${it.rack ? `<br><span style="font-size:9px;color:#666">📦 ${esc(it.rack)}</span>` : ''}
        <br><span style="font-size:9px;color:#444">${esc(it.category || '')} ${it.imei ? 'IMEI: ' + esc(it.imei) : ''}</span>
      </td>
      <td style="text-align:center;font-size:11px">${it.quantity || it.qty || 1}</td>
      <td style="text-align:right;font-size:11px">${Number(it.line_total || it.total || it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');
  const taxRow = Number(data.tax || 0) > 0 ? `<div class="row"><span>Tax ${data.tax_rate || 0}%</span><span>PKR ${Number(data.tax).toLocaleString()}</span></div>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>@page{size:80mm auto;margin:4mm} body{font-family:'Courier New',monospace;width:74mm;margin:0 auto;color:#000;font-weight:bold} h2{text-align:center;margin:0 0 2px 0;font-size:18px;font-weight:900;letter-spacing:1px} .sub{text-align:center;font-size:11px;margin:1px 0} hr{border:none;border-top:2px dashed #000;margin:5px 0} table{width:100%;border-collapse:collapse;font-size:11px} th{border-bottom:2px dashed #000;padding:4px 0;font-size:11px;text-align:left} .row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0} .bold{font-weight:900;font-size:13px} .center{text-align:center;margin-top:6px;font-size:11px} .footer{text-align:center;margin-top:10px;font-size:10px;font-weight:normal;line-height:1.4}</style></head><body><h2>${esc(SHOP.name)}</h2><div class="sub">${esc(SHOP.address)}</div><div class="sub">Tel: ${esc(SHOP.phone1)} / ${esc(SHOP.phone2)}</div><hr><div class="row"><span>Invoice: <b>${esc(data.invoice)}</b></span></div><div class="row"><span>Date: ${new Date(data.date).toLocaleString('en-PK')}</span></div><div class="row"><span>Customer: ${esc(data.customer || 'Walk-in')}</span></div>${data.phone ? `<div class="row"><span>Phone: ${esc(data.phone)}</span></div>` : ''}${data.cashier ? `<div class="row"><span>Cashier: ${esc(data.cashier)}</span></div>` : ''}<hr><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemRows}</tbody></table><hr><div class="row"><span>Subtotal</span><span>PKR ${sub.toLocaleString()}</span></div><div class="row"><span>Discount</span><span>-PKR ${Number(data.discount || 0).toLocaleString()}</span></div>${taxRow}<div class="row bold"><span>Total</span><span>PKR ${tot.toLocaleString()}</span></div><div class="row"><span>Paid</span><span>PKR ${Number(data.paid || 0).toLocaleString()}</span></div><div class="row"><span>Method</span><span>${esc(data.payment_method || 'Cash')}</span></div>${data.balance > 0 ? `<div class="row bold"><span>Due</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}${urduTermsBlock(type)}<hr><div class="center">Thank you for shopping!</div><div class="center">Visit Again</div><div class="footer"><div style="font-weight:bold">Powered by MS.TECH</div><div>03099100546</div></div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script></body></html>`;
  w.document.write(html); w.document.close();
}
window.printThermal80mm = printThermal80mm;

function printA4Premium(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=920,height=1020');
  if (!w) return toast('Popup blocked', 'error');
  let sub = Number(data.subtotal || 0), tot = Number(data.total || 0);
  const itemsSum = (data.items || []).reduce((s, it) => s + Number(it.total || it.line_total || it.amount || 0), 0);
  if (!sub || isNaN(sub)) sub = itemsSum;
  if (!tot || isNaN(tot)) tot = sub - Number(data.discount || 0) + Number(data.tax || 0);
  const rows = (data.items || []).map((it, i) => `<tr><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;color:#333;font-size:14px">${i + 1}. ${esc(it.description || it.product_name || it.name)}${it.rack ? `<br><small style="color:#888">📦 ${esc(it.rack)}</small>` : ''}</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR ${Number(it.price || it.unit_price || it.total || 0).toLocaleString()}</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:center;color:#333;font-size:14px">${it.qty || it.quantity || 1}</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR ${Number(it.total || it.line_total || it.amount || 0).toLocaleString()}</td></tr>`).join('');
  const isReport = type === 'report'; const title = isReport ? 'REPORT' : 'INVOICE';
  const urduA4 = type === 'repair' ? `<div style="margin-top:20px;padding:15px;background:#fafbfd;border-radius:8px;direction:rtl;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;font-size:13px;line-height:1.9;color:#333;border:1px solid #e6e9f2"><div style="text-align:center;font-weight:bold;margin-bottom:8px">مرمت کی شرائط</div><div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div><div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div><div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div><div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div><div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div></div>` : '';
  const taxRow = Number(data.tax || 0) > 0 ? `<div class="totals-row"><span>TAX ${data.tax_rate || 0}%</span><span>PKR ${Number(data.tax).toLocaleString()}</span></div>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); *{margin:0;padding:0;box-sizing:border-box} body{font-family:'Inter',sans-serif;background:#fff;color:#333;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;min-height:100vh;padding-bottom:150px} .top-curve{position:absolute;top:0;left:0;width:100%;height:160px;background:linear-gradient(135deg,#0f172a 0%,#5b8def 50%,#7c5cff 100%);clip-path:ellipse(150% 100% at 50% 0%);z-index:1} .content{position:relative;z-index:2;padding:40px 60px} .header{display:flex;justify-content:space-between;align-items:flex-start;margin-top:60px;margin-bottom:50px} .title{font-size:48px;font-weight:800;color:#111;margin:0;line-height:1;letter-spacing:-1px} .title span{color:#5b8def;font-size:60px;line-height:0;vertical-align:bottom;margin-right:5px} .company{text-align:right;color:#fff;margin-top:-30px} .company h2{margin:0;font-size:22px;font-weight:800;letter-spacing:1px;color:#111} .company p{margin:3px 0 0;font-size:12px;color:#5b8def;font-weight:600;letter-spacing:.5px} .info{display:flex;justify-content:space-between;margin-bottom:40px;font-size:13px;color:#555} .info-col p{margin:6px 0} .info-col b{color:#333;font-weight:700} table{width:100%;border-collapse:collapse;margin-bottom:40px} th{text-align:left;color:#5b8def;font-size:16px;font-weight:700;padding:10px;text-transform:uppercase;border-bottom:2px solid #5b8def;letter-spacing:.5px} .bottom-section{display:flex;justify-content:space-between;align-items:flex-start;margin-top:40px;page-break-inside:avoid} .terms{width:45%} .terms h4{color:#5b8def;font-size:15px;font-weight:700;margin-bottom:8px} .terms p{font-size:12px;color:#666;line-height:1.6} .totals{width:40%} .totals-row{display:flex;justify-content:space-between;padding:12px 0;font-size:15px;color:#333;font-weight:600;border-bottom:1px solid #eee} .totals-row.grand{font-size:20px;color:#5b8def;font-weight:800;border-bottom:none;margin-top:5px;padding-top:15px;border-top:2px solid #5b8def} .bottom-curve{position:fixed;bottom:0;left:0;width:100%;height:100px;background:linear-gradient(135deg,#0f172a 0%,#5b8def 50%,#7c5cff 100%);clip-path:ellipse(150% 100% at 50% 100%);z-index:1} .footer{position:fixed;bottom:15px;left:0;width:100%;text-align:center;z-index:2;color:#fff;font-size:11px;line-height:1.4} @media print{body{padding-bottom:120px}.top-curve,.bottom-curve{display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="top-curve"></div><div class="content"><div class="header"><h1 class="title"><span>|</span>${title}</h1><div class="company"><h2>${esc(SHOP.name)}</h2><p>${esc(SHOP.tagline)}</p></div></div><div class="info"><div class="info-col"><p><b>${title} NO:</b> ${esc(data.invoice)}</p><p><b>DATE:</b> ${new Date(data.date).toLocaleDateString('en-GB')}</p>${data.cashier ? `<p><b>CASHIER:</b> ${esc(data.cashier)}</p>` : ''}</div><div class="info-col" style="text-align:right"><p><b>${isReport ? 'REPORT TYPE:' : 'INVOICE TO:'}</b> ${esc(data.customer || 'All Customers')}</p><p>${data.phone ? '<b>PHONE:</b> ' + esc(data.phone) : esc(SHOP.address)}</p></div></div><table><thead><tr><th>DESCRIPTION</th><th style="text-align:right">PRICE</th><th style="text-align:center">QTY.</th><th style="text-align:right">TOTAL</th></tr></thead><tbody>${rows}</tbody></table>${urduA4}<div class="bottom-section"><div class="terms"><h4>Terms and conditions</h4><p>${isReport ? 'This is a system generated report.' : 'Goods once sold will not be taken back or exchanged. Warranty claims are subject to manufacturer terms.'}</p></div><div class="totals"><div class="totals-row"><span>SUBTOTAL</span><span>PKR ${sub.toLocaleString()}</span></div><div class="totals-row"><span>DISCOUNT</span><span>PKR ${Number(data.discount || 0).toLocaleString()}</span></div>${taxRow}<div class="totals-row grand"><span>GRAND TOTAL</span><span>PKR ${tot.toLocaleString()}</span></div><div class="totals-row" style="border:none;padding-top:5px"><span>PAID</span><span>PKR ${Number(data.paid || 0).toLocaleString()}</span></div>${data.balance > 0 ? `<div class="totals-row" style="color:#dc2626;border:none;padding-top:5px"><span>BALANCE</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}</div></div></div><div class="bottom-curve"></div><div class="footer"><div style="font-weight:bold;font-size:12px">Powered by MS.TECH</div><div>03099100546</div></div><script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script></body></html>`;
  w.document.write(html); w.document.close();
}
window.printA4Premium = printA4Premium;

// =====================================================
// SIDEBAR & NAVIGATION
// =====================================================
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');

if (handle) {
  handle.addEventListener('click', e => {
    e.stopPropagation();
    const open = sidebar.classList.toggle('show');
    if (open) setTimeout(() => sidebar.classList.remove('show'), 15000);
  });
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !handle.contains(e.target)) sidebar.classList.remove('show');
  });
}

const MODULE_TITLES = { overview: 'Dashboard', inventory: 'Inventory', racks: 'Racks', purchases: 'Purchases / Products', sales: 'Sales / POS', repairing: 'Repairing', customers: 'Customers', suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses', reports: 'Reports & P&L', transactions: 'Transactions', settings: 'Staff & Logs' };
const MODULE_KEYS = { o: 'overview', i: 'inventory', k: 'racks', u: 'purchases', l: 'sales', r: 'repairing', c: 'customers', s: 'suppliers', d: 'credit', e: 'expenses', p: 'reports', t: 'transactions', ',': 'settings' };

function hasAccess(mod) {
  const permsMap = {
    sales: 'allow_pos', inventory: 'allow_inventory', racks: 'allow_inventory',
    purchases: 'allow_purchases', repairing: 'allow_repairing', customers: 'allow_customers',
    suppliers: 'allow_suppliers', credit: 'allow_credit', expenses: 'allow_expenses',
    reports: 'allow_reports', transactions: 'allow_transactions', settings: 'allow_staff'
  };
  const permKey = permsMap[mod];
  if (permKey && SHOP_PERMS[permKey] === false) return false;
  return true;
}

function navTo(mod) {
  if (!hasAccess(mod)) {
    toast('Access Denied: You do not have permission to use this section. Please contact MS.Tech.', 'error');
    return;
  }
  document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
    const m = btn.dataset.module;
    if (m && !hasAccess(m) && m !== 'overview') btn.style.display = 'none';
    else btn.style.display = 'flex';
  });
  const btn = document.querySelector(`.nav-item[data-module="${mod}"]`);
  if (!btn) return;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  const target = $('module-' + mod);
  if (target) target.classList.add('active');
  $('pageTitle').textContent = MODULE_TITLES[mod] || mod;
  loadModule(mod);
  sidebar.classList.remove('show');
}

document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => navTo(btn.dataset.module));
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview();
    case 'inventory': return loadInventory();
    case 'racks': return loadRacks();
    case 'purchases': return loadPurchasesModule();
    case 'sales': return loadSaleProducts();
    case 'repairing': return loadRepairs();
    case 'customers': return loadCustomers();
    case 'suppliers': return loadSuppliers();
    case 'credit': return loadCredit();
    case 'expenses': return loadExpenses();
    case 'transactions': return loadTransactions();
    case 'settings': return loadStaff();
  }
}

// =====================================================
// GLOBAL KEYBOARD SHORTCUTS
// =====================================================
document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (e.key === 'Escape') { closeModal(); $('notifPanel')?.classList.remove('open'); return; }
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const k = e.key.toLowerCase();
    if (MODULE_KEYS[k]) { e.preventDefault(); navTo(MODULE_KEYS[k]); return; }
  }
  if (!typing) {
    if (e.key === 'F1') { e.preventDefault(); showShortcutHelp(); }
    if (e.key === 'F2') { e.preventDefault(); $('btnAddToCart')?.click(); }
    if (e.key === 'F4') { e.preventDefault(); $('btnSaveSale')?.click(); }
    if (e.key === 'F5') { e.preventDefault(); const active = document.querySelector('.module.active')?.id.replace('module-', ''); if (active) navTo(active); toast('Refreshed', 'info'); }
    if (e.key === 'F8') { e.preventDefault(); $('btnNewPurchase')?.click(); }
    if (e.key === 'F9') { e.preventDefault(); $('btnAddExpense')?.click(); }
    if (e.key === 'F10') { e.preventDefault(); $('btnAddRepair')?.click(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector('.search-bar input')?.focus(); }
  }
});

function showShortcutHelp() {
  const body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13px">
    <div><h4 style="margin:0 0 8px">Navigation (Alt + key)</h4>
    <div style="line-height:1.9">
      <div><span class="kbd">Alt+O</span> Dashboard</div>
      <div><span class="kbd">Alt+I</span> Inventory</div>
      <div><span class="kbd">Alt+K</span> Racks</div>
      <div><span class="kbd">Alt+U</span> Purchases</div>
      <div><span class="kbd">Alt+L</span> Sales/POS</div>
      <div><span class="kbd">Alt+R</span> Repairing</div>
      <div><span class="kbd">Alt+C</span> Customers</div>
      <div><span class="kbd">Alt+D</span> Udhar</div>
      <div><span class="kbd">Alt+E</span> Expenses</div>
      <div><span class="kbd">Alt+P</span> Reports</div>
    </div></div>
    <div><h4 style="margin:0 0 8px">POS Actions</h4>
    <div style="line-height:1.9">
      <div><span class="kbd">F2</span> Add to Cart</div>
      <div><span class="kbd">F4</span> Save Sale</div>
      <div><span class="kbd">Enter</span> Next field</div>
      <div><span class="kbd">Ctrl+Enter</span> Save Form</div>
      <div><span class="kbd">Esc</span> Close Modal</div>
      <div><span class="kbd">Alt+F</span> Search racks</div>
    </div></div>
  </div>`;
  openModal('Keyboard Shortcuts', body, async () => closeModal(), 'Close');
}

// ---------------------------------------------------
// MODAL SYSTEM + AUTO ENTER NAVIGATION
// ---------------------------------------------------
let MODAL_CONFIRM = null;

function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save', isFullscreen = false) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel;
  MODAL_CONFIRM = onConfirm;
  const modalEl = document.querySelector('.modal');
  if (isFullscreen) {
    modalEl.style.maxWidth = '100%'; modalEl.style.width = '100vw'; modalEl.style.height = '100vh'; modalEl.style.maxHeight = '100vh'; modalEl.style.borderRadius = '0'; document.querySelector('.modal-backdrop').style.padding = '0';
  } else {
    modalEl.style.maxWidth = '900px'; modalEl.style.width = '100%'; modalEl.style.height = 'auto'; modalEl.style.maxHeight = '90vh'; modalEl.style.borderRadius = 'var(--radius-lg)'; document.querySelector('.modal-backdrop').style.padding = '20px';
  }
  $('modalBackdrop').classList.add('open');
  setTimeout(() => $('modalBody').querySelector('input,select,textarea')?.focus(), 80);
  setTimeout(() => attachEnterNavigation($('modalBody'), onConfirm), 120);
}

function attachEnterNavigation(root, saveCallback) {
  if (!root) return;
  const fields = Array.from(root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([readonly]), select, textarea'))
    .filter(el => el.offsetParent !== null && !el.disabled);
  fields.forEach((el, i) => {
    if (el.dataset.enterBound) return;
    el.dataset.enterBound = '1';
    el.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.altKey && !ev.ctrlKey) {
        if (el.tagName === 'TEXTAREA') return;
        ev.preventDefault();
        const next = fields[i + 1];
        if (next) { next.focus(); if (next.select) try { next.select(); } catch (_) {} }
        else { if (saveCallback) saveCallback(); }
      }
    });
  });
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter' && $('modalBackdrop').classList.contains('open')) {
    e.preventDefault();
    if (MODAL_CONFIRM) MODAL_CONFIRM().catch(err => toast(err.message || 'Error', 'error'));
  }
});

function closeModal() { $('modalBackdrop').classList.remove('open'); MODAL_CONFIRM = null; }
$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => {
  if (!MODAL_CONFIRM) return;
  try { await MODAL_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); }
};

// =====================================================
// DASHBOARD OVERVIEW
// =====================================================
async function loadOverview() {
  const [salesRes, prodsRes, custsRes, purchRes, expRes, todaySalesRes, monthSalesRes] = await Promise.all([
    supabase.from('sales').select('balance'),
    supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);
  const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  $('stProducts').textContent = (prodsRes.data || []).filter(p => p.is_active !== false).length;
  $('stStock').textContent = sum(prodsRes, 'quantity');
  $('stTodaySales').textContent = fmt(sum(todaySalesRes, 'total'));
  $('stMonthSales').textContent = fmt(sum(monthSalesRes, 'total'));
  $('stPurchases').textContent = fmt(sum(purchRes, 'total'));
  $('stCustomers').textContent = custsRes.count || 0;
  $('stOutstanding').textContent = fmt(sum(salesRes, 'balance'));
  $('stExpenses').textContent = fmt(sum(expRes, 'amount'));
  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) { $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>'; }
  else { $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`; }
  const { data: dueSales } = await supabase.from('sales').select('customer_name,balance').gt('balance', 0);
  if (dueSales && dueSales.length) {
    const badge = $('notifBadge');
    if (badge) { badge.textContent = dueSales.length; badge.style.display = 'inline-block'; }
    const panel = $('notifPanel');
    if (panel) panel.innerHTML = `<h3 style="font-size:14px;margin:0 0 10px">Pending Udhar</h3>` + dueSales.slice(0, 20).map(d => `<div class="notif-item"><b>${esc(d.customer_name || 'Walk-in')}</b> — ${fmt(d.balance)}</div>`).join('');
  }
}

// =====================================================
// PRODUCTS MODULE
// =====================================================
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  renderProductsTable();
}

function renderProductsTable() {
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products. Add from Purchase section.</div>'; return; }
  const search = ($('productSearch')?.value || '').toLowerCase().trim();
  const catF = $('productFilterCat')?.value || '';
  const brandF = $('productFilterBrand')?.value || '';
  const filtered = ALL_PRODUCTS.filter(p => {
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search) || (p.imei_1 || '').toLowerCase().includes(search) || (p.imei_2 || '').toLowerCase().includes(search);
    const matchCat = !catF || (p.category || '').toLowerCase() === catF.toLowerCase();
    const matchBrand = !brandF || (p.brand || '').toLowerCase() === brandF.toLowerCase();
    return matchSearch && matchCat && matchBrand;
  });
  const cats = [...new Set(ALL_PRODUCTS.map(p => p.category).filter(Boolean))];
  const brands = [...new Set(ALL_PRODUCTS.map(p => p.brand).filter(Boolean))];
  if ($('productFilterCat') && $('productFilterCat').options.length <= 1) $('productFilterCat').innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if ($('productFilterBrand') && $('productFilterBrand').options.length <= 1) $('productFilterBrand').innerHTML = '<option value="">All Brands</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
  if (!filtered.length) { t.innerHTML = '<div class="empty">No products match your filters.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" id="prodSelectAll" onchange="toggleAllProducts(this)"></th><th>Product</th><th>Category</th><th>Brand</th><th>IMEI 1 / 2</th><th>📦 Rack</th><th class="num">Price</th><th class="num">Stock</th><th class="actions">Actions</th></tr></thead><tbody>
    ${filtered.map(p => `<tr>
      <td><input type="checkbox" class="prod-check" value="${p.id}" onchange="updateProductBulk()"></td>
      <td><strong>${esc(p.name)}</strong><br><small style="color:#6b7896">${esc(p.sub_category || '')}</small></td>
      <td><span class="pill blue">${esc(p.category || '—')}</span></td>
      <td>${esc(p.brand || '—')}</td>
      <td><small>${esc(p.imei_1 || '—')} / ${esc(p.imei_2 || '—')}</small></td>
      <td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td>
      <td class="num">${fmt(p.sale_price)}</td>
      <td class="num"><b style="color:${p.quantity <= p.min_stock ? '#dc2626' : '#16a34a'}">${p.quantity}</b></td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

$('productSearch')?.addEventListener('input', renderProductsTable);
$('productFilterCat')?.addEventListener('change', renderProductsTable);
$('productFilterBrand')?.addEventListener('change', renderProductsTable);

window.toggleAllProducts = cb => { document.querySelectorAll('.prod-check').forEach(c => c.checked = cb.checked); updateProductBulk(); };
function updateProductBulk() { const n = document.querySelectorAll('.prod-check:checked').length; $('productBulkBar').style.display = n ? 'flex' : 'none'; $('productSelCount').textContent = n; }

window.editProduct = async id => {
  if (!checkPermission('edit')) return;
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return toast('Product not found', 'error');
  const { data: racks } = await supabase.from('racks').select('id,name').order('name');
  const body = `<div class="form-grid">
    <div class="field full"><label>Name *</label><input id="peName" value="${esc(p.name)}"></div>
    <div class="field"><label>Category</label><select id="peCat">${CATEGORIES.map(c => `<option ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Brand</label><select id="peBrand"><option value="">— None —</option>${BRANDS.map(b => `<option ${p.brand === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    <div class="field"><label>Purchase Price</label><input id="pePPrice" type="number" value="${p.purchase_price || 0}"></div>
    <div class="field"><label>Sale Price</label><input id="peSPrice" type="number" value="${p.sale_price || 0}"></div>
    <div class="field"><label>Quantity</label><input id="peQty" type="number" value="${p.quantity || 0}"></div>
    <div class="field"><label>Min Stock</label><input id="peMin" type="number" value="${p.min_stock || 3}"></div>
    <div class="field"><label>IMEI 1</label><input id="peImei1" value="${esc(p.imei_1 || '')}"></div>
    <div class="field"><label>IMEI 2</label><input id="peImei2" value="${esc(p.imei_2 || '')}"></div>
    <div class="field full"><label>📦 Rack</label><select id="peRack"><option value="">— Unassigned —</option>${(racks || []).map(r => `<option value="${r.id}" ${p.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
  </div>`;
  openModal('Edit Product', body, async () => {
    const payload = {
      name: $('peName').value.trim(), category: $('peCat').value, brand: $('peBrand').value || null,
      purchase_price: Number($('pePPrice').value) || 0, sale_price: Number($('peSPrice').value) || 0,
      quantity: Number($('peQty').value) || 0, min_stock: Number($('peMin').value) || 3,
      imei_1: $('peImei1').value.trim() || null, imei_2: $('peImei2').value.trim() || null,
      rack_id: $('peRack').value || null
    };
    if (!payload.name) throw new Error('Name required');
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await logActivity('EDIT', 'products', payload.name);
    closeModal(); toast('Product updated', 'success'); loadProducts();
  });
};

window.deleteProduct = async id => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete this product? Sales history preserved.')) return;
  try {
    await supabase.from('sale_items').update({ product_id: null }).eq('product_id', id);
    await supabase.from('purchase_items').update({ product_id: null }).eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'products', id);
    toast('Product deleted', 'success'); loadProducts();
  } catch (err) { toast(err.message, 'error'); }
};

window.bulkDeleteProducts = async () => {
  if (!checkPermission('delete')) return;
  const ids = [...document.querySelectorAll('.prod-check:checked')].map(c => c.value);
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} products? Sales history will be preserved.`)) return;
  try {
    await supabase.from('sale_items').update({ product_id: null }).in('product_id', ids);
    await supabase.from('purchase_items').update({ product_id: null }).in('product_id', ids);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;
    await logActivity('BULK_DELETE', 'products', `Deleted ${ids.length} products`);
    toast(`Deleted ${ids.length} products successfully`, 'success'); loadProducts();
  } catch (err) { toast(err.message, 'error'); }
};

// =====================================================
// INVENTORY
// =====================================================
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML = '<option value="">All Racks</option>' + (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(200);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>IMEI</th><th>📦 Rack</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td><small>${esc(p.imei_1 || '—')}</small></td><td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}</tbody></table>`;
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase.from('sale_items').select('product_name,quantity,created_at,sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchase_items').select('product_name,quantity,created_at,purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50)
  ]);
  const movements = [...(saleItems || []).map(m => ({ type: 'OUT', name: m.product_name, qty: m.quantity, ref: m.sales?.invoice_no, date: m.created_at })), ...(purchItems || []).map(m => ({ type: 'IN', name: m.product_name, qty: m.quantity, ref: m.purchases?.invoice_no, date: m.created_at }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 60);
  $('movementsTable').innerHTML = movements.length ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref || '—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No movements.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);

// =====================================================
// RACKS (from v34 — unchanged)
// =====================================================
let RACK_SEARCH = '';
async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  ALL_RACKS = racks || [];
  const { data: rackProducts } = await supabase.from('products').select('rack_id,quantity,sale_price,name').not('rack_id', 'is', null);
  const countMap = {}, qtyMap = {}, valueMap = {};
  (rackProducts || []).forEach(p => {
    if (!p.rack_id) return;
    countMap[p.rack_id] = (countMap[p.rack_id] || 0) + 1;
    qtyMap[p.rack_id] = (qtyMap[p.rack_id] || 0) + Number(p.quantity || 0);
    valueMap[p.rack_id] = (valueMap[p.rack_id] || 0) + Number(p.quantity || 0) * Number(p.sale_price || 0);
  });
  const search = (RACK_SEARCH || '').toLowerCase().trim();
  const filtered = ALL_RACKS.filter(r => !search || (r.name || '').toLowerCase().includes(search) || (r.description || '').toLowerCase().includes(search));
  const t = $('racksTable');
  if (!filtered.length) {
    t.innerHTML = `<div class="empty">${ALL_RACKS.length ? 'No racks match search.' : 'No racks yet. Click + Add Rack or press Alt+A.'}</div>`;
  } else {
    t.innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th class="num">Products</th><th class="num">Total Qty</th><th class="num">Value</th><th>Actions</th></tr></thead><tbody>
      ${filtered.map(r => `<tr>
        <td><b>${esc(r.name)}</b></td>
        <td>${esc(r.description || '—')}</td>
        <td class="num">${countMap[r.id] || 0}</td>
        <td class="num">${qtyMap[r.id] || 0}</td>
        <td class="num">${fmt(valueMap[r.id] || 0)}</td>
        <td class="actions" style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="viewRackStock('${r.id}','${esc(r.name)}')">View</button>
          <button class="btn btn-ghost btn-sm" onclick="editRack('${r.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="assignProductsToRack('${r.id}','${esc(r.name)}')">Assign</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Del</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
  }
  const { data: stock } = await supabase.from('products').select('id,name,quantity,sale_price,racks!fk_products_racks(name)').order('name');
  const stockBox = $('rackStockTable');
  if (stockBox) {
    stockBox.innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Qty</th><th class="num">Value</th></tr></thead><tbody>
      ${(stock || []).map(p => `<tr><td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity || 0)}</td><td class="num">${fmt(Number(p.quantity || 0) * Number(p.sale_price || 0))}</td></tr>`).join('')}
    </tbody></table>`;
  }
  bindRackShortcuts();
}

function bindRackShortcuts() {
  if (window._rackKeyHandler) document.removeEventListener('keydown', window._rackKeyHandler);
  window._rackKeyHandler = e => {
    if (!$('module-racks')?.classList.contains('active')) return;
    if ($('modalBackdrop').classList.contains('open')) return;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (typing) return;
    const k = e.key.toLowerCase();
    if (e.altKey && k === 'a') { e.preventDefault(); openRackModal(); }
    if (e.altKey && k === 'f') { e.preventDefault(); $('rackSearchInput')?.focus(); }
  };
  document.addEventListener('keydown', window._rackKeyHandler);
}

$('rackSearchInput')?.addEventListener('input', e => { RACK_SEARCH = e.target.value; loadRacks(); });
$('btnAddRack').onclick = () => openRackModal();

function openRackModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field full"><label>Rack Name *</label><input id="rackName" value="${esc(r?.name || '')}" placeholder="e.g. Rack A / Shelf 1 / Drawer 3"></div>
    <div class="field full"><label>Description</label><input id="rackDesc" value="${esc(r?.description || '')}" placeholder="e.g. Mobile Phones, Left side"></div>
  </div>
  <p style="margin-top:12px;font-size:12px;color:var(--muted)">💡 <b>Enter</b> = next field / save &nbsp;|&nbsp; <b>Ctrl+Enter</b> = save</p>`;
  openModal(r ? 'Edit Rack' : 'Add Rack', body, async () => {
    const name = $('rackName').value.trim();
    if (!name) throw new Error('Rack name is required');
    const payload = { name, description: $('rackDesc').value.trim() || null };
    let res;
    if (r) res = await supabase.from('racks').update(payload).eq('id', r.id);
    else res = await supabase.from('racks').insert(payload);
    if (res.error) throw new Error(res.error.message);
    await logActivity(r ? 'EDIT' : 'CREATE', 'racks', name);
    closeModal(); toast(`Rack ${r ? 'updated' : 'added'} ✅`, 'success'); loadRacks();
  }, r ? 'Update Rack' : 'Add Rack');
}
window.editRack = id => { if (!checkPermission('edit')) return; const r = ALL_RACKS.find(x => x.id === id); if (!r) return toast('Rack not found', 'error'); openRackModal(r); };
window.deleteRack = async id => {
  if (!checkPermission('delete')) return;
  const r = ALL_RACKS.find(x => x.id === id);
  if (!confirm(`Delete rack "${r?.name || id}"? Products will become Unassigned.`)) return;
  try {
    await supabase.from('products').update({ rack_id: null }).eq('rack_id', id);
    const { error } = await supabase.from('racks').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'racks', r?.name || id);
    toast('Rack deleted', 'success'); loadRacks();
  } catch (e) { toast(e.message, 'error'); }
};
window.viewRackStock = async (rackId, rackName) => {
  const { data: prods } = await supabase.from('products').select('*').eq('rack_id', rackId);
  if (!prods?.length) return toast('No products in this rack', 'error');
  const totalQty = prods.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const totalValue = prods.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.sale_price || 0)), 0);
  const body = `<div style="margin-bottom:12px;padding:12px;background:#fafbfd;border-radius:8px"><b>${esc(rackName)}</b><br>Total Products: <b>${prods.length}</b> | Total Qty: <b>${totalQty}</b> | Value: <b>${fmt(totalValue)}</b></div>
  <table class="data"><thead><tr><th>Product</th><th>Category</th><th class="num">Qty</th><th class="num">Price</th></tr></thead><tbody>
    ${prods.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td class="num">${p.quantity}</td><td class="num">${fmt(p.sale_price)}</td></tr>`).join('')}
  </tbody></table>`;
  openModal(`Rack: ${rackName}`, body, async () => closeModal(), 'Close');
};
window.assignProductsToRack = async (rackId, rackName) => {
  if (!checkPermission('edit')) return;
  const { data: prods } = await supabase.from('products').select('id,name,category,rack_id,quantity').order('name');
  const list = prods || [];
  const body = `<div style="margin-bottom:10px;padding:10px;background:#fafbfd;border-radius:8px">Rack: <b>${esc(rackName)}</b> — tick products to assign:</div>
    <div class="field full"><input id="assignSearch" placeholder="Search..." oninput="filterAssignList()"></div>
    <div id="assignList" style="max-height:400px;overflow-y:auto;margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:8px">
      ${list.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer">
        <input type="checkbox" class="assign-check" value="${p.id}" ${p.rack_id === rackId ? 'checked' : ''}>
        <span style="flex:1">${esc(p.name)} <small style="color:#999">(${esc(p.category || '—')}) — qty ${p.quantity}</small></span>
      </label>`).join('')}
    </div>`;
  openModal(`Assign → ${rackName}`, body, async () => {
    const selected = [...document.querySelectorAll('.assign-check:checked')].map(c => c.value);
    const allIds = list.map(p => p.id);
    const toRemove = allIds.filter(id => !selected.includes(id) && list.find(p => p.id === id)?.rack_id === rackId);
    if (toRemove.length) await supabase.from('products').update({ rack_id: null }).in('id', toRemove);
    if (selected.length) await supabase.from('products').update({ rack_id: rackId }).in('id', selected);
    await logActivity('ASSIGN', 'racks', `${selected.length} products → ${rackName}`);
    closeModal(); toast('Rack assignments saved ✅', 'success'); loadRacks();
  }, 'Save Assignments');
};
window.filterAssignList = () => {
  const q = ($('assignSearch')?.value || '').toLowerCase().trim();
  document.querySelectorAll('#assignList label').forEach(l => {
    l.style.display = !q || l.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
  });
};

// =====================================================
// PURCHASES (unchanged from v34)
// =====================================================
async function loadPurchasesModule() {
  await loadProducts();
  const { data, error } = await supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
  const t = $('purchasesTable'); if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(p => `<tr><td><b>${esc(p.invoice_no || p.id.slice(0, 6))}</b></td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td><small>${new Date(p.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="editPurchase('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePurchase('${p.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('btnPurchasesHistory').onclick = () => { const box = $('purchasesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadPurchasesModule(); };
$('btnRefreshPurchases').onclick = loadPurchasesModule;
window.deletePurchase = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete purchase?')) return; await supabase.from('purchases').delete().eq('id', id); await logActivity('DELETE', 'purchases', id); toast('Deleted'); loadPurchasesModule(); };
window.editPurchase = async id => { if (!checkPermission('edit')) return; const { data: p } = await supabase.from('purchases').select('*').eq('id', id).single(); if (p) openPurchaseModal(p); };
$('btnNewPurchase').onclick = () => openPurchaseModal();

async function openPurchaseModal(p = null) {
  const { data: sups } = await supabase.from('suppliers').select('id,name').order('name');
  const { data: racks } = await supabase.from('racks').select('id,name').order('name');
  const prodOptions = ALL_PRODUCTS.map(prod => `<option value="${esc(prod.name)}|${esc(prod.category)}|${esc(prod.brand || '')}" data-id="${prod.id}" data-name="${esc(prod.name)}" data-cat="${esc(prod.category)}" data-brand="${esc(prod.brand || '')}" data-buy="${prod.purchase_price}" data-sale="${prod.sale_price}" data-imei1="${esc(prod.imei_1 || '')}" data-imei2="${esc(prod.imei_2 || '')}">${esc(prod.name)} (${esc(prod.category)})</option>`).join('');
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups || []).map(s => `<option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no || '')}" placeholder="Auto-generated if blank"></div>
      <div class="field"><label>Total (PKR) <small>(Auto)</small></label><input id="puTotal" type="number" value="${p?.total || 0}" readonly style="background:#f0f2f7;cursor:not-allowed;font-weight:bold;color:var(--primary)"></div>
      <div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid || 0}"></div>
      <div class="field full"><label>Notes</label><input id="puNotes" value="${esc(p?.notes || '')}"></div>
    </div>
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div><h4 style="margin:0;font-size:15px">Products / Items</h4><p style="margin:2px 0 0;font-size:11px;color:var(--muted)">Type name to auto-fill. <b>Alt+A</b> add row, <b>Ctrl+Enter</b> save.</p></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-ghost btn-sm" onclick="addCustomCategory()">+ Category</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="addCustomBrand()">+ Brand</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="addPurchaseItemRow()">+ Add Item</button>
        </div>
      </div>
      <div class="purchase-item-row row-header"><div>Product Name (Search)</div><div>Category</div><div>Brand</div><div>Qty</div><div>Buy Price</div><div>Sale Price</div><div>IMEI 1</div><div>IMEI 2</div><div>Rack</div><div></div></div>
      <div id="purchaseItemsHost" style="max-height: calc(100vh - 400px);overflow-y:auto;padding-right:4px"></div>
    </div>
    <datalist id="prodMasterList">${prodOptions}</datalist>
    <datalist id="rackMasterList">${(racks || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</datalist>
  `;
  openModal(p ? 'Edit Purchase' : 'New Purchase Invoice', body, async () => {
    const total = Number($('puTotal').value) || 0;
    const invoiceNo = $('puInv').value.trim() || ('PUR-' + Date.now().toString().slice(-6));
    const payload = { supplier_id: $('puSup').value || null, invoice_no: invoiceNo, total, paid: Number($('puPaid').value) || 0, notes: $('puNotes').value.trim() || null };
    let purchaseId = p?.id;
    if (p) {
      const { error } = await supabase.from('purchases').update(payload).eq('id', p.id);
      if (error) throw new Error(error.message);
      await supabase.from('purchase_items').delete().eq('purchase_id', p.id);
    } else {
      const { data: created, error } = await supabase.from('purchases').insert(payload).select().single();
      if (error) throw new Error(error.message);
      purchaseId = created.id;
    }
    const itemRows = document.querySelectorAll('#purchaseItemsHost .purchase-item-row');
    let itemsProcessed = 0;
    for (const row of itemRows) {
      const name = row.querySelector('.pi-name').value.trim(); if (!name) continue;
      const category = row.querySelector('.pi-category').value;
      const brand = row.querySelector('.pi-brand').value.trim();
      const qty = Number(row.querySelector('.pi-qty').value) || 0;
      const pprice = Number(row.querySelector('.pi-pprice').value) || 0;
      const sprice = Number(row.querySelector('.pi-sprice').value) || 0;
      const imei1 = row.querySelector('.pi-imei1').value.trim() || null;
      const imei2 = row.querySelector('.pi-imei2').value.trim() || null;
      const rackId = row.querySelector('.pi-rack').value || null;
      await supabase.from('purchase_items').insert({ purchase_id: purchaseId, product_name: name, category, quantity: qty, unit_price: pprice, line_total: qty * pprice, imei_1: imei1, imei_2: imei2 });
      const searchName = name.toLowerCase().replace(/\s+/g, ' ').trim();
      const { data: allProds } = await supabase.from('products').select('*');
      const existing = allProds?.find(pr => pr.name.toLowerCase().replace(/\s+/g, ' ').trim() === searchName && pr.category === category && (pr.brand || '').toLowerCase() === (brand || '').toLowerCase());
      if (existing) {
        await supabase.from('products').update({ quantity: Number(existing.quantity || 0) + qty, purchase_price: pprice || existing.purchase_price, sale_price: sprice || existing.sale_price, imei_1: imei1 || existing.imei_1, imei_2: imei2 || existing.imei_2, rack_id: rackId || existing.rack_id }).eq('id', existing.id);
      } else {
        await supabase.from('products').insert({ name, category, brand: brand || null, quantity: qty, purchase_price: pprice, sale_price: sprice, min_stock: 3, imei_1: imei1, imei_2: imei2, rack_id: rackId });
      }
      itemsProcessed++;
    }
    if (itemsProcessed === 0) throw new Error('Please add at least one valid product');
    await logActivity(p ? 'EDIT' : 'CREATE', 'purchases', `Invoice ${invoiceNo} - ${itemsProcessed} items`);
    closeModal(); toast('Purchase saved & products synced!', 'success'); loadPurchasesModule(); loadOverview();
  }, p ? 'Update Purchase' : 'Save Purchase', true);
  setTimeout(() => {
    if (p) {
      supabase.from('purchase_items').select('*').eq('purchase_id', p.id).then(({ data: items }) => {
        (items || []).forEach(it => addPurchaseItemRow(it));
        updatePurchaseTotal();
      });
    } else { addPurchaseItemRow(); updatePurchaseTotal(); }
  }, 50);
}

window.addCustomCategory = () => {
  const newCat = prompt('Enter new category name:');
  if (newCat && newCat.trim() && !CATEGORIES.includes(newCat.trim())) {
    CATEGORIES.push(newCat.trim());
    document.querySelectorAll('.pi-category').forEach(sel => { sel.innerHTML += `<option value="${newCat.trim()}">${newCat.trim()}</option>`; });
    toast('Category added: ' + newCat, 'success');
  }
};
window.addCustomBrand = () => {
  const newBrand = prompt('Enter new brand name:');
  if (newBrand && newBrand.trim() && !BRANDS.includes(newBrand.trim())) {
    BRANDS.push(newBrand.trim());
    toast('Brand added: ' + newBrand, 'success');
  }
};
window.addPurchaseItemRow = (existingData = null) => {
  const host = $('purchaseItemsHost'); if (!host) return;
  const div = document.createElement('div');
  div.className = 'purchase-item-row';
  const nameVal = existingData ? esc(existingData.product_name) : '';
  const catVal = existingData ? existingData.category : '';
  const brandVal = existingData ? esc(existingData.brand || '') : '';
  const qtyVal = existingData ? existingData.quantity : 1;
  const ppriceVal = existingData ? existingData.unit_price : 0;
  const spriceVal = existingData ? (ALL_PRODUCTS.find(p=>p.name===existingData.product_name)?.sale_price || 0) : 0;
  const imei1Val = existingData ? esc(existingData.imei_1 || '') : '';
  const imei2Val = existingData ? esc(existingData.imei_2 || '') : '';
  div.innerHTML = `
    <input class="pi-name" list="prodMasterList" placeholder="Search Product..." value="${nameVal}" oninput="handleProductAutoFill(this)">
    <select class="pi-category">${CATEGORIES.map(c => `<option ${catVal === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <input class="pi-brand" placeholder="Brand" list="brandList" value="${brandVal}">
    <input class="pi-qty" type="number" value="${qtyVal}" min="1" placeholder="Qty" oninput="updatePurchaseTotal()">
    <input class="pi-pprice" type="number" value="${ppriceVal}" placeholder="Buy" oninput="updatePurchaseTotal()">
    <input class="pi-sprice" type="number" value="${spriceVal}" placeholder="Sale">
    <input class="pi-imei1" placeholder="IMEI 1" value="${imei1Val}">
    <input class="pi-imei2" placeholder="IMEI 2" value="${imei2Val}">
    <select class="pi-rack"><option value="">— Rack —</option>${(($('rackMasterList')?.innerHTML || '').match(/value="([^"]+)">([^<]+)/g) || []).map(m => { const parts = m.match(/value="([^"]+)">([^<]+)/); return `<option value="${parts[1]}" ${existingData?.rack_id === parts[1] ? 'selected' : ''}>${parts[2]}</option>`; }).join('')}</select>
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentNode.remove(); updatePurchaseTotal();">×</button>
  `;
  host.appendChild(div);
};
window.handleProductAutoFill = (input) => {
  const val = input.value;
  const datalist = document.getElementById('prodMasterList');
  if (!datalist) return;
  const option = Array.from(datalist.options).find(opt => opt.value === val);
  if (option) {
    const row = input.parentElement;
    row.querySelector('.pi-category').value = option.dataset.cat;
    row.querySelector('.pi-brand').value = option.dataset.brand;
    row.querySelector('.pi-pprice').value = option.dataset.buy;
    row.querySelector('.pi-sprice').value = option.dataset.sale;
    row.querySelector('.pi-imei1').value = option.dataset.imei1;
    row.querySelector('.pi-imei2').value = option.dataset.imei2;
    updatePurchaseTotal();
    toast('Existing details auto-filled!', 'info');
  }
};
window.updatePurchaseTotal = () => {
  let total = 0;
  document.querySelectorAll('#purchaseItemsHost .purchase-item-row').forEach(row => {
    const qty = Number(row.querySelector('.pi-qty').value) || 0;
    const pprice = Number(row.querySelector('.pi-pprice').value) || 0;
    total += qty * pprice;
  });
  if($('puTotal')) $('puTotal').value = total;
};

// =====================================================
// SALES / POS — v35 FULL UPGRADE
// =====================================================
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;
let POS_ALL_PRODS = [];
let HELD_CARTS = JSON.parse(localStorage.getItem('bm_held_carts') || '[]');
let POS_TAX_RATE = Number(SHOP.tax_rate || 0);
let POS_TAX_ENABLED = SHOP.tax_enabled === true;
let POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };

async function loadPosCustomers() {
  const { data } = await supabase.from('customers').select('id,name,phone').order('name');
  POS_CUSTOMERS = data || [];
  if ($('posCustomerOptions')) $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');
}
async function updatePosCustomerDue() {
  const name = $('saleCustName')?.value.trim(); const phone = $('saleCustPhone')?.value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; if ($('previousDueBox')) $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance', 0);
  POS_PREVIOUS_DUE = (data || []).reduce((n, x) => n + Number(x.balance || 0), 0);
  if ($('previousDueAmount')) $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE);
  if ($('previousDueBox')) $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName')?.addEventListener('change', updatePosCustomerDue);
$('saleCustPhone')?.addEventListener('change', updatePosCustomerDue);

// ✅ Load POS
async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*,racks!fk_products_racks(name)').gt('quantity', 0).order('name');
  POS_ALL_PRODS = data || [];
  // Category filter
  const cats = [...new Set(POS_ALL_PRODS.map(p => p.category).filter(Boolean))];
  if ($('saleCategoryFilter')) $('saleCategoryFilter').innerHTML = '<option value="">— All Categories —</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterPosProducts();
  renderCart();
  loadPosTaxUI();
}

// ✅ Smart Product Search (Name, SKU, IMEI, Model, Barcode)
window.filterPosProducts = () => {
  const cat = $('saleCategoryFilter')?.value || '';
  const q = ($('posProductSearch')?.value || '').toLowerCase().trim();
  let filtered = cat ? POS_ALL_PRODS.filter(p => p.category === cat) : POS_ALL_PRODS;
  if (q) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      (p.imei_1 || '').toLowerCase().includes(q) ||
      (p.imei_2 || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
    );
  }
  const sel = $('saleProductSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Choose Product —</option>' + filtered.map(p => {
    const rack = p.racks?.name ? `📦 ${p.racks.name}` : '📦 —';
    return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-imei2="${esc(p.imei_2 || '')}" data-cat="${esc(p.category)}" data-brand="${esc(p.brand || '')}" data-stock="${p.quantity}" data-rack="${esc(p.racks?.name || 'Unassigned')}">${esc(p.name)} — ${fmt(p.sale_price)} | Stock: ${p.quantity} | ${rack}</option>`;
  }).join('');
};

$('saleCategoryFilter')?.addEventListener('change', filterPosProducts);
$('posProductSearch')?.addEventListener('input', filterPosProducts);

// ✅ Barcode Scanner — scan karte hi product add
$('posBarcodeInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const code = e.target.value.trim();
    if (!code) return;
    const prod = POS_ALL_PRODS.find(p =>
      (p.barcode || '').toLowerCase() === code.toLowerCase() ||
      (p.imei_1 || '').toLowerCase() === code.toLowerCase() ||
      (p.imei_2 || '').toLowerCase() === code.toLowerCase() ||
      (p.sku || '').toLowerCase() === code.toLowerCase()
    );
    if (prod) {
      addProductToCart(prod.id);
      toast(`Added: ${prod.name}`, 'success');
    } else {
      toast(`No product found for: ${code}`, 'error');
    }
    e.target.value = '';
  }
});

// ✅ Add to Cart
function addProductToCart(productId) {
  const p = POS_ALL_PRODS.find(x => x.id === productId);
  if (!p) return toast('Product not found', 'error');
  const stock = Number(p.quantity) || 0;
  const existing = CART.find(c => c.product_id === productId);
  if (existing && existing.quantity + 1 > stock) return toast('Stock limit reached', 'error');
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({
    product_id: p.id, product_name: p.name, imei: p.imei_1 || '', imei_2: p.imei_2 || '',
    category: p.category, brand: p.brand, unit_price: Number(p.sale_price) || 0,
    quantity: 1, line_total: Number(p.sale_price) || 0, stock,
    rack: p.racks?.name || 'Unassigned', discount: 0
  });
  renderCart();
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect');
  if (!sel || !sel.value) return toast('Select a product first', 'error');
  addProductToCart(sel.value);
};

// ✅ Cart render with product-wise discount, rack, IMEI
function renderCart() {
  const host = $('cartItems');
  if (!host) return;
  if (!CART.length) { host.innerHTML = '<div class="empty">Cart is empty</div>'; }
  else {
    host.innerHTML = `<table class="cart-mini"><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Disc</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${CART.map((c, i) => `<tr>
        <td>
          <b>${esc(c.product_name)}</b><br>
          <small style="color:#888">📦 ${esc(c.rack || '—')} ${c.imei ? '| IMEI: ' + esc(c.imei) : ''}</small>
        </td>
        <td class="num"><input type="number" value="${c.unit_price}" style="width:64px;padding:3px;text-align:right;border:1px solid var(--border);border-radius:5px;font-size:11px" onchange="updateCartPrice(${i},this.value)"></td>
        <td class="num"><input type="number" value="${c.discount || 0}" style="width:50px;padding:3px;text-align:right;border:1px solid var(--border);border-radius:5px;font-size:11px" onchange="updateCartDiscount(${i},this.value)" title="Line discount (PKR)"></td>
        <td class="num" style="white-space:nowrap"><button class="qty-btn" onclick="decCartQty(${i})">−</button><b style="margin:0 6px">${c.quantity}</b><button class="qty-btn" onclick="incCartQty(${i})">+</button></td>
        <td class="num">${fmt(c.line_total - (c.discount || 0) * c.quantity)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }
  recalcPosTotals();
}

function recalcPosTotals() {
  let sub = 0, lineDisc = 0;
  CART.forEach(c => {
    const base = c.unit_price * c.quantity;
    const d = (c.discount || 0) * c.quantity;
    sub += base;
    lineDisc += d;
  });
  // Bill-wise discount
  let billDisc = Number($('saleDiscount')?.value) || 0;
  if ($('saleDiscountType')?.value === 'pct') billDisc = ((sub - lineDisc) * billDisc) / 100;
  const afterDisc = Math.max(0, sub - lineDisc - billDisc);
  // Tax
  const taxAmt = POS_TAX_ENABLED ? (afterDisc * POS_TAX_RATE) / 100 : 0;
  const finalTotal = afterDisc + taxAmt + POS_PREVIOUS_DUE;

  if ($('cartSubtotal')) $('cartSubtotal').textContent = fmt(sub);
  if ($('cartLineDisc')) $('cartLineDisc').textContent = fmt(lineDisc);
  if ($('cartBillDisc')) $('cartBillDisc').textContent = fmt(billDisc);
  if ($('cartTax')) { $('cartTax').textContent = fmt(taxAmt); $('cartTaxRow') && ($('cartTaxRow').style.display = POS_TAX_ENABLED ? 'flex' : 'none'); }
  if ($('cartTotal')) $('cartTotal').textContent = fmt(finalTotal);
  if ($('salePaid')) $('salePaid').value = finalTotal;
  if ($('udharWarning')) $('udharWarning').style.display = (finalTotal - (Number($('salePaid')?.value) || 0) > 0) ? 'block' : 'none';
}

function loadPosTaxUI() {
  if ($('posTaxRate')) $('posTaxRate').value = POS_TAX_RATE;
  if ($('posTaxEnabled')) $('posTaxEnabled').checked = POS_TAX_ENABLED;
  recalcPosTotals();
}

window.removeCart = i => { CART.splice(i, 1); renderCart(); };
window.incCartQty = i => { const c = CART[i]; if (c.quantity + 1 > c.stock) return toast('Stock limit', 'error'); c.quantity++; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.decCartQty = i => { const c = CART[i]; if (c.quantity <= 1) return window.removeCart(i); c.quantity--; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.updateCartPrice = (i, val) => { const c = CART[i]; c.unit_price = Number(val) || 0; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.updateCartDiscount = (i, val) => { const c = CART[i]; c.discount = Number(val) || 0; renderCart(); };

$('saleDiscount')?.addEventListener('input', recalcPosTotals);
$('saleDiscountType')?.addEventListener('change', recalcPosTotals);
$('salePaid')?.addEventListener('input', recalcPosTotals);
$('posTaxRate')?.addEventListener('input', e => { POS_TAX_RATE = Number(e.target.value) || 0; recalcPosTotals(); });
$('posTaxEnabled')?.addEventListener('change', e => { POS_TAX_ENABLED = e.target.checked; recalcPosTotals(); });

// ✅ Multiple payments split
function openPaymentSplitModal() {
  const total = Number(($('cartTotal')?.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  const body = `<div style="display:grid;gap:10px">
    <p style="margin:0 0 6px;font-size:13px;color:var(--muted)">Total: <b>${fmt(total)}</b> — split across methods</p>
    ${['Cash', 'Card', 'Easypaisa', 'JazzCash', 'Bank'].map(m => `
      <div class="field"><label>${m}</label><input type="number" data-pay="${m}" value="${POS_PAYMENTS[m] || 0}" placeholder="0"></div>
    `).join('')}
    <div id="splitSum" style="padding:10px;background:#fafbfd;border-radius:6px;font-size:13px;text-align:center">
      Sum: <b id="splitSumAmt">PKR 0</b>
    </div>
  </div>`;
  openModal('Split Payments', body, async () => {
    let sum = 0;
    document.querySelectorAll('[data-pay]').forEach(inp => {
      const m = inp.dataset.pay; POS_PAYMENTS[m] = Number(inp.value) || 0; sum += POS_PAYMENTS[m];
    });
    if ($('salePaid')) $('salePaid').value = sum;
    closeModal(); recalcPosTotals();
  }, 'Apply');
  setTimeout(() => {
    const updateSum = () => {
      let s = 0; document.querySelectorAll('[data-pay]').forEach(i => s += Number(i.value) || 0);
      if ($('splitSumAmt')) $('splitSumAmt').textContent = fmt(s);
    };
    document.querySelectorAll('[data-pay]').forEach(i => i.addEventListener('input', updateSum));
    updateSum();
  }, 100);
}
$('btnSplitPayment')?.addEventListener('click', openPaymentSplitModal);

// ✅ Hold / Resume
$('btnHoldSale')?.addEventListener('click', () => {
  if (!CART.length) return toast('Cart empty', 'error');
  const name = $('saleCustName').value.trim() || prompt('Hold name (optional):', 'Held Sale');
  HELD_CARTS.push({ id: Date.now(), name: name || 'Held Sale', cart: [...CART], discount: Number($('saleDiscount').value) || 0, time: new Date().toISOString() });
  localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  CART = []; $('saleDiscount').value = 0; $('saleCustName').value = ''; $('saleCustPhone').value = '';
  POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };
  renderCart(); toast('Sale held!', 'success');
});
$('btnResumeSale')?.addEventListener('click', () => {
  if (!HELD_CARTS.length) return toast('No held sales', 'error');
  const list = HELD_CARTS.map((h, i) => `${i + 1}. ${h.name} — ${fmt(h.cart.reduce((s, c) => s + c.line_total, 0))} (${new Date(h.time).toLocaleTimeString()})`).join('\n');
  const pick = prompt(`Held sales:\n${list}\n\nEnter number to resume:`, '1');
  const idx = Number(pick) - 1;
  if (isNaN(idx) || !HELD_CARTS[idx]) return;
  CART = [...HELD_CARTS[idx].cart]; $('saleDiscount').value = HELD_CARTS[idx].discount || 0;
  HELD_CARTS.splice(idx, 1); localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  renderCart(); toast('Sale resumed', 'success');
});

// ✅ Save Sale — includes tax, line/bill discount, rack, IMEI, cashier, payment method
$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart is empty', 'error');
  let sub = 0, lineDisc = 0;
  CART.forEach(c => { sub += c.unit_price * c.quantity; lineDisc += (c.discount || 0) * c.quantity; });
  let billDisc = Number($('saleDiscount').value) || 0;
  if ($('saleDiscountType').value === 'pct') billDisc = ((sub - lineDisc) * billDisc) / 100;
  const afterDisc = Math.max(0, sub - lineDisc - billDisc);
  const taxAmt = POS_TAX_ENABLED ? (afterDisc * POS_TAX_RATE) / 100 : 0;
  const totalSale = afterDisc + taxAmt;
  const paid = Number($('salePaid').value) || 0;
  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  const custPhone = $('saleCustPhone').value.trim();
  const payMethod = $('salePaymentMethod').value || 'Cash';
  // Choose primary method from split if any
  let primaryMethod = payMethod;
  const splitEntries = Object.entries(POS_PAYMENTS).filter(([, v]) => Number(v) > 0);
  if (splitEntries.length > 1) primaryMethod = 'Split';
  else if (splitEntries.length === 1) primaryMethod = splitEntries[0][0];

  $('btnSaveSale').disabled = true; $('btnSaveSale').textContent = 'Saving...';
  try {
    let customerId = null;
    if (custName !== 'Walk-in Customer') {
      let found = POS_CUSTOMERS.find(c => (custPhone && c.phone === custPhone) || c.name.toLowerCase() === custName.toLowerCase());
      if (!found) {
        const { data: created, error: ce } = await supabase.from('customers').insert({ name: custName, phone: custPhone || null, opening_balance: 0 }).select('id,name,phone').single();
        if (ce) throw new Error('Customer: ' + ce.message);
        found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }
    const invNo = 'INV-' + Date.now().toString().slice(-6);
    const salePayload = {
      invoice_no: invNo, customer_id: customerId, customer_name: custName,
      customer_phone: custPhone || null, subtotal: sub, discount: lineDisc + billDisc,
      tax: taxAmt, tax_rate: POS_TAX_ENABLED ? POS_TAX_RATE : 0,
      total: totalSale, paid, balance: totalSale - paid,
      payment_method: primaryMethod,
      payment_split: splitEntries.length > 0 ? JSON.stringify(POS_PAYMENTS) : null,
      cashier_id: CURRENT_STAFF, cashier_name: CURRENT_NAME
    };
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert(salePayload).select().single();
    if (saleErr) throw new Error('Sale: ' + saleErr.message);

    const items = CART.map(c => ({
      sale_id: saleData.id, product_id: c.product_id, product_name: c.product_name,
      imei: c.imei || null, imei_2: c.imei_2 || null, quantity: c.quantity,
      unit_price: c.unit_price, line_total: c.line_total,
      line_discount: (c.discount || 0) * c.quantity, category: c.category,
      rack_name: c.rack || null
    }));
    const { error: itemsErr } = await supabase.from('sale_items').insert(items);
    if (itemsErr) throw new Error('Items: ' + itemsErr.message);

    for (const item of CART) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.quantity) }).eq('id', item.product_id);
    }

    await logActivity('CREATE', 'sales', `Sale ${invNo} - ${fmt(totalSale)}`);
    const printOpt = confirm('Sale saved! Print Thermal (OK) or A4 (Cancel)?');
    const payload = {
      invoice: invNo, customer: custName, phone: custPhone, cashier: CURRENT_NAME,
      subtotal: sub, discount: lineDisc + billDisc, tax: taxAmt, tax_rate: POS_TAX_ENABLED ? POS_TAX_RATE : 0,
      total: totalSale, paid, balance: totalSale - paid, payment_method: primaryMethod,
      date: new Date(), items: [...CART]
    };
    if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');

    CART = []; $('saleDiscount').value = 0; $('salePaid').value = 0; $('saleCustName').value = ''; $('saleCustPhone').value = '';
    POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };
    $('previousDueBox').style.display = 'none'; POS_PREVIOUS_DUE = 0; $('saleCategoryFilter').value = '';
    if ($('posProductSearch')) $('posProductSearch').value = '';
    renderCart(); loadSaleProducts(); loadOverview(); toast('Sale saved & POS cleared', 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally { $('btnSaveSale').disabled = false; $('btnSaveSale').innerHTML = 'Save Sale <span class="kbd">F4</span>'; }
};

window.deleteSale = async id => {
  if (!IS_ADMIN) return toast('Only Admin can delete sales!', 'error');
  if (!confirm('DELETE this sale? Stock will be reversed.')) return;
  try {
    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
    for (const it of items || []) {
      if (it.product_id) {
        const { data: prod } = await supabase.from('products').select('quantity').eq('id', it.product_id).single();
        if (prod) await supabase.from('products').update({ quantity: prod.quantity + it.quantity }).eq('id', it.product_id);
      }
    }
    await supabase.from('sale_items').delete().eq('sale_id', id); await supabase.from('sales').delete().eq('id', id);
    await logActivity('DELETE', 'sales', id); toast('Sale deleted & stock reversed', 'success');
    loadSalesHistory(); loadOverview();
  } catch (e) { toast(e.message, 'error'); }
};

$('btnSalesHistory').onclick = () => { const box = $('salesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadSalesHistory(); };
$('btnRefreshSales').onclick = loadSalesHistory;
async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { $('salesHistoryTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  $('salesHistoryTable').innerHTML = !data?.length ? '<div class="empty">No sales.</div>' : `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Method</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td><span class="pill">${esc(s.payment_method || 'Cash')}</span></td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${s.balance > 0 ? `<b style="color:#dc2626">${fmt(s.balance)}</b>` : '<span class="pill green">Paid</span>'}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">Print</button><button class="btn btn-danger btn-sm" onclick="deleteSale('${s.id}')" title="Admin only">Del</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async id => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single(); if (!s) return;
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone, cashier: s.cashier_name, subtotal: s.subtotal, discount: s.discount, tax: s.tax, tax_rate: s.tax_rate, total: s.total, paid: s.paid, balance: s.balance, payment_method: s.payment_method, date: s.created_at, items: items || [] };
  if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');
};

// =====================================================
// REPAIRING (unchanged)
// =====================================================
const COMMON_FAULTS = ['Screen Broken', 'Touch Not Working', 'Battery Drain', 'Not Charging', 'No Power', 'No Display', 'Dead', 'Water Damage', 'Camera Not Working', 'Speaker Not Working', 'Mic Not Working', 'Network Issue', 'Face ID Not Working', 'Software Update'];
async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || ''; const st = $('repairStatusFilter')?.value || '';
  let query = supabase.from('repairs').select('*').order('created_at', { ascending: false });
  if (st) query = query.eq('status', st);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,mobile.ilike.%${q}%,slip_no.ilike.%${q}%`);
  const { data, error } = await query;
  const t = $('repairsTable');
  if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data?.length) { t.innerHTML = '<div class="empty">No repair jobs.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Slip#</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.map(r => `<tr><td><b>${esc(r.slip_no || '—')}</b></td><td>${esc(r.customer_name)}<br><small>${esc(r.phone || '')}</small></td><td>${esc(r.mobile || '—')}</td><td><small>${esc(r.issue || '—')}</small></td><td class="num">${fmt(r.charge)}</td><td><span class="pill">${esc(r.status)}</span></td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewRepair('${r.id}')">Print</button><button class="btn btn-ghost btn-sm" onclick="editRepair('${r.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRepair('${r.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('repairSearch')?.addEventListener('input', () => loadRepairs());
$('repairStatusFilter')?.addEventListener('change', () => loadRepairs());
$('btnAddRepair').onclick = () => openRepairModal();
window.editRepair = async id => { if (!checkPermission('edit')) return; const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single(); if (r) openRepairModal(r); };
window.deleteRepair = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('repairs').delete().eq('id', id); await logActivity('DELETE', 'repairs', id); toast('Deleted'); loadRepairs(); };
window.viewRepair = async id => {
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single(); if (!r) return;
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: r.slip_no, customer: r.customer_name, phone: r.phone, cashier: CURRENT_NAME, subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, balance: r.charge - r.advance, date: r.created_at, items: [{ name: r.mobile + ' - ' + (r.issue || 'Repair'), qty: 1, total: r.charge }] };
  if (printOpt) printThermal80mm(payload, 'repair'); else printA4Premium(payload, 'repair');
};
function openRepairModal(r = null) {
  const body = `<div class="form-grid"><div class="field"><label>Customer *</label><input id="rCust" value="${esc(r?.customer_name || '')}"></div><div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone || '')}"></div><div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile || '')}"></div><div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei || '')}"></div><div class="field full"><label>Fault</label><input id="rIssue" list="faultsList" value="${esc(r?.issue || '')}"><datalist id="faultsList">${COMMON_FAULTS.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div><div class="field full" style="display:flex;gap:20px;padding:10px;background:#fafbfd;border-radius:8px;border:1px solid #e6e9f2"><label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rBatWarranty" ${r?.battery_warranty === 'Yes' ? 'checked' : ''}> Battery Warranty (Yes/No)</label><label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rDeadWarranty" ${r?.dead_warranty === 'Yes' ? 'checked' : ''}> Dead Warranty (Yes/No)</label></div><div class="field"><label>Charge</label><input id="rCharge" type="number" value="${r?.charge || 0}"></div><div class="field"><label>Advance</label><input id="rAdvance" type="number" value="${r?.advance || 0}"></div><div class="field"><label>Status</label><select id="rStatus">${['Received', 'In Progress', 'Ready', 'Delivered'].map(s => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field full"><label>Notes</label><textarea id="rNotes">${esc(r?.notes || '')}</textarea></div></div>`;
  openModal(r ? 'Edit Repair' : 'New Repair', body, async () => {
    const payload = { customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim() || null, mobile: $('rMobile').value.trim() || null, imei: $('rImei').value.trim() || null, issue: $('rIssue').value.trim() || null, charge: Number($('rCharge').value) || 0, advance: Number($('rAdvance').value) || 0, status: $('rStatus').value, notes: $('rNotes').value.trim() || null, battery_warranty: $('rBatWarranty').checked ? 'Yes' : 'No', dead_warranty: $('rDeadWarranty').checked ? 'Yes' : 'No' };
    if (!payload.customer_name) throw new Error('Customer required');
    if (payload.status === 'Delivered' && payload.charge > payload.advance) { if (!confirm(`Payment still pending (${fmt(payload.charge - payload.advance)}). Deliver?`)) throw new Error('Delivery cancelled.'); }
    if (r) await supabase.from('repairs').update(payload).eq('id', r.id); else await supabase.from('repairs').insert(payload);
    await logActivity(r ? 'EDIT' : 'CREATE', 'repairs', payload.customer_name);
    closeModal(); toast('Saved', 'success'); loadRepairs();
  });
}

// =====================================================
// CUSTOMERS (unchanged)
// =====================================================
let ALL_CUST = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q; ALL_CUST = data || [];
  const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" onchange="toggleAllCust(this)"></th><th>Name</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead><tbody>${ALL_CUST.map(c => `<tr><td><input type="checkbox" class="cust-check" value="${c.id}" onchange="updateCustBulk()"></td><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td><td><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value));
$('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = id => { if (!checkPermission('edit')) return; openCustomerModal(ALL_CUST.find(c => c.id === id)); };
window.deleteCustomer = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; try { await supabase.from('sales').update({ customer_id: null }).eq('customer_id', id); const { error } = await supabase.from('customers').delete().eq('id', id); if (error) throw error; await logActivity('DELETE', 'customers', id); toast('Deleted'); loadCustomers(); } catch (e) { toast(e.message, 'error'); } };
window.toggleAllCust = cb => { document.querySelectorAll('.cust-check').forEach(c => c.checked = cb.checked); updateCustBulk(); };
function updateCustBulk() { const n = document.querySelectorAll('.cust-check:checked').length; $('custBulkBar').style.display = n ? 'flex' : 'none'; $('custSelCount').textContent = n; }
window.bulkDeleteCustomers = async () => { if (!checkPermission('delete')) return; const ids = [...document.querySelectorAll('.cust-check:checked')].map(c => c.value); if (!ids.length || !confirm(`Delete ${ids.length} customers?`)) return; try { await supabase.from('sales').update({ customer_id: null }).in('customer_id', ids); const { error } = await supabase.from('customers').delete().in('id', ids); if (error) throw error; toast(`Deleted ${ids.length} customers`); loadCustomers(); } catch (e) { toast(e.message, 'error'); } };
function openCustomerModal(c = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name || '')}"></div><div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}"></div><div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance || 0}"></div><div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address || '')}</textarea></div></div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id); else await supabase.from('customers').insert(payload);
    await logActivity(c ? 'EDIT' : 'CREATE', 'customers', payload.name);
    toast('Saved', 'success'); closeModal(); loadCustomers();
  });
}

// =====================================================
// SUPPLIERS (unchanged)
// =====================================================
let ALL_SUP = [];
let SUP_FILTER = { search: '', cat: '' };
async function loadSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) { $('suppliersTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  ALL_SUP = data || [];
  const catFilter = $('supplierCategoryFilter');
  if (catFilter) { const cats = [...new Set(ALL_SUP.map(s => s.category).filter(Boolean))]; catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}" ${SUP_FILTER.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join(''); }
  let filtered = [...ALL_SUP];
  if (SUP_FILTER.search) { const q = SUP_FILTER.search.toLowerCase(); filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(q) || (s.phone || '').includes(q)); }
  if (SUP_FILTER.cat) filtered = filtered.filter(s => s.category === SUP_FILTER.cat);
  const t = $('suppliersTable');
  if (!filtered.length) { t.innerHTML = `<div class="empty">${ALL_SUP.length ? 'No suppliers match filter.' : 'No suppliers yet. Click + Add Supplier.'}</div>`; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>Phone</th><th>Address</th><th class="num">Purchases</th><th>Actions</th></tr></thead><tbody>${filtered.map(s => `<tr><td><b>${esc(s.name)}</b></td><td><span class="pill blue">${esc(s.category || 'General')}</span></td><td>${esc(s.phone || '—')}</td><td><small>${esc(s.address || '—')}</small></td><td class="num"><button class="btn btn-ghost btn-sm" onclick="viewSupplierLedger('${s.id}','${esc(s.name)}')">View</button></td><td class="actions" style="white-space:nowrap">${s.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(s.phone)}">📞</a>` : ''}${s.phone ? `<a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(s.phone.replace(/[^0-9]/g,''))}" target="_blank">💬</a>` : ''}<button class="btn btn-ghost btn-sm" onclick="viewSupplierHistory('${s.id}','${esc(s.name)}')">History</button><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('supplierSearch')?.addEventListener('input', e => { SUP_FILTER.search = e.target.value; loadSuppliers(); });
$('supplierCategoryFilter')?.addEventListener('change', e => { SUP_FILTER.cat = e.target.value; loadSuppliers(); });
$('btnAddSupplier').onclick = () => openSupplierModal();
function openSupplierModal(s = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Supplier Name *</label><input id="sName" value="${esc(s?.name || '')}"></div><div class="field"><label>Category</label><input id="sCategory" value="${esc(s?.category || '')}" list="supCats"><datalist id="supCats">${CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist></div><div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone || '')}"></div><div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address || '')}</textarea></div><div class="field full"><label>Notes</label><textarea id="sNotes">${esc(s?.notes || '')}</textarea></div></div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = { name: $('sName').value.trim(), category: $('sCategory').value.trim() || null, phone: $('sPhone').value.trim() || null, address: $('sAddr').value.trim() || null, notes: $('sNotes').value.trim() || null };
    if (!payload.name) throw new Error('Supplier name is required');
    let res; if (s) res = await supabase.from('suppliers').update(payload).eq('id', s.id); else res = await supabase.from('suppliers').insert(payload);
    if (res.error) throw new Error(res.error.message);
    await logActivity(s ? 'EDIT' : 'CREATE', 'suppliers', payload.name);
    closeModal(); toast('Supplier saved ✅', 'success'); loadSuppliers();
  });
}
window.editSupplier = id => { if (!checkPermission('edit')) return; const s = ALL_SUP.find(x => x.id === id); if (!s) return toast('Not found', 'error'); openSupplierModal(s); };
window.deleteSupplier = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete supplier?')) return; try { await supabase.from('purchases').update({ supplier_id: null }).eq('supplier_id', id); const { error } = await supabase.from('suppliers').delete().eq('id', id); if (error) throw error; await logActivity('DELETE', 'suppliers', id); toast('Supplier deleted', 'success'); loadSuppliers(); } catch (e) { toast(e.message, 'error'); } };
window.viewSupplierHistory = async (id, name) => {
  const { data } = await supabase.from('purchases').select('*').eq('supplier_id', id).order('created_at', { ascending: false });
  if (!data?.length) return toast('No purchases from this supplier', 'error');
  const total = data.reduce((s, p) => s + Number(p.total || 0), 0); const paid = data.reduce((s, p) => s + Number(p.paid || 0), 0);
  const body = `<div style="margin-bottom:12px;padding:12px;background:#fafbfd;border-radius:8px"><b>${esc(name)}</b><br>Total: <b>${fmt(total)}</b> | Paid: <b>${fmt(paid)}</b> | Due: <b style="color:#dc2626">${fmt(total - paid)}</b></div><table class="data"><thead><tr><th>Invoice</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${data.map(p => `<tr><td>${esc(p.invoice_no || p.id.slice(0, 6))}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  openModal(`Supplier History — ${name}`, body, async () => closeModal(), 'Close');
};
window.viewSupplierLedger = async (id, name) => {
  const { data } = await supabase.from('purchases').select('total,paid').eq('supplier_id', id);
  const total = (data || []).reduce((s, p) => s + Number(p.total || 0), 0); const paid = (data || []).reduce((s, p) => s + Number(p.paid || 0), 0);
  const body = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div style="padding:14px;background:#eff6ff;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Total</div><div style="font-size:20px;font-weight:800;color:#2563eb">${fmt(total)}</div></div><div style="padding:14px;background:#f0fdf4;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Paid</div><div style="font-size:20px;font-weight:800;color:#16a34a">${fmt(paid)}</div></div><div style="padding:14px;background:#fef2f2;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Due</div><div style="font-size:20px;font-weight:800;color:#dc2626">${fmt(total - paid)}</div></div></div>`;
  openModal(`Ledger — ${name}`, body, async () => closeModal(), 'Close');
};

// =====================================================
// CREDIT / UDHAR (same function — unchanged)
// =====================================================
let CREDIT_RANGE = 'all', CREDIT_STATUS = 'all';
$('creditDateTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditDateTabs').querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); CREDIT_RANGE = b.dataset.range; loadCredit(); });
$('creditStatusTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditStatusTabs').querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); CREDIT_STATUS = b.dataset.status; loadCredit(); });
function getDateRange(range) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (range === 'today') return { from: new Date(y, m, d).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() };
  if (range === 'week') { const ws = new Date(now); ws.setDate(d - now.getDay()); return { from: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() }; }
  if (range === 'month') return { from: new Date(y, m, 1).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() };
  return { from: null, to: null };
}
async function loadCredit() {
  const range = getDateRange(CREDIT_RANGE);
  let q = supabase.from('sales').select('customer_id,customer_name,customer_phone,balance,total,paid,invoice_no,created_at').gt('balance', 0).order('created_at', { ascending: false });
  if (range.from) q = q.gte('created_at', range.from); if (range.to) q = q.lte('created_at', range.to);
  const { data: sales } = await q;
  const { data: recov } = await supabase.from('credit_recoveries').select('*,customers(name,phone)').order('created_at', { ascending: false }).limit(100);
  let filteredSales = sales || []; if (CREDIT_STATUS === 'received') filteredSales = [];
  const map = {}; filteredSales.forEach(s => { const key = s.customer_id || s.customer_name || 'walkin'; if (!map[key]) map[key] = { name: s.customer_name || 'Walk-in', phone: s.customer_phone, total: 0, count: 0, id: s.customer_id }; map[key].total += Number(s.balance || 0); map[key].count++; });
  const summary = Object.values(map).sort((a, b) => b.total - a.total);
  $('creditSummaryTable').innerHTML = summary.length ? `<table class="data"><thead><tr><th>Customer</th><th>Phone</th><th class="num">Invoices</th><th class="num">Outstanding</th><th>Print</th></tr></thead><tbody>${summary.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.phone || '—')}</td><td class="num">${s.count}</td><td class="num"><b>${fmt(s.total)}</b></td><td><button class="btn btn-ghost btn-sm" onclick="printCustomerUdhar('${esc(s.name)}')">Print</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No outstanding credit.</div>';
  $('creditTable').innerHTML = filteredSales.length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Recover</th></tr></thead><tbody>${filteredSales.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-primary btn-sm" onclick="recoverCredit('${s.invoice_no}')">Recover</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No pending invoices in this range.</div>';
  $('recoveriesTable').innerHTML = (recov || []).length ? `<table class="data"><thead><tr><th>Customer</th><th class="num">Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${recov.map(r => `<tr><td>${esc(r.customers?.name || '—')}</td><td class="num">${fmt(r.amount)}</td><td>${esc(r.method || 'cash')}</td><td><small>${new Date(r.created_at).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No recoveries.</div>';
}
window.printCustomerUdhar = async customerName => {
  const { data: sales } = await supabase.from('sales').select('*').eq('customer_name', customerName).gt('balance', 0).order('created_at', { ascending: false });
  if (!sales?.length) return toast('No pending for this customer', 'error');
  const total = sales.reduce((s, x) => s + Number(x.balance || 0), 0);
  const printOpt = confirm(`Print ${customerName}'s udhar (${fmt(total)})?\n\nOK = Thermal, Cancel = A4`);
  const payload = { invoice: 'UDHAR-' + customerName.slice(0, 8), customer: customerName, phone: sales[0].customer_phone, subtotal: total, discount: 0, total, paid: 0, balance: total, date: new Date(), items: sales.map(s => ({ name: s.invoice_no, description: s.invoice_no, qty: 1, quantity: 1, price: s.balance, total: s.balance })) };
  if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'report');
};
window.recoverCredit = async invoice => {
  const amountStr = prompt(`Recovery for ${invoice}:`, ''); if (!amountStr) return;
  const amount = Number(amountStr); if (!amount || amount <= 0) return toast('Invalid amount', 'error');
  const { data: s } = await supabase.from('sales').select('*').eq('invoice_no', invoice).single(); if (!s) return;
  const newPaid = Number(s.paid || 0) + amount; const newBal = Math.max(0, Number(s.total || 0) - newPaid);
  await supabase.from('sales').update({ paid: newPaid, balance: newBal }).eq('id', s.id);
  await supabase.from('credit_recoveries').insert({ customer_id: s.customer_id, sale_id: s.id, invoice_no: invoice, amount, method: 'cash' });
  await logActivity('RECOVER', 'credit', `${invoice} - ${fmt(amount)}`);
  toast('Recovery recorded', 'success'); loadCredit(); loadOverview();
};
$('btnPrintCreditAll').onclick = () => {
  const rows = $('creditSummaryTable').querySelectorAll('tbody tr');
  if (!rows.length) return toast('Nothing to print', 'error');
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  let total = 0;
  const items = Array.from(rows).map(r => {
    const c = r.querySelectorAll('td');
    const amt = Number(c[3].innerText.replace(/[^0-9]/g, ''));
    total += amt;
    return { name: c[0].innerText, description: c[0].innerText, qty: 1, quantity: 1, price: amt, total: amt };
  });
  const payload = { invoice: 'UDHAR-ALL', customer: 'All', subtotal: total, discount: 0, total, paid: 0, balance: 0, date: new Date(), items };
  if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'report');
};

// =====================================================
// EXPENSES (unchanged)
// =====================================================
const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Transport', 'Repair Parts', 'Tea/Food', 'Marketing', 'Other'];
async function loadExpenses() {
  const catSel = $('expFilterCat'); if (catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">All</option>' + EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  const from = $('expFilterFrom')?.value || ''; const to = $('expFilterTo')?.value || ''; const cat = $('expFilterCat')?.value || '';
  let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (from) q = q.gte('expense_date', from); if (to) q = q.lte('expense_date', to); if (cat) q = q.eq('category', cat);
  const { data } = await q; const t = $('expensesTable');
  t.innerHTML = !data?.length ? '<div class="empty">No expenses.</div>' : `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${data.map(e => `<tr><td>${esc(e.expense_date)}</td><td><span class="pill orange">${esc(e.category || 'Other')}</span></td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
  const all = data || []; const today = new Date().toISOString().slice(0, 10); const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay()); const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
  $('expToday').textContent = fmt(sum(all.filter(x => x.expense_date === today))); $('expWeek').textContent = fmt(sum(all.filter(x => x.expense_date >= ws.toISOString().slice(0, 10)))); $('expMonth').textContent = fmt(sum(all.filter(x => x.expense_date >= ms))); $('expTotal').textContent = fmt(sum(all));
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Date *</label><input type="date" id="exDate" value="${new Date().toISOString().slice(0, 10)}"></div><div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Amount *</label><input type="number" id="exAmount" value="0"></div><div class="field full"><label>Description</label><input id="exDesc"></div></div>`;
  openModal('Add Expense', body, async () => { const amount = Number($('exAmount').value) || 0; if (amount <= 0) throw new Error('Amount must be greater than 0'); await supabase.from('expenses').insert({ expense_date: $('exDate').value, category: $('exCat').value, amount, description: $('exDesc').value.trim() || null }); await logActivity('CREATE', 'expenses', fmt(amount)); closeModal(); toast('Expense added', 'success'); loadExpenses(); });
};
window.deleteExpense = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('expenses').delete().eq('id', id); toast('Deleted'); loadExpenses(); };
$('btnFilterExpenses').onclick = loadExpenses;

// =====================================================
// REPORTS — v35 FULL UPGRADE (13 types)
// =====================================================
$('btnRunReport').onclick = runReport;
$('btnPrintReport').onclick = () => {
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const rows = $('reportOutput').querySelectorAll('tbody tr');
  let total = 0;
  const items = Array.from(rows).map(r => {
    const c = r.querySelectorAll('td');
    if (c.length < 2) return null;
    let amtStr = c[c.length - 1]?.innerText || c[c.length - 2]?.innerText || '0';
    const amt = Number(amtStr.replace(/[^0-9]/g, '')) || 0;
    total += amt;
    return { name: c[0]?.innerText || 'Item', description: c[0]?.innerText || 'Item', qty: 1, quantity: 1, price: amt, total: amt };
  }).filter(Boolean);
  const payload = { invoice: 'REPORT', customer: $('reportType').value.toUpperCase(), subtotal: total, discount: 0, total: total, paid: total, balance: 0, date: new Date(), items };
  if (printOpt) printThermal80mm(payload, 'report'); else printA4Premium(payload, 'report');
};

function getReportRange() {
  const from = $('reportFrom')?.value; const to = $('reportTo')?.value;
  return { from, to };
}

async function runReport() {
  const type = $('reportType').value; const { from, to } = getReportRange();
  const search = $('reportSearch')?.value?.trim().toLowerCase() || '';
  const out = $('reportOutput'); out.innerHTML = '<div class="empty">Loading…</div>';
  try {
    if (type === 'sales' || type === 'daily' || type === 'weekly' || type === 'monthly') {
      let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (type === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        q = q.gte('created_at', today).lte('created_at', today + 'T23:59:59');
      } else if (type === 'weekly') {
        const ws = new Date(); ws.setDate(ws.getDate() - 7);
        q = q.gte('created_at', ws.toISOString());
      } else if (type === 'monthly') {
        const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        q = q.gte('created_at', ms.toISOString());
      } else {
        if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      }
      const { data } = await q; let f = data || []; if (search) f = f.filter(s => (s.customer_name || '').toLowerCase().includes(search) || (s.invoice_no || '').toLowerCase().includes(search));
      const total = f.reduce((s, r) => s + Number(r.total || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">${type.toUpperCase()} Sales — Total: ${fmt(total)} — Count: ${f.length}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Method</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${f.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '')}</td><td><span class="pill">${esc(s.payment_method || 'Cash')}</span></td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'cash' || type === 'credit') {
      let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      let f = data || [];
      if (type === 'cash') f = f.filter(s => Number(s.paid) >= Number(s.total));
      else f = f.filter(s => Number(s.balance) > 0);
      const total = f.reduce((s, r) => s + Number(r.total || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">${type === 'cash' ? 'Cash Sales' : 'Credit Sales'} — Total: ${fmt(total)} — Count: ${f.length}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${f.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'payment') {
      let q = supabase.from('sales').select('payment_method,total,paid').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const map = {};
      (data || []).forEach(s => {
        const m = s.payment_method || 'Cash';
        if (!map[m]) map[m] = { method: m, count: 0, total: 0, paid: 0 };
        map[m].count++; map[m].total += Number(s.total || 0); map[m].paid += Number(s.paid || 0);
      });
      out.innerHTML = `<h3 style="margin-bottom:12px">Payment Method Report</h3><table class="data"><thead><tr><th>Method</th><th class="num">Count</th><th class="num">Total</th><th class="num">Paid</th></tr></thead><tbody>${Object.values(map).map(m => `<tr><td><b>${esc(m.method)}</b></td><td class="num">${m.count}</td><td class="num">${fmt(m.total)}</td><td class="num">${fmt(m.paid)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'product') {
      let q = supabase.from('sale_items').select('product_name,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      let f = data || []; if (search) f = f.filter(i => (i.product_name || '').toLowerCase().includes(search));
      const map = {};
      f.forEach(it => { const k = it.product_name; if (!map[k]) map[k] = { name: k, qty: 0, total: 0 }; map[k].qty += Number(it.quantity || 0); map[k].total += Number(it.line_total || 0); });
      const rows = Object.values(map).sort((a, b) => b.total - a.total);
      out.innerHTML = `<h3 style="margin-bottom:12px">Product-wise Sales</h3><table class="data"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Revenue</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.total)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'category') {
      let q = supabase.from('sale_items').select('category,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const map = {};
      (data || []).forEach(it => { const k = it.category || 'Other'; if (!map[k]) map[k] = { cat: k, qty: 0, total: 0 }; map[k].qty += Number(it.quantity || 0); map[k].total += Number(it.line_total || 0); });
      const rows = Object.values(map).sort((a, b) => b.total - a.total);
      out.innerHTML = `<h3 style="margin-bottom:12px">Category-wise Sales</h3><table class="data"><thead><tr><th>Category</th><th class="num">Qty</th><th class="num">Revenue</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.cat)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.total)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'cashier') {
      let q = supabase.from('sales').select('cashier_name,cashier_id,total,paid').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const map = {};
      (data || []).forEach(s => { const k = s.cashier_name || s.cashier_id || 'Admin'; if (!map[k]) map[k] = { name: k, count: 0, total: 0, paid: 0 }; map[k].count++; map[k].total += Number(s.total || 0); map[k].paid += Number(s.paid || 0); });
      const rows = Object.values(map).sort((a, b) => b.total - a.total);
      out.innerHTML = `<h3 style="margin-bottom:12px">Cashier-wise Sales</h3><table class="data"><thead><tr><th>Cashier</th><th class="num">Count</th><th class="num">Total</th><th class="num">Paid</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.count}</td><td class="num">${fmt(r.total)}</td><td class="num">${fmt(r.paid)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'pl') {
      let q = supabase.from('sale_items').select('product_id,product_name,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data: items } = await q;
      let f = items || []; if (search) f = f.filter(i => (i.product_name || '').toLowerCase().includes(search));
      const { data: prods } = await supabase.from('products').select('id,purchase_price');
      const costMap = Object.fromEntries((prods || []).map(p => [p.id, Number(p.purchase_price || 0)]));
      const map = {};
      f.forEach(it => {
        const k = it.product_id || it.product_name;
        if (!map[k]) map[k] = { name: it.product_name, qty: 0, rev: 0, cost: 0 };
        map[k].qty += Number(it.quantity || 0);
        map[k].rev += Number(it.line_total || 0);
        map[k].cost += Number(it.quantity || 0) * (costMap[it.product_id] || 0);
      });
      const rows = Object.values(map).map(r => ({ ...r, profit: r.rev - r.cost }));
      const tr = rows.reduce((s, r) => s + r.rev, 0), tc = rows.reduce((s, r) => s + r.cost, 0), tp = tr - tc;
      $('plSummary').style.display = 'flex';
      $('plSummary').innerHTML = `<div class="stat"><div class="stat-icon green">↗</div><div><strong>${fmt(tr)}</strong><small>Revenue</small></div></div><div class="stat"><div class="stat-icon orange">↙</div><div><strong>${fmt(tc)}</strong><small>Cost</small></div></div><div class="stat"><div class="stat-icon purple">▨</div><div><strong>${fmt(tp)}</strong><small>Profit</small></div></div>`;
      out.innerHTML = `<h3 style="margin-bottom:12px">P&L</h3><table class="data"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Rev</th><th class="num">Cost</th><th class="num">Profit</th></tr></thead><tbody>${rows.sort((a, b) => b.profit - a.profit).map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.rev)}</td><td class="num">${fmt(r.cost)}</td><td class="num"><b>${fmt(r.profit)}</b></td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'discount') {
      let q = supabase.from('sales').select('invoice_no,customer_name,discount,subtotal,total,created_at').gt('discount', 0).order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const total = (data || []).reduce((s, r) => s + Number(r.discount || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Discount Report — Total Discount: ${fmt(total)}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Subtotal</th><th class="num">Discount</th><th class="num">Total</th><th>Date</th></tr></thead><tbody>${(data || []).map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '')}</td><td class="num">${fmt(s.subtotal)}</td><td class="num"><b>${fmt(s.discount)}</b></td><td class="num">${fmt(s.total)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'return') {
      let q = supabase.from('sales').select('invoice_no,customer_name,total,paid,balance,created_at').lt('paid', 0).order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Return & Refund Report</h3>${(data || []).length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${(data || []).map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">No returns/refunds recorded.</div>'}`;
    } else if (type === 'bestselling') {
      let q = supabase.from('sale_items').select('product_name,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const map = {};
      (data || []).forEach(it => { const k = it.product_name; if (!map[k]) map[k] = { name: k, qty: 0, total: 0 }; map[k].qty += Number(it.quantity || 0); map[k].total += Number(it.line_total || 0); });
      const rows = Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 20);
      out.innerHTML = `<h3 style="margin-bottom:12px">Best Selling Products (Top 20)</h3><table class="data"><thead><tr><th>#</th><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td class="num"><b>${r.qty}</b></td><td class="num">${fmt(r.total)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'lowstock') {
      const { data } = await supabase.from('products').select('name,category,quantity,min_stock,racks!fk_products_racks(name)').order('quantity');
      const low = (data || []).filter(p => Number(p.quantity) <= Number(p.min_stock || 3));
      out.innerHTML = `<h3 style="margin-bottom:12px">Low Stock Alerts (${low.length})</h3>${low.length ? `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>📦 Rack</th><th class="num">Stock</th><th class="num">Min</th></tr></thead><tbody>${low.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.category || '')}</td><td>${esc(p.racks?.name || '—')}</td><td class="num"><b style="color:#dc2626">${p.quantity}</b></td><td class="num">${p.min_stock || 3}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">All products well stocked ✅</div>'}`;
    } else if (type === 'purchases') {
      let q = supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Purchase Report</h3><table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${(data || []).map(p => `<tr><td>${esc(p.invoice_no || '—')}</td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'expenses') {
      let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (from) q = q.gte('expense_date', from); if (to) q = q.lte('expense_date', to);
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Expense Report</h3><table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${(data || []).map(e => `<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category || '')}</td><td>${esc(e.description || '')}</td><td class="num">${fmt(e.amount)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'customer') {
      const { data } = await supabase.from('customers').select('*'); let f = data || []; if (search) f = f.filter(c => (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Customer Report</h3><table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th></tr></thead><tbody>${f.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td></tr>`).join('')}</tbody></table>`;
    }
  } catch (e) { out.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`; }
}

// =====================================================
// TRANSACTIONS (unchanged)
// =====================================================
async function loadTransactions() {
  const { data: sales } = await supabase.from('sales').select('invoice_no,customer_name,total,paid,balance,created_at,payment_method').order('created_at', { ascending: false }).limit(50);
  const { data: purchases } = await supabase.from('purchases').select('invoice_no,total,paid,created_at').order('created_at', { ascending: false }).limit(30);
  const { data: expenses } = await supabase.from('expenses').select('expense_date,category,amount,description').order('expense_date', { ascending: false }).limit(30);
  const rows = [
    ...(sales || []).map(s => ({ date: s.created_at, type: 'SALE', ref: s.invoice_no, party: s.customer_name || 'Walk-in', in: s.paid, out: 0, note: s.payment_method || 'cash' })),
    ...(purchases || []).map(p => ({ date: p.created_at, type: 'PURCHASE', ref: p.invoice_no, party: 'Supplier', in: 0, out: p.paid, note: 'purchase' })),
    ...(expenses || []).map(e => ({ date: e.expense_date + 'T12:00:00', type: 'EXPENSE', ref: '—', party: e.category, in: 0, out: e.amount, note: e.description || '' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  $('transactionsTable').innerHTML = rows.length ? `<table class="data"><thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Party</th><th class="num">In</th><th class="num">Out</th><th>Note</th></tr></thead><tbody>${rows.map(r => `<tr><td><small>${new Date(r.date).toLocaleString()}</small></td><td><span class="pill ${r.type === 'SALE' ? 'green' : r.type === 'PURCHASE' ? 'orange' : 'red'}">${r.type}</span></td><td>${esc(r.ref)}</td><td>${esc(r.party)}</td><td class="num">${r.in ? fmt(r.in) : '—'}</td><td class="num">${r.out ? fmt(r.out) : '—'}</td><td><small>${esc(r.note)}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No transactions.</div>';
}

// =====================================================
// STAFF & LOGS (unchanged)
// =====================================================
async function loadStaff() {
  const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
  const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50);
  $('staffTable').innerHTML = !data?.length ? '<div class="empty">No staff.</div>' : `<table class="data"><thead><tr><th>Name</th><th>Staff ID</th><th>Role</th><th>Phone</th><th>Actions</th></tr></thead><tbody>${data.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.staff_id)}</td><td>${esc(s.role || 'Staff')}</td><td>${esc(s.phone || '—')}</td><td><button class="btn btn-ghost btn-sm" onclick="viewStaffPermissions('${s.id}')">Perms</button><button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
  $('logsTable').innerHTML = !logs?.length ? '<div class="empty">No logs.</div>' : `<table class="data"><thead><tr><th>Staff</th><th>Action</th><th>Module</th><th>Details</th><th>Date</th></tr></thead><tbody>${logs.map(l => `<tr><td>${esc(l.staff_name || '—')}</td><td><span class="pill">${esc(l.action)}</span></td><td>${esc(l.module)}</td><td><small>${esc(l.details || '')}</small></td><td><small>${new Date(l.created_at).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`;
}
window.viewStaffPermissions = async id => {
  const { data: s } = await supabase.from('staff').select('*').eq('id', id).single(); if (!s) return;
  const perms = [['allow_pos', 'POS / Sales'], ['allow_inventory', 'Inventory'], ['allow_purchases', 'Purchases'], ['allow_repairing', 'Repairing'], ['allow_customers', 'Customers'], ['allow_suppliers', 'Suppliers'], ['allow_credit', 'Credit / Udhar'], ['allow_expenses', 'Expenses'], ['allow_reports', 'Reports'], ['allow_transactions', 'Transactions'], ['allow_staff', 'Staff Management']];
  const body = `<h4 style="margin:0 0 10px">${esc(s.name)} (${esc(s.staff_id)})</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${perms.map(([k, label]) => `<label style="display:flex;align-items:center;gap:8px;padding:8px;background:#fafbfd;border-radius:6px"><input type="checkbox" class="perm-check" data-key="${k}" ${s[k] !== false ? 'checked' : ''}> ${label}</label>`).join('')}</div>`;
  openModal(`Permissions — ${s.name}`, body, async () => {
    const updates = {};
    document.querySelectorAll('.perm-check').forEach(cb => { updates[cb.dataset.key] = cb.checked; });
    const { error } = await supabase.from('staff').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    closeModal(); toast('Permissions updated', 'success'); loadStaff();
  }, 'Save Permissions');
};
window.deleteStaff = async id => { if (!IS_ADMIN) return toast('Admin only', 'error'); if (!confirm('Delete staff?')) return; await supabase.from('staff').delete().eq('id', id); toast('Deleted'); loadStaff(); };

// =====================================================
// INIT
// =====================================================
(async () => {
  await loadShopSettings();
  loadModule('overview');
})();
