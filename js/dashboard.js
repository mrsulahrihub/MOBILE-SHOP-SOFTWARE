// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER (v9.8)
// =====================================================
import { supabase } from './config.js';

// --- 1. MULTI-TENANT AUTH GUARD (Super Admin Rule) ---
const SHOP_ID = localStorage.getItem('shop_id');
const SHOP_NAME = localStorage.getItem('shop_name') || 'BM MOBILE ZONE';

if (!SHOP_ID) {
  window.location.replace('./login.html');
  throw new Error('Unauthorized: No shop_id found.');
}

// Update Topbar Info
document.getElementById('userName').textContent = SHOP_NAME;
document.getElementById('userRole').textContent = 'ADMIN';
document.getElementById('welcomeName').textContent = SHOP_NAME;
document.getElementById('userAvatar').textContent = SHOP_NAME.charAt(0).toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', async () => {
  localStorage.removeItem('shop_id');
  localStorage.removeItem('shop_name');
  localStorage.removeItem('owner_name');
  location.replace('./login.html');
});

// --- 2. HELPERS ---
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SHOP_INFO = {
  name: SHOP_NAME,
  address: 'Chohan Mobile Market, Zafarwal',
  phone1: '0345-6613232',
  phone2: '0307-6613232',
  phoneMain: '03099100546'
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

// --- 3. SHORTCUTS (Keyboard Mastery) ---
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (e.key === 'Escape') closeModal();
    return;
  }

  if (e.altKey) {
    const key = e.key.toLowerCase();
    const shortcuts = {
      'o': 'overview', 'p': 'products', 'i': 'inventory', 'l': 'sales',
      'u': 'purchases', 'e': 'expenses', 'r': 'reports', 'x': 'logout'
    };
    
    if (shortcuts[key]) {
      e.preventDefault();
      if (key === 'x') $('logoutBtn').click();
      else document.querySelector(`[data-module="${shortcuts[key]}"]`)?.click();
    }
    
    // Shortcut for Save Sale (Alt + S)
    if (key === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  }

  if (e.key === 'Escape') closeModal();
});

// --- 4. SIDEBAR ---
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');
let sidebarTimeout;

if (handle) {
  handle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = sidebar.classList.toggle('show');
    handle.classList.toggle('open', isOpen);
  });
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && e.target !== handle) {
      sidebar.classList.remove('show'); handle.classList.remove('open');
    }
  });
}

// --- 5. NAVIGATION ---
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

// =====================================================
// OVERVIEW
// =====================================================
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance').eq('shop_id', SHOP_ID),
    supabase.from('products').select('quantity,is_active,name,min_stock').eq('shop_id', SHOP_ID),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('shop_id', SHOP_ID),
    supabase.from('purchases').select('total').eq('shop_id', SHOP_ID),
    supabase.from('expenses').select('amount').eq('shop_id', SHOP_ID),
    supabase.from('sales').select('total').eq('shop_id', SHOP_ID).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from('sales').select('total').eq('shop_id', SHOP_ID).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
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

  const lowStockItems = (prods.data || []).filter(p => p.quantity <= p.min_stock);
  if (lowStockItems.length > 0) {
    const alertHTML = `<div class="clay" style="padding:20px; margin-bottom:20px; border-left:4px solid #ef4444; background:rgba(239,68,68,0.05)">
      <h3 style="font-size:14px; font-weight:800; color:#ef4444; margin-bottom:10px">⚠️ Inventory Alerts (${lowStockItems.length} items)</h3>
      <ul style="font-size:12px; color:var(--text); padding-left:20px;">${lowStockItems.map(p => `<li><strong>${esc(p.name)}</strong> - ${p.quantity === 0 ? '<span style="color:red;font-weight:bold">Out of Stock</span>' : `Only ${p.quantity} left`}</li>`).join('')}</ul></div>`;
    if ($('lowStockAlertBox')) $('lowStockAlertBox').remove();
    const div = document.createElement('div'); div.id = 'lowStockAlertBox'; div.innerHTML = alertHTML;
    $('dashStats').after(div);
  }

  const { data: recent } = await supabase.from('sales').select('*').eq('shop_id', SHOP_ID).order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  else $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

// =====================================================
// PRODUCTS
// =====================================================
let ALL_PRODUCTS = [];
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks(name)').eq('shop_id', SHOP_ID).order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>IMEI</th><th class="num">Price</th><th>Rack</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.category || '—')} ${p.sub_category ? '/ ' + esc(p.sub_category) : ''}</td><td><small>${esc(p.imei_1 || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
$('btnAddProduct')?.addEventListener('click', () => openProductModal());

window.editProduct = (id) => { const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };

window.deleteProduct = async (id) => {
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return toast('Product not found', 'error');
  if (!confirm(`Delete product "${p.name}"?\n\nAgar product kisi sale/purchase mein use hua hai to deactivate (inactive) ho jayega.`)) return;

  const { error } = await supabase.from('products').delete().eq('id', id).eq('shop_id', SHOP_ID);

  if (error) {
    if (error.code === '23503' || (error.message || '').toLowerCase().includes('foreign key')) {
      const { error: softErr } = await supabase.from('products').update({ is_active: false, quantity: 0 }).eq('id', id).eq('shop_id', SHOP_ID);
      if (softErr) toast('Delete failed: ' + softErr.message, 'error');
      else { toast('Product deactivated (used in transactions)', 'success'); loadProducts(); }
    } else {
      toast('Delete failed: ' + error.message, 'error');
    }
    return;
  }
  toast('Product deleted', 'success');
  loadProducts();
};

async function openProductModal(p = null) {
  const { data: rackRows, error: rackErr } = await supabase.from('racks').select('id,name').eq('shop_id', SHOP_ID).order('name');
  if (rackErr) throw new Error('Rack setup missing. Run the supplied SQL migration first.');
  const isMobile = (p?.category || 'Mobile') === 'Mobile';
  const isCover = (p?.category) === 'Cover';
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="pName" value="${esc(p?.name || '')}"></div>
      <div class="field"><label>Category</label><select id="pCategory" onchange="toggleProductFields()"><option value="Mobile" ${!p || p.category === 'Mobile' ? 'selected' : ''}>Mobile</option><option value="Cover" ${p?.category === 'Cover' ? 'selected' : ''}>Cover</option><option value="Accessory" ${p?.category === 'Accessory' ? 'selected' : ''}>Accessory</option></select></div>
      <div class="field" id="coverSubField" style="${isCover ? '' : 'display:none'}"><label>Cover Type</label><select id="pSubCategory"><option value="Simple" ${p?.sub_category === 'Simple' ? 'selected' : ''}>Simple</option><option value="Design" ${p?.sub_category === 'Design' ? 'selected' : ''}>Design</option><option value="Ladies" ${p?.sub_category === 'Ladies' ? 'selected' : ''}>Ladies</option></select></div>
      <div class="field" id="imei1Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 1</label><input id="pImei1" value="${esc(p?.imei_1 || '')}"></div>
      <div class="field" id="imei2Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 2</label><input id="pImei2" value="${esc(p?.imei_2 || '')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price || 0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price || 0}"></div>
      <div class="field"><label>Rack Location</label><select id="pRack"><option value="">Unassigned</option>${(rackRows || []).map(r => `<option value="${r.id}" ${p?.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity || 0}"></div>
      <div class="field"><label>Min Stock</label><input id="pMin" type="number" value="${p?.min_stock || 5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const cat = $('pCategory').value;
    const payload = {
      shop_id: SHOP_ID,
      name: $('pName').value.trim(), category: cat,
      sub_category: cat === 'Cover' ? $('pSubCategory').value : null,
      imei_1: cat === 'Mobile' ? ($('pImei1').value.trim() || null) : null,
      imei_2: cat === 'Mobile' ? ($('pImei2').value.trim() || null) : null,
      purchase_price: Number($('pPurchase').value) || 0,
      sale_price: Number($('pSale').value) || 0,
      quantity: Number($('pQty').value) || 0,
      rack_id: $('pRack').value || null,
      min_stock: Number($('pMin').value) || 5
    };
    if (!payload.name) throw new Error('Name required');
    if (p) await supabase.from('products').update(payload).eq('id', p.id).eq('shop_id', SHOP_ID);
    else await supabase.from('products').insert(payload);
    toast('Saved', 'success'); closeModal(); loadProducts();
  });
}
window.toggleProductFields = () => {
  const cat = $('pCategory').value;
  $('coverSubField').style.display = cat === 'Cover' ? '' : 'none';
  $('imei1Field').style.display = cat === 'Mobile' ? '' : 'none';
  $('imei2Field').style.display = cat === 'Mobile' ? '' : 'none';
};

// =====================================================
// INVENTORY
// =====================================================
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').eq('shop_id', SHOP_ID).order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML += (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks(name)').eq('shop_id', SHOP_ID).order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(100);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>Rack</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}${p.sub_category ? ' / ' + esc(p.sub_category) : ''}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
    <td>${p.quantity <= p.min_stock ? '<span class="pill red">Low Stock</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}
  </tbody></table>`;

  const { data: mov } = await supabase.from('inventory_movements').select('*, products(name)').eq('shop_id', SHOP_ID).order('created_at', { ascending: false }).limit(20);
  const tm = $('movementsTable');
  if (!mov || !mov.length) tm.innerHTML = '<div class="empty">No movements yet.</div>';
  else tm.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Product</th><th>Type</th><th class="num">Qty</th><th>Notes</th></tr></thead><tbody>
    ${mov.map(m => `<tr><td>${new Date(m.created_at).toLocaleString()}</td><td>${esc(m.products?.name || '—')}</td>
    <td><span class="pill ${m.quantity > 0 ? 'green' : 'orange'}">${esc(m.movement_type)}</span></td>
    <td class="num">${m.quantity}</td><td>${esc(m.notes || '')}</td></tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// SALES / POS
// =====================================================
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;

async function loadPosCustomers() {
  const { data, error } = await supabase.from('customers').select('id,name,phone').eq('shop_id', SHOP_ID).order('name');
  if (error) return;
  POS_CUSTOMERS = data || [];
  $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');
}

async function updatePosCustomerDue() {
  const name = $('saleCustName').value.trim();
  const phone = $('saleCustPhone').value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data, error } = await supabase.from('sales').select('balance').eq('customer_id', match.id).eq('shop_id', SHOP_ID).gt('balance', 0);
  if (error) { toast(error.message, 'error'); return; }
  POS_PREVIOUS_DUE = (data || []).reduce((n, x) => n + Number(x.balance || 0), 0);
  $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE);
  $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName').addEventListener('change', updatePosCustomerDue);
$('saleCustPhone').addEventListener('change', updatePosCustomerDue);

async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*').eq('shop_id', SHOP_ID).gt('quantity', 0).order('name');
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
        const { data: created, error: ce } = await supabase.from('customers').insert({ shop_id: SHOP_ID, name: custName, phone: custPhone || null, opening_balance: 0 }).select('id,name,phone').single();
        if (ce) throw new Error(ce.message);
        found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }
    
    const { data, error } = await supabase.rpc('create_sale', {
      p_shop_id: SHOP_ID, 
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

// --- SALES HISTORY ---
const salesHistoryBox = document.getElementById('salesHistoryBox');
const btnSalesHistory = document.getElementById('btnSalesHistory');

btnSalesHistory?.addEventListener('click', async () => {
  const isHidden = salesHistoryBox.hasAttribute('hidden');
  if (isHidden) {
    salesHistoryBox.removeAttribute('hidden');
    btnSalesHistory.textContent = '✖ Hide History';
    await loadSalesHistory();
  } else {
    salesHistoryBox.setAttribute('hidden', '');
    btnSalesHistory.textContent = '📋 Sales History';
  }
});
document.getElementById('btnRefreshSales')?.addEventListener('click', loadSalesHistory);

async function loadSalesHistory() {
  const t = document.getElementById('salesHistoryTable');
  if (!t) return;
  t.innerHTML = '<div class="empty">Loading…</div>';
  const { data, error } = await supabase.from('sales').select('*').eq('shop_id', SHOP_ID).order('created_at', { ascending: false }).limit(200);
  if (error) { t.innerHTML = `<div class="empty" style="color:#ef4444">Error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No sales yet.</div>'; return; }

  const totals = data.reduce((a, s) => ({
    total: a.total + Number(s.total || 0),
    paid: a.paid + Number(s.paid || 0),
    balance: a.balance + Number(s.balance || 0)
  }), { total: 0, paid: 0, balance: 0 });

  t.innerHTML = `
    <table class="data">
      <thead><tr><th>Invoice</th><th>Customer</th><th>Phone</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Method</th><th>Date</th></tr></thead>
      <tbody>
        ${data.map(s => `<tr>
          <td><strong>${esc(s.invoice_no)}</strong></td>
          <td>${esc(s.customer_name || 'Walk-in')}</td>
          <td>${esc(s.customer_phone || '—')}</td>
          <td class="num">${fmt(s.total)}</td>
          <td class="num">${fmt(s.paid)}</td>
          <td class="num"><span class="pill ${Number(s.balance) > 0 ? 'red' : 'green'}">${fmt(s.balance)}</span></td>
          <td>${esc(s.payment_method || '—')}</td>
          <td>${new Date(s.created_at).toLocaleString('en-PK')}</td>
        </tr>`).join('')}
        <tr style="background:rgba(0,0,0,.04);font-weight:800">
          <th colspan="3">GRAND TOTAL (${data.length} sales)</th>
          <th class="num">${fmt(totals.total)}</th>
          <th class="num">${fmt(totals.paid)}</th>
          <th class="num">${fmt(totals.balance)}</th>
          <th colspan="2"></th>
        </tr>
      </tbody>
    </table>`;
}

// =====================================================
// RACKS, REPAIRING, PURCHASES, CUSTOMERS, SUPPLIERS, CREDIT, EXPENSES, P&L, TRANSACTIONS, REPORTS, SETTINGS, PRINTING...
// (Yeh saara code pehle jaisa hi hai, bas har query mein .eq('shop_id', SHOP_ID) lazmi check karein)
// =====================================================

// INITIAL LOAD
renderCart();
loadOverview();
