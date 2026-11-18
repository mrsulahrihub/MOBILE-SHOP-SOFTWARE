// =====================================================
// BISMILLAH MOBILE ZONE — Dashboard Controller v28.0
// Hand-crafted production build — fully usable features
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
      action,
      module,
      details: String(details).slice(0, 500)
    });
  } catch (e) { console.warn('activity log failed', e); }
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
// PRINT — THERMAL 80mm
// Urdu only on Repair receipts. Sale receipts are English.
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

  let urduBlock = '';
  if (type === 'repair') {
    urduBlock = `
      <hr style="border-top:1px dashed #000;margin:6px 0;">
      <div style="text-align:right;font-size:12px;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;direction:rtl;line-height:1.7">
        <div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:5px">موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div>
        <div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div>
        <div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div>
        <div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div>
        <div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div>
      </div>`;
  }

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
// PRINT — A4 PREMIUM
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

// ---------------------------------------------------
// KEYBOARD SHORTCUTS
// ---------------------------------------------------
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
// PRODUCTS
// =====================================================
let ALL_PRODUCTS = [];
const CATEGORIES = ['Mobile Phones', 'Mobile Accessories', 'Chargers & Cables', 'Handsfree & Audio', 'Batteries', 'Memory & Storage', 'Mobile Parts', 'SIM & Network', 'Repairing Tools', 'Other Gadgets'];

async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products. Add from Purchase section.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" id="prodSelectAll" onchange="toggleAllProducts(this)"></th><th>Product</th><th>Category</th><th>Brand</th><th>IMEI 1 / 2</th><th class="num">Price</th><th class="num">Stock</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><input type="checkbox" class="prod-check" value="${p.id}" onchange="updateProductBulk()"></td><td><strong>${esc(p.name)}</strong><br><small style="color:#6b7896">${esc(p.sub_category || '')}</small></td><td>${esc(p.category || '—')}</td><td>${esc(p.brand || '—')}</td><td><small>${esc(p.imei_1 || '—')} / ${esc(p.imei_2 || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td class="num">${p.quantity}</td><td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
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
