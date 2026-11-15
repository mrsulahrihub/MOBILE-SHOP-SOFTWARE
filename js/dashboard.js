// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER (v5.0 Premium)
// =====================================================
import { supabase } from './config.js';
import { getActiveProfile } from './auth-guard.js';

// ---------- Auth guard ----------
const result = await getActiveProfile();
if (!result) { location.replace('./login.html'); throw new Error('Unauthorized'); }
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

// Sound Beep for POS
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
};

function toast(msg, type = 'info') {
  const host = $('toastHost');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// =====================================================
// THEME SWITCHER (20+ Themes)
// =====================================================
const THEMES = [
  "Default", "Glassmorphism", "Neumorphism", "Claymorphism", "Skeuomorphism", 
  "Minimalism", "Bento Grid", "Brutalism", "Aurora UI", "Dark UI", 
  "3D Immersive UI", "Bauhaus", "Cyberpunk UI", "Flat Design", "Material Design", 
  "Fluent Design", "Motion UI", "Organic UI", "Retro-Futurism", "Swiss Style", 
  "Gradient Mesh UI", "Editorial UI", "Parallax Design", "Isometric UI", 
  "Hyperrealism UI", "Liquid Glass UI"
];

function initThemeSwitcher() {
  const topbar = document.querySelector('.topbar .user-info');
  if (!topbar) return;
  
  const select = document.createElement('select');
  select.id = 'themeSelector';
  select.style.cssText = "margin-right:15px; padding:5px; border-radius:5px; border:1px solid #ccc; font-size:12px;";
  
  THEMES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.toLowerCase().replace(/\s+/g, '-');
    opt.textContent = t;
    select.appendChild(opt);
  });

  // Load saved theme
  const savedTheme = localStorage.getItem('bm_theme') || 'default';
  select.value = savedTheme;
  applyTheme(savedTheme);

  select.addEventListener('change', (e) => {
    applyTheme(e.target.value);
    localStorage.setItem('bm_theme', e.target.value);
  });

  topbar.insertBefore(select, topbar.firstChild);
}

function applyTheme(theme) {
  document.body.className = ''; // Clear existing
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }
}
initThemeSwitcher();

// =====================================================
// KEYBOARD SHORTCUTS
// =====================================================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); if ($('btnSaveSale') && !$('btnSaveSale').disabled) $('btnSaveSale').click(); }
  if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); document.querySelector('[data-module="products"]')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); document.querySelector('[data-module="sales"]')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'c') { e.preventDefault(); document.querySelector('[data-module="customers"]')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'u') { e.preventDefault(); document.querySelector('[data-module="credit"]')?.click(); }
  if (e.key === 'Escape' && $('modalBackdrop')?.classList.contains('open')) closeModal();
  if (e.key === 'F1') { e.preventDefault(); showShortcutHelp(); }
  if (e.key === 'F2' && $('btnAddToCart') && !$('btnAddToCart').disabled) { e.preventDefault(); $('btnAddToCart').click(); }
  if (e.key === 'F4' && $('btnSaveSale') && !$('btnSaveSale').disabled) { e.preventDefault(); $('btnSaveSale').click(); }
});

function showShortcutHelp() {
  const body = `<div style="font-size:13px;line-height:1.8">
    <b>Navigation:</b><br>
    <code>Alt+P</code> Products · <code>Alt+L</code> POS · <code>Alt+C</code> Customers · <code>Alt+U</code> Udhar<br><br>
    <b>POS Actions:</b><br>
    <code>F2</code> Add to Cart · <code>F4</code> / <code>Alt+S</code> Save Sale<br><br>
    <b>Others:</b><br>
    <code>F1</code> Help · <code>Esc</code> Close
  </div>`;
  openModal('⌨️ Keyboard Shortcuts', body, () => closeModal(), 'Close');
}

// ---------- Modal & Nav ----------
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
  if (MODAL_ON_CONFIRM) { try { await MODAL_ON_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); } }
};

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
    supabase.from('products').select('quantity,is_active,name,min_stock'),
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

  // Low Stock Alert
  const lowStockItems = (prods.data || []).filter(p => p.quantity <= p.min_stock);
  let alertHTML = '';
  if (lowStockItems.length > 0) {
    alertHTML = `<div class="clay" style="padding:20px; margin-bottom:20px; border-left:4px solid #ef4444; background:#fef2f2">
      <h3 style="font-size:14px; font-weight:800; color:#991b1b; margin-bottom:10px">⚠️ Inventory Alerts (${lowStockItems.length} items)</h3>
      <ul style="font-size:12px; color:#7f1d1d; padding-left:20px; line-height:1.8">
        ${lowStockItems.map(p => `<li><strong>${esc(p.name)}</strong> - ${p.quantity === 0 ? '<span style="color:red;font-weight:bold">Out of Stock</span>' : `Only ${p.quantity} left (Min: ${p.min_stock})`}</li>`).join('')}
      </ul>
    </div>`;
  }

  const recentBox = $('recentSales');
  if (recentBox) {
    const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
    let recentHTML = '';
    if (!recent || !recent.length) { recentHTML = '<div class="empty">No sales yet.</div>'; }
    else {
      recentHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead><tbody>
        ${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}
      </tbody></table>`;
    }
    const dashStats = $('dashStats');
    if (dashStats && lowStockItems.length > 0) {
      if ($('lowStockAlertBox')) $('lowStockAlertBox').remove();
      const div = document.createElement('div');
      div.id = 'lowStockAlertBox';
      div.innerHTML = alertHTML;
      dashStats.after(div);
    }
    recentBox.innerHTML = recentHTML;
  }
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
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>IMEI / SKU</th><th class="num">Sale Price</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `
      <tr>
        <td><strong>${esc(p.name)}</strong><br><small>${esc(p.model||'')}</small></td>
        <td><small>${esc(p.category||'—')}${p.sub_category ? ' / ' + esc(p.sub_category) : ''}</small></td>
        <td><small>${esc(p.imei_1 || '—')}${p.imei_2 ? '<br>' + esc(p.imei_2) : ''}</small></td>
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

window.editProduct = (id) => { const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };
window.deleteProduct = async (id) => {
  if (!confirm('Delete this product?')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) toast(error.message, 'error');
  else { toast('Product deleted', 'success'); loadProducts(); }
};

function openProductModal(p = null) {
  const isMobile = (p?.category || 'Mobile') === 'Mobile';
  const isCover = (p?.category) === 'Cover';
  const body = `
    <div class="form-grid">
      <div class="field full"><label>Product Name *</label><input id="pName" value="${esc(p?.name||'')}"></div>
      <div class="field">
        <label>Category *</label>
        <select id="pCategory" onchange="toggleProductFields()">
          <option value="Mobile" ${!p || p.category==='Mobile'?'selected':''}>Mobile</option>
          <option value="Cover" ${p?.category==='Cover'?'selected':''}>Mobile Cover</option>
          <option value="Accessory" ${p?.category==='Accessory'?'selected':''}>Accessory</option>
        </select>
      </div>
      <div class="field" id="coverSubField" style="${isCover ? '' : 'display:none'}">
        <label>Cover Type</label>
        <select id="pSubCategory">
          <option value="Simple" ${p?.sub_category==='Simple'?'selected':''}>Simple (White)</option>
          <option value="Design" ${p?.sub_category==='Design'?'selected':''}>Design (Stylish)</option>
          <option value="Ladies" ${p?.sub_category==='Ladies'?'selected':''}>Ladies Cover</option>
        </select>
      </div>
      <div class="field"><label>Brand</label><input id="pBrand" value="${esc(p?.brand||'')}"></div>
      <div class="field"><label>Model</label><input id="pModel" value="${esc(p?.model||'')}"></div>
      <div class="field" id="imei1Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 1</label><input id="pImei1" value="${esc(p?.imei_1||'')}"></div>
      <div class="field" id="imei2Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 2</label><input id="pImei2" value="${esc(p?.imei_2||'')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price||0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price||0}"></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity||0}"></div>
      <div class="field"><label>Min Stock</label><input id="pMin" type="number" value="${p?.min_stock||5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const cat = $('pCategory').value;
    const payload = {
      name: $('pName').value.trim(),
      category: cat,
      sub_category: cat === 'Cover' ? $('pSubCategory').value : null,
      brand: $('pBrand').value.trim() || null,
      model: $('pModel').value.trim() || null,
      imei_1: cat === 'Mobile' ? ($('pImei1').value.trim() || null) : null,
      imei_2: cat === 'Mobile' ? ($('pImei2').value.trim() || null) : null,
      purchase_price: Number($('pPurchase').value) || 0,
      sale_price: Number($('pSale').value) || 0,
      quantity: Number($('pQty').value) || 0,
      min_stock: Number($('pMin').value) || 5
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
  const { data: low } = await supabase.from('products').select('*').order('quantity', { ascending: true }).limit(20);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category||'—')}${p.sub_category ? ' / '+esc(p.sub_category) : ''}</small></td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
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
let LAST_SALE = null;

async function loadSaleProducts() {
  const { data } = await supabase.from('products').select('id,name,category,sub_category,imei_1,imei_2,sale_price,quantity').gt('quantity', 0).order('name');
  const sel = $('saleProductSelect');
  sel.innerHTML = '<option value="">— Choose product —</option>' +
    (data || []).map(p => {
      const label = `${p.name}${p.sub_category ? ' ('+p.sub_category+')' : ''} — ${fmt(p.sale_price)} (${p.quantity} in stock)`;
      return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1||'')}" data-imei2="${esc(p.imei_2||'')}" data-stock="${p.quantity}">${esc(label)}</option>`;
    }).join('');
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
      imei_2: opt.dataset.imei2 || null,
      unit_price: Number(opt.dataset.price),
      quantity: 1,
      line_total: Number(opt.dataset.price)
    });
  }
  playBeep(); // Audio Beep on Add
  renderCart();
};

function renderCart() {
  const box = $('cartItems');
  if (!CART.length) { box.innerHTML = '<div class="empty">Cart is empty</div>'; }
  else {
    box.innerHTML = `<table class="data cart-table"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${CART.map((c, i) => `<tr><td>${esc(c.product_name)}${c.imei ? '<br><small>IMEI: '+esc(c.imei)+'</small>' : ''}</td>
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
  if (Number($('salePaid').value) === 0) $('salePaid').value = total;

  const paid = Number($('salePaid').value) || 0;
  const udharWarn = $('udharWarning');
  if (udharWarn) {
    udharWarn.style.display = (total - paid > 0) ? 'block' : 'none';
  }
}

window.removeCart = (i) => { CART.splice(i, 1); renderCart(); };
$('saleDiscount').addEventListener('input', renderCart);
$('salePaid')?.addEventListener('input', renderCart);

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart is empty', 'error');
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  const disc = Number($('saleDiscount').value) || 0;
  const total = Math.max(0, sub - disc);
  const paid = Number($('salePaid').value) || 0;
  const method = $('salePaymentMethod').value;
  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  const custPhone = $('saleCustPhone').value.trim() || null;

  if (paid < 0 || paid > total) return toast('Invalid paid amount', 'error');

  $('btnSaveSale').disabled = true;
  try {
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: null, p_customer_name: custName, p_customer_phone: custPhone,
      p_subtotal: sub, p_discount: disc, p_total: total, p_paid: paid,
      p_payment_method: method, p_notes: null,
      p_items: CART.map(c => ({
        product_id: c.product_id, product_name: c.product_name,
        imei: c.imei, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total
      }))
    });
    if (error) throw new Error(error.message);

    // Fallback for invoice number
    const invNo = data.invoice_no || data.invoice_number || 'INV-' + Date.now().toString().slice(-6);

    LAST_SALE = {
      invoice: invNo,
      customer: custName, phone: custPhone,
      total, paid, balance: total - paid,
      method, items: [...CART], date: new Date()
    };

    if (total - paid > 0) {
      toast(`Udhar ${fmt(total - paid)} saved in Credit section`, 'info');
    }

    toast('Sale saved successfully', 'success');
    CART = [];
    $('saleCustName').value = '';
    $('saleCustPhone').value = '';
    $('saleDiscount').value = 0;
    $('salePaid').value = 0;
    renderCart();
    loadSaleProducts();
    loadOverview();

    if (confirm('Print 80mm thermal receipt?')) printThermal80mm(LAST_SALE);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    $('btnSaveSale').disabled = false;
  }
};

// =====================================================
// 80mm THERMAL RECEIPT (With Logo Background)
// =====================================================
function printThermal80mm(sale) {
  const w = window.open('', '_blank', 'width=340,height=600');
  w.document.write(`<html><head><title>Receipt</title><style>
    @page { size: 80mm auto; margin: 0; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 11px; 
      width: 76mm; 
      margin: 0 auto; 
      padding: 2mm; 
      position: relative;
      background-color: #fff;
    }
    /* Background Watermark Logo */
    body::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50mm;
      height: 50mm;
      /* Yahan apni BM logo ka direct URL dalein */
      background-image: url('https://i.ibb.co/6PZ9Z9x/bm-logo.png'); 
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.1; /* Black & white low brightness effect */
      z-index: -1;
    }
    .center { text-align: center; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; position: relative; z-index: 1; }
    td, th { padding: 1px 0; text-align: left; }
    .num { text-align: right; }
    .big { font-size: 13px; font-weight: bold; }
    .b { font-weight: bold; }
    .due { color: red; font-weight: bold; }
  </style></head><body>
    <div class="center">
      <div class="big">BM MOBILE ZONE</div>
      <div>Chohan Mobile Market, Zafarwal</div>
      <div>03099100546</div>
    </div>
    <div class="line"></div>
    <div>Invoice: <span class="b">${esc(sale.invoice || 'N/A')}</span></div>
    <div>Date: ${sale.date.toLocaleString('en-PK')}</div>
    <div>Customer: ${esc(sale.customer)}</div>
    ${sale.phone ? `<div>Phone: ${esc(sale.phone)}</div>` : ''}
    <div class="line"></div>
    <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th></tr></thead>
    <tbody>
      ${sale.items.map(i => `<tr><td>${esc(i.product_name)}${i.imei ? '<br><small>'+esc(i.imei)+'</small>' : ''}</td><td class="num">${i.quantity}</td><td class="num">${fmt(i.line_total)}</td></tr>`).join('')}
    </tbody></table>
    <div class="line"></div>
    <table>
      <tr><td>Total</td><td class="num b">${fmt(sale.total)}</td></tr>
      <tr><td>Paid</td><td class="num">${fmt(sale.paid)}</td></tr>
      <tr><td class="due">Due</td><td class="num due">${fmt(sale.balance)}</td></tr>
    </table>
    <div class="line"></div>
    <div class="center" style="font-size:10px;margin-top:6px; position: relative; z-index: 1;">
      Thank you for shopping!<br>
      Visit Again<br><br>
      <b>Software Made by MS Tech</b><br>
      📞 03099100546
    </div>
    <script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);}<\/script>
  </body></html>`);
  w.document.close();
}

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
        <select id="puProd"><option value="">— Choose —</option>${(prods||[]).map(p => `<option value="${p.id}" data-name="${esc(p.name)}" data-price="${p.purchase_price||0}">${esc(p.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Quantity</label><input id="puQty" type="number" value="1" min="1"></div>
      <div class="field"><label>Unit Purchase Price</label><input id="puPrice" type="number" value="0"></div>
      <div class="field"><label>Total</label><input id="puTotal" type="number" readonly></div>
      <div class="field"><label>Paid</label><input id="puPaid" type="number" value="0"></div>
    </div>
  `;
  openModal('New Purchase', body, async () => {
    const prodId = $('puProd').value;
    const opt = $('puProd').options[$('puProd').selectedIndex];
    const qty = Number($('puQty').value) || 1;
    const price = Number($('puPrice').value) || 0;
    const total = qty * price;
    const paid = Number($('puPaid').value) || 0;
    if (!prodId) throw new Error('Select product');

    const invNo = 'PUR-' + Date.now().toString().slice(-6);

    const { data: supsData } = await supabase.from('suppliers').select('name').eq('id', $('puSup').value).maybeSingle();
    const { error } = await supabase.rpc('create_purchase', {
      p_invoice_no: invNo,
      p_supplier_id: $('puSup').value || null,
      p_supplier_name: supsData?.name || null,
      p_subtotal: total, p_discount: 0, p_total: total, p_paid: paid,
      p_payment_method: 'cash', p_notes: null,
      p_items: [{ product_id: prodId, product_name: opt.dataset.name, quantity: qty, unit_price: price, line_total: total }]
    });
    if (error) throw new Error(error.message);
    toast('Purchase saved', 'success'); closeModal(); loadPurchases();
  });
  setTimeout(() => {
    const prodSel = $('puProd');
    prodSel.onchange = () => {
      const o = prodSel.options[prodSel.selectedIndex];
      if (o.dataset.price) $('puPrice').value = o.dataset.price;
    };
    const calc = () => $('puTotal').value = (Number($('puQty').value)||0) * (Number($('puPrice').value)||0);
    $('puQty').oninput = calc; $('puPrice').oninput = calc;
  }, 50);
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
    const res = c ? await supabase.from('customers').update(payload).eq('id', c.id) : await supabase.from('customers').insert(payload);
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
