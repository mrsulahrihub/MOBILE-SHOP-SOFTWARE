// =====================================================
// BM MOBILE ZONE - FULL WORKING SYSTEM (v17.0 - FINAL)
// =====================================================
import { supabase } from './config.js';

// --- 1. INITIAL SETUP & SESSION ---
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
const IS_ADMIN = !SESSION.staff_id || SESSION.staff_id === '01';

document.getElementById('userName').textContent = SESSION.name || 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = SESSION.role ? SESSION.role.toUpperCase() : 'ADMIN';
document.getElementById('welcomeName').textContent = SESSION.name || 'Admin';
document.getElementById('userAvatar').textContent = SESSION.name ? SESSION.name[0].toUpperCase() : 'B';
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('bm_staff');
  window.location.replace('./login.html');
});

// --- 2. HELPERS ---
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SHOP_INFO = { name: 'BM MOBILE ZONE', address: 'Chohan Mobile Market, Zafarwal', phone1: '0345-6613232', phone2: '0307-6613232' };

function checkPermission(action) {
  if (!SESSION.staff_id) return true; // Full access if no staff logged in (legacy)
  if (IS_ADMIN) return true;
  if (action === 'edit' && !SESSION.can_edit) { toast('Aapko edit ki ijazat nahi hai!', 'error'); return false; }
  if (action === 'delete' && !SESSION.can_delete) { toast('Aapko delete ki ijazat nahi hai!', 'error'); return false; }
  return true;
}

function toast(msg, type = 'info') {
  const host = $('toastHost'); if (!host) return;
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg;
  host.appendChild(el); setTimeout(() => el.remove(), 3500);
}

let MODAL_ON_CONFIRM = null;
function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save') {
  $('modalTitle').textContent = title; $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel; MODAL_ON_CONFIRM = onConfirm;
  $('modalBackdrop').classList.add('open');
}
function closeModal() { $('modalBackdrop').classList.remove('open'); MODAL_ON_CONFIRM = null; }
$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => {
  if (MODAL_ON_CONFIRM) { try { await MODAL_ON_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); } }
};

// --- 3. PREMIUM PRINTING FUNCTIONS ---
function printThermal80mm(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=340,height=640');
  if (!w) { toast('Popup blocked — allow popups to print', 'error'); return; }
  
  const items = (data.items || []).map(it => `
    <tr>
      <td style="text-align:left;font-size:11px">${esc(it.product_name || it.name)}<br><span style="font-size:9px;color:#444">${esc(it.category || '')} ${it.imei ? 'IMEI: '+esc(it.imei) : ''}</span></td>
      <td style="text-align:center;font-size:11px">${it.quantity || it.qty || 1}</td>
      <td style="text-align:right;font-size:11px">${Number(it.line_total || it.total || it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  let showTopLine = false;
  if (type === 'repair' || type === 'sale') {
    const urduLine = "ﻣوﺑﺎﺋل ﻣرﻣت ﮐﮯ ﺑﻌد وﺻول ﮐرﻧﮯ ﮐﮯ ﻟﯾﮯ ﯾہ رﺳﯾد ﻻزﻣﯽ ﺳﺎﺗﮭ ﻻﺋﯾں۔";
    if (confirm(`Kya aap yeh line print karna chahte hain?\n\n"${urduLine}"\n\n(OK = Haan, Cancel = Nahi)`)) showTopLine = true;
  }

  let urduTerms = '';
  if (type === 'repair' || type === 'sale') {
    urduTerms = `
    <hr style="border-top: 1px dashed #000; margin: 6px 0;">
    <div style="text-align:right; font-size:12px; font-family:'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; direction: rtl; line-height: 1.6;">
      ${showTopLine ? `<div style="text-align:center; font-weight:bold; font-size:13px; margin-bottom:4px;">ﻣوﺑﺎﺋل ﻣرﻣت ﮐﮯ ﺑﻌد وﺻول ﮐرﻧﮯ ﮐﮯ ﻟﯾﮯ ﯾہ رﺳﯾد ﻻزﻣﯽ ﺳﺎﺗﮭ ﻻﺋﯾں۔</div>` : ''}
      <div>• ﺑراه ِ ﮐرم ﻣﺎل ﮐﺎؤﻧﭨر ﭘر ﭼﯾﮏ ﮐرﯾں۔</div>
      <div>• ﭘﮭوﻟﯽ ﮨوﺋﯽ ﺑﯾﭨری ﮐﯽ ﮐوﺋﯽ وارﻧﭨﯽ ﻧﮩﯾں ﮨﮯ۔</div>
      <div>• ﺑﯾﭨری ﮐﯽ وارﻧﭨﯽ ﺻرف 2 دن ﮨوﮔﯽ۔</div>
      <div>• اﺳﭨرپ واﻟﯽ ﺑﯾﭨری ﮐﯽ ﮐوﺋﯽ وارﻧﭨﯽ ﻧﮩﯾں ﮨﮯ۔</div>
      <div>• اﺳﺗﻌﻣﺎل ﺷده Accessories واﭘس ﯾﺎ ﺗﺑدﯾل ﻧﮩﯾں ﮨوں ﮔﯽ۔</div>
    </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: 'Courier New', monospace; width: 74mm; margin: 0 auto; color: #000; font-weight: bold; }
    h2 { text-align: center; margin: 0 0 2px 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 11px; margin: 1px 0; }
    hr { border: none; border-top: 2px dashed #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { border-bottom: 2px dashed #000; padding: 4px 0; font-size: 11px; text-align: left; }
    .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
    .bold { font-weight: 900; font-size: 13px; }
    .center { text-align: center; margin-top: 6px; font-size: 11px; }
    .footer { text-align: center; margin-top: 10px; font-size: 10px; font-weight: normal; line-height: 1.4; }
  </style></head><body>
    <h2>BM MOBILE ZONE</h2>
    <div class="sub">Chohan Mobile Market, Zafarwal</div>
    <div class="sub">☎ 0345-6613232 / 0307-6613232</div>
    <hr>
    <div class="row"><span>Invoice: <b>${esc(data.invoice)}</b></span></div>
    <div class="row"><span>Date: ${new Date(data.date).toLocaleString('en-PK')}</span></div>
    <div class="row"><span>Customer: ${esc(data.customer || 'Walk-in')}</span></div>
    ${data.phone ? `<div class="row"><span>Phone: ${esc(data.phone)}</span></div>` : ''}
    <hr>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${items}</tbody></table>
    <hr>
    <div class="row"><span>Subtotal</span><span>PKR ${Number(data.subtotal||0).toLocaleString()}</span></div>
    <div class="row"><span>Discount</span><span>-PKR ${Number(data.discount||0).toLocaleString()}</span></div>
    <div class="row bold"><span>Total</span><span>PKR ${Number(data.total||0).toLocaleString()}</span></div>
    <div class="row"><span>Paid</span><span>PKR ${Number(data.paid||0).toLocaleString()}</span></div>
    ${data.balance > 0 ? `<div class="row bold"><span>Due</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}
    ${urduTerms}
    <hr>
    <div class="center">Thank you for shopping!</div>
    <div class="center">Visit Again</div>
    <div class="footer">
      <div style="font-weight:bold;">Powered by MS.TECH</div>
      <div>Smart Business Solutions | Software Developed by MS.TECH</div>
      <div>☎ 03099100546</div>
    </div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script>
  </body></html>`;
  w.document.write(html); w.document.close();
}
window.printThermal80mm = printThermal80mm;

function printA4Premium(data, type = 'sale') {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) { toast('Popup blocked', 'error'); return; }
  
  const rows = (data.items || []).map((it, idx) => `
    <tr>
      <td>${idx + 1}. ${esc(it.description || it.product_name || it.name)}</td>
      <td style="text-align:right">PKR ${Number(it.price || it.unit_price || 0).toLocaleString()}</td>
      <td style="text-align:center">${it.qty || it.quantity || 1}</td>
      <td style="text-align:right">PKR ${Number(it.total || it.line_total || it.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  let showTopLine = false;
  if (type === 'repair' || type === 'sale') {
    const urduLine = "ﻣوﺑﺎﺋل ﻣرﻣت ﮐﮯ ﺑﻌد وﺻول ﮐرﻧﮯ ﮐﮯ ﻟﯾﮯ ﯾہ رﺳﯾد ﻻزﻣﯽ ﺳﺎﺗﮭ ﻻﺋﯾں۔";
    if (confirm(`Kya aap yeh line print karna chahte hain?\n\n"${urduLine}"\n\n(OK = Haan, Cancel = Nahi)`)) showTopLine = true;
  }

  let urduTerms = '';
  if (type === 'repair' || type === 'sale') {
    urduTerms = `
    <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-left: 4px solid #5b8def; text-align:right; font-family:'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif; direction: rtl; font-size: 14px; color: #333; line-height: 1.8;">
      ${showTopLine ? `<div style="font-weight:bold; margin-bottom:5px;">ﻣوﺑﺎﺋل ﻣرﻣت ﮐﮯ ﺑﻌد وﺻول ﮐرﻧﮯ ﮐﮯ ﻟﯾﮯ ﯾہ رﺳﯾد ﻻزﻣﯽ ﺳﺎﺗﮭ ﻻﺋﯾں۔</div>` : ''}
      <div>• ﺑراه ِ ﮐرم ﻣﺎل ﮐﺎؤﻧﭨر ﭘر ﭼﯾﮏ ﮐرﯾں۔</div>
      <div>• ﭘﮭوﻟﯽ ﮨوﺋﯽ ﺑﯾﭨری ﮐﯽ ﮐوﺋﯽ وارﻧﭨﯽ ﻧﮩﯾں ﮨﮯ۔</div>
      <div>• ﺑﯾﭨری ﮐﯽ وارﻧﭨﯽ ﺻرف 2 دن ﮨوﮔﯽ۔</div>
      <div>• اﺳﭨرپ واﻟﯽ ﺑﯾﭨری ﮐﯽ ﮐوﺋﯽ وارﻧﭨﯽ ﻧﮩﯾں ﮨﮯ۔</div>
      <div>• اﺳﺗﻌﻣﺎل ﺷده Accessories واﭘس ﯾﺎ ﺗﺑدﯾل ﻧﮩﯾں ﮨوں ﮔﯽ۔</div>
    </div>`;
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; background: #fff; color: #333; margin: 0; padding: 40px; position: relative; min-height: 100vh; }
    .header-bg { position: absolute; top: 0; left: 0; width: 100%; height: 150px; background: linear-gradient(135deg, #0f172a 0%, #5b8def 50%, #7c5cff 100%); clip-path: ellipse(150% 100% at 50% 0%); z-index: -1; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; margin-top: 60px; }
    .title { font-size: 42px; font-weight: 800; color: #1b2436; margin: 0; border-left: 5px solid #5b8def; padding-left: 15px; line-height: 1; }
    .company { text-align: right; color: #fff; }
    .company h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
    .company p { margin: 2px 0 0; font-size: 12px; color: #cbd5e1; }
    .info { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 13px; }
    .info-col p { margin: 4px 0; }
    .info-col b { color: #5b8def; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; color: #5b8def; font-size: 14px; padding: 10px; border-bottom: 2px solid #5b8def; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .totals { width: 300px; float: right; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #5b8def; font-weight: 600; }
    .totals-row.grand { font-size: 18px; color: #1b2436; font-weight: 800; border-top: 2px solid #5b8def; margin-top: 5px; padding-top: 10px; }
    .footer-bg { position: fixed; bottom: 0; left: 0; width: 100%; height: 120px; background: linear-gradient(135deg, #0f172a 0%, #5b8def 50%, #7c5cff 100%); clip-path: ellipse(150% 100% at 50% 100%); z-index: -1; }
    .clearfix::after { content: ""; clear: both; display: table; }
    .footer-text { position: fixed; bottom: 10px; left: 0; width: 100%; text-align: center; font-size: 11px; color: #fff; line-height: 1.4; }
  </style></head><body>
    <div class="header-bg"></div>
    <div class="header">
      <h1 class="title">INVOICE</h1>
      <div class="company">
        <h2>BM MOBILE ZONE</h2>
        <p>Chohan Mobile Market, Zafarwal</p>
        <p>0345-6613232</p>
      </div>
    </div>
    <div class="info">
      <div class="info-col">
        <p><b>INVOICE NO:</b> ${esc(data.invoice)}</p>
        <p><b>DATE:</b> ${new Date(data.date).toLocaleDateString()}</p>
      </div>
      <div class="info-col" style="text-align:right">
        <p><b>CUSTOMER:</b> ${esc(data.customer)}</p>
        <p><b>PHONE:</b> ${esc(data.phone || '—')}</p>
      </div>
    </div>
    <table><thead><tr><th>Description</th><th style="text-align:right">Price</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="clearfix">
      <div class="totals">
        <div class="totals-row"><span>SUBTOTAL</span><span>PKR ${Number(data.subtotal||0).toLocaleString()}</span></div>
        <div class="totals-row"><span>DISCOUNT</span><span>PKR ${Number(data.discount||0).toLocaleString()}</span></div>
        <div class="totals-row grand"><span>GRAND TOTAL</span><span>PKR ${Number(data.total||0).toLocaleString()}</span></div>
        <div class="totals-row"><span>PAID</span><span>PKR ${Number(data.paid||0).toLocaleString()}</span></div>
        ${data.balance > 0 ? `<div class="totals-row" style="color:#dc2626"><span>BALANCE</span><span>PKR ${Number(data.balance).toLocaleString()}</span></div>` : ''}
      </div>
    </div>
    ${urduTerms}
    <div class="footer-bg"></div>
    <div class="footer-text">
      <div style="font-weight:bold; font-size:12px;">Powered by MS.TECH</div>
      <div>Smart Business Solutions | Software Developed by MS.TECH</div>
      <div>☎ 03099100546</div>
    </div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);}<\/script>
  </body></html>`;
  w.document.write(html); w.document.close();
}
window.printA4Premium = printA4Premium;

// --- 4. SIDEBAR & NAVIGATION ---
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');
let sidebarTimeout;
if (handle) {
  handle.addEventListener('click', (e) => {
    e.stopPropagation(); const isOpen = sidebar.classList.toggle('show'); handle.classList.toggle('open', isOpen);
    if (isOpen) resetSidebarTimer(); else clearTimeout(sidebarTimeout);
  });
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !handle.contains(e.target)) { sidebar.classList.remove('show'); handle.classList.remove('open'); clearTimeout(sidebarTimeout); }
  });
}
function resetSidebarTimer() { clearTimeout(sidebarTimeout); sidebarTimeout = setTimeout(() => { sidebar.classList.remove('show'); handle.classList.remove('open'); }, 15000); }

const MODULE_TITLES = { 
  overview: 'Dashboard', products: 'Products', inventory: 'Inventory', racks: 'Racks', 
  repairing: 'Repairing', sales: 'Sales / POS', purchases: 'Purchases', customers: 'Customers', 
  suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses', 
  reports: 'Reports & P&L', settings: 'Staff Settings' 
};

document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mod = btn.dataset.module;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active')); 
    const targetMod = $('module-' + mod);
    if(targetMod) targetMod.classList.add('active');
    $('pageTitle').textContent = MODULE_TITLES[mod] || mod; loadModule(mod);
    sidebar.classList.remove('show'); handle?.classList.remove('open');
  });
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview();
    case 'products': return loadProducts();
    case 'inventory': return loadInventory();
    case 'racks': return loadRacks();
    case 'repairing': return loadRepairs();
    case 'sales': return loadSaleProducts();
    case 'purchases': return loadPurchases();
    case 'customers': return loadCustomers();
    case 'suppliers': return loadSuppliers();
    case 'credit': return loadCredit();
    case 'expenses': return loadExpenses();
    case 'reports': return; // Handled by button click
    case 'settings': return loadStaff();
  }
}

// --- 5. OVERVIEW ---
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance'), supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }), supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'), supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);
  const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  $('stProducts').textContent = (prods.data || []).filter(p => p.is_active !== false).length;
  $('stStock').textContent = sum(prods, 'quantity');
  $('stTodaySales').textContent = fmt(sum(salesToday, 'total'));
  $('stMonthSales').textContent = fmt(sum(salesMonth, 'total'));
  $('stPurchases').textContent = fmt(sum(purch, 'total'));
  $('stCustomers').textContent = custs.count || 0;
  $('stOutstanding').textContent = fmt(sum(sales, 'balance'));
  $('stExpenses').textContent = fmt(sum(exp, 'amount'));

  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  else $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

// --- 6. PRODUCTS ---
let ALL_PRODUCTS = [];
const CATEGORIES = ['Mobile Phones', 'Mobile Accessories', 'Chargers & Cables', 'Handsfree & Audio', 'Batteries', 'Memory & Storage', 'Mobile Parts', 'SIM & Network', 'Repairing Tools', 'Other Gadgets'];
const CAT_ITEMS = {
  'Mobile Accessories': ['Glass Protector', 'Back Cover', 'Flip Cover', 'Camera Lens', 'Ring Holder', 'Phone Pouch', 'Selfie Stick', 'Car Mount', 'OTG Cable'],
  'Chargers & Cables': ['Fast Charger', 'Type-C Cable', 'Lightning Cable', 'Micro USB Cable', 'Car Charger', 'Power Bank', 'Wireless Charger', 'Adapter'],
  'Handsfree & Audio': ['Handsfree', 'Earbuds', 'Bluetooth Headset', 'Neckband', 'Speaker', 'Airpods'],
  'Batteries': ['Mobile Battery', 'Power Bank Battery', 'Lithium Ion', 'Strip Battery'],
  'Memory & Storage': ['Memory Card 32GB', 'Memory Card 64GB', 'Memory Card 128GB', 'USB Flash Drive', 'OTG Pen Drive'],
  'Mobile Parts': ['LCD Panel', 'Touch Screen', 'Battery Connector', 'Charging Port', 'Camera Module', 'Speaker', 'Vibrator', 'Flex Cable', 'Back Camera', 'Front Camera'],
  'SIM & Network': ['SIM Ejector', 'SIM Adapter', 'Network Booster', 'Signal Antenna'],
  'Repairing Tools': ['Screwdriver Kit', 'Opening Pry Tool', 'Tweezers', 'Heat Gun', 'Suction Cup', 'Multimeter', 'BGA Rework Station'],
  'Other Gadgets': ['Smart Watch', 'Fitness Band', 'Bluetooth Tracker', 'VR Headset', 'Gaming Controller']
};

async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Product Name</th><th>Category</th><th>Brand</th><th>Barcode</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><strong>${esc(p.name)}</strong><br><small>${esc(p.sub_category || '')}</small></td><td>${esc(p.category || '—')}</td><td>${esc(p.brand || '—')}</td><td><small>${esc(p.barcode || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
$('btnAddProduct')?.addEventListener('click', () => openProductModal());
window.editProduct = (id) => { if(!checkPermission('edit')) return; const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };
window.deleteProduct = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete this product?')) return; const { error } = await supabase.from('products').delete().eq('id', id); if (error) return toast(error.message, 'error'); toast('Product deleted', 'success'); loadProducts(); };

async function openProductModal(p = null) {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const body = `<div class="form-grid">
      <div class="field"><label>Product Name *</label><input id="pName" value="${esc(p?.name || '')}" placeholder="e.g. iPhone 11 Glass"></div>
      <div class="field"><label>Brand</label><input id="pBrand" value="${esc(p?.brand || '')}" placeholder="e.g. Apple, Samsung, Anker"></div>
      <div class="field"><label>Category *</label>
        <select id="pCategory" onchange="updateSubCatOptions()">
          ${CATEGORIES.map(c => `<option value="${c}" ${p?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Sub-Category / Model</label>
        <input id="pSubCategory" list="subCatList" placeholder="Select or type..." value="${esc(p?.sub_category || '')}">
        <datalist id="subCatList"></datalist>
      </div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price || 0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price || 0}"></div>
      <div class="field"><label>Stock Quantity</label><input id="pQty" type="number" value="${p?.quantity || 0}"></div>
      <div class="field"><label>Barcode</label><input id="pBarcode" value="${esc(p?.barcode || '')}" placeholder="Scan or type barcode"></div>
      <div class="field"><label>Rack Location</label><select id="pRack"><option value="">Unassigned</option>${(rackRows || []).map(r => `<option value="${r.id}" ${p?.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Min Stock Alert</label><input id="pMin" type="number" value="${p?.min_stock || 5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const payload = { name: $('pName').value.trim(), brand: $('pBrand').value.trim() || null, category: $('pCategory').value, sub_category: $('pSubCategory').value.trim() || null, barcode: $('pBarcode').value.trim() || null, purchase_price: Number($('pPurchase').value) || 0, sale_price: Number($('pSale').value) || 0, quantity: Number($('pQty').value) || 0, rack_id: $('pRack').value || null, min_stock: Number($('pMin').value) || 5 };
    if (!payload.name) throw new Error('Product Name required');
    if (p) await supabase.from('products').update(payload).eq('id', p.id); else await supabase.from('products').insert(payload);
    toast('Saved', 'success'); closeModal(); loadProducts();
  });
  updateSubCatOptions(p?.sub_category);
}
window.updateSubCatOptions = (val = '') => { const cat = $('pCategory').value; const items = CAT_ITEMS[cat] || []; const dl = $('subCatList'); if (dl) dl.innerHTML = items.map(i => `<option value="${esc(i)}">`).join(''); if (val !== undefined && val !== '') $('pSubCategory').value = val; };

// --- 7. INVENTORY & RACKS ---
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter'); if (rf && rf.options.length <= 1) rf.innerHTML = '<option value="">All Racks</option>' + (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(100);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>Rack</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}${p.sub_category ? ' / ' + esc(p.sub_category) : ''}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low Stock</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}</tbody></table>`;

  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([ supabase.from('sale_items').select('product_name,quantity,created_at, sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50), supabase.from('purchase_items').select('product_name,quantity,created_at, purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50) ]);
  const movements = [ ...(saleItems || []).map(m => ({ type: 'OUT', name: m.product_name, qty: m.quantity, ref: m.sales?.invoice_no, date: m.created_at })), ...(purchItems || []).map(m => ({ type: 'IN', name: m.product_name, qty: m.quantity, ref: m.purchases?.invoice_no, date: m.created_at })) ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 60);
  $('movementsTable').innerHTML = movements.length ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref || '—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No stock movements yet.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);

async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  const rows = racks || [];
  $('racksTable').innerHTML = rows.length ? `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.description || '—')}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Delete</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No racks created.</div>';
  const { data: stock } = await supabase.from('products').select('name,quantity,racks!fk_products_racks(name)').order('name');
  $('rackStockTable').innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Quantity</th></tr></thead><tbody>${(stock || []).map(p => `<tr><td>${esc(p.racks?.name || 'Unassigned')}</td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity || 0)}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddRack').onclick = () => openModal('Add Rack', `<div class="form-grid"><div class="field"><label>Rack Name *</label><input id="rackName" placeholder="Rack A-01"></div><div class="field full"><label>Description</label><input id="rackDesc"></div></div>`, async () => {
  const name = $('rackName').value.trim(); if (!name) throw new Error('Rack name required');
  const { error } = await supabase.from('racks').insert({ name, description: $('rackDesc').value.trim() || null });
  if (error) throw new Error(error.message); closeModal(); toast('Rack added', 'success'); loadRacks();
});
window.deleteRack = async id => { if(!checkPermission('delete')) return; if (!confirm('Delete rack?')) return; const { error } = await supabase.from('racks').delete().eq('id', id); if (error) toast(error.message, 'error'); else { toast('Rack deleted'); loadRacks(); } };

// --- 8. SALES / POS ---
let CART = []; let POS_CUSTOMERS = []; let POS_PREVIOUS_DUE = 0; let POS_ALL_PRODS = [];
async function loadPosCustomers() { const { data } = await supabase.from('customers').select('id,name,phone').order('name'); POS_CUSTOMERS = data || []; $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join(''); }
async function updatePosCustomerDue() {
  const name = $('saleCustName').value.trim(); const phone = $('saleCustPhone').value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance', 0);
  POS_PREVIOUS_DUE = (data || []).reduce((n, x) => n + Number(x.balance || 0), 0);
  $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE); $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName').addEventListener('change', updatePosCustomerDue); $('saleCustPhone').addEventListener('change', updatePosCustomerDue);

async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
  POS_ALL_PRODS = data || [];
  const cats = [...new Set(POS_ALL_PRODS.map(p => p.category).filter(Boolean))];
  $('saleCategoryFilter').innerHTML = '<option value="">— All Categories —</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterPosProducts();
}
window.filterPosProducts = () => {
  const cat = $('saleCategoryFilter').value;
  const filtered = cat ? POS_ALL_PRODS.filter(p => p.category === cat) : POS_ALL_PRODS;
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + filtered.map(p => { const catDisplay = p.category ? `[${p.category}${p.sub_category ? ' - ' + p.sub_category : ''}]` : ''; return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-cat="${esc(p.category)}" data-subcat="${esc(p.sub_category || '')}" data-stock="${p.quantity}">${esc(p.name)} ${catDisplay} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`; }).join('');
};
$('saleCategoryFilter').addEventListener('change', filterPosProducts);

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, category: opt.dataset.cat, sub_category: opt.dataset.subcat, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  renderCart();
};
function renderCart() {
  if (!CART.length) $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  else $('cartItems').innerHTML = `<table class="data cart-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>${CART.map((c, i) => `<tr><td>${esc(c.product_name)}<br><small>${esc(c.category)} ${esc(c.sub_category)}</small></td><td class="num">${c.quantity}</td><td class="num">${fmt(c.line_total)}</td><td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td></tr>`).join('')}</tbody></table>`;
  const sub = CART.reduce((s, c) => s + c.line_total, 0); const disc = Number($('saleDiscount').value) || 0; const total = Math.max(0, sub - disc);
  $('cartSubtotal').textContent = fmt(sub); $('cartTotal').textContent = fmt(total);
  if (Number($('salePaid').value) === 0) $('salePaid').value = total;
  const udhar = total - (Number($('salePaid').value) || 0);
  $('udharWarning').style.display = udhar > 0 ? 'block' : 'none';
}
window.removeCart = (i) => { CART.splice(i, 1); renderCart(); };
$('saleDiscount').addEventListener('input', renderCart); $('salePaid').addEventListener('input', renderCart);

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart empty', 'error');
  
  const subtotal = CART.reduce((s, c) => s + c.line_total, 0);
  const discount = Number($('saleDiscount').value) || 0;
  const total = Math.max(0, subtotal - discount);
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
        if (ce) throw new Error('Customer Error: ' + ce.message); 
        found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }

    const invNo = 'INV-' + Date.now().toString().slice(-6);

    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({
      invoice_no: invNo, customer_id: customerId, customer_name: custName, customer_phone: custPhone || null,
      subtotal, discount, total, paid, balance: total - paid, payment_method: payMethod
    }).select().single();

    if (saleErr) throw new Error('Sale DB Error: ' + saleErr.message);

    const saleItems = CART.map(c => ({
      sale_id: saleData.id, product_id: c.product_id, product_name: c.product_name, imei: c.imei || null,
      quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total, category: c.category, sub_category: c.sub_category
    }));

    const { error: itemsErr } = await supabase.from('sale_items').insert(saleItems);
    if (itemsErr) throw new Error('Items DB Error: ' + itemsErr.message);

    for (const item of CART) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.quantity) }).eq('id', item.product_id);
    }

    const printOpt = confirm('Sale Saved Successfully! \n\nPrint Thermal Receipt (OK) ya A4 Premium Invoice (Cancel)?');
    const payload = { invoice: invNo, customer: custName, phone: custPhone, subtotal, discount, total, paid, balance: total - paid, date: new Date(), items: [...CART] };
    if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');

    toast('Sale Saved & Stock Updated!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
    $('saleCustName').value = ''; $('saleCustPhone').value = ''; $('salePaid').value = 0; $('saleDiscount').value = 0; POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none';
    if (!$('salesHistoryBox').hidden) loadSalesHistory();
  } catch (err) { console.error(err); toast(err.message, 'error'); }
  finally { $('btnSaveSale').disabled = false; $('btnSaveSale').textContent = '💾 Save Sale (F4)'; }
};

$('btnSalesHistory').onclick = () => { const box = $('salesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadSalesHistory(); };
$('btnRefreshSales').onclick = () => loadSalesHistory();
async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
  const t = $('salesHistoryTable'); if (error) { t.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No sales yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Method</th><th>Date</th><th></th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${esc(s.payment_method || 'cash')}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">🖨</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async (id) => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single();
  if (!s) return toast('Sale not found', 'error');
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const printOpt = confirm('Print Thermal Receipt (OK) ya A4 Premium Invoice (Cancel)?');
  const payload = { invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone, subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paid, balance: s.balance, date: s.created_at, items: items || [] };
  if (printOpt) printThermal80mm(payload, 'sale'); else printA4Premium(payload, 'sale');
};

// --- 9. REPAIRING ---
const COMMON_FAULTS = ['Screen Broken', 'Touch Not Working', 'Battery Drain', 'Not Charging', 'No Power', 'No Display', 'Dead', 'Water Damage', 'Camera Not Working', 'Front Camera', 'Back Camera', 'Speaker Not Working', 'Mic Not Working', 'Earpiece Not Working', 'Vibrator Not Working', 'Network Issue', 'No Signal', 'WiFi Issue', 'Bluetooth Issue', 'Face ID Not Working', 'Fingerprint Issue', 'Software Update', 'Hanging Problem', 'Auto Restart', 'Bootloop', 'Fast Charging Issue', 'Slow Charging', 'Heating Issue', 'Headphone Jack', 'Charging Port', 'Data Cable Issue', 'Volume Button', 'Power Button', 'Home Button', 'Silent Switch', 'Back Glass Broken', 'Camera Glass', 'Lens Scratch', 'Bezel Damage', 'Frame Bend', 'Battery Swollen', 'Water Indicator', 'SIM Not Detected', 'Memory Card Slot', 'Speaker Crackling', 'Display Flicker', 'Screen Lines', 'Ghost Touch', 'LCD Burn', 'Backlight Issue', 'No Sound', 'Low Sound', 'Call Drops', 'Echo on Call', 'Proximity Sensor', 'Light Sensor', 'Gyro Sensor', 'Compass Sensor', 'IR Blaster', 'NFC Issue', 'Wireless Charging', 'Reverse Charging', 'Pop-up Camera', 'Slider Phone', 'Flip Phone Hinge', 'Screen Protector', 'Back Cover', 'Lens Protector', 'Board Repair', 'IC Replacement', 'CPU Issue', 'Power IC', 'Charging IC', 'Audio IC', 'Network IC', 'Memory IC', 'Display IC', 'BGA Rework', 'Jumper Wire', 'Track Repair', 'Water Clean', 'Corrosion Clean', 'Antenna Replace', 'Charging Flex', 'LCD Flex', 'Touch Flex', 'Digitizer', 'Glass Replacement', 'Software Flash', 'Firmware Update', 'FRP Lock', 'iCloud Lock', 'Google Lock', 'Pattern Lock', 'Bypass', 'Signal Booster', 'Battery Connector', 'Charging Port Replace', 'Speaker Replace', 'Mic Replace', 'Camera Module', 'Face ID Flex', 'Fingerprint Flex', 'Vibrator Motor', 'Haptic Engine', 'Taptic Engine', 'True Tone', 'Battery Health'];

async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || ''; const st = $('repairStatusFilter')?.value || '';
  let query = supabase.from('repairs').select('*').order('created_at', { ascending: false });
  if (st) query = query.eq('status', st);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,mobile.ilike.%${q}%,imei.ilike.%${q}%,slip_no.ilike.%${q}%`);
  const { data, error } = await query;
  const t = $('repairsTable'); if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No repair jobs.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Slip#</th><th>Customer</th><th>Mobile / IMEI</th><th>Issue</th><th class="num">Charge</th><th class="num">Advance</th><th class="num">Due</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${data.map(r => {
    const due = Number(r.charge || 0) - Number(r.advance || 0);
    const pillClass = r.status === 'Delivered' ? 'green' : r.status === 'Ready' ? 'orange' : r.status === 'In Progress' ? 'orange' : '';
    return `<tr><td><b>${esc(r.slip_no || '—')}</b></td><td>${esc(r.customer_name)}<br><small>${esc(r.phone || '')}</small></td><td>${esc(r.mobile || '—')}<br><small>${esc(r.imei || '')}</small></td><td><small>${esc(r.issue || '—')}</small></td><td class="num">${fmt(r.charge)}</td><td class="num">${fmt(r.advance)}</td><td class="num">${due > 0 ? `<b style="color:#dc2626">${fmt(due)}</b>` : '<span class="pill green">Paid</span>'}</td><td><span class="pill ${pillClass}">${esc(r.status)}</span></td><td><small>${new Date(r.created_at).toLocaleDateString()}</small></td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewRepair('${r.id}')">View</button><button class="btn btn-ghost btn-sm" onclick="editRepair('${r.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRepair('${r.id}')">Del</button></td></tr>`;
  }).join('')}</tbody></table>`;
}
$('repairSearch')?.addEventListener('input', () => loadRepairs()); $('repairStatusFilter')?.addEventListener('change', () => loadRepairs());
$('btnAddRepair').onclick = () => openRepairModal();
window.editRepair = async (id) => { if(!checkPermission('edit')) return; const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single(); if (r) openRepairModal(r); };
window.deleteRepair = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete this repair slip?')) return; const { error } = await supabase.from('repairs').delete().eq('id', id); if (error) return toast(error.message, 'error'); toast('Repair slip deleted'); loadRepairs(); };
window.viewRepair = async (id) => {
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single();
  if (!r) return toast('Not found', 'error');
  const printOpt = confirm('Print Thermal Slip (OK) ya A4 Invoice (Cancel)?');
  const payload = { invoice: r.slip_no, customer: r.customer_name, phone: r.phone, subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, balance: (r.charge - r.advance), date: r.created_at, items: [{ name: r.mobile + ' - ' + (r.issue || 'Repair'), qty: 1, total: r.charge }] };
  if (printOpt) printThermal80mm(payload, 'repair'); else printA4Premium(payload, 'repair');
};

function openRepairModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field"><label>Customer Name *</label><input id="rCust" value="${esc(r?.customer_name || '')}"></div>
    <div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone || '')}"></div>
    <div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile || '')}"></div>
    <div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei || '')}"></div>
    <div class="field full"><label>Fault / Issue (Auto-suggest)</label><input id="rIssue" list="faultsList" value="${esc(r?.issue || '')}" placeholder="Type to search 100+ faults..."><datalist id="faultsList">${COMMON_FAULTS.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
    <div class="field full" style="display:flex;gap:10px;align-items:center;background:rgba(0,0,0,0.02);padding:10px;border-radius:8px;">
      <div style="flex:1"><label style="margin:0;font-size:12px;">Battery Warranty</label><select id="rBatWarranty" style="padding:6px"><option value="No" ${r?.battery_warranty === 'No' ? 'selected' : ''}>No</option><option value="Yes (2 Days)" ${r?.battery_warranty === 'Yes (2 Days)' ? 'selected' : ''}>Yes (2 Days)</option></select></div>
      <div style="flex:1"><label style="margin:0;font-size:12px;">Dead Warranty</label><select id="rDeadWarranty" style="padding:6px"><option value="No" ${r?.dead_warranty === 'No' ? 'selected' : ''}>No</option><option value="Yes" ${r?.dead_warranty === 'Yes' ? 'selected' : ''}>Yes</option></select></div>
    </div>
    <div class="field"><label>Charge (PKR)</label><input id="rCharge" type="number" value="${r?.charge || 0}"></div>
    <div class="field"><label>Advance (PKR)</label><input id="rAdvance" type="number" value="${r?.advance || 0}"></div>
    <div class="field"><label>Status</label><select id="rStatus">${['Received','In Progress','Ready','Delivered'].map(s => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field full"><label>Notes</label><textarea id="rNotes" rows="2">${esc(r?.notes || '')}</textarea></div>
  </div>`;
  openModal(r ? 'Edit Repair Slip' : 'New Repair Slip', body, async () => {
    const payload = { customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim() || null, mobile: $('rMobile').value.trim() || null, imei: $('rImei').value.trim() || null, issue: $('rIssue').value.trim() || null, battery_warranty: $('rBatWarranty').value, dead_warranty: $('rDeadWarranty').value, charge: Number($('rCharge').value) || 0, advance: Number($('rAdvance').value) || 0, status: $('rStatus').value, notes: $('rNotes').value.trim() || null };
    if (!payload.customer_name) throw new Error('Customer name required');
    if (r) { if (payload.status === 'Delivered' && r.status !== 'Delivered') payload.delivered_at = new Date().toISOString(); await supabase.from('repairs').update(payload).eq('id', r.id); }
    else await supabase.from('repairs').insert(payload);
    closeModal(); toast('Saved', 'success'); loadRepairs(); loadOverview();
  });
}

// --- 10. PURCHASES ---
async function loadPurchases() {
  const { data, error } = await supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false });
  const t = $('purchasesTable'); if (error) { t.innerHTML = `<div class="empty">Purchases table not installed: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th></th></tr></thead><tbody>${data.map(p => `<tr><td><b>${esc(p.invoice_no || p.id.slice(0,6))}</b></td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td class="num">${fmt(p.total - (p.paid||0))}</td><td><small>${new Date(p.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="editPurchase('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePurchase('${p.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
window.deletePurchase = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete purchase?')) return; await supabase.from('purchases').delete().eq('id', id); toast('Deleted'); loadPurchases(); };
window.editPurchase = async (id) => { if(!checkPermission('edit')) return; const { data: p } = await supabase.from('purchases').select('*').eq('id', id).single(); if (p) openPurchaseModal(p); };
$('btnNewPurchase').onclick = () => openPurchaseModal();
async function openPurchaseModal(p = null) {
  const { data: sups } = await supabase.from('suppliers').select('id,name').order('name');
  const body = `<div class="form-grid"><div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups || []).map(s => `<option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no || '')}"></div><div class="field"><label>Total (PKR)</label><input id="puTotal" type="number" value="${p?.total || 0}"></div><div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid || 0}"></div><div class="field full"><label>Notes</label><textarea id="puNotes">${esc(p?.notes || '')}</textarea></div></div>`;
  openModal(p ? 'Edit Purchase' : 'New Purchase', body, async () => {
    const payload = { supplier_id: $('puSup').value || null, invoice_no: $('puInv').value.trim() || null, total: Number($('puTotal').value) || 0, paid: Number($('puPaid').value) || 0, notes: $('puNotes').value.trim() || null };
    if (p) await supabase.from('purchases').update(payload).eq('id', p.id); else await supabase.from('purchases').insert(payload);
    closeModal(); toast('Saved', 'success'); loadPurchases();
  });
}

// --- 11. CUSTOMERS & SUPPLIERS ---
let ALL_CUST = []; let ALL_SUP = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false }); if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q; ALL_CUST = data || []; const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>${ALL_CUST.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value)); $('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = (id) => { if(!checkPermission('edit')) return; openCustomerModal(ALL_CUST.find(c => c.id === id)); };
window.deleteCustomer = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('customers').delete().eq('id', id); toast('Deleted'); loadCustomers(); };
function openCustomerModal(c = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name || '')}"></div><div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}"></div><div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance || 0}"></div><div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address || '')}</textarea></div></div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => { const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 }; if (!payload.name) throw new Error('Name required'); if (c) await supabase.from('customers').update(payload).eq('id', c.id); else await supabase.from('customers').insert(payload); toast('Saved', 'success'); closeModal(); loadCustomers(); });
}

async function loadSuppliers() {
  const { data } = await supabase.from('suppliers').select('*').order('name'); ALL_SUP = data || []; const t = $('suppliersTable');
  if (!ALL_SUP.length) { t.innerHTML = '<div class="empty">No suppliers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category (Supplies)</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>${ALL_SUP.map(s => `<tr><td>${esc(s.name)}</td><td><span class="pill blue">${esc(s.category || 'General')}</span></td><td>${esc(s.phone || '—')}</td><td>${esc(s.address || '—')}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('btnAddSupplier').onclick = () => openSupplierModal();
window.editSupplier = (id) => { if(!checkPermission('edit')) return; openSupplierModal(ALL_SUP.find(s => s.id === id)); };
window.deleteSupplier = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('suppliers').delete().eq('id', id); toast('Deleted'); loadSuppliers(); };
function openSupplierModal(s = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="sName" value="${esc(s?.name || '')}"></div><div class="field"><label>Supplies Category</label><input id="sCategory" value="${esc(s?.category || '')}" placeholder="Mobile Accessories, Glass"></div><div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone || '')}"></div><div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address || '')}</textarea></div></div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => { const payload = { name: $('sName').value.trim(), category: $('sCategory').value.trim() || null, phone: $('sPhone').value.trim() || null, address: $('sAddr').value.trim() || null }; if (!payload.name) throw new Error('Name required'); if (s) await supabase.from('suppliers').update(payload).eq('id', s.id); else await supabase.from('suppliers').insert(payload); toast('Saved', 'success'); closeModal(); loadSuppliers(); });
}

// --- 12. CREDIT / UDHAR (AUTO-SYNCED) ---
async function loadCredit() {
  const [{ data: sales }, { data: recov }] = await Promise.all([
    supabase.from('sales').select('customer_id,customer_name,customer_phone,balance,invoice_no,created_at').gt('balance', 0).order('created_at', { ascending: false }),
    supabase.from('credit_recoveries').select('*, customers(name,phone)').order('created_at', { ascending: false }).limit(100)
  ]);
  const map = {}; (sales || []).forEach(s => { const key = s.customer_id || s.customer_name || 'walkin'; if (!map[key]) map[key] = { name: s.customer_name || 'Walk-in', phone: s.customer_phone, total: 0, count: 0 }; map[key].total += Number(s.balance || 0); map[key].count++; });
  const summary = Object.values(map).sort((a, b) => b.total - a.total);
  $('creditSummaryTable').innerHTML = summary.length ? `<table class="data"><thead><tr><th>Customer</th><th>Phone</th><th class="num">Invoices</th><th class="num">Outstanding</th></tr></thead><tbody>${summary.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.phone || '—')}</td><td class="num">${s.count}</td><td class="num"><b>${fmt(s.total)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No outstanding credit. 🎉</div>';
  $('creditTable').innerHTML = (sales || []).length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Balance</th><th>Date</th><th></th></tr></thead><tbody>${sales.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}<br><small>${esc(s.customer_phone || '')}</small></td><td class="num">${fmt(s.balance)}</td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-primary btn-sm" onclick="recoverCredit('${s.invoice_no}')">Recover</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No outstanding invoices.</div>';
  $('recoveriesTable').innerHTML = (recov || []).length ? `<table class="data"><thead><tr><th>Customer</th><th class="num">Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${recov.map(r => `<tr><td>${esc(r.customers?.name || '—')}</td><td class="num">${fmt(r.amount)}</td><td>${esc(r.method || 'cash')}</td><td><small>${new Date(r.created_at).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No recoveries yet.</div>';
}
window.recoverCredit = async (invoice) => {
  const amountStr = prompt(`Recovery amount for invoice ${invoice}:`, ''); if (!amountStr) return;
  const amount = Number(amountStr); if (!amount || amount <= 0) return toast('Invalid amount', 'error');
  const { data: s } = await supabase.from('sales').select('*').eq('invoice_no', invoice).single();
  if (!s) return toast('Invoice not found', 'error');
  const newPaid = Number(s.paid || 0) + amount; const newBal = Math.max(0, Number(s.total || 0) - newPaid);
  const { error: ue } = await supabase.from('sales').update({ paid: newPaid, balance: newBal }).eq('id', s.id); if (ue) return toast(ue.message, 'error');
  await supabase.from('credit_recoveries').insert({ customer_id: s.customer_id, sale_id: s.id, invoice_no: invoice, amount, method: 'cash' });
  toast('Recovery recorded', 'success'); loadCredit(); loadOverview();
};
$('btnPrintCreditAll').onclick = () => {
  const rows = $('creditSummaryTable').querySelectorAll('tbody tr'); if (!rows.length) return toast('Nothing to print', 'error');
  const printOpt = confirm('Print Thermal Report (OK) ya A4 Premium (Cancel)?');
  const payload = { invoice: 'UDHAR-ALL', customer: 'All Customers', subtotal: 0, total: 0, paid: 0, balance: 0, date: new Date(), items: Array.from(rows).map(r => { const cols = r.querySelectorAll('td'); return { description: cols[0].innerText, price: 0, qty: 1, total: Number(cols[3].innerText.replace(/[^0-9]/g, '')) }; }) };
  if (printOpt) { printThermal80mm({ ...payload, items: payload.items.map(i => ({ ...i, name: i.description, quantity: i.qty })) }, 'sale'); }
  else printA4Premium(payload, 'sale');
};

// --- 13. EXPENSES ---
const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Transport', 'Repair Parts', 'Tea/Food', 'Marketing', 'Other'];
async function loadExpenses() {
  const catSel = $('expFilterCat'); if (catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">All</option>' + EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  const from = $('expFilterFrom')?.value || ''; const to = $('expFilterTo')?.value || ''; const cat = $('expFilterCat')?.value || '';
  let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false });
  if (from) q = q.gte('expense_date', from); if (to) q = q.lte('expense_date', to); if (cat) q = q.eq('category', cat);
  const { data, error } = await q; const t = $('expensesTable');
  if (error) { t.innerHTML = `<div class="empty">Expenses table not installed: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No expenses.</div>'; }
  else t.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${data.map(e => `<tr><td>${esc(e.expense_date)}</td><td><span class="pill orange">${esc(e.category || 'Other')}</span></td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
  const all = data || []; const today = new Date().toISOString().slice(0, 10); const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10); const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
  $('expToday').textContent = fmt(sum(all.filter(x => x.expense_date === today))); $('expWeek').textContent = fmt(sum(all.filter(x => x.expense_date >= weekStart.toISOString().slice(0, 10)))); $('expMonth').textContent = fmt(sum(all.filter(x => x.expense_date >= monthStart))); $('expTotal').textContent = fmt(sum(all));
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Date *</label><input type="date" id="exDate" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Amount (PKR) *</label><input type="number" id="exAmount" value="0"></div><div class="field full"><label>Description</label><input id="exDesc"></div></div>`;
  openModal('Add Expense', body, async () => { const amount = Number($('exAmount').value) || 0; if (amount <= 0) throw new Error('Amount must be > 0'); await supabase.from('expenses').insert({ expense_date: $('exDate').value, category: $('exCat').value, amount, description: $('exDesc').value.trim() || null }); closeModal(); toast('Expense added', 'success'); loadExpenses(); loadOverview(); });
};
window.deleteExpense = async (id) => { if(!checkPermission('delete')) return; if (!confirm('Delete expense?')) return; await supabase.from('expenses').delete().eq('id', id); toast('Deleted'); loadExpenses(); };
$('btnFilterExpenses').onclick = () => loadExpenses();

// --- 14. COMBINED REPORTS & P&L ---
$('btnRunReport').onclick = runReport;
$('btnPrintReport').onclick = () => {
  const printOpt = confirm('Print Thermal (OK) ya A4 Premium (Cancel)?');
  const payload = { invoice: 'REPORT', customer: $('reportType').value.toUpperCase(), subtotal: 0, total: 0, paid: 0, balance: 0, date: new Date(), items: Array.from($('reportOutput').querySelectorAll('tbody tr')).map(r => { const c = r.querySelectorAll('td'); return { description: c[0]?.innerText + ' ' + (c[1]?.innerText||''), price: 0, qty: 1, total: c[c.length-1]?.innerText || c[c.length-2]?.innerText }; }) };
  if (printOpt) printThermal80mm({ ...payload, items: payload.items.map(i => ({ ...i, name: i.description, quantity: i.qty })) }, 'sale'); else printA4Premium(payload, 'sale');
};

async function runReport() {
  const type = $('reportType').value; 
  const from = $('reportFrom').value; const to = $('reportTo').value;
  const search = $('reportSearch')?.value?.trim().toLowerCase() || '';
  const out = $('reportOutput'); out.innerHTML = '<div class="empty">Loading…</div>';
  const plSummary = $('plSummary');
  
  try {
    if (type === 'sales') {
      plSummary.style.display = 'none';
      let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      let filtered = data || [];
      if (search) filtered = filtered.filter(s => (s.customer_name||'').toLowerCase().includes(search) || (s.invoice_no||'').toLowerCase().includes(search));
      const total = filtered.reduce((s, r) => s + Number(r.total || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Sales Report — Total: ${fmt(total)}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${filtered.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } 
    else if (type === 'purchases') {
      plSummary.style.display = 'none';
      let q = supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      let filtered = data || [];
      if (search) filtered = filtered.filter(p => (p.suppliers?.name||'').toLowerCase().includes(search) || (p.invoice_no||'').toLowerCase().includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Purchase Report</h3><table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${filtered.map(p => `<tr><td>${esc(p.invoice_no || '—')}</td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } 
    else if (type === 'expenses') {
      plSummary.style.display = 'none';
      let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (from) q = q.gte('expense_date', from); if (to) q = q.lte('expense_date', to);
      const { data } = await q;
      let filtered = data || [];
      if (search) filtered = filtered.filter(e => (e.description||'').toLowerCase().includes(search) || (e.category||'').toLowerCase().includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Expense Report</h3><table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${filtered.map(e => `<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category || '')}</td><td>${esc(e.description || '')}</td><td class="num">${fmt(e.amount)}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'pl') {
      plSummary.style.display = 'flex';
      let q = supabase.from('sale_items').select('product_id,product_name,quantity,unit_price,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data: items } = await q;
      let filtered = items || [];
      if (search) filtered = filtered.filter(i => (i.product_name||'').toLowerCase().includes(search));
      const { data: prods } = await supabase.from('products').select('id,purchase_price');
      const costMap = Object.fromEntries((prods || []).map(p => [p.id, Number(p.purchase_price || 0)]));
      const map = {};
      filtered.forEach(it => { const key = it.product_id || it.product_name; if (!map[key]) map[key] = { name: it.product_name, qty: 0, revenue: 0, cost: 0 }; map[key].qty += Number(it.quantity || 0); map[key].revenue += Number(it.line_total || 0); map[key].cost += Number(it.quantity || 0) * (costMap[it.product_id] || 0); });
      const rows = Object.values(map).map(r => ({ ...r, profit: r.revenue - r.cost }));
      const totalRev = rows.reduce((s, r) => s + r.revenue, 0); const totalCost = rows.reduce((s, r) => s + r.cost, 0); const totalProfit = totalRev - totalCost;
      $('plSummary').innerHTML = `<div class="stat clay"><div class="stat-icon green">↗</div><div><strong>${fmt(totalRev)}</strong><small>Total Revenue</small></div></div><div class="stat clay"><div class="stat-icon orange">↙</div><div><strong>${fmt(totalCost)}</strong><small>Total Cost</small></div></div><div class="stat clay"><div class="stat-icon purple">▨</div><div><strong>${fmt(totalProfit)}</strong><small>Gross Profit</small></div></div>`;
      out.innerHTML = `<h3 style="margin-bottom:12px">Profit & Loss (Item-wise)</h3>` + (rows.length ? `<table class="data"><thead><tr><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th><th class="num">Cost</th><th class="num">Profit</th></tr></thead><tbody>${rows.sort((a,b)=>b.profit-a.profit).map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.revenue)}</td><td class="num">${fmt(r.cost)}</td><td class="num" style="color:${r.profit>=0?'#22a06b':'#dc2626'}"><b>${fmt(r.profit)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No data found.</div>');
    }
    else if (type === 'customer') {
      plSummary.style.display = 'none';
      const { data } = await supabase.from('customers').select('*'); let filtered = data || [];
      if (search) filtered = filtered.filter(c => (c.name||'').toLowerCase().includes(search) || (c.phone||'').includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Customer Report</h3><table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th></tr></thead><tbody>${filtered.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type === 'repairing') {
      plSummary.style.display = 'none';
      const { data } = await supabase.from('repairs').select('*'); let filtered = data || [];
      if (search) filtered = filtered.filter(r => (r.customer_name||'').toLowerCase().includes(search) || (r.mobile||'').toLowerCase().includes(search) || (r.issue||'').toLowerCase().includes(search));
      out.innerHTML = `<h3 style="margin-bottom:12px">Repairing Report</h3><table class="data"><thead><tr><th>Slip</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th>Status</th></tr></thead><tbody>${filtered.map(r => `<tr><td>${esc(r.slip_no || '')}</td><td>${esc(r.customer_name)}</td><td>${esc(r.mobile || '')}</td><td>${esc(r.issue || '')}</td><td class="num">${fmt(r.charge)}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table>`;
    }
  } catch (e) { out.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// --- 15. STAFF / SETTINGS ---
async function loadStaff() {
  const t = $('staffTable'); t.innerHTML = '<div class="empty">Loading staff data…</div>';
  const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
  if (error) { t.innerHTML = `<div class="empty">Staff table error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No staff members found. Click "+ Generate Staff ID" to add one.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Staff ID</th><th>Name</th><th>Role</th><th>Permissions</th><th class="actions">Actions</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.staff_id)}</b></td><td>${esc(s.name)}</td><td><span class="pill ${s.role === 'Admin' ? 'green' : 'orange'}">${esc(s.role)}</span></td><td><small>Edit: ${s.can_edit ? '<span style="color:green">✅ Yes</span>' : '<span style="color:red">❌ No</span>'} &nbsp;|&nbsp; Delete: ${s.can_delete ? '<span style="color:green">✅ Yes</span>' : '<span style="color:red">❌ No</span>'}</small></td><td class="actions">${s.staff_id === '01' ? '<small style="color:#7b869a">Protected</small>' : `<button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Del</button>`}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddStaff').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Staff ID *</label><input id="stId" placeholder="e.g. 02, 03" autocomplete="off"></div><div class="field"><label>Staff Name *</label><input id="stName" placeholder="Full Name"></div><div class="field full"><label>Password *</label><input id="stPass" type="password" placeholder="Set a password"></div><div class="field"><label>Role</label><select id="stRole"><option value="Staff">Staff</option><option value="Manager">Manager</option><option value="Admin">Admin (Full Access)</option></select></div><div class="field full" style="display:flex;gap:20px;margin-top:10px;padding:10px;background:rgba(0,0,0,0.02);border-radius:8px;"><label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:13px;cursor:pointer;"><input type="checkbox" id="stEdit"> Can Edit Records</label><label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:13px;cursor:pointer;"><input type="checkbox" id="stDelete"> Can Delete Records</label></div></div>`;
  openModal('Generate Staff ID', body, async () => {
    const staffId = $('stId').value.trim(); const name = $('stName').value.trim(); const password = $('stPass').value.trim();
    if (!staffId || !name || !password) throw new Error('All fields are required!');
    const { error } = await supabase.from('staff').insert({ staff_id: staffId, name: name, password: password, role: $('stRole').value, can_edit: $('stEdit').checked, can_delete: $('stDelete').checked });
    if (error) { if (error.code === '23505') throw new Error('This Staff ID already exists. Please choose a different one.'); throw new Error(error.message); }
    closeModal(); toast('Staff ID Generated Successfully!', 'success'); loadStaff();
  });
};
window.deleteStaff = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete this staff member?')) return; const { error } = await supabase.from('staff').delete().eq('id', id); if (error) return toast(error.message, 'error'); toast('Staff deleted'); loadStaff(); };

// INITIAL LOAD
renderCart();
loadOverview();
