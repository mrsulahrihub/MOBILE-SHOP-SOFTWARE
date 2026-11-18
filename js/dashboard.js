// =====================================================
// BISMILLAH MOBILE ZONE — Dashboard Controller v30.1 (Final)
// Urdu Receipts + Admin Override + Supplier Fix + Stock Merge
// =====================================================
import { supabase } from './config.js';

// ---------------------------------------------------
// SESSION & GUARD
// ---------------------------------------------------
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
const SHOP_ID = localStorage.getItem('shop_id');

if (!SHOP_ID && (!SESSION || !SESSION.staff_id)) {
  window.location.replace('./login.html');
  throw new Error('Redirecting to login...');
}

const IS_ADMIN = !SESSION.staff_id || SESSION.staff_id === '01' || SESSION.role === 'Admin';
const CURRENT_STAFF = SESSION.staff_id || '01';
const CURRENT_NAME = SESSION.name || 'Admin';

document.getElementById('userName').textContent = CURRENT_NAME || localStorage.getItem('owner_name') || 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = (SESSION.role || 'ADMIN').toUpperCase();
document.getElementById('welcomeName').textContent = CURRENT_NAME;
document.getElementById('userAvatar').textContent = (CURRENT_NAME || 'B')[0].toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (!confirm('Are you sure you want to logout?')) return;
  ['bm_staff', 'shop_id', 'shop_name', 'owner_name'].forEach(k => localStorage.removeItem(k));
  window.location.replace('./login.html');
});

// ---------------------------------------------------
// UTILITIES
// ---------------------------------------------------
const $ = id => document.getElementById(id);
const fmt = n => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStartISO = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

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
    await supabase.from('activity_log').insert({
      staff_id: CURRENT_STAFF,
      staff_name: CURRENT_NAME,
      action, module,
      details: String(details).slice(0, 500)
    });
  } catch (e) { console.warn('activity log failed', e); }
}

// =====================================================
// ✅ URDU TERMS — CENTRAL FUNCTION (Sale + Repair)
// =====================================================
function urduTermsBlock(type = 'sale') {
  const common = `
    <div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div>
    <div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div>
    <div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div>
    <div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div>`;
  const saleExtra = `
    <div>• سیل شدہ مال واپس یا تبدیل نہیں ہوگا۔</div>
    <div>• وارنٹی کے لیے رسید لازمی پیش کریں۔</div>`;
  const repairExtra = `
    <div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div>
    <div>• مرمت شدہ موبائل کی وارنٹی صرف 7 دن ہوگی۔</div>`;

  return `
    <hr style="border-top:1px dashed #000;margin:6px 0;">
    <div style="text-align:right;font-size:12px;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;direction:rtl;line-height:1.7">
      ${type === 'repair' ? `<div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:5px">مرمت کی شرائط</div>` : ''}
      ${common}
      ${type === 'repair' ? repairExtra : saleExtra}
    </div>`;
}

// ---------------------------------------------------
// MODAL SYSTEM
// ---------------------------------------------------
let MODAL_CONFIRM = null;

function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save') {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel;
  MODAL_CONFIRM = onConfirm;
  $('modalBackdrop').classList.add('open');
  setTimeout(() => $('modalBody').querySelector('input,select,textarea')?.focus(), 80);
}

function closeModal() {
  $('modalBackdrop').classList.remove('open');
  MODAL_CONFIRM = null;
}

$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => {
  if (!MODAL_CONFIRM) return;
  try { await MODAL_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); }
};

// ---------------------------------------------------
// SHOP SETTINGS
// ---------------------------------------------------
let SHOP = {
  name: 'BM MOBILE ZONE',
  address: 'Chohan Mobile Market, Zafarwal',
  phone1: '0345-6613232',
  phone2: '0307-6613232',
  tagline: 'Your Trusted Mobile Shop'
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
        tagline: data.tagline || SHOP.tagline
      };
    }
  } catch (e) { console.warn('shop settings fail', e); }
}

// =====================================================
// PRINT — THERMAL 80mm (SALE + REPAIR — DONO ME URDU)
// =====================================================
function printThermal80mm(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=340,height=680');
  if (!w) { toast('Popup blocked — allow popups to print', 'error'); return; }

  let sub = Number(data.subtotal || 0);
  let tot = Number(data.total || 0);
  const itemsSum = (data.items || []).reduce((s, it) => s + Number(it.line_total || it.total || it.amount || 0), 0);
  if (!sub) sub = itemsSum;
  if (!tot) tot = sub - Number(data.discount || 0);

  const itemRows = (data.items || []).map(it => `
    <tr>
      <td style="text-align:left;font-size:11px">
        ${esc(it.product_name || it.name || it.description)}
        <br><span style="font-size:9px;color:#444">${esc(it.category || '')} ${it.imei ? 'IMEI: ' + esc(it.imei) : ''}</span>
      </td>
      <td style="text-align:center;font-size:11px">${it.quantity || it.qty || 1}</td>
      <td style="text-align:right;font-size:11px">${Number(it.line_total || it.total || it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  const urduBlock = urduTermsBlock(type);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>
    @page{size:80mm auto;margin:4mm}
    body{font-family:'Courier New',monospace;width:74mm;margin:0 auto;color:#000;font-weight:bold}
    h2{text-align:center;margin:0 0 2px 0;font-size:18px;font-weight:900;letter-spacing:1px}
    .sub{text-align:center;font-size:11px;margin:1px 0}
    hr{border:none;border-top:2px dashed #000;margin:5px 0}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{border-bottom:2px dashed #000;padding:4px 0;font-size:11px;text-align:left}
    .row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0}
    .bold{font-weight:900;font-size:13px}
    .center{text-align:center;margin-top:6px;font-size:11px}
    .footer{text-align:center;margin-top:10px;font-size:10px;font-weight:normal;line-height:1.4}
  </style></head><body>
    <h2>${esc(SHOP.name)}</h2>
    <div class="sub">${esc(SHOP.address)}</div>
    <div class="sub">Tel: ${esc(SHOP.phone1)} / ${esc(SHOP.phone2)}</div>
    <hr>
    <div class="row"><span>Invoice: <b>${esc(data.invoice)}</b></span></div>
    <div class="row"><span>Date: ${new Date(data.date).toLocaleString('en-PK')}</span></div>
    <div class="row"><span>Customer: ${esc(data.customer || 'Walk-in')}</span></div>
    ${data.phone ? `<div class="row"><span>Phone: ${esc(data.phone)}</span></div>` : ''}
    <hr>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemRows}</tbody></table>
    <hr>
    <div class="row"><span>Subtotal</span><span>PKR ${sub.toLocaleString()}</span></div>
    <div class="row"><span>Discount</span><span>-PKR ${Number(data.discount || 0).toLocaleString()}</span></div>
    <div class="row bold"><span>Total</span><span>PKR ${tot.toLocaleString()}</span></div>
    <div class="row"><span>Paid</span><span>PKR ${Number(data.paid || 0).toLocaleString()}</span></div>
    ${data.balance > 0 ? `<div class="row bold"><span>Due</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}
    ${urduBlock}
    <hr>
    <div class="center">Thank you for shopping!</div>
    <div class="center">Visit Again</div>
    <div class="footer"><div style="font-weight:bold">Powered by MS.TECH</div><div>03099100546</div></div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
}
window.printThermal80mm = printThermal80mm;

// =====================================================
// PRINT — A4 PREMIUM (URDU SIRF REPAIR PE)
// =====================================================
function printA4Premium(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=920,height=1020');
  if (!w) { toast('Popup blocked', 'error'); return; }

  let sub = Number(data.subtotal || 0);
  let tot = Number(data.total || 0);
  const itemsSum = (data.items || []).reduce((s, it) => s + Number(it.total || it.line_total || it.amount || 0), 0);
  if (!sub) sub = itemsSum;
  if (!tot) tot = sub - Number(data.discount || 0);

  const rows = (data.items || []).map((it, i) => `
    <tr>
      <td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;color:#333;font-size:14px">${i + 1}. ${esc(it.description || it.product_name || it.name)}</td>
      <td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR ${Number(it.price || it.unit_price || 0).toLocaleString()}</td>
      <td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:center;color:#333;font-size:14px">${it.qty || it.quantity || 1}</td>
      <td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR ${Number(it.total || it.line_total || it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  const isReport = type === 'report';
  const title = isReport ? 'REPORT' : 'INVOICE';

  const urduA4 = type === 'repair' ? `
    <div style="margin-top:20px;padding:15px;background:#fafbfd;border-radius:8px;direction:rtl;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;font-size:13px;line-height:1.9;color:#333;border:1px solid #e6e9f2">
      <div style="text-align:center;font-weight:bold;margin-bottom:8px">مرمت کی شرائط</div>
      <div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div>
      <div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div>
      <div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div>
      <div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div>
      <div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div>
    </div>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Inter',sans-serif;background:#fff;color:#333;-webkit-print-color-adjust:exact;print-color-adjust:exact;position:relative;min-height:100vh;padding-bottom:150px}
    .top-curve{position:absolute;top:0;left:0;width:100%;height:160px;background:linear-gradient(135deg,#0f172a 0%,#5b8def 50%,#7c5cff 100%);clip-path:ellipse(150% 100% at 50% 0%);z-index:1}
    .content{position:relative;z-index:2;padding:40px 60px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-top:60px;margin-bottom:50px}
    .title{font-size:48px;font-weight:800;color:#111;margin:0;line-height:1;letter-spacing:-1px}
    .title span{color:#5b8def;font-size:60px;line-height:0;vertical-align:bottom;margin-right:5px}
    .company{text-align:right;color:#fff;margin-top:-30px}
    .company h2{margin:0;font-size:22px;font-weight:800;letter-spacing:1px;color:#111}
    .company p{margin:3px 0 0;font-size:12px;color:#5b8def;font-weight:600;letter-spacing:.5px}
    .info{display:flex;justify-content:space-between;margin-bottom:40px;font-size:13px;color:#555}
    .info-col p{margin:6px 0}
    .info-col b{color:#333;font-weight:700}
    table{width:100%;border-collapse:collapse;margin-bottom:40px}
    th{text-align:left;color:#5b8def;font-size:16px;font-weight:700;padding:10px;text-transform:uppercase;border-bottom:2px solid #5b8def;letter-spacing:.5px}
    .bottom-section{display:flex;justify-content:space-between;align-items:flex-start;margin-top:40px;page-break-inside:avoid}
    .terms{width:45%}
    .terms h4{color:#5b8def;font-size:15px;font-weight:700;margin-bottom:8px}
    .terms p{font-size:12px;color:#666;line-height:1.6}
    .totals{width:40%}
    .totals-row{display:flex;justify-content:space-between;padding:12px 0;font-size:15px;color:#333;font-weight:600;border-bottom:1px solid #eee}
    .totals-row.grand{font-size:20px;color:#5b8def;font-weight:800;border-bottom:none;margin-top:5px;padding-top:15px;border-top:2px solid #5b8def}
    .bottom-curve{position:fixed;bottom:0;left:0;width:100%;height:100px;background:linear-gradient(135deg,#0f172a 0%,#5b8def 50%,#7c5cff 100%);clip-path:ellipse(150% 100% at 50% 100%);z-index:1}
    .footer{position:fixed;bottom:15px;left:0;width:100%;text-align:center;z-index:2;color:#fff;font-size:11px;line-height:1.4}
    @media print{body{padding-bottom:120px}.top-curve,.bottom-curve{display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="top-curve"></div>
    <div class="content">
      <div class="header">
        <h1 class="title"><span>|</span>${title}</h1>
        <div class="company"><h2>${esc(SHOP.name)}</h2><p>${esc(SHOP.tagline)}</p></div>
      </div>
      <div class="info">
        <div class="info-col"><p><b>${title} NO:</b> ${esc(data.invoice)}</p><p><b>DATE:</b> ${new Date(data.date).toLocaleDateString('en-GB')}</p></div>
        <div class="info-col" style="text-align:right"><p><b>${isReport ? 'REPORT TYPE:' : 'INVOICE TO:'}</b> ${esc(data.customer || 'All Customers')}</p><p>${data.phone ? '<b>PHONE:</b> ' + esc(data.phone) : esc(SHOP.address)}</p></div>
      </div>
      <table><thead><tr><th>DESCRIPTION</th><th style="text-align:right">PRICE</th><th style="text-align:center">QTY.</th><th style="text-align:right">TOTAL</th></tr></thead><tbody>${rows}</tbody></table>
      ${urduA4}
      <div class="bottom-section">
        <div class="terms"><h4>Terms and conditions</h4><p>${isReport ? 'This is a system generated report.' : 'Goods once sold will not be taken back or exchanged. Warranty claims are subject to manufacturer terms.'}</p></div>
        <div class="totals">
          <div class="totals-row"><span>SUBTOTAL</span><span>PKR ${sub.toLocaleString()}</span></div>
          <div class="totals-row"><span>DISCOUNT</span><span>PKR ${Number(data.discount || 0).toLocaleString()}</span></div>
          <div class="totals-row grand"><span>GRAND TOTAL</span><span>PKR ${tot.toLocaleString()}</span></div>
          <div class="totals-row" style="border:none;padding-top:5px"><span>PAID</span><span>PKR ${Number(data.paid || 0).toLocaleString()}</span></div>
          ${data.balance > 0 ? `<div class="totals-row" style="color:#dc2626;border:none;padding-top:5px"><span>BALANCE</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}
        </div>
      </div>
    </div>
    <div class="bottom-curve"></div>
    <div class="footer"><div style="font-weight:bold;font-size:12px">Powered by MS.TECH</div><div>03099100546</div></div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script>
  </body></html>`;
  w.document.write(html);
  w.document.close();
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

const MODULE_TITLES = {
  overview: 'Dashboard', inventory: 'Inventory', racks: 'Racks',
  purchases: 'Purchases / Products', sales: 'Sales / POS', repairing: 'Repairing',
  customers: 'Customers', suppliers: 'Suppliers', credit: 'Credit / Udhar',
  expenses: 'Expenses', reports: 'Reports & P&L', transactions: 'Transactions',
  settings: 'Staff & Logs'
};

const MODULE_KEYS = { o: 'overview', i: 'inventory', k: 'racks', u: 'purchases', l: 'sales', r: 'repairing', c: 'customers', s: 'suppliers', d: 'credit', e: 'expenses', p: 'reports', t: 'transactions', ',': 'settings' };

function navTo(mod) {
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
    if (e.key === 'F5') { e.preventDefault(); const active = document.querySelector('.module.active')?.id.replace('module-', ''); if (active) loadModule(active); toast('Refreshed', 'info'); }
    if (e.key === 'F8') { e.preventDefault(); $('btnNewPurchase')?.click(); }
    if (e.key === 'F9') { e.preventDefault(); $('btnAddExpense')?.click(); }
    if (e.key === 'F10') { e.preventDefault(); $('btnAddRepair')?.click(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector('.search-bar input')?.focus(); }
  }
});

function showShortcutHelp() {
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13px">
      <div><h4 style="margin:0 0 8px">Navigation (Alt + key)</h4><div style="line-height:1.9">
        <div><span class="kbd">Alt+O</span> Dashboard</div><div><span class="kbd">Alt+I</span> Inventory</div><div><span class="kbd">Alt+U</span> Purchases</div><div><span class="kbd">Alt+L</span> Sales/POS</div><div><span class="kbd">Alt+R</span> Repairing</div><div><span class="kbd">Alt+C</span> Customers</div><div><span class="kbd">Alt+D</span> Udhar</div><div><span class="kbd">Alt+E</span> Expenses</div><div><span class="kbd">Alt+P</span> Reports</div><div><span class="kbd">Alt+,</span> Settings</div>
      </div></div>
      <div><h4 style="margin:0 0 8px">Actions</h4><div style="line-height:1.9">
        <div><span class="kbd">F1</span> Help</div><div><span class="kbd">F2</span> Add to Cart</div><div><span class="kbd">F4</span> Save Sale</div><div><span class="kbd">F8</span> New Purchase</div><div><span class="kbd">F9</span> Add Expense</div><div><span class="kbd">F10</span> Repair Slip</div><div><span class="kbd">Esc</span> Close Modal</div>
      </div></div>
    </div>`;
  openModal('Keyboard Shortcuts', body, async () => closeModal(), 'Close');
}

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
  if (!recent || !recent.length) {
    $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  } else {
    $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  }

  const { data: dueSales } = await supabase.from('sales').select('customer_name,balance').gt('balance', 0);
  if (dueSales && dueSales.length) {
    const totalDue = dueSales.reduce((s, x) => s + Number(x.balance || 0), 0);
    toast(`Warning: ${dueSales.length} customers have total ${fmt(totalDue)} pending udhar!`, 'error');
    const badge = $('notifBadge');
    if (badge) { badge.textContent = dueSales.length; badge.style.display = 'inline-block'; }
    const panel = $('notifPanel');
    if (panel) panel.innerHTML = `<h3 style="font-size:14px;margin:0 0 10px">Pending Udhar</h3>` + dueSales.slice(0, 20).map(d => `<div class="notif-item"><b>${esc(d.customer_name || 'Walk-in')}</b> — ${fmt(d.balance)}</div>`).join('');
  }
}

// =====================================================
// PRODUCTS — EDIT + DELETE (Admin override)
// =====================================================
let ALL_PRODUCTS = [];
const CATEGORIES = ['Mobile Phones', 'Mobile Accessories', 'Chargers & Cables', 'Handsfree & Audio', 'Batteries', 'Memory & Storage', 'Mobile Parts', 'SIM & Network', 'Repairing Tools', 'Other Gadgets'];

async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.or(`name.ilike.%${filter}%,imei_1.ilike.%${filter}%,imei_2.ilike.%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products. Add from Purchase section.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" id="prodSelectAll" onchange="toggleAllProducts(this)"></th><th>Product</th><th>Category</th><th>Brand</th><th>IMEI 1 / 2</th><th class="num">Price</th><th class="num">Stock</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr>
      <td><input type="checkbox" class="prod-check" value="${p.id}" onchange="updateProductBulk()"></td>
      <td><strong>${esc(p.name)}</strong><br><small style="color:#6b7896">${esc(p.sub_category || '')}</small></td>
      <td>${esc(p.category || '—')}</td>
      <td>${esc(p.brand || '—')}</td>
      <td><small>${esc(p.imei_1 || '—')} / ${esc(p.imei_2 || '—')}</small></td>
      <td class="num">${fmt(p.sale_price)}</td>
      <td class="num"><b style="color:${p.quantity <= p.min_stock ? '#dc2626' : '#16a34a'}">${p.quantity}</b></td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));

window.toggleAllProducts = cb => {
  document.querySelectorAll('.prod-check').forEach(c => c.checked = cb.checked);
  updateProductBulk();
};
function updateProductBulk() {
  const n = document.querySelectorAll('.prod-check:checked').length;
  $('productBulkBar').style.display = n ? 'flex' : 'none';
  $('productSelCount').textContent = n;
}

window.editProduct = async id => {
  if (!checkPermission('edit')) return;
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return toast('Product not found', 'error');
  const { data: racks } = await supabase.from('racks').select('id,name').order('name');
  const body = `<div class="form-grid">
    <div class="field full"><label>Name *</label><input id="peName" value="${esc(p.name)}"></div>
    <div class="field"><label>Category</label><select id="peCat">${CATEGORIES.map(c => `<option ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Brand</label><input id="peBrand" value="${esc(p.brand || '')}"></div>
    <div class="field"><label>Purchase Price</label><input id="pePPrice" type="number" value="${p.purchase_price || 0}"></div>
    <div class="field"><label>Sale Price</label><input id="peSPrice" type="number" value="${p.sale_price || 0}"></div>
    <div class="field"><label>Quantity</label><input id="peQty" type="number" value="${p.quantity || 0}"></div>
    <div class="field"><label>Min Stock</label><input id="peMin" type="number" value="${p.min_stock || 3}"></div>
    <div class="field"><label>IMEI 1</label><input id="peImei1" value="${esc(p.imei_1 || '')}"></div>
    <div class="field"><label>IMEI 2</label><input id="peImei2" value="${esc(p.imei_2 || '')}"></div>
    <div class="field full"><label>Rack</label><select id="peRack"><option value="">— None —</option>${(racks || []).map(r => `<option value="${r.id}" ${p.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
  </div>`;
  openModal('Edit Product', body, async () => {
    const payload = {
      name: $('peName').value.trim(),
      category: $('peCat').value,
      brand: $('peBrand').value.trim() || null,
      purchase_price: Number($('pePPrice').value) || 0,
      sale_price: Number($('peSPrice').value) || 0,
      quantity: Number($('peQty').value) || 0,
      min_stock: Number($('peMin').value) || 3,
      imei_1: $('peImei1').value.trim() || null,
      imei_2: $('peImei2').value.trim() || null,
      rack_id: $('peRack').value || null
    };
    if (!payload.name) throw new Error('Name required');
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await logActivity('EDIT', 'products', payload.name);
    closeModal(); toast('Product updated', 'success'); loadProducts();
  });
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
    toast(`Deleted ${ids.length} products successfully`, 'success');
    loadProducts();
  } catch (err) { toast(err.message, 'error'); }
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
    toast('Product deleted', 'success');
    loadProducts();
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
  else t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" onchange="toggleAllInv(this)"></th><th>Product</th><th>Category</th><th>IMEI</th><th>Rack</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>${low.map(p => `<tr><td><input type="checkbox" class="inv-check" value="${p.id}" onchange="updateInvBulk()"></td><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td><small>${esc(p.imei_1 || '—')}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}</tbody></table>`;
  
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase.from('sale_items').select('product_name,quantity,created_at,sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchase_items').select('product_name,quantity,created_at,purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50)
  ]);
  const movements = [...(saleItems || []).map(m => ({ type: 'OUT', name: m.product_name, qty: m.quantity, ref: m.sales?.invoice_no, date: m.created_at })), ...(purchItems || []).map(m => ({ type: 'IN', name: m.product_name, qty: m.quantity, ref: m.purchases?.invoice_no, date: m.created_at }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 60);
  $('movementsTable').innerHTML = movements.length ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref || '—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No movements.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);
window.toggleAllInv = cb => { document.querySelectorAll('.inv-check').forEach(c => c.checked = cb.checked); updateInvBulk(); };
function updateInvBulk() { const n = document.querySelectorAll('.inv-check:checked').length; $('inventoryBulkBar').style.display = n ? 'flex' : 'none'; $('inventorySelCount').textContent = n; }

// =====================================================
// RACKS
// =====================================================
async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  const rows = racks || [];
  $('racksTable').innerHTML = rows.length ? `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.description || '—')}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Delete</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No racks.</div>';
  const { data: stock } = await supabase.from('products').select('name,quantity,racks!fk_products_racks(name)').order('name');
  $('rackStockTable').innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Quantity</th></tr></thead><tbody>${(stock || []).map(p => `<tr><td>${esc(p.racks?.name || 'Unassigned')}</td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity || 0)}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddRack').onclick = () => openModal('Add Rack', `<div class="form-grid"><div class="field"><label>Rack Name *</label><input id="rackName"></div><div class="field full"><label>Description</label><input id="rackDesc"></div></div>`, async () => {
  const name = $('rackName').value.trim(); if (!name) throw new Error('Name required');
  const { error } = await supabase.from('racks').insert({ name, description: $('rackDesc').value.trim() || null });
  if (error) throw new Error(error.message); closeModal(); toast('Rack added', 'success'); loadRacks();
});
window.deleteRack = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete rack?')) return; const { error } = await supabase.from('racks').delete().eq('id', id); if (error) toast(error.message, 'error'); else { toast('Rack deleted'); loadRacks(); } };

// =====================================================
// PURCHASES MODULE
// =====================================================
async function loadPurchasesModule() {
  loadProducts();
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
  const body = `
    <div class="form-grid">
      <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups || []).map(s => `<option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no || '')}"></div>
      <div class="field"><label>Total (PKR) <small>(Auto)</small></label><input id="puTotal" type="number" value="${p?.total || 0}" readonly style="background:#f0f2f7;cursor:not-allowed"></div>
      <div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid || 0}"></div>
      <div class="field full"><label>Notes</label><textarea id="puNotes">${esc(p?.notes || '')}</textarea></div>
    </div>
    <div style="margin-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h4 style="margin:0;font-size:14px">Products / Items</h4>
        <button type="button" class="btn btn-primary btn-sm" onclick="addPurchaseItemRow()">+ Add Item</button>
      </div>
      <div class="purchase-item-row" style="background:transparent;border:none;font-size:11px;font-weight:800;color:#6b7896;padding:0 10px;margin-bottom:6px">
        <div>Product Name</div><div>Category</div><div>Brand</div><div>Qty</div><div>Buy Price</div><div>Sale Price</div><div>IMEI 1</div><div>IMEI 2</div><div></div>
      </div>
      <div id="purchaseItemsHost"></div>
    </div>
  `;
  openModal(p ? 'Edit Purchase' : 'New Purchase', body, async () => {
    const total = Number($('puTotal').value) || 0;
    const payload = { supplier_id: $('puSup').value || null, invoice_no: $('puInv').value.trim() || null, total, paid: Number($('puPaid').value) || 0, notes: $('puNotes').value.trim() || null };
    let purchaseId = p?.id;
    
    if (p) { 
      const { error } = await supabase.from('purchases').update(payload).eq('id', p.id); 
      if (error) throw new Error(error.message);
      await supabase.from('purchase_items').delete().eq('purchase_id', p.id);
    }
    else { 
      const { data: created, error } = await supabase.from('purchases').insert(payload).select().single(); 
      if (error) throw new Error(error.message); 
      purchaseId = created.id; 
    }

    const itemRows = document.querySelectorAll('#purchaseItemsHost .purchase-item-row');
    for (const row of itemRows) {
      const name = row.querySelector('.pi-name').value.trim(); if (!name) continue;
      const category = row.querySelector('.pi-category').value;
      const brand = row.querySelector('.pi-brand').value.trim();
      const qty = Number(row.querySelector('.pi-qty').value) || 0;
      const pprice = Number(row.querySelector('.pi-pprice').value) || 0;
      const sprice = Number(row.querySelector('.pi-sprice').value) || 0;
      const imei1 = row.querySelector('.pi-imei1').value.trim() || null;
      const imei2 = row.querySelector('.pi-imei2').value.trim() || null;
      
      await supabase.from('purchase_items').insert({ purchase_id: purchaseId, product_name: name, category, quantity: qty, unit_price: pprice, line_total: qty * pprice, imei_1: imei1, imei_2: imei2 });
      
      // ✅ STOCK MERGE FIX: Same Name + Category + Brand check karega (IMEI ignore)
      let q = supabase.from('products').select('*').eq('name', name).eq('category', category);
      if (brand) q = q.eq('brand', brand); else q = q.is('brand', null);
      const { data: existing } = await q;
      
      if (existing && existing.length) {
        // Agar pehle se hai toh Stock update karega
        const old = existing[0];
        await supabase.from('products').update({ 
          quantity: Number(old.quantity || 0) + qty, 
          purchase_price: pprice || old.purchase_price, 
          sale_price: sprice || old.sale_price, 
          imei_1: imei1 || old.imei_1, 
          imei_2: imei2 || old.imei_2 
        }).eq('id', old.id);
      } else {
        // Agar naya hai toh nayi entry
        await supabase.from('products').insert({ name, category, brand: brand || null, quantity: qty, purchase_price: pprice, sale_price: sprice, min_stock: 3, imei_1: imei1, imei_2: imei2 });
      }
    }
    await logActivity(p ? 'EDIT' : 'CREATE', 'purchases', `Purchase ${payload.invoice_no || purchaseId}`);
    closeModal(); toast('Purchase saved & products synced!', 'success'); loadPurchasesModule();
  });
  
  setTimeout(() => { 
    addPurchaseItemRow(); 
    updatePurchaseTotal(); 
  }, 50);
}

window.addPurchaseItemRow = () => {
  const host = $('purchaseItemsHost'); if (!host) return;
  const div = document.createElement('div');
  div.className = 'purchase-item-row';
  div.innerHTML = `
    <input class="pi-name" placeholder="Product Name" oninput="updatePurchaseTotal()">
    <select class="pi-category">${CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select>
    <input class="pi-brand" placeholder="Brand">
    <input class="pi-qty" type="number" value="1" placeholder="Qty" oninput="updatePurchaseTotal()">
    <input class="pi-pprice" type="number" value="0" placeholder="Buy" oninput="updatePurchaseTotal()">
    <input class="pi-sprice" type="number" value="0" placeholder="Sale">
    <input class="pi-imei1" placeholder="IMEI 1">
    <input class="pi-imei2" placeholder="IMEI 2">
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentNode.remove(); updatePurchaseTotal();">×</button>
  `;
  host.appendChild(div);
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
// SALES / POS — Premium Build
// =====================================================
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;
let POS_ALL_PRODS = [];
let HELD_CARTS = JSON.parse(localStorage.getItem('bm_held_carts') || '[]');

async function loadPosCustomers() {
  const { data } = await supabase.from('customers').select('id,name,phone').order('name');
  POS_CUSTOMERS = data || [];
  $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');
}

async function updatePosCustomerDue() {
  const name = $('saleCustName').value.trim();
  const phone = $('saleCustPhone').value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance', 0);
  POS_PREVIOUS_DUE = (data || []).reduce((n, x) => n + Number(x.balance || 0), 0);
  $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE);
  $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName').addEventListener('change', updatePosCustomerDue);
$('saleCustPhone').addEventListener('change', updatePosCustomerDue);

async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
  POS_ALL_PRODS = data || [];
  const cats = [...new Set(POS_ALL_PRODS.map(p => p.category).filter(Boolean))];
  $('saleCategoryFilter').innerHTML = '<option value="">— All —</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterPosProducts();
  renderCart();
}

window.filterPosProducts = () => {
  const cat = $('saleCategoryFilter').value;
  const filtered = cat ? POS_ALL_PRODS.filter(p => p.category === cat) : POS_ALL_PRODS;
  $('saleProductSelect').innerHTML = '<option value="">— Choose —</option>' + filtered.map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-cat="${esc(p.category)}" data-stock="${p.quantity}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity})</option>`).join('');
};
$('saleCategoryFilter').addEventListener('change', filterPosProducts);

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect');
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select a product first', 'error');
  const stock = Number(opt.dataset.stock) || 0;
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing && existing.quantity + 1 > stock) return toast('Stock limit reached', 'error');
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, category: opt.dataset.cat, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price), stock });
  renderCart();
};

function renderCart() {
  if (!CART.length) {
    $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  } else {
    $('cartItems').innerHTML = `<table class="cart-mini"><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>${CART.map((c, i) => `
      <tr>
        <td>${esc(c.product_name)}</td>
        <td class="num"><input type="number" value="${c.unit_price}" style="width:64px;padding:3px;text-align:right;border:1px solid var(--border);border-radius:5px;font-size:11px" onchange="updateCartPrice(${i},this.value)"></td>
        <td class="num" style="white-space:nowrap">
          <button class="qty-btn" onclick="decCartQty(${i})">−</button>
          <b style="margin:0 6px">${c.quantity}</b>
          <button class="qty-btn" onclick="incCartQty(${i})">+</button>
        </td>
        <td class="num">${fmt(c.line_total)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td>
      </tr>`).join('')}</tbody></table>`;
  }
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  let disc = Number($('saleDiscount').value) || 0;
  const discType = $('saleDiscountType').value;
  if (discType === 'pct') disc = (sub * disc) / 100;
  const finalTotal = Math.max(0, sub - disc) + POS_PREVIOUS_DUE;
  $('cartSubtotal').textContent = fmt(sub);
  $('cartTotal').textContent = fmt(finalTotal);
  $('salePaid').value = finalTotal;
  const udhar = finalTotal - (Number($('salePaid').value) || 0);
  $('udharWarning').style.display = udhar > 0 ? 'block' : 'none';
}

window.removeCart = i => { CART.splice(i, 1); renderCart(); };
window.incCartQty = i => { const c = CART[i]; if (c.quantity + 1 > c.stock) return toast('Stock limit', 'error'); c.quantity++; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.decCartQty = i => { const c = CART[i]; if (c.quantity <= 1) return window.removeCart(i); c.quantity--; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.updateCartPrice = (i, val) => { const c = CART[i]; c.unit_price = Number(val) || 0; c.line_total = c.quantity * c.unit_price; renderCart(); };

$('saleDiscount').addEventListener('input', renderCart);
$('saleDiscountType').addEventListener('change', renderCart);
$('salePaid').addEventListener('input', () => {
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  let disc = Number($('saleDiscount').value) || 0;
  const discType = $('saleDiscountType').value;
  if (discType === 'pct') disc = (sub * disc) / 100;
  const finalTotal = Math.max(0, sub - disc) + POS_PREVIOUS_DUE;
  $('udharWarning').style.display = finalTotal - (Number($('salePaid').value) || 0) > 0 ? 'block' : 'none';
});

// HOLD SALE
$('btnHoldSale')?.addEventListener('click', () => {
  if (!CART.length) return toast('Cart empty', 'error');
  const name = $('saleCustName').value.trim() || prompt('Hold name (optional):', 'Held Sale');
  HELD_CARTS.push({ id: Date.now(), name: name || 'Held Sale', cart: [...CART], discount: Number($('saleDiscount').value) || 0, time: new Date().toISOString() });
  localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  CART = []; $('saleDiscount').value = 0; $('saleCustName').value = ''; $('saleCustPhone').value = '';
  renderCart(); toast('Sale held!', 'success');
});

$('btnResumeSale')?.addEventListener('click', () => {
  if (!HELD_CARTS.length) return toast('No held sales', 'error');
  const list = HELD_CARTS.map((h, i) => `${i + 1}. ${h.name} — ${fmt(h.cart.reduce((s, c) => s + c.line_total, 0))} (${new Date(h.time).toLocaleTimeString()})`).join('\n');
  const pick = prompt(`Held sales:\n${list}\n\nEnter number to resume:`, '1');
  const idx = Number(pick) - 1;
  if (isNaN(idx) || !HELD_CARTS[idx]) return;
  CART = [...HELD_CARTS[idx].cart]; $('saleDiscount').value = HELD_CARTS[idx].discount || 0;
  HELD_CARTS.splice(idx, 1);
  localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  renderCart(); toast('Sale resumed', 'success');
});

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart is empty', 'error');
  const subtotal = CART.reduce((s, c) => s + c.line_total, 0);
  let discount = Number($('saleDiscount').value) || 0;
  if ($('saleDiscountType').value === 'pct') discount = (subtotal * discount) / 100;
  const totalSale = Math.max(0, subtotal - discount);
  const paid = Number($('salePaid').value) || 0;
  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  const custPhone = $('saleCustPhone').value.trim();
  const payMethod = $('salePaymentMethod').value;

  $('btnSaveSale').disabled = true;
  $('btnSaveSale').textContent = 'Saving...';

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
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      invoice_no: invNo, customer_id: customerId, customer_name: custName,
      customer_phone: custPhone || null, subtotal, discount, total: totalSale,
      paid, balance: totalSale - paid, payment_method: payMethod
    }).select().single();
    if (saleErr) throw new Error('Sale: ' + saleErr.message);

    const items = CART.map(c => ({
      sale_id: saleData.id, product_id: c.product_id, product_name: c.product_name,
      imei: c.imei || null, quantity: c.quantity, unit_price: c.unit_price,
      line_total: c.line_total, category: c.category
    }));
    const { error: itemsErr } = await supabase.from('sale_items').insert(items);
    if (itemsErr) throw new Error('Items: ' + itemsErr.message);

    for (const item of CART) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.quantity) }).eq('id', item.product_id);
    }

    await logActivity('CREATE', 'sales', `Sale ${invNo} - ${fmt(totalSale)}`);
    const printOpt = confirm('Sale saved! Print Thermal (OK) or A4 (Cancel)?');
    const payload = { invoice: invNo, customer: custName, phone: custPhone, subtotal, discount, total: totalSale, paid, balance: totalSale - paid, date: new Date(), items: [...CART] };
    if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');

    CART = [];
    $('saleDiscount').value = 0; $('salePaid').value = 0;
    $('saleCustName').value = ''; $('saleCustPhone').value = '';
    $('previousDueBox').style.display = 'none'; POS_PREVIOUS_DUE = 0;
    $('saleCategoryFilter').value = '';
    renderCart(); loadSaleProducts(); loadOverview();
    toast('Sale saved & POS cleared', 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally {
    $('btnSaveSale').disabled = false;
    $('btnSaveSale').innerHTML = 'Save Sale <span class="kbd">F4</span>';
  }
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
    await supabase.from('sale_items').delete().eq('sale_id', id);
    await supabase.from('sales').delete().eq('id', id);
    await logActivity('DELETE', 'sales', id);
    toast('Sale deleted & stock reversed', 'success');
    loadSalesHistory(); loadOverview();
  } catch (e) { toast(e.message, 'error'); }
};

$('btnSalesHistory').onclick = () => { const box = $('salesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadSalesHistory(); };
$('btnRefreshSales').onclick = loadSalesHistory;
async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { $('salesHistoryTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  $('salesHistoryTable').innerHTML = !data?.length ? '<div class="empty">No sales.</div>' : `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${s.balance > 0 ? `<b style="color:#dc2626">${fmt(s.balance)}</b>` : '<span class="pill green">Paid</span>'}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">Print</button><button class="btn btn-danger btn-sm" onclick="deleteSale('${s.id}')" title="Admin only">Del</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async id => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single(); if (!s) return;
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone, subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paid, balance: s.balance, date: s.created_at, items: items || [] };
  if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');
};

// =====================================================
// REPAIRING — with Delivery Payment Check
// =====================================================
const COMMON_FAULTS = ['Screen Broken', 'Touch Not Working', 'Battery Drain', 'Not Charging', 'No Power', 'No Display', 'Dead', 'Water Damage', 'Camera Not Working', 'Speaker Not Working', 'Mic Not Working', 'Network Issue', 'Face ID Not Working', 'Software Update'];

async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || '';
  const st = $('repairStatusFilter')?.value || '';
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
  const payload = { invoice: r.slip_no, customer: r.customer_name, phone: r.phone, subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, balance: r.charge - r.advance, date: r.created_at, items: [{ name: r.mobile + ' - ' + (r.issue || 'Repair'), qty: 1, total: r.charge }] };
  if (printOpt) printThermal80mm(payload, 'repair'); else printA4Premium(payload, 'repair');
};

function openRepairModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field"><label>Customer *</label><input id="rCust" value="${esc(r?.customer_name || '')}"></div>
    <div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone || '')}"></div>
    <div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile || '')}"></div>
    <div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei || '')}"></div>
    <div class="field full"><label>Fault</label><input id="rIssue" list="faultsList" value="${esc(r?.issue || '')}"><datalist id="faultsList">${COMMON_FAULTS.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
    <div class="field full" style="display:flex;gap:20px;padding:10px;background:#fafbfd;border-radius:8px;border:1px solid #e6e9f2">
      <label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rBatWarranty" ${r?.battery_warranty === 'Yes' ? 'checked' : ''}> Battery Warranty (Yes/No)</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rDeadWarranty" ${r?.dead_warranty === 'Yes' ? 'checked' : ''}> Dead Warranty (Yes/No)</label>
    </div>
    <div class="field"><label>Charge</label><input id="rCharge" type="number" value="${r?.charge || 0}"></div>
    <div class="field"><label>Advance</label><input id="rAdvance" type="number" value="${r?.advance || 0}"></div>
    <div class="field"><label>Status</label><select id="rStatus">${['Received', 'In Progress', 'Ready', 'Delivered'].map(s => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field full"><label>Notes</label><textarea id="rNotes">${esc(r?.notes || '')}</textarea></div>
  </div>`;

  openModal(r ? 'Edit Repair' : 'New Repair', body, async () => {
    const payload = {
      customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim() || null,
      mobile: $('rMobile').value.trim() || null, imei: $('rImei').value.trim() || null,
      issue: $('rIssue').value.trim() || null, charge: Number($('rCharge').value) || 0,
      advance: Number($('rAdvance').value) || 0, status: $('rStatus').value,
      notes: $('rNotes').value.trim() || null,
      battery_warranty: $('rBatWarranty').checked ? 'Yes' : 'No',
      dead_warranty: $('rDeadWarranty').checked ? 'Yes' : 'No'
    };
    if (!payload.customer_name) throw new Error('Customer required');

    if (payload.status === 'Delivered' && payload.charge > payload.advance) {
      if (!confirm(`Payment still pending (${fmt(payload.charge - payload.advance)}). Do you want to deliver the item?`)) {
        throw new Error('Delivery cancelled due to pending payment.');
      }
    }

    if (r) await supabase.from('repairs').update(payload).eq('id', r.id);
    else await supabase.from('repairs').insert(payload);
    await logActivity(r ? 'EDIT' : 'CREATE', 'repairs', payload.customer_name);
    closeModal(); toast('Saved', 'success'); loadRepairs();
  });
}

// =====================================================
// CUSTOMERS
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
window.deleteCustomer = async id => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete?')) return;
  try {
    await supabase.from('sales').update({ customer_id: null }).eq('customer_id', id);
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'customers', id);
    toast('Deleted'); loadCustomers();
  } catch (e) { toast(e.message, 'error'); }
};
window.toggleAllCust = cb => { document.querySelectorAll('.cust-check').forEach(c => c.checked = cb.checked); updateCustBulk(); };
function updateCustBulk() { const n = document.querySelectorAll('.cust-check:checked').length; $('custBulkBar').style.display = n ? 'flex' : 'none'; $('custSelCount').textContent = n; }

window.bulkDeleteCustomers = async () => {
  if (!checkPermission('delete')) return;
  const ids = [...document.querySelectorAll('.cust-check:checked')].map(c => c.value);
  if (!ids.length || !confirm(`Delete ${ids.length} customers? Sales history will be preserved.`)) return;
  try {
    await supabase.from('sales').update({ customer_id: null }).in('customer_id', ids);
    const { error } = await supabase.from('customers').delete().in('id', ids);
    if (error) throw error;
    toast(`Deleted ${ids.length} customers successfully`);
    loadCustomers();
  } catch (e) { toast(e.message, 'error'); }
};

function openCustomerModal(c = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name || '')}"></div><div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}"></div><div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance || 0}"></div><div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address || '')}</textarea></div></div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id);
    else await supabase.from('customers').insert(payload);
    await logActivity(c ? 'EDIT' : 'CREATE', 'customers', payload.name);
    toast('Saved', 'success'); closeModal(); loadCustomers();
  });
}

// =====================================================
// SUPPLIERS — FIXED + PREMIUM
// =====================================================
let ALL_SUP = [];
let SUP_FILTER = { search: '', cat: '' };

async function loadSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) { $('suppliersTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  ALL_SUP = data || [];

  const catFilter = $('supplierCategoryFilter');
  if (catFilter) {
    const cats = [...new Set(ALL_SUP.map(s => s.category).filter(Boolean))];
    catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}" ${SUP_FILTER.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
  }

  let filtered = [...ALL_SUP];
  if (SUP_FILTER.search) {
    const q = SUP_FILTER.search.toLowerCase();
    filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(q) || (s.phone || '').includes(q));
  }
  if (SUP_FILTER.cat) filtered = filtered.filter(s => s.category === SUP_FILTER.cat);

  const t = $('suppliersTable');
  if (!filtered.length) {
    t.innerHTML = `<div class="empty">${ALL_SUP.length ? 'No suppliers match filter.' : 'No suppliers yet. Click + Add Supplier.'}</div>`;
    return;
  }

  t.innerHTML = `<table class="data"><thead><tr>
    <th>Name</th><th>Category</th><th>Phone</th><th>Address</th><th class="num">Purchases</th><th>Actions</th>
  </tr></thead><tbody>${filtered.map(s => `
    <tr>
      <td><b>${esc(s.name)}</b></td>
      <td><span class="pill blue">${esc(s.category || 'General')}</span></td>
      <td>${esc(s.phone || '—')}</td>
      <td><small>${esc(s.address || '—')}</small></td>
      <td class="num"><button class="btn btn-ghost btn-sm" onclick="viewSupplierLedger('${s.id}','${esc(s.name)}')">View</button></td>
      <td class="actions" style="white-space:nowrap">
        ${s.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(s.phone)}" title="Call">📞</a>` : ''}
        ${s.phone ? `<a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(s.phone.replace(/[^0-9]/g,''))}" target="_blank" title="WhatsApp">💬</a>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="viewSupplierHistory('${s.id}','${esc(s.name)}')">History</button>
        <button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
}

$('supplierSearch')?.addEventListener('input', e => { SUP_FILTER.search = e.target.value; loadSuppliers(); });
$('supplierCategoryFilter')?.addEventListener('change', e => { SUP_FILTER.cat = e.target.value; loadSuppliers(); });

$('btnAddSupplier').onclick = () => openSupplierModal();

function openSupplierModal(s = null) {
  const body = `<div class="form-grid">
    <div class="field full"><label>Supplier Name *</label><input id="sName" value="${esc(s?.name || '')}" placeholder="e.g. Ali Mobile Parts"></div>
    <div class="field"><label>Category</label><input id="sCategory" value="${esc(s?.category || '')}" placeholder="e.g. Mobile Parts" list="supCats"><datalist id="supCats">${CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist></div>
    <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone || '')}" placeholder="03xx-xxxxxxx"></div>
    <div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address || '')}</textarea></div>
    <div class="field full"><label>Notes</label><textarea id="sNotes">${esc(s?.notes || '')}</textarea></div>
  </div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = {
      name: $('sName').value.trim(),
      category: $('sCategory').value.trim() || null,
      phone: $('sPhone').value.trim() || null,
      address: $('sAddr').value.trim() || null,
      notes: $('sNotes').value.trim() || null
    };
    if (!payload.name) throw new Error('Supplier name is required');
    let res;
    if (s) res = await supabase.from('suppliers').update(payload).eq('id', s.id);
    else res = await supabase.from('suppliers').insert(payload);
    if (res.error) throw new Error(res.error.message);
    await logActivity(s ? 'EDIT' : 'CREATE', 'suppliers', payload.name);
    closeModal(); toast('Supplier saved ✅', 'success'); loadSuppliers();
  });
}

window.editSupplier = id => {
  if (!checkPermission('edit')) return;
  const s = ALL_SUP.find(x => x.id === id);
  if (!s) return toast('Not found', 'error');
  openSupplierModal(s);
};

window.deleteSupplier = async id => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete supplier? Purchases history will be preserved.')) return;
  try {
    await supabase.from('purchases').update({ supplier_id: null }).eq('supplier_id', id);
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'suppliers', id);
    toast('Supplier deleted', 'success'); loadSuppliers();
  } catch (e) { toast(e.message, 'error'); }
};

window.viewSupplierHistory = async (id, name) => {
  const { data } = await supabase.from('purchases').select('*').eq('supplier_id', id).order('created_at', { ascending: false });
  if (!data?.length) return toast('No purchases from this supplier', 'error');
  const total = data.reduce((s, p) => s + Number(p.total || 0), 0);
  const paid = data.reduce((s, p) => s + Number(p.paid || 0), 0);
  const body = `
    <div style="margin-bottom:12px;padding:12px;background:#fafbfd;border-radius:8px">
      <b>${esc(name)}</b><br>
      Total Purchases: <b>${fmt(total)}</b> | Paid: <b>${fmt(paid)}</b> | Due: <b style="color:#dc2626">${fmt(total - paid)}</b>
    </div>
    <table class="data"><thead><tr><th>Invoice</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${data.map(p => `<tr><td>${esc(p.invoice_no || p.id.slice(0, 6))}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  openModal(`Supplier History — ${name}`, body, async () => closeModal(), 'Close');
};

window.viewSupplierLedger = async (id, name) => {
  const { data } = await supabase.from('purchases').select('total,paid').eq('supplier_id', id);
  const total = (data || []).reduce((s, p) => s + Number(p.total || 0), 0);
  const paid = (data || []).reduce((s, p) => s + Number(p.paid || 0), 0);
  const due = total - paid;
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="padding:14px;background:#eff6ff;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896;text-transform:uppercase">Total</div><div style="font-size:20px;font-weight:800;color:#2563eb">${fmt(total)}</div></div>
      <div style="padding:14px;background:#f0fdf4;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896;text-transform:uppercase">Paid</div><div style="font-size:20px;font-weight:800;color:#16a34a">${fmt(paid)}</div></div>
      <div style="padding:14px;background:#fef2f2;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896;text-transform:uppercase">Due</div><div style="font-size:20px;font-weight:800;color:#dc2626">${fmt(due)}</div></div>
    </div>
    <p style="color:#6b7896;font-size:13px">Supplier: <b>${esc(name)}</b></p>`;
  openModal(`Ledger — ${name}`, body, async () => closeModal(), 'Close');
};

// =====================================================
// CREDIT / UDHAR
// =====================================================
let CREDIT_RANGE = 'all', CREDIT_STATUS = 'all';
$('creditDateTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => {
  $('creditDateTabs').querySelectorAll('button').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); CREDIT_RANGE = b.dataset.range; loadCredit();
});
$('creditStatusTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => {
  $('creditStatusTabs').querySelectorAll('button').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); CREDIT_STATUS = b.dataset.status; loadCredit();
});

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
  if (range.from) q = q.gte('created_at', range.from);
  if (range.to) q = q.lte('created_at', range.to);
  const { data: sales } = await q;
  const { data: recov } = await supabase.from('credit_recoveries').select('*,customers(name,phone)').order('created_at', { ascending: false }).limit(100);
  let filteredSales = sales || [];
  if (CREDIT_STATUS === 'received') filteredSales = [];
  const map = {};
  filteredSales.forEach(s => {
    const key = s.customer_id || s.customer_name || 'walkin';
    if (!map[key]) map[key] = { name: s.customer_name || 'Walk-in', phone: s.customer_phone, total: 0, count: 0, id: s.customer_id };
    map[key].total += Number(s.balance || 0); map[key].count++;
  });
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
  const newPaid = Number(s.paid || 0) + amount;
  const newBal = Math.max(0, Number(s.total || 0) - newPaid);
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
// EXPENSES
// =====================================================
const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Transport', 'Repair Parts', 'Tea/Food', 'Marketing', 'Other'];
async function loadExpenses() {
  const catSel = $('expFilterCat');
  if (catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">All</option>' + EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  const from = $('expFilterFrom')?.value || '';
  const to = $('expFilterTo')?.value || '';
  const cat = $('expFilterCat')?.value || '';
  let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (from) q = q.gte('expense_date', from);
  if (to) q = q.lte('expense_date', to);
  if (cat) q = q.eq('category', cat);
  const { data } = await q;
  const t = $('expensesTable');
  t.innerHTML = !data?.length ? '<div class="empty">No expenses.</div>' : `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${data.map(e => `<tr><td>${esc(e.expense_date)}</td><td><span class="pill orange">${esc(e.category || 'Other')}</span></td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
  const all = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay());
  const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
  $('expToday').textContent = fmt(sum(all.filter(x => x.expense_date === today)));
  $('expWeek').textContent = fmt(sum(all.filter(x => x.expense_date >= ws.toISOString().slice(0, 10))));
  $('expMonth').textContent = fmt(sum(all.filter(x => x.expense_date >= ms)));
  $('expTotal').textContent = fmt(sum(all));
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Date *</label><input type="date" id="exDate" value="${new Date().toISOString().slice(0, 10)}"></div><div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Amount *</label><input type="number" id="exAmount" value="0"></div><div class="field full"><label>Description</label><input id="exDesc"></div></div>`;
  openModal('Add Expense', body, async () => {
    const amount = Number($('exAmount').value) || 0;
    if (amount <= 0) throw new Error('Amount must be greater than 0');
    await supabase.from('expenses').insert({ expense_date: $('exDate').value, category: $('exCat').value, amount, description: $('exDesc').value.trim() || null });
    await logActivity('CREATE', 'expenses', fmt(amount));
    closeModal(); toast('Expense added', 'success'); loadExpenses();
  });
};
window.deleteExpense = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('expenses').delete().eq('id', id); toast('Deleted'); loadExpenses(); };
$('btnFilterExpenses').onclick = loadExpenses;

// =====================================================
// REPORTS
// =====================================================
$('btnRunReport').onclick = runReport;
$('btnPrintReport').onclick = () => {
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: 'REPORT', customer: $('reportType').value.toUpperCase(), subtotal: 0, total: 0, paid: 0, balance: 0, date: new Date(), items: Array.from($('reportOutput').querySelectorAll('tbody tr')).map(r => { const c = r.querySelectorAll('td'); return { description: c[0]?.innerText + ' ' + (c[1]?.innerText || ''), price: 0, qty: 1, total: c[c.length - 1]?.innerText || c[c.length - 2]?.innerText }; }) };
  if (printOpt) printThermal80mm({ ...payload, items: payload.items.map(i => ({ ...i, name: i.description, quantity: i.qty })) }, 'sale');
  else printA4Premium(payload, 'report');
};
async function runReport() {
  const type = $('reportType').value;
  const from = $('reportFrom').value;
  const to = $('reportTo').value;
  const search = $('reportSearch')?.value?.trim().toLowerCase() || '';
  const out = $('reportOutput'); out.innerHTML = '<div class="empty">Loading…</div>';
  try {
    if (type === 'sales') {
      let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q; let f = data || [];
      if (search) f = f.filter(s => (s.customer_name || '').toLowerCase().includes(search) || (s.invoice_no || '').toLowerCase().includes(search));
      const total = f.reduce((s, r) => s + Number(r.total || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Sales Report — Total: ${fmt(total)}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${f.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'pl') {
      let q = supabase.from('sale_items').select('product_id,product_name,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data: items } = await q; let f = items || [];
      if (search) f = f.filter(i => (i.product_name || '').toLowerCase().includes(search));
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
    }
    else if (type === 'purchases') {
      let q = supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q; let f = data || [];
      if (search) f = f.filter(p => (p.suppliers?.name || '').toLowerCase().includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Purchase Report</h3><table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${f.map(p => `<tr><td>${esc(p.invoice_no || '—')}</td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'expenses') {
      let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (from) q = q.gte('expense_date', from);
      if (to) q = q.lte('expense_date', to);
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Expense Report</h3><table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${(data || []).map(e => `<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category || '')}</td><td>${esc(e.description || '')}</td><td class="num">${fmt(e.amount)}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'customer') {
      const { data } = await supabase.from('customers').select('*'); let f = data || [];
      if (search) f = f.filter(c => (c.name || '').toLowerCase().includes(search) || (c.phone || '').includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Customer Report</h3><table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th></tr></thead><tbody>${f.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'repairing') {
      const { data } = await supabase.from('repairs').select('*'); let f = data || [];
      if (search) f = f.filter(r => (r.customer_name || '').toLowerCase().includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Repairing Report</h3><table class="data"><thead><tr><th>Slip</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th>Status</th></tr></thead><tbody>${f.map(r => `<tr><td>${esc(r.slip_no || '')}</td><td>${esc(r.customer_name)}</td><td>${esc(r.mobile || '')}</td><td>${esc(r.issue || '')}</td><td class="num">${fmt(r.charge)}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table>`;
    }
  } catch (e) { out.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// =====================================================
// STAFF + ACTIVITY LOGS
// =====================================================
async function loadStaff() {
  const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
  const t = $('staffTable');
  if (error) { t.innerHTML = `<div class="empty">${esc(error.message)}</div>`; }
  else if (!data?.length) { t.innerHTML = '<div class="empty">No staff.</div>'; }
  else {
    t.innerHTML = `<table class="data"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Permissions</th><th>Actions</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.staff_id)}</b></td><td>${esc(s.name)}</td><td><span class="pill">${esc(s.role)}</span></td><td><small>Edit: ${s.can_edit ? 'Yes' : 'No'} | Del: ${s.can_delete ? 'Yes' : 'No'}</small></td><td>${s.staff_id === '01' ? '<small style="color:#6b7896">Protected</small>' : `<button class="btn btn-ghost btn-sm" onclick="editStaff('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Del</button>`}</td></tr>`).join('')}</tbody></table>`;
  }

  const { data: logs, error: logErr } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
  if (logErr) {
    $('activityLogTable').innerHTML = `<div class="empty">Error loading activity: ${esc(logErr.message)}</div>`;
  } else if (!logs?.length) {
    $('activityLogTable').innerHTML = '<div class="empty">No activity recorded yet.</div>';
  } else {
    $('activityLogTable').innerHTML = logs.map(l => `<div class="log-row"><span><small>${new Date(l.created_at).toLocaleString()}</small></span><span><b>${esc(l.staff_name || l.staff_id)}</b></span><span><span class="pill blue">${esc(l.action)}</span></span><span>${esc(l.module || '')} — <small>${esc(l.details || '')}</small></span></div>`).join('');
  }
}

$('btnAddStaff').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Staff ID *</label><input id="stId"></div><div class="field"><label>Name *</label><input id="stName"></div><div class="field full"><label>Password *</label><input id="stPass" type="password"></div><div class="field"><label>Role</label><select id="stRole"><option>Staff</option><option>Manager</option><option>Admin</option></select></div><div class="field full" style="display:flex;gap:20px"><label><input type="checkbox" id="stEdit"> Can Edit</label><label><input type="checkbox" id="stDelete"> Can Delete</label></div></div>`;
  openModal('Generate Staff ID', body, async () => {
    const payload = { staff_id: $('stId').value.trim(), name: $('stName').value.trim(), password: $('stPass').value.trim(), role: $('stRole').value, can_edit: $('stEdit').checked, can_delete: $('stDelete').checked };
    if (!payload.staff_id || !payload.name || !payload.password) throw new Error('All required');
    const { error } = await supabase.from('staff').insert(payload);
    if (error) throw new Error(error.code === '23505' ? 'Staff ID already exists' : error.message);
    await logActivity('CREATE', 'staff', payload.name);
    closeModal(); toast('Staff created', 'success'); loadStaff();
  });
};

window.editStaff = async id => {
  if (!IS_ADMIN) return toast('Only Admin can edit staff', 'error');
  const { data: s } = await supabase.from('staff').select('*').eq('id', id).single(); if (!s) return;
  const body = `<div class="form-grid"><div class="field"><label>Staff ID *</label><input id="stId" value="${esc(s.staff_id)}"></div><div class="field"><label>Name *</label><input id="stName" value="${esc(s.name)}"></div><div class="field full"><label>New Password (blank = keep)</label><input id="stPass" type="password"></div><div class="field"><label>Role</label><select id="stRole">${['Staff', 'Manager', 'Admin'].map(r => `<option ${s.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div><div class="field full" style="display:flex;gap:20px"><label><input type="checkbox" id="stEdit" ${s.can_edit ? 'checked' : ''}> Can Edit</label><label><input type="checkbox" id="stDelete" ${s.can_delete ? 'checked' : ''}> Can Delete</label></div></div>`;
  openModal('Edit Staff', body, async () => {
    const payload = { staff_id: $('stId').value.trim(), name: $('stName').value.trim(), role: $('stRole').value, can_edit: $('stEdit').checked, can_delete: $('stDelete').checked };
    if ($('stPass').value.trim()) payload.password = $('stPass').value.trim();
    if (!payload.staff_id || !payload.name) throw new Error('Required');
    const { error } = await supabase.from('staff').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await logActivity('EDIT', 'staff', payload.name);
    closeModal(); toast('Staff updated', 'success'); loadStaff();
  });
};

window.deleteStaff = async id => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete this staff?')) return;
  await supabase.from('staff').delete().eq('id', id);
  await logActivity('DELETE', 'staff', id);
  toast('Deleted'); loadStaff();
};

// =====================================================
// TRANSACTIONS
// =====================================================
async function loadTransactions() {
  const [{ data: s }, { data: p }, { data: e }] = await Promise.all([
    supabase.from('sales').select('invoice_no,total,created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchases').select('invoice_no,total,created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('expenses').select('description,amount,created_at').order('created_at', { ascending: false }).limit(50)
  ]);
  const rows = [
    ...(s || []).map(x => ({ t: 'IN', ref: x.invoice_no, amt: x.total, date: x.created_at })),
    ...(p || []).map(x => ({ t: 'OUT', ref: x.invoice_no, amt: x.total, date: x.created_at })),
    ...(e || []).map(x => ({ t: 'EXPENSE', ref: x.description, amt: x.amount, date: x.created_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  $('transactionsTable').innerHTML = `<table class="data"><thead><tr><th>Type</th><th>Reference</th><th class="num">Amount</th><th>Date</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="pill ${r.t === 'IN' ? 'green' : r.t === 'OUT' ? 'orange' : 'red'}">${r.t}</span></td><td>${esc(r.ref || '—')}</td><td class="num">${fmt(r.amt)}</td><td><small>${new Date(r.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`;
}

// =====================================================
// NOTIFICATION BELL
// =====================================================
$('notifBell').onclick = () => { $('notifPanel').classList.toggle('open'); };
document.addEventListener('click', e => {
  if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBell')) $('notifPanel')?.classList.remove('open');
});

// =====================================================
// INIT
// =====================================================
(async () => {
  await loadShopSettings();
  renderCart();
  loadOverview();
})();
