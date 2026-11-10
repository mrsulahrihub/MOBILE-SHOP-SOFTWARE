// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER
// =====================================================

import { supabase } from './config.js';
import { getActiveProfile } from './auth-guard.js';

// ---------- Auth guard ----------
const result = await getActiveProfile();
if (!result) {
  location.replace('./login.html');
  throw new Error('Unauthorized');
}
const { profile } = result;

document.getElementById('userName').textContent = profile.full_name;
document.getElementById('userRole').textContent = profile.role.toUpperCase();
document.getElementById('welcomeName').textContent = profile.full_name;
document.getElementById('userAvatar').textContent = profile.full_name.charAt(0).toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.replace('./login.html');
});

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg, type = 'info') {
  const host = $('toastHost');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

let MODAL_ON_CONFIRM = null;
function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save') {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel;
  MODAL_ON_CONFIRM = onConfirm;
  $('modalBackdrop').classList.add('open');
}
function closeModal() {
  $('modalBackdrop').classList.remove('open');
  MODAL_ON_CONFIRM = null;
}
$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => {
  if (MODAL_ON_CONFIRM) {
    try { await MODAL_ON_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); }
  }
};

// ---------- Module navigation ----------
const MODULE_TITLES = {
  overview: 'Dashboard', products: 'Products', inventory: 'Inventory',
  sales: 'Sales / POS', purchases: 'Purchases', customers: 'Customers',
  suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses',
  transactions: 'Transactions', reports: 'Reports', settings: 'Settings'
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
  });
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview();
    case 'products': return loadProducts();
    case 'inventory': return loadInventory();
    case 'sales': return loadSaleProducts();
    case 'purchases': return loadPurchases();
    case 'customers': return loadCustomers();
    case 'suppliers': return loadSuppliers();
    case 'credit': return loadCredit();
    case 'expenses': return loadExpenses();
    case 'transactions': return loadTransactions();
    case 'settings': return loadSettings();
  }
}

// =====================================================
// OVERVIEW
// =====================================================
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance'),
    supabase.from('products').select('quantity,is_active'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);

  const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  $('stProducts').textContent = (prods.data || []).filter(p => p.is_active).length;
  $('stStock').textContent = sum(prods, 'quantity');
  $('stTodaySales').textContent = fmt(sum(salesToday, 'total'));
  $('stMonthSales').textContent = fmt(sum(salesMonth, 'total'));
  $('stPurchases').textContent = fmt(sum(purch, 'total'));
  $('stCustomers').textContent = custs.count || 0;
  $('stOutstanding').textContent = fmt(sum(sales, 'balance'));
  $('stExpenses').textContent = fmt(sum(exp, 'amount'));

  // Recent sales
  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  const t = $('recentSales');
  if (!recent || !recent.length) { t.innerHTML = '<div class="empty">No sales yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead><tbody>
    ${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// PRODUCTS
// =====================================================
let ALL_PRODUCTS = [];
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found. Add your first product.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Brand</th><th>IMEI / SKU</th><th class="num">Purchase</th><th class="num">Sale</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `
      <tr>
        <td><strong>${esc(p.name)}</strong><br><small style="color:var(--muted)">${esc(p.model||'')}</small></td>
        <td>${esc(p.brand||'—')}</td>
        <td><small>${esc(p.imei || p.sku || '—')}</small></td>
        <td class="num">${fmt(p.purchase_price)}</td>
        <td class="num">${fmt(p.sale_price)}</td>
        <td class="num">${p.quantity}</td>
        <td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td>
        <td class="actions">
          <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button>
        </td>
      </tr>`).join('')}
  </tbody></table>`;
}

$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));

$('btnAddProduct')?.addEventListener('click', () => openProductModal());

window.editProduct = (id) => {
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (p) openProductModal(p);
};
window.deleteProduct = async (id) => {
  if (!confirm('Delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) toast(error.message, 'error');
  else { toast('Product deleted', 'success'); loadProducts(); }
};

function openProductModal(p = null) {
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Product Name *</label><input id="pName" value="${esc(p?.name||'')}"></div>
      <div class="field"><label>Brand</label><input id="pBrand" value="${esc(p?.brand||'')}"></div>
      <div class="field"><label>Model</label><input id="pModel" value="${esc(p?.model||'')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price||0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price||0}"></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity||0}"></div>
      <div class="field"><label>Min Stock</label><input id="pMin" type="number" value="${p?.min_stock||5}"></div>
      <div class="field"><label>IMEI (unique)</label><input id="pImei" value="${esc(p?.imei||'')}"></div>
      <div class="field"><label>SKU</label><input id="pSku" value="${esc(p?.sku||'')}"></div>
      <div class="field full"><label>Description</label><textarea id="pDesc">${esc(p?.description||'')}</textarea></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const payload = {
      name: $('pName').value.trim(),
      brand: $('pBrand').value.trim() || null,
      model: $('pModel').value.trim() || null,
      purchase_price: Number($('pPurchase').value) || 0,
      sale_price: Number($('pSale').value) || 0,
      quantity: Number($('pQty').value) || 0,
      min_stock: Number($('pMin').value) || 5,
      imei: $('pImei').value.trim() || null,
      sku: $('pSku').value.trim() || null,
      description: $('pDesc').value.trim() || null
    };
    if (!payload.name) throw new Error('Product name is required');
    let res;
    if (p) res = await supabase.from('products').update(payload).eq('id', p.id);
    else res = await supabase.from('products').insert(payload);
    if (res.error) throw new Error(res.error.message);
    toast(p ? 'Product updated' : 'Product added', 'success');
    closeModal();
    loadProducts();
  });
}

// =====================================================
// INVENTORY
// =====================================================
async function loadInventory() {
  const { data: low } = await supabase.from('products').select('*').order('quantity', { ascending: true }).limit(20);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
    <td>${p.quantity <= p.min_stock ? '<span class="pill red">Low Stock</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}
  </tbody></table>`;

  const { data: mov } = await supabase.from('inventory_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(20);
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

async function loadSaleProducts() {
  const { data } = await supabase.from('products').select('id,name,imei,sale_price,quantity').gt('quantity', 0).order('name');
  const sel = $('saleProductSelect');
  sel.innerHTML = '<option value="">— Choose product —</option>' +
    (data || []).map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei||'')}" data-stock="${p.quantity}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity} in stock)</option>`).join('');
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect');
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select a product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  const stock = Number(opt.dataset.stock);
  if (existing) {
    if (existing.quantity + 1 > stock) return toast('Insufficient stock', 'error');
    existing.quantity++;
    existing.line_total = existing.quantity * existing.unit_price;
  } else {
    CART.push({
      product_id: opt.value,
      product_name: opt.dataset.name,
      imei: opt.dataset.imei || null,
      unit_price: Number(opt.dataset.price),
      quantity: 1,
      line_total: Number(opt.dataset.price)
    });
  }
  renderCart();
};

function renderCart() {
  const box = $('cartItems');
  if (!CART.length) { box.innerHTML = '<div class="empty">Cart is empty</div>'; }
  else {
    box.innerHTML = `<table class="data cart-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${CART.map((c, i) => `<tr><td>${esc(c.product_name)}</td>
        <td class="num">${c.quantity}</td>
        <td class="num">${fmt(c.unit_price)}</td>
        <td class="num">${fmt(c.line_total)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td></tr>`).join('')}
    </tbody></table>`;
  }
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  const disc = Number($('saleDiscount').value) || 0;
  const total = Math.max(0, sub - disc);
  $('cartSubtotal').textContent = fmt(sub);
  $('cartTotal').textContent = fmt(total);
  $('salePaid').value = total; // auto-fill full payment
}

window.removeCart = (i) => { CART.splice(i, 1); renderCart(); };
$('saleDiscount').addEventListener('input', renderCart);

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart is empty', 'error');
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  const disc = Number($('saleDiscount').value) || 0;
  const total = Math.max(0, sub - disc);
  const paid = Number($('salePaid').value) || 0;
  const method = $('salePaymentMethod').value;

  $('btnSaveSale').disabled = true;
  try {
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: null,
      p_customer_name: $('saleCustName').value.trim() || 'Walk-in Customer',
      p_customer_phone: $('saleCustPhone').value.trim() || null,
      p_subtotal: sub,
      p_discount: disc,
      p_total: total,
      p_paid: paid,
      p_payment_method: method,
      p_notes: null,
      p_items: CART.map(c => ({
        product_id: c.product_id,
        product_name: c.product_name,
        imei: c.imei,
        quantity: c.quantity,
        unit_price: c.unit_price,
        line_total: c.line_total
      }))
    });
    if (error) throw new Error(error.message);
    toast('Sale saved successfully', 'success');
    CART = [];
    $('saleCustName').value = '';
    $('saleCustPhone').value = '';
    $('saleDiscount').value = 0;
    renderCart();
    loadSaleProducts();
    loadOverview();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    $('btnSaveSale').disabled = false;
  }
};

$('btnSalesHistory').onclick = () => {
  const box = $('salesHistoryBox');
  box.hidden = !box.hidden;
  if (!box.hidden) loadSalesHistory();
};

async function loadSalesHistory() {
  const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(50);
  const t = $('salesHistoryTable');
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No sales yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Method</th><th>Date</th></tr></thead><tbody>
    ${data.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td>
      <td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td>
      <td class="num">${s.balance > 0 ? `<span class="pill red">${fmt(s.balance)}</span>` : '<span class="pill green">Paid</span>'}</td>
      <td>${esc(s.payment_method)}</td><td>${new Date(s.created_at).toLocaleString()}</td></tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// PURCHASES
// =====================================================
async function loadPurchases() {
  const { data } = await supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(50);
  const t = $('purchasesTable');
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>
    ${data.map(p => `<tr><td>${esc(p.invoice_no)}</td><td>${esc(p.supplier_name || '—')}</td>
      <td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td class="num">${fmt(p.balance)}</td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}
  </tbody></table>`;
}

$('btnNewPurchase').onclick = async () => {
  // load products + suppliers for modal
  const [{ data: prods }, { data: sups }] = await Promise.all([
    supabase.from('products').select('id,name,purchase_price').order('name'),
    supabase.from('suppliers').select('id,name').order('name')
  ]);
  const body = `
    <div class="form-grid">
      <div class="field"><label>Supplier</label>
        <select id="puSup"><option value="">— None —</option>${(sups||[]).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Product</label>
        <select id="puProd"><option value="">— Choose —</option>${(prods||[]).map(p => `<option value="${p.id}" data-name="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Quantity</label><input id="puQty" type="number" value="1" min="1"></div>
      <div class="field"><label>Unit Purchase Price</label><input id="puPrice" type="number" value="0"></div>
      <div class="field"><label>Total</label><input id="puTotal" type="number" readonly></div>
      <div class="field"><label>Paid</label><input id="puPaid" type="number" value="0"></div>
    </div>
    <p style="font-size:11px;color:var(--muted);margin-top:12px">Note: This adds a single line purchase. Full multi-line POS purchase coming in v2.1</p>
  `;
  openModal('New Purchase', body, async () => {
    const prodId = $('puProd').value;
    const opt = $('puProd').options[$('puProd').selectedIndex];
    const qty = Number($('puQty').value) || 1;
    const price = Number($('puPrice').value) || 0;
    const total = qty * price;
    const paid = Number($('puPaid').value) || 0;
    if (!prodId) throw new Error('Select product');

    const { data: sups } = await supabase.from('suppliers').select('name').eq('id', $('puSup').value).maybeSingle();
    const { error } = await supabase.rpc('create_purchase', {
      p_supplier_id: $('puSup').value || null,
      p_supplier_name: sups?.name || null,
      p_subtotal: total,
      p_discount: 0,
      p_total: total,
      p_paid: paid,
      p_payment_method: 'cash',
      p_notes: null,
      p_items: [{
        product_id: prodId,
        product_name: opt.dataset.name,
        quantity: qty,
        unit_price: price,
        line_total: total
      }]
    });
    if (error) throw new Error(error.message);
    toast('Purchase saved', 'success');
    closeModal();
    loadPurchases();
  });
};

// =====================================================
// CUSTOMERS
// =====================================================
let ALL_CUST = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q;
  ALL_CUST = data || [];
  const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers. Add first customer.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_CUST.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.address||'—')}</td>
      <td class="actions"><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}

$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value));

$('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = (id) => openCustomerModal(ALL_CUST.find(c => c.id === id));
window.deleteCustomer = async (id) => {
  if (!confirm('Delete customer?')) return;
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) toast(error.message, 'error'); else { toast('Deleted', 'success'); loadCustomers(); }
};

function openCustomerModal(c = null) {
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone||'')}"></div>
      <div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance||0}"></div>
      <div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address||'')}</textarea></div>
    </div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = {
      name: $('cName').value.trim(),
      phone: $('cPhone').value.trim() || null,
      address: $('cAddr').value.trim() || null,
      opening_balance: Number($('cBal').value) || 0
    };
    if (!payload.name) throw new Error('Name required');
    const res = c
      ? await supabase.from('customers').update(payload).eq('id', c.id)
      : await supabase.from('customers').insert(payload);
    if (res.error) throw new Error(res.error.message);
    toast('Saved', 'success'); closeModal(); loadCustomers();
  });
}

// =====================================================
// SUPPLIERS
// =====================================================
let ALL_SUP = [];
async function loadSuppliers() {
  const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
  ALL_SUP = data || [];
  const t = $('suppliersTable');
  if (!ALL_SUP.length) { t.innerHTML = '<div class="empty">No suppliers yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_SUP.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone||'—')}</td><td>${esc(s.address||'—')}</td>
      <td class="actions"><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('btnAddSupplier').onclick = () => openSupplierModal();
window.editSupplier = (id) => openSupplierModal(ALL_SUP.find(s => s.id === id));
window.deleteSupplier = async (id) => {
  if (!confirm('Delete supplier?')) return;
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) toast(error.message, 'error'); else { toast('Deleted', 'success'); loadSuppliers(); }
};

function openSupplierModal(s = null) {
  const body = `<div class="form-grid">
    <div class="field full"><label>Supplier Name *</label><input id="sName" value="${esc(s?.name||'')}"></div>
    <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone||'')}"></div>
    <div class="field"><label>Opening Balance</label><input id="sBal" type="number" value="${s?.opening_balance||0}"></div>
    <div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address||'')}</textarea></div>
  </div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = {
      name: $('sName').value.trim(),
      phone: $('sPhone').value.trim() || null,
      address: $('sAddr').value.trim() || null,
      opening_balance: Number($('sBal').value) || 0
    };
    if (!payload.name) throw new Error('Name required');
    const res = s ? await supabase.from('suppliers').update(payload).eq('id', s.id) : await supabase.from('suppliers').insert(payload);
    if (res.error) throw new Error(res.error.message);
    toast('Saved', 'success'); closeModal(); loadSuppliers();
  });
}

// =====================================================
// CREDIT / UDHAR
// =====================================================
async function loadCredit() {
  const { data: sales } = await supabase.from('sales').select('id,invoice_no,customer_name,customer_phone,total,paid,balance,created_at').gt('balance', 0).order('created_at', { ascending: false });
  const t = $('creditTable');
  if (!sales || !sales.length) { t.innerHTML = '<div class="empty">No outstanding credit.</div>'; }
  else {
    t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Phone</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th class="actions">Action</th></tr></thead><tbody>
      ${sales.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name)}</td><td>${esc(s.customer_phone||'—')}</td>
        <td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td>
        <td class="num"><span class="pill red">${fmt(s.balance)}</span></td>
        <td class="actions"><button class="btn btn-primary btn-sm" onclick="openRecovery('${s.id}','${esc(s.customer_name)}',${s.balance})">Receive Payment</button></td></tr>`).join('')}
    </tbody></table>`;
  }

  const { data: rec } = await supabase.from('customer_payments').select('*, customers(name)').order('created_at', { ascending: false }).limit(20);
  const tr = $('recoveriesTable');
  if (!rec || !rec.length) tr.innerHTML = '<div class="empty">No recoveries yet.</div>';
  else tr.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Customer</th><th class="num">Amount</th><th>Method</th></tr></thead><tbody>
    ${rec.map(r => `<tr><td>${new Date(r.created_at).toLocaleString()}</td><td>${esc(r.customers?.name || '—')}</td>
      <td class="num">${fmt(r.amount)}</td><td>${esc(r.payment_method)}</td></tr>`).join('')}
  </tbody></table>`;
}

window.openRecovery = (saleId, custName, balance) => {
  const body = `<div class="form-grid">
    <div class="field full"><label>Customer</label><input readonly value="${esc(custName)}"></div>
    <div class="field"><label>Outstanding Balance</label><input readonly value="${fmt(balance)}"></div>
    <div class="field"><label>Amount Received</label><input id="recAmt" type="number" value="${balance}" max="${balance}"></div>
    <div class="field"><label>Payment Method</label>
      <select id="recMethod"><option value="cash">Cash</option><option value="bank">Bank</option><option value="other">Other</option></select>
    </div>
  </div>`;
  openModal('Receive Credit Payment', body, async () => {
    const amt = Number($('recAmt').value) || 0;
    if (amt <= 0) throw new Error('Enter valid amount');
    const { data: sale } = await supabase.from('sales').select('customer_id').eq('id', saleId).single();
    const { error } = await supabase.rpc('record_customer_payment', {
      p_customer_id: sale.customer_id,
      p_sale_id: saleId,
      p_amount: amt,
      p_payment_method: $('recMethod').value,
      p_notes: null
    });
    if (error) throw new Error(error.message);
    toast('Payment recorded', 'success'); closeModal(); loadCredit();
  });
};

// =====================================================
// EXPENSES
// =====================================================
async function loadExpenses() {
  const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(50);
  const t = $('expensesTable');
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No expenses yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th>Method</th></tr></thead><tbody>
    ${data.map(e => `<tr><td>${esc(e.expense_date)}</td><td>${esc(e.category)}</td><td>${esc(e.description||'')}</td>
      <td class="num">${fmt(e.amount)}</td><td>${esc(e.payment_method)}</td></tr>`).join('')}
  </tbody></table>`;
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid">
    <div class="field"><label>Category</label><input id="eCat" value="General"></div>
    <div class="field"><label>Amount</label><input id="eAmt" type="number" value="0"></div>
    <div class="field"><label>Date</label><input id="eDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Method</label><select id="eMethod"><option value="cash">Cash</option><option value="bank">Bank</option></select></div>
    <div class="field full"><label>Description</label><textarea id="eDesc"></textarea></div>
  </div>`;
  openModal('Add Expense', body, async () => {
    const payload = {
      category: $('eCat').value.trim() || 'General',
      description: $('eDesc').value.trim() || null,
      amount: Number($('eAmt').value) || 0,
      payment_method: $('eMethod').value,
      expense_date: $('eDate').value,
      created_by: profile.id
    };
    const { error } = await supabase.from('expenses').insert(payload);
    if (error) throw new Error(error.message);
    // Also log transaction
    await supabase.from('transactions').insert({
      transaction_type: 'expense', amount: payload.amount,
      payment_method: payload.payment_method, direction: 'out',
      notes: payload.description, created_by: profile.id
    });
    toast('Expense added', 'success'); closeModal(); loadExpenses();
  });
};

// =====================================================
// TRANSACTIONS
// =====================================================
async function loadTransactions() {
  const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
  const t = $('transactionsTable');
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No transactions yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Date</th><th>Type</th><th>Party</th><th class="num">Amount</th><th>Direction</th><th>Method</th></tr></thead><tbody>
    ${data.map(x => `<tr><td>${new Date(x.created_at).toLocaleString()}</td>
      <td>${esc(x.transaction_type)}</td><td>${esc(x.party_name || '—')}</td>
      <td class="num">${fmt(x.amount)}</td>
      <td><span class="pill ${x.direction === 'in' ? 'green' : 'orange'}">${x.direction === 'in' ? 'IN' : 'OUT'}</span></td>
      <td>${esc(x.payment_method||'—')}</td></tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// REPORTS
// =====================================================
$('btnRunReport').onclick = async () => {
  const type = $('reportType').value;
  const from = $('reportFrom').value ? new Date($('reportFrom').value).toISOString() : new Date(0).toISOString();
  const to = $('reportTo').value ? new Date($('reportTo').value + 'T23:59:59').toISOString() : new Date().toISOString();

  const out = $('reportOutput');
  out.innerHTML = '<div class="empty">Loading…</div>';

  let table = '', title = '';
  if (type === 'sales' || type === 'purchases') {
    const { data } = await supabase.from(type).select('*').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false });
    title = type === 'sales' ? 'Sales Report' : 'Purchase Report';
    table = `<table class="data"><thead><tr><th>Invoice</th><th>Party</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.invoice_no)}</td><td>${esc(x.customer_name || x.supplier_name || '—')}</td>
        <td class="num">${fmt(x.total)}</td><td class="num">${fmt(x.paid)}</td><td class="num">${fmt(x.balance)}</td>
        <td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')}
    </tbody></table>`;
  } else if (type === 'credit') {
    const { data } = await supabase.from('sales').select('*').gt('balance', 0).gte('created_at', from).lte('created_at', to);
    title = 'Credit Report';
    table = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.invoice_no)}</td><td>${esc(x.customer_name)}</td>
        <td class="num">${fmt(x.balance)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join('')}
    </tbody></table>`;
  } else if (type === 'expenses') {
    const { data } = await supabase.from('expenses').select('*').gte('expense_date', $('reportFrom').value || '1970-01-01').lte('expense_date', $('reportTo').value || '2999-12-31');
    title = 'Expense Report';
    table = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.expense_date)}</td><td>${esc(x.category)}</td><td>${esc(x.description||'')}</td><td class="num">${fmt(x.amount)}</td></tr>`).join('')}
    </tbody></table>`;
  }

  out.innerHTML = `<h3 style="font-size:15px;font-weight:800;margin-bottom:12px">${title}</h3>${table}`;
};

$('btnPrintReport').onclick = () => window.print();

// =====================================================
// SETTINGS
// =====================================================
async function loadSettings() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (!data) return;
  $('setShopName').value = data.shop_name || '';
  $('setOwner').value = data.owner_name || '';
  $('setAddress').value = data.address || '';
  $('setPhone').value = data.phone || '';
  $('setCurrency').value = data.currency || 'PKR';
  $('setFooter').value = data.footer_text || '';
}
$('btnSaveSettings').onclick = async () => {
  const payload = {
    shop_name: $('setShopName').value.trim(),
    owner_name: $('setOwner').value.trim(),
    address: $('setAddress').value.trim(),
    phone: $('setPhone').value.trim(),
    currency: $('setCurrency').value.trim(),
    footer_text: $('setFooter').value.trim(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('settings').update(payload).eq('id', 1);
  if (error) toast(error.message, 'error');
  else toast('Settings saved', 'success');
};

// =====================================================
// INITIAL LOAD
// =====================================================
renderCart();
loadOverview();
