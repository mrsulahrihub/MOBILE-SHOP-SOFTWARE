// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER (v6.0)
// =====================================================
import { supabase } from './config.js';
import { getActiveProfile } from './auth-guard.js';

// 1. Auth Guard
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

// 2. Helpers
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg, type = 'info') {
  const host = $('toastHost');
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

// 3. THEME & DAY/NIGHT SWITCHER LOGIC
function initThemeSwitcher() {
  const topbarUserInfo = document.querySelector('.topbar .user-info');
  if (!topbarUserInfo) return;
  
  const controls = document.createElement('div');
  controls.className = 'theme-controls';

  const select = document.createElement('select');
  select.className = 'theme-select';
  const themes = [
    { val: 'clay', name: 'Claymorphism' },
    { val: 'glass', name: 'Glassmorphism' },
    { val: 'neo', name: 'Neumorphism' },
    { val: 'bento', name: 'Bento Grid' },
    { val: 'minimal', name: 'Minimalism' }
  ];
  themes.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.val; opt.textContent = t.name;
    select.appendChild(opt);
  });

  const switchLabel = document.createElement('label');
  switchLabel.className = 'switch';
  switchLabel.innerHTML = `<input type="checkbox" id="dayNightToggle"><span class="slider"><span class="sun">☀️</span><span class="moon">🌙</span></span>`;

  controls.appendChild(select);
  controls.appendChild(switchLabel);
  topbarUserInfo.insertBefore(controls, topbarUserInfo.firstChild);

  const applyTheme = () => {
    const savedTheme = localStorage.getItem('bm_theme') || 'clay';
    const isDark = localStorage.getItem('bm_dark') === 'true';

    document.body.className = `theme-${savedTheme}`;
    select.value = savedTheme;

    if (isDark) {
      document.body.classList.add('dark-mode');
      document.getElementById('dayNightToggle').checked = true;
    } else {
      document.getElementById('dayNightToggle').checked = false;
    }
  };

  applyTheme();

  select.addEventListener('change', (e) => {
    localStorage.setItem('bm_theme', e.target.value);
    applyTheme();
  });

  document.getElementById('dayNightToggle').addEventListener('change', (e) => {
    localStorage.setItem('bm_dark', e.target.checked);
    applyTheme();
  });
}
initThemeSwitcher();

// 4. Shortcuts
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); document.querySelector('[data-module="products"]')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); document.querySelector('[data-module="sales"]')?.click(); }
});

// 5. Navigation Logic
const MODULE_TITLES = { overview: 'Dashboard', products: 'Products', inventory: 'Inventory', sales: 'Sales / POS', purchases: 'Purchases', customers: 'Customers', suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses', transactions: 'Transactions', reports: 'Reports', settings: 'Settings' };

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

// 6. Load Overview
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance'), supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }), supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'), supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
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

  const lowStockItems = (prods.data || []).filter(p => p.quantity <= p.min_stock);
  if (lowStockItems.length > 0) {
    const alertHTML = `<div class="clay" style="padding:20px; margin-bottom:20px; border-left:4px solid #ef4444; background:rgba(239,68,68,0.05)">
      <h3 style="font-size:14px; font-weight:800; color:#ef4444; margin-bottom:10px">⚠️ Inventory Alerts (${lowStockItems.length} items)</h3>
      <ul style="font-size:12px; color:var(--text); padding-left:20px;">${lowStockItems.map(p => `<li><strong>${esc(p.name)}</strong> - ${p.quantity === 0 ? '<span style="color:red;font-weight:bold">Out of Stock</span>' : `Only ${p.quantity} left`}</li>`).join('')}</ul></div>`;
    if ($('lowStockAlertBox')) $('lowStockAlertBox').remove();
    const div = document.createElement('div'); div.id = 'lowStockAlertBox'; div.innerHTML = alertHTML;
    $('dashStats').after(div);
  }

  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  else $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

// 7. Products (Add, Edit, Delete)
let ALL_PRODUCTS = [];
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>IMEI</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.category||'—')} ${p.sub_category ? '/ '+esc(p.sub_category) : ''}</td><td><small>${esc(p.imei_1 || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
$('btnAddProduct')?.addEventListener('click', () => openProductModal());
window.editProduct = (id) => { const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };
window.deleteProduct = async (id) => { if (!confirm('Delete?')) return; await supabase.from('products').delete().eq('id', id); toast('Deleted'); loadProducts(); };

function openProductModal(p = null) {
  const isMobile = (p?.category || 'Mobile') === 'Mobile';
  const isCover = (p?.category) === 'Cover';
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="pName" value="${esc(p?.name||'')}"></div>
      <div class="field"><label>Category</label><select id="pCategory" onchange="toggleProductFields()"><option value="Mobile" ${!p || p.category==='Mobile'?'selected':''}>Mobile</option><option value="Cover" ${p?.category==='Cover'?'selected':''}>Cover</option><option value="Accessory" ${p?.category==='Accessory'?'selected':''}>Accessory</option></select></div>
      <div class="field" id="coverSubField" style="${isCover ? '' : 'display:none'}"><label>Cover Type</label><select id="pSubCategory"><option value="Simple">Simple</option><option value="Design">Design</option><option value="Ladies">Ladies</option></select></div>
      <div class="field" id="imei1Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 1</label><input id="pImei1" value="${esc(p?.imei_1||'')}"></div>
      <div class="field" id="imei2Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 2</label><input id="pImei2" value="${esc(p?.imei_2||'')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price||0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price||0}"></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity||0}"></div>
      <div class="field"><label>Min Stock</label><input id="pMin" type="number" value="${p?.min_stock||5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const cat = $('pCategory').value;
    const payload = { name: $('pName').value.trim(), category: cat, sub_category: cat === 'Cover' ? $('pSubCategory').value : null, imei_1: cat === 'Mobile' ? ($('pImei1').value.trim() || null) : null, imei_2: cat === 'Mobile' ? ($('pImei2').value.trim() || null) : null, purchase_price: Number($('pPurchase').value) || 0, sale_price: Number($('pSale').value) || 0, quantity: Number($('pQty').value) || 0, min_stock: Number($('pMin').value) || 5 };
    if (!payload.name) throw new Error('Name required');
    if (p) await supabase.from('products').update(payload).eq('id', p.id); else await supabase.from('products').insert(payload);
    toast('Saved', 'success'); closeModal(); loadProducts();
  });
}
window.toggleProductFields = () => {
  const cat = $('pCategory').value;
  $('coverSubField').style.display = cat === 'Cover' ? '' : 'none';
  $('imei1Field').style.display = cat === 'Mobile' ? '' : 'none';
  $('imei2Field').style.display = cat === 'Mobile' ? '' : 'none';
};

// 8. POS / Sales Logic
let CART = [];
async function loadSaleProducts() {
  const { data } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + (data || []).map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1||'')}" data-stock="${p.quantity}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity} in stock)</option>`).join('');
}
$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
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
  $('btnSaveSale').disabled = true;
  try {
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: null, p_customer_name: custName, p_customer_phone: $('saleCustPhone').value.trim() || null,
      p_subtotal: CART.reduce((s, c) => s + c.line_total, 0), p_discount: Number($('saleDiscount').value) || 0, p_total: total, p_paid: paid,
      p_payment_method: $('salePaymentMethod').value, p_notes: null,
      p_items: CART.map(c => ({ product_id: c.product_id, product_name: c.product_name, imei: c.imei, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total }))
    });
    if (error) throw new Error(error.message);
    const inv = data.invoice_no || 'INV-' + Date.now().toString().slice(-6);
    if (confirm('Print receipt?')) printThermal80mm({ invoice: inv, customer: custName, total, paid, balance: total - paid, date: new Date(), items: [...CART] });
    toast('Sale Saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
    $('saleCustName').value = ''; $('saleCustPhone').value = ''; $('salePaid').value = 0; $('saleDiscount').value = 0;
  } catch (e) { toast(e.message, 'error'); } finally { $('btnSaveSale').disabled = false; }
};

// 9. Print 80mm
function printThermal80mm(sale) {
  const w = window.open('', '_blank', 'width=340,height=600');
  w.document.write(`<html><head><title>Receipt</title><style>@page{size:80mm auto;margin:0}body{font-family:'Courier New',monospace;font-size:11px;width:76mm;margin:0 auto;padding:2mm;position:relative;background:#fff;color:#000}body::before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50mm;height:50mm;background-image:url('https://i.ibb.co/6PZ9Z9x/bm-logo.png');background-size:contain;background-repeat:no-repeat;background-position:center;opacity:.08;z-index:-1}.center{text-align:center}.line{border-top:1px dashed #000;margin:4px 0}table{width:100%;border-collapse:collapse;font-size:10px;position:relative;z-index:1}td,th{padding:1px 0;text-align:left}.num{text-align:right}.big{font-size:13px;font-weight:bold}.b{font-weight:bold}.due{color:red;font-weight:bold}</style></head><body>
    <div class="center"><div class="big">BM MOBILE ZONE</div><div>Chohan Mobile Market</div><div>03099100546</div></div><div class="line"></div>
    <div>Invoice: <span class="b">${esc(sale.invoice)}</span></div><div>Date: ${sale.date.toLocaleString()}</div><div>Customer: ${esc(sale.customer)}</div><div class="line"></div>
    <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th></tr></thead><tbody>${sale.items.map(i => `<tr><td>${esc(i.product_name)}</td><td class="num">${i.quantity}</td><td class="num">${fmt(i.line_total)}</td></tr>`).join('')}</tbody></table><div class="line"></div>
    <table><tr><td>Total</td><td class="num b">${fmt(sale.total)}</td></tr><tr><td>Paid</td><td class="num">${fmt(sale.paid)}</td></tr><tr><td class="due">Due</td><td class="num due">${fmt(sale.balance)}</td></tr></table><div class="line"></div>
    <div class="center" style="font-size:10px;margin-top:6px;position:relative;z-index:1">Thank you!<br>Visit Again<br><br><b>Software Made by MS Tech</b><br>📞 03099100546</div>
    <script>window.onload=function(){window.print();setTimeout(()=>window.close(),800);}<\/script></body></html>`);
  w.document.close();
}
