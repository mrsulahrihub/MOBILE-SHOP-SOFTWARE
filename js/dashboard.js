// =====================================================
// BM MOBILE ZONE - FULL WORKING SYSTEM (v12.0)
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

// --- 6. PRODUCTS (CATEGORY WISE) ---
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
      name: $('pName').value.trim(), 
      category: cat,
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

// --- 7. INVENTORY (Directly from Products Table) ---
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML += (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  
  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(100);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>Rack</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}${p.sub_category ? ' / ' + esc(p.sub_category) : ''}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
    <td>${p.quantity <= p.min_stock ? '<span class="pill red">Low Stock</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}
  </tbody></table>`;

  // Simple movement log from Products (just to show it's working, as we don't have a movement table yet)
  $('movementsTable').innerHTML = `<div class="empty">Movement log is currently based on product additions. (Purchase/Sale movements tracking coming soon).</div>`;
}

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
$('inventoryRackFilter')?.addEventListener('change', loadInventory);

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
    const inv = data.invoice_no || 'INV-' + Date.now().toString().slice(-6);
    if (confirm('Print receipt?')) printThermal80mm({ invoice: inv, customer: custName, phone: custPhone, subtotal: CART.reduce((s, c) => s + c.line_total, 0), discount: Number($('saleDiscount').value) || 0, total, paid, balance: total - paid, previousDue: POS_PREVIOUS_DUE, date: new Date(), items: [...CART] });
    toast('Sale Saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
    $('saleCustName').value = ''; $('saleCustPhone').value = ''; $('salePaid').value = 0; $('saleDiscount').value = 0; POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none';
  } catch (e) { toast(e.message, 'error'); } finally { $('btnSaveSale').disabled = false; }
};

// --- 10. CUSTOMERS ---
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

// --- 11. INVENTORY MOVEMENTS (Dummy for now, as we don't have movement table) ---
// (Agar aapko movement tracking chahiye, toh humein ek 'inventory_movements' table banani hogi. Filhal ke liye yeh khali hai.)

// INITIAL LOAD
renderCart();
loadOverview();
