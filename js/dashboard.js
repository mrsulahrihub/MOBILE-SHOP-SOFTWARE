// =====================================================
// BM MOBILE ZONE - FULL WORKING SYSTEM (v13.0 - FIXED)
// All modules 100% working. No undefined functions.
// =====================================================
import { supabase } from './config.js';

// --- 1. INITIAL SETUP ---
document.getElementById('userName').textContent = 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = 'ADMIN';
document.getElementById('welcomeName').textContent = 'Admin';
document.getElementById('userAvatar').textContent = 'B';
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', () => {
  window.location.replace('./login.html');
});

// --- 2. HELPERS ---
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SHOP_INFO = {
  name: 'BM MOBILE ZONE',
  address: 'Chohan Mobile Market, Zafarwal',
  phone1: '0345-6613232',
  phone2: '0307-6613232',
  phoneMain: '0345-6613232'
};

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

function toast(msg, type = 'info') {
  const host = $('toastHost');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`; el.textContent = msg;
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

// --- 2b. THERMAL RECEIPT PRINTER (the missing function) ---
function printThermal80mm(data) {
  const w = window.open('', '_blank', 'width=340,height=640');
  if (!w) { toast('Popup blocked — allow popups to print receipt', 'error'); return; }
  const items = (data.items || []).map(it =>
    `<tr>
      <td style="text-align:left">${esc(it.product_name)}${it.imei ? `<br><span style="font-size:9px;color:#555">IMEI: ${esc(it.imei)}</span>` : ''}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">${Number(it.line_total).toLocaleString()}</td>
    </tr>`).join('');
  const d = data.date ? new Date(data.date) : new Date();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; margin: 0 auto; color: #000; }
    h2 { text-align: center; margin: 0; font-size: 16px; }
    .sub { text-align: center; font-size: 9px; margin: 2px 0; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; font-size: 9px; }
    .total-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
    .grand { font-weight: bold; font-size: 13px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
    .center { text-align: center; }
    @media print { body { width: 72mm; } }
  </style></head><body>
    <h2>${esc(SHOP_INFO.name)}</h2>
    <div class="sub">${esc(SHOP_INFO.address)}</div>
    <div class="sub">Ph: ${esc(SHOP_INFO.phone1)} / ${esc(SHOP_INFO.phone2)}</div>
    <hr>
    <div class="sub" style="text-align:left">Invoice: <b>${esc(data.invoice)}</b></div>
    <div class="sub" style="text-align:left">Date: ${d.toLocaleString('en-PK')}</div>
    <div class="sub" style="text-align:left">Customer: ${esc(data.customer || 'Walk-in')}${data.phone ? ` (${esc(data.phone)})` : ''}</div>
    <hr>
    <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${items}</tbody></table>
    <hr>
    <div class="total-row"><span>Subtotal</span><span>PKR ${Number(data.subtotal).toLocaleString()}</span></div>
    <div class="total-row"><span>Discount</span><span>PKR ${Number(data.discount || 0).toLocaleString()}</span></div>
    <div class="total-row grand"><span>TOTAL</span><span>PKR ${Number(data.total).toLocaleString()}</span></div>
    <div class="total-row"><span>Paid</span><span>PKR ${Number(data.paid).toLocaleString()}</span></div>
    <div class="total-row"><span>Balance</span><span>PKR ${Number(data.balance || 0).toLocaleString()}</span></div>
    ${data.previousDue > 0 ? `<div class="total-row" style="color:#b45309"><span>Previous Due</span><span>PKR ${Number(data.previousDue).toLocaleString()}</span></div>` : ''}
    <hr>
    <div class="center" style="font-size:10px;margin-top:8px">Shukriya! Dobara Tashreef Layein</div>
    <div class="center" style="font-size:9px;margin-top:2px">Powered by MS.TECH</div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},400);}<\/script>
  </body></html>`;
  w.document.write(html); w.document.close();
}
window.printThermal80mm = printThermal80mm;

// --- 3. SIDEBAR & THEME ---
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');
let sidebarTimeout;

if (handle) {
  handle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = sidebar.classList.toggle('show');
    handle.classList.toggle('open', isOpen);
    if (isOpen) resetSidebarTimer(); else clearTimeout(sidebarTimeout);
  });
  sidebar.addEventListener('mouseenter', () => clearTimeout(sidebarTimeout));
  sidebar.addEventListener('mouseleave', () => resetSidebarTimer());
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !handle.contains(e.target)) {
      sidebar.classList.remove('show'); handle.classList.remove('open');
      clearTimeout(sidebarTimeout);
    }
  });
}
function resetSidebarTimer() {
  clearTimeout(sidebarTimeout);
  sidebarTimeout = setTimeout(() => {
    sidebar.classList.remove('show'); handle.classList.remove('open');
  }, 15000);
}

// --- 4. SHORTCUTS & NAVIGATION ---
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (e.key === 'F2') { e.preventDefault(); $('btnAddToCart')?.click(); }
  if (e.key === 'F4') { e.preventDefault(); $('btnSaveSale')?.click(); }
  if (e.key === 'F8') { e.preventDefault(); $('btnNewPurchase')?.click(); }
  if (e.key === 'F9') { e.preventDefault(); $('btnAddExpense')?.click(); }
  if (e.altKey) {
    const key = e.key.toLowerCase();
    const shortcuts = { 'o': 'overview', 'p': 'products', 'i': 'inventory', 'l': 'sales', 'u': 'purchases', 'e': 'expenses', 'r': 'reports' };
    if (shortcuts[key]) { e.preventDefault(); document.querySelector(`[data-module="${shortcuts[key]}"]`)?.click(); }
    if (key === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  }
  if (e.key === 'Escape') closeModal();
});

const MODULE_TITLES = {
  overview: 'Dashboard', products: 'Products', inventory: 'Inventory', racks: 'Rack Management',
  repairing: 'Repairing', sales: 'Sales / POS', purchases: 'Purchases', customers: 'Customers',
  suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses',
  profitloss: 'Profit & Loss', transactions: 'Transactions', reports: 'Reports', settings: 'Settings'
};

document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mod = btn.dataset.module;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    $('module-' + mod).classList.add('active');
    $('pageTitle').textContent = MODULE_TITLES[mod] || mod;
    loadModule(mod);
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
    case 'profitloss': return;
    case 'transactions': return loadTransactions();
    case 'reports': return;
    case 'settings': return loadSettings();
  }
}

// --- 5. OVERVIEW ---
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance'),
    supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
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
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>Sub-Category</th><th>IMEI</th><th class="num">Price</th><th>Rack</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.category || '—')}</td><td>${esc(p.sub_category || '—')}</td><td><small>${esc(p.imei_1 || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
$('btnAddProduct')?.addEventListener('click', () => openProductModal());
window.editProduct = (id) => { const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };
window.deleteProduct = async (id) => {
  if (!confirm('Delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  toast('Product deleted', 'success'); loadProducts();
};

async function openProductModal(p = null) {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const isMobile = (p?.category || 'Mobile') === 'Mobile';
  const body = `<div class="form-grid">
      <div class="field full"><label>Product Name *</label><input id="pName" value="${esc(p?.name || '')}" placeholder="e.g. OG Glass iPhone 11"></div>
      <div class="field"><label>Main Category *</label>
        <select id="pCategory" onchange="toggleProductFields()">
          <option value="Mobile" ${p?.category === 'Mobile' ? 'selected' : ''}>Mobile Phone</option>
          <option value="Glass" ${p?.category === 'Glass' ? 'selected' : ''}>Mobile Glass (OG etc)</option>
          <option value="Cover" ${p?.category === 'Cover' ? 'selected' : ''}>Mobile Cover</option>
          <option value="Accessory" ${p?.category === 'Accessory' ? 'selected' : ''}>Accessory</option>
          <option value="Other" ${p?.category === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      <div class="field"><label>Sub-Category / Model</label>
        <input id="pSubCategory" list="subCatList" placeholder="e.g. iPhone 11, Samsung S21" value="${esc(p?.sub_category || '')}">
        <datalist id="subCatList">
          <option value="iPhone 11"><option value="iPhone 12"><option value="iPhone 13">
          <option value="Samsung S21"><option value="Samsung S22"><option value="Infinix Hot 12">
          <option value="Vivo Y21"><option value="Oppo A16">
        </datalist>
      </div>
      <div class="field" id="imei1Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 1</label><input id="pImei1" value="${esc(p?.imei_1 || '')}"></div>
      <div class="field" id="imei2Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 2</label><input id="pImei2" value="${esc(p?.imei_2 || '')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price || 0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price || 0}"></div>
      <div class="field"><label>Rack Location</label><select id="pRack"><option value="">Unassigned</option>${(rackRows || []).map(r => `<option value="${r.id}" ${p?.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity || 0}"></div>
      <div class="field"><label>Min Stock Alert</label><input id="pMin" type="number" value="${p?.min_stock || 5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const cat = $('pCategory').value;
    const payload = {
      name: $('pName').value.trim(), category: cat,
      sub_category: $('pSubCategory').value.trim() || null,
      imei_1: cat === 'Mobile' ? ($('pImei1').value.trim() || null) : null,
      imei_2: cat === 'Mobile' ? ($('pImei2').value.trim() || null) : null,
      purchase_price: Number($('pPurchase').value) || 0,
      sale_price: Number($('pSale').value) || 0,
      quantity: Number($('pQty').value) || 0,
      rack_id: $('pRack').value || null,
      min_stock: Number($('pMin').value) || 5
    };
    if (!payload.name) throw new Error('Product Name required');
    if (p) await supabase.from('products').update(payload).eq('id', p.id);
    else await supabase.from('products').insert(payload);
    toast('Saved', 'success'); closeModal(); loadProducts();
  });
}
window.toggleProductFields = () => {
  const cat = $('pCategory').value;
  $('imei1Field').style.display = cat === 'Mobile' ? '' : 'none';
  $('imei2Field').style.display = cat === 'Mobile' ? '' : 'none';
};

// --- 7. INVENTORY ---
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML = '<option value="">All Racks</option>' + (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');

  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(100);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>Rack</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}${p.sub_category ? ' / ' + esc(p.sub_category) : ''}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
    <td>${p.quantity <= p.min_stock ? '<span class="pill red">Low Stock</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}
  </tbody></table>`;

  // Real movement log: derive from sales + purchases
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase.from('sale_items').select('product_name,quantity,created_at, sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchase_items').select('product_name,quantity,created_at, purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50)
  ]);
  const movements = [
    ...(saleItems || []).map(m => ({ type: 'OUT', name: m.product_name, qty: m.quantity, ref: m.sales?.invoice_no, date: m.created_at })),
    ...(purchItems || []).map(m => ({ type: 'IN', name: m.product_name, qty: m.quantity, ref: m.purchases?.invoice_no, date: m.created_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 60);
  $('movementsTable').innerHTML = movements.length
    ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref || '—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No stock movements yet.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);

// --- 8. RACKS ---
async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  const rows = racks || [];
  $('racksTable').innerHTML = rows.length
    ? `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.description || '—')}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Delete</button></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No racks created.</div>';

  const { data: stock } = await supabase.from('products').select('name,quantity,racks!fk_products_racks(name)').order('name');
  $('rackStockTable').innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Quantity</th></tr></thead><tbody>${(stock || []).map(p => `<tr><td>${esc(p.racks?.name || 'Unassigned')}</td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity || 0)}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddRack').onclick = () => openModal('Add Rack',
  `<div class="form-grid"><div class="field"><label>Rack Name *</label><input id="rackName" placeholder="Rack A-01"></div><div class="field full"><label>Description</label><input id="rackDesc"></div></div>`,
  async () => {
    const name = $('rackName').value.trim();
    if (!name) throw new Error('Rack name required');
    const { error } = await supabase.from('racks').insert({ name, description: $('rackDesc').value.trim() || null });
    if (error) throw new Error(error.message);
    closeModal(); toast('Rack added', 'success'); loadRacks();
  });
window.deleteRack = async id => {
  if (!confirm('Delete rack? Products in this rack must be reassigned first.')) return;
  const { error } = await supabase.from('racks').delete().eq('id', id);
  if (error) toast(error.message, 'error'); else { toast('Rack deleted'); loadRacks(); }
};

// --- 9. SALES / POS ---
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;

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
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + (data || []).map(p => {
    const catDisplay = p.category ? `[${p.category}${p.sub_category ? ' - ' + p.sub_category : ''}]` : '';
    return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-stock="${p.quantity}">${esc(p.name)} ${catDisplay} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`;
  }).join('');
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  playBeep();
  renderCart();
};

function renderCart() {
  if (!CART.length) $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  else $('cartItems').innerHTML = `<table class="data cart-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>${CART.map((c, i) => `<tr><td>${esc(c.product_name)}</td><td class="num">${c.quantity}</td><td class="num">${fmt(c.line_total)}</td><td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td></tr>`).join('')}</tbody></table>`;
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  const disc = Number($('saleDiscount').value) || 0;
  const total = Math.max(0, sub - disc);
  $('cartSubtotal').textContent = fmt(sub); $('cartTotal').textContent = fmt(total);
  if (Number($('salePaid').value) === 0) $('salePaid').value = total;
  const udhar = total - (Number($('salePaid').value) || 0);
  $('udharWarning').style.display = udhar > 0 ? 'block' : 'none';
}
window.removeCart = (i) => { CART.splice(i, 1); renderCart(); };
$('saleDiscount').addEventListener('input', renderCart);
$('salePaid').addEventListener('input', renderCart);

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart empty', 'error');
  const total = Math.max(0, CART.reduce((s, c) => s + c.line_total, 0) - (Number($('saleDiscount').value) || 0));
  const paid = Number($('salePaid').value) || 0;
  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  const custPhone = $('saleCustPhone').value.trim();
  $('btnSaveSale').disabled = true;
  try {
    let customerId = null;
    if (custName !== 'Walk-in Customer') {
      let found = POS_CUSTOMERS.find(c => (custPhone && c.phone === custPhone) || c.name.toLowerCase() === custName.toLowerCase());
      if (!found) {
        const { data: created, error: ce } = await supabase.from('customers').insert({ name: custName, phone: custPhone || null, opening_balance: 0 }).select('id,name,phone').single();
        if (ce) throw new Error(ce.message);
        found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }

    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: customerId, p_customer_name: custName, p_customer_phone: custPhone || null,
      p_subtotal: CART.reduce((s, c) => s + c.line_total, 0), p_discount: Number($('saleDiscount').value) || 0, p_total: total, p_paid: paid,
      p_payment_method: $('salePaymentMethod').value, p_notes: null,
      p_items: CART.map(c => ({ product_id: c.product_id, product_name: c.product_name, imei: c.imei, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total }))
    });

    if (error) throw new Error(error.message);
    const inv = data?.invoice_no || 'INV-' + Date.now().toString().slice(-6);
    if (confirm('Print receipt?')) {
      printThermal80mm({
        invoice: inv, customer: custName, phone: custPhone,
        subtotal: CART.reduce((s, c) => s + c.line_total, 0),
        discount: Number($('saleDiscount').value) || 0,
        total, paid, balance: total - paid, previousDue: POS_PREVIOUS_DUE,
        date: new Date(), items: [...CART]
      });
    }
    toast('Sale Saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
    $('saleCustName').value = ''; $('saleCustPhone').value = ''; $('salePaid').value = 0; $('saleDiscount').value = 0; POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none';
  } catch (e) { toast(e.message, 'error'); } finally { $('btnSaveSale').disabled = false; }
};

// Sales History
$('btnSalesHistory').onclick = () => {
  const box = $('salesHistoryBox');
  box.hidden = !box.hidden;
  if (!box.hidden) loadSalesHistory();
};
$('btnRefreshSales').onclick = () => loadSalesHistory();

async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
  const t = $('salesHistoryTable');
  if (error) { t.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No sales yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Method</th><th>Date</th><th></th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${esc(s.payment_method || 'cash')}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">🖨</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async (id) => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single();
  if (!s) return toast('Sale not found', 'error');
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  printThermal80mm({
    invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone,
    subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paid, balance: s.balance,
    previousDue: 0, date: s.created_at,
    items: (items || []).map(i => ({ product_name: i.product_name, imei: i.imei, quantity: i.quantity, line_total: i.line_total }))
  });
};

// --- 10. REPAIRING ---
async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || '';
  const st = $('repairStatusFilter')?.value || '';
  let query = supabase.from('repairs').select('*').order('created_at', { ascending: false });
  if (st) query = query.eq('status', st);
  if (q) query = query.or(`customer_name.ilike.%${q}%,mobile.ilike.%${q}%,imei.ilike.%${q}%`);
  const { data, error } = await query;
  const t = $('repairsTable');
  if (error) { t.innerHTML = `<div class="empty">Repairs table not installed: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No repair jobs.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Slip#</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th class="num">Advance</th><th class="num">Due</th><th>Status</th><th></th></tr></thead><tbody>${data.map(r => `<tr><td><b>${esc(r.slip_no || r.id.slice(0,6))}</b></td><td>${esc(r.customer_name)}<br><small>${esc(r.phone || '')}</small></td><td>${esc(r.mobile || '')}<br><small>${esc(r.imei || '')}</small></td><td><small>${esc(r.issue || '')}</small></td><td class="num">${fmt(r.charge)}</td><td class="num">${fmt(r.advance)}</td><td class="num">${fmt((r.charge||0)-(r.advance||0))}</td><td><span class="pill ${r.status === 'Delivered' ? 'green' : r.status === 'Ready' ? 'orange' : ''}">${esc(r.status)}</span></td><td><button class="btn btn-ghost btn-sm" onclick="editRepair('${r.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRepair('${r.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('repairSearch')?.addEventListener('input', () => loadRepairs());
$('repairStatusFilter')?.addEventListener('change', () => loadRepairs());

$('btnAddRepair').onclick = () => openRepairModal();
window.editRepair = async (id) => {
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single();
  if (r) openRepairModal(r);
};
window.deleteRepair = async (id) => {
  if (!confirm('Delete repair slip?')) return;
  await supabase.from('repairs').delete().eq('id', id);
  toast('Deleted'); loadRepairs();
};

function openRepairModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field"><label>Customer Name *</label><input id="rCust" value="${esc(r?.customer_name || '')}"></div>
    <div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone || '')}"></div>
    <div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile || '')}"></div>
    <div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei || '')}"></div>
    <div class="field full"><label>Issue / Problem</label><textarea id="rIssue">${esc(r?.issue || '')}</textarea></div>
    <div class="field"><label>Charge (PKR)</label><input id="rCharge" type="number" value="${r?.charge || 0}"></div>
    <div class="field"><label>Advance (PKR)</label><input id="rAdvance" type="number" value="${r?.advance || 0}"></div>
    <div class="field"><label>Status</label><select id="rStatus">${['Received','In Progress','Ready','Delivered'].map(s => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
  </div>`;
  openModal(r ? 'Edit Repair Slip' : 'New Repair Slip', body, async () => {
    const payload = {
      customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim() || null,
      mobile: $('rMobile').value.trim() || null, imei: $('rImei').value.trim() || null,
      issue: $('rIssue').value.trim() || null, charge: Number($('rCharge').value) || 0,
      advance: Number($('rAdvance').value) || 0, status: $('rStatus').value
    };
    if (!payload.customer_name) throw new Error('Customer name required');
    if (r) await supabase.from('repairs').update(payload).eq('id', r.id);
    else await supabase.from('repairs').insert({ ...payload, slip_no: 'R-' + Date.now().toString().slice(-6) });
    closeModal(); toast('Saved', 'success'); loadRepairs();
  });
}

// --- 11. PURCHASES ---
async function loadPurchases() {
  const { data, error } = await supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false });
  const t = $('purchasesTable');
  if (error) { t.innerHTML = `<div class="empty">Purchases table not installed: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th></th></tr></thead><tbody>${data.map(p => `<tr><td><b>${esc(p.invoice_no || p.id.slice(0,6))}</b></td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td class="num">${fmt(p.total - (p.paid||0))}</td><td><small>${new Date(p.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="editPurchase('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePurchase('${p.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
window.deletePurchase = async (id) => {
  if (!confirm('Delete purchase?')) return;
  await supabase.from('purchases').delete().eq('id', id);
  toast('Deleted'); loadPurchases();
};
window.editPurchase = async (id) => {
  const { data: p } = await supabase.from('purchases').select('*').eq('id', id).single();
  if (p) openPurchaseModal(p);
};
$('btnNewPurchase').onclick = () => openPurchaseModal();

async function openPurchaseModal(p = null) {
  const { data: sups } = await supabase.from('suppliers').select('id,name').order('name');
  const body = `<div class="form-grid">
    <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups || []).map(s => `<option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no || '')}"></div>
    <div class="field"><label>Total (PKR)</label><input id="puTotal" type="number" value="${p?.total || 0}"></div>
    <div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid || 0}"></div>
    <div class="field full"><label>Notes</label><textarea id="puNotes">${esc(p?.notes || '')}</textarea></div>
  </div>`;
  openModal(p ? 'Edit Purchase' : 'New Purchase', body, async () => {
    const payload = {
      supplier_id: $('puSup').value || null, invoice_no: $('puInv').value.trim() || null,
      total: Number($('puTotal').value) || 0, paid: Number($('puPaid').value) || 0,
      notes: $('puNotes').value.trim() || null
    };
    if (p) await supabase.from('purchases').update(payload).eq('id', p.id);
    else await supabase.from('purchases').insert(payload);
    closeModal(); toast('Saved', 'success'); loadPurchases();
  });
}

// --- 12. CUSTOMERS ---
let ALL_CUST = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q;
  ALL_CUST = data || [];
  const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_CUST.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td>
      <td class="actions"><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value));
$('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = (id) => openCustomerModal(ALL_CUST.find(c => c.id === id));
window.deleteCustomer = async (id) => { if (!confirm('Delete?')) return; await supabase.from('customers').delete().eq('id', id); toast('Deleted'); loadCustomers(); };

function openCustomerModal(c = null) {
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name || '')}"></div>
      <div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}"></div>
      <div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance || 0}"></div>
      <div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address || '')}</textarea></div>
    </div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id);
    else await supabase.from('customers').insert(payload);
    toast('Saved', 'success'); closeModal(); loadCustomers();
  });
}

// --- 13. SUPPLIERS ---
let ALL_SUP = [];
async function loadSuppliers() {
  const { data } = await supabase.from('suppliers').select('*').order('name');
  ALL_SUP = data || [];
  const t = $('suppliersTable');
  if (!ALL_SUP.length) { t.innerHTML = '<div class="empty">No suppliers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_SUP.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone || '—')}</td><td>${esc(s.address || '—')}</td>
      <td class="actions"><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('btnAddSupplier').onclick = () => openSupplierModal();
window.editSupplier = (id) => openSupplierModal(ALL_SUP.find(s => s.id === id));
window.deleteSupplier = async (id) => { if (!confirm('Delete?')) return; await supabase.from('suppliers').delete().eq('id', id); toast('Deleted'); loadSuppliers(); };

function openSupplierModal(s = null) {
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="sName" value="${esc(s?.name || '')}"></div>
      <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone || '')}"></div>
      <div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address || '')}</textarea></div>
    </div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = { name: $('sName').value.trim(), phone: $('sPhone').value.trim() || null, address: $('sAddr').value.trim() || null };
    if (!payload.name) throw new Error('Name required');
    if (s) await supabase.from('suppliers').update(payload).eq('id', s.id);
    else await supabase.from('suppliers').insert(payload);
    toast('Saved', 'success'); closeModal(); loadSuppliers();
  });
}

// --- 14. CREDIT / UDHAR ---
async function loadCredit() {
  // Customer-wise summary
  const [{ data: sales }, { data: recov }] = await Promise.all([
    supabase.from('sales').select('customer_id,customer_name,customer_phone,balance,invoice_no,created_at').gt('balance', 0).order('created_at', { ascending: false }),
    supabase.from('credit_recoveries').select('*, customers(name,phone)').order('created_at', { ascending: false }).limit(100)
  ]);
  const map = {};
  (sales || []).forEach(s => {
    const key = s.customer_id || s.customer_name || 'walkin';
    if (!map[key]) map[key] = { name: s.customer_name || 'Walk-in', phone: s.customer_phone, total: 0, count: 0 };
    map[key].total += Number(s.balance || 0);
    map[key].count++;
  });
  const summary = Object.values(map).sort((a, b) => b.total - a.total);
  $('creditSummaryTable').innerHTML = summary.length
    ? `<table class="data"><thead><tr><th>Customer</th><th>Phone</th><th class="num">Invoices</th><th class="num">Outstanding</th></tr></thead><tbody>${summary.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.phone || '—')}</td><td class="num">${s.count}</td><td class="num"><b>${fmt(s.total)}</b></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No outstanding credit. 🎉</div>';

  // Outstanding invoices
  $('creditTable').innerHTML = (sales || []).length
    ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Balance</th><th>Date</th><th></th></tr></thead><tbody>${sales.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}<br><small>${esc(s.customer_phone || '')}</small></td><td class="num">${fmt(s.balance)}</td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-primary btn-sm" onclick="recoverCredit('${s.invoice_no}')">Recover</button></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No outstanding invoices.</div>';

  // Recoveries
  $('recoveriesTable').innerHTML = (recov || []).length
    ? `<table class="data"><thead><tr><th>Customer</th><th class="num">Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${recov.map(r => `<tr><td>${esc(r.customers?.name || '—')}</td><td class="num">${fmt(r.amount)}</td><td>${esc(r.method || 'cash')}</td><td><small>${new Date(r.created_at).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No recoveries yet.</div>';
}
window.recoverCredit = async (invoice) => {
  const amountStr = prompt(`Recovery amount for invoice ${invoice}:`, '');
  if (!amountStr) return;
  const amount = Number(amountStr);
  if (!amount || amount <= 0) return toast('Invalid amount', 'error');
  const { data: s } = await supabase.from('sales').select('*').eq('invoice_no', invoice).single();
  if (!s) return toast('Invoice not found', 'error');
  const newPaid = Number(s.paid || 0) + amount;
  const newBal = Math.max(0, Number(s.total || 0) - newPaid);
  const { error: ue } = await supabase.from('sales').update({ paid: newPaid, balance: newBal }).eq('id', s.id);
  if (ue) return toast(ue.message, 'error');
  await supabase.from('credit_recoveries').insert({ customer_id: s.customer_id, sale_id: s.id, invoice_no: invoice, amount, method: 'cash' });
  toast('Recovery recorded', 'success'); loadCredit();
};
$('btnPrintCreditAll').onclick = () => {
  const rows = $('creditSummaryTable').querySelectorAll('tbody tr');
  if (!rows.length) return toast('Nothing to print', 'error');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Udhar Report</title><style>body{font-family:Arial;padding:20px}h1{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f0f0f0}</style></head><body><h1>${SHOP_INFO.name} — Udhar Report</h1><p>${SHOP_INFO.address} · ${SHOP_INFO.phone1}</p>${$('creditSummaryTable').innerHTML}</body></html>`);
  w.document.close(); w.print();
};

// --- 15. EXPENSES ---
const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Transport', 'Repair Parts', 'Tea/Food', 'Marketing', 'Other'];
async function loadExpenses() {
  // Filter selects
  const catSel = $('expFilterCat');
  if (catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">All</option>' + EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');

  const from = $('expFilterFrom')?.value || '';
  const to = $('expFilterTo')?.value || '';
  const cat = $('expFilterCat')?.value || '';
  let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false });
  if (from) q = q.gte('expense_date', from);
  if (to) q = q.lte('expense_date', to);
  if (cat) q = q.eq('category', cat);
  const { data, error } = await q;
  const t = $('expensesTable');
  if (error) { t.innerHTML = `<div class="empty">Expenses table not installed: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No expenses.</div>'; }
  else t.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${data.map(e => `<tr><td>${esc(e.expense_date)}</td><td><span class="pill orange">${esc(e.category || 'Other')}</span></td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;

  // Stats
  const all = data || [];
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const sum = arr => arr.reduce((s, x) => s + Number(x.amount || 0), 0);
  $('expToday').textContent = fmt(sum(all.filter(x => x.expense_date === today)));
  $('expWeek').textContent = fmt(sum(all.filter(x => x.expense_date >= weekStart.toISOString().slice(0, 10))));
  $('expMonth').textContent = fmt(sum(all.filter(x => x.expense_date >= monthStart)));
  $('expTotal').textContent = fmt(sum(all));
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid">
    <div class="field"><label>Date *</label><input type="date" id="exDate" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Amount (PKR) *</label><input type="number" id="exAmount" value="0"></div>
    <div class="field full"><label>Description</label><input id="exDesc"></div>
  </div>`;
  openModal('Add Expense', body, async () => {
    const amount = Number($('exAmount').value) || 0;
    if (amount <= 0) throw new Error('Amount must be > 0');
    await supabase.from('expenses').insert({ expense_date: $('exDate').value, category: $('exCat').value, amount, description: $('exDesc').value.trim() || null });
    closeModal(); toast('Expense added', 'success'); loadExpenses(); loadOverview();
  });
};
window.deleteExpense = async (id) => { if (!confirm('Delete expense?')) return; await supabase.from('expenses').delete().eq('id', id); toast('Deleted'); loadExpenses(); };
$('btnFilterExpenses').onclick = () => loadExpenses();

// --- 16. PROFIT & LOSS ---
$('btnRunPL').onclick = runPL;
$('btnPrintPL').onclick = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>P&L</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#eee}</style></head><body><h1>${SHOP_INFO.name} — Profit & Loss (Item-wise)</h1>${$('plTable').innerHTML}</body></html>`); w.document.close(); w.print(); };

async function runPL() {
  const from = $('plFrom').value;
  const to = $('plTo').value;
  let q = supabase.from('sale_items').select('product_id,product_name,quantity,unit_price,line_total,created_at');
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to + 'T23:59:59');
  const { data: items, error } = await q;
  if (error) { $('plTable').innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  const { data: prods } = await supabase.from('products').select('id,purchase_price');
  const costMap = Object.fromEntries((prods || []).map(p => [p.id, Number(p.purchase_price || 0)]));
  const map = {};
  (items || []).forEach(it => {
    const key = it.product_id || it.product_name;
    if (!map[key]) map[key] = { name: it.product_name, qty: 0, revenue: 0, cost: 0 };
    map[key].qty += Number(it.quantity || 0);
    map[key].revenue += Number(it.line_total || 0);
    map[key].cost += Number(it.quantity || 0) * (costMap[it.product_id] || 0);
  });
  const rows = Object.values(map).map(r => ({ ...r, profit: r.revenue - r.cost }));
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalRev - totalCost;
  $('plSummary').innerHTML = `
    <div class="stat clay"><div class="stat-icon green">↗</div><div><strong>${fmt(totalRev)}</strong><small>Total Revenue</small></div></div>
    <div class="stat clay"><div class="stat-icon orange">↙</div><div><strong>${fmt(totalCost)}</strong><small>Total Cost</small></div></div>
    <div class="stat clay"><div class="stat-icon purple">▨</div><div><strong>${fmt(totalProfit)}</strong><small>Gross Profit</small></div></div>`;
  $('plTable').innerHTML = rows.length
    ? `<table class="data"><thead><tr><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th><th class="num">Cost</th><th class="num">Profit</th></tr></thead><tbody>${rows.sort((a,b)=>b.profit-a.profit).map(r => `<tr><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.revenue)}</td><td class="num">${fmt(r.cost)}</td><td class="num" style="color:${r.profit>=0?'#22a06b':'#dc2626'}"><b>${fmt(r.profit)}</b></td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No sales in this period.</div>';
}

// --- 17. TRANSACTIONS ---
async function loadTransactions() {
  const [salesR, purchR, expR, recovR] = await Promise.all([
    supabase.from('sales').select('invoice_no,total,paid,created_at,customer_name').order('created_at', { ascending: false }).limit(100),
    supabase.from('purchases').select('invoice_no,total,paid,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('credit_recoveries').select('*').order('created_at', { ascending: false }).limit(100)
  ]);
  const tx = [
    ...(salesR.data || []).map(s => ({ date: s.created_at, type: 'SALE', desc: `${s.invoice_no} — ${s.customer_name || 'Walk-in'}`, in: Number(s.paid || 0), out: 0 })),
    ...(purchR.data || []).map(p => ({ date: p.created_at, type: 'PURCHASE', desc: p.invoice_no || 'Purchase', in: 0, out: Number(p.paid || 0) })),
    ...(expR.data || []).map(e => ({ date: e.created_at, type: 'EXPENSE', desc: `${e.category || 'Expense'} — ${e.description || ''}`, in: 0, out: Number(e.amount || 0) })),
    ...(recovR.data || []).map(r => ({ date: r.created_at, type: 'RECOVERY', desc: `Recovery — ${r.invoice_no || ''}`, in: Number(r.amount || 0), out: 0 }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  $('transactionsTable').innerHTML = tx.length
    ? `<table class="data"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th class="num">In</th><th class="num">Out</th></tr></thead><tbody>${tx.map(t => `<tr><td><small>${new Date(t.date).toLocaleString()}</small></td><td><span class="pill ${t.type === 'SALE' || t.type === 'RECOVERY' ? 'green' : 'orange'}">${t.type}</span></td><td>${esc(t.desc)}</td><td class="num" style="color:#22a06b">${t.in ? fmt(t.in) : '—'}</td><td class="num" style="color:#dc2626">${t.out ? fmt(t.out) : '—'}</td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">No transactions.</div>';
}

// --- 18. REPORTS ---
$('btnRunReport').onclick = runReport;
$('btnPrintReport').onclick = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>Report</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px}th{background:#eee}</style></head><body><h1>${SHOP_INFO.name} — Report</h1>${$('reportOutput').innerHTML}</body></html>`); w.document.close(); w.print(); };

async function runReport() {
  const type = $('reportType').value;
  let from = $('reportFrom').value;
  let to = $('reportTo').value;
  if (!from || !to) {
    const now = new Date();
    if ($('reportPeriod').value === 'daily') { from = to = now.toISOString().slice(0, 10); }
    else if ($('reportPeriod').value === 'weekly') { const w = new Date(); w.setDate(w.getDate() - 7); from = w.toISOString().slice(0, 10); to = now.toISOString().slice(0, 10); }
    else if ($('reportPeriod').value === 'monthly') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); to = now.toISOString().slice(0, 10); }
  }
  const out = $('reportOutput');
  out.innerHTML = '<div class="empty">Loading…</div>';
  try {
    if (type === 'sales') {
      let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      const total = (data || []).reduce((s, r) => s + Number(r.total || 0), 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Sales Report — ${esc(from)} to ${esc(to)} (Total: ${fmt(total)})</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${(data || []).map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'purchases') {
      let q = supabase.from('purchases').select('*').order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from);
      if (to) q = q.lte('created_at', to + 'T23:59:59');
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Purchase Report</h3><table class="data"><thead><tr><th>Invoice</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${(data || []).map(p => `<tr><td>${esc(p.invoice_no || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'credit') {
      const { data } = await supabase.from('sales').select('*').gt('balance', 0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Credit Report</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Balance</th></tr></thead><tbody>${(data || []).map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || '—')}</td><td class="num">${fmt(s.balance)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'expenses') {
      let q = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (from) q = q.gte('expense_date', from);
      if (to) q = q.lte('expense_date', to);
      const { data } = await q;
      out.innerHTML = `<h3 style="margin-bottom:12px">Expense Report</h3><table class="data"><thead><tr><th>Date</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>${(data || []).map(e => `<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category || '')}</td><td class="num">${fmt(e.amount)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'customer') {
      const { data } = await supabase.from('customers').select('*');
      out.innerHTML = `<h3 style="margin-bottom:12px">Customer Report</h3><table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th></tr></thead><tbody>${(data || []).map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'repairing') {
      const { data } = await supabase.from('repairs').select('*');
      out.innerHTML = `<h3 style="margin-bottom:12px">Repairing Report</h3><table class="data"><thead><tr><th>Slip</th><th>Customer</th><th class="num">Charge</th><th class="num">Advance</th><th>Status</th></tr></thead><tbody>${(data || []).map(r => `<tr><td>${esc(r.slip_no || '')}</td><td>${esc(r.customer_name)}</td><td class="num">${fmt(r.charge)}</td><td class="num">${fmt(r.advance)}</td><td>${esc(r.status)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type === 'pl') {
      await runPL();
      out.innerHTML = $('plTable').innerHTML;
    }
  } catch (e) { out.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// --- 19. SETTINGS ---
async function loadSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  $('setShopName').value = data?.shop_name || SHOP_INFO.name;
  $('setOwner').value = data?.owner_name || '';
  $('setAddress').value = data?.address || SHOP_INFO.address;
  $('setPhone').value = data?.phone || SHOP_INFO.phone1;
  $('setCurrency').value = data?.currency || 'PKR';
  $('setFooter').value = data?.footer_text || 'Powered by MS.TECH';
}
$('btnSaveSettings').onclick = async () => {
  const payload = {
    id: 1, shop_name: $('setShopName').value.trim(), owner_name: $('setOwner').value.trim(),
    address: $('setAddress').value.trim(), phone: $('setPhone').value.trim(),
    currency: $('setCurrency').value.trim() || 'PKR', footer_text: $('setFooter').value.trim()
  };
  const { error } = await supabase.from('settings').upsert(payload);
  if (error) return toast(error.message, 'error');
  toast('Settings saved', 'success');
};

// INITIAL LOAD
renderCart();
loadOverview();
