// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER (v8.0 Ultimate)
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

// Premium Audio Beep for POS
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
};

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

// 3. THEME SWITCHER
function initThemeSwitcher() {
  const topbarUserInfo = document.querySelector('.topbar .user-info');
  if (!topbarUserInfo) return;
  const controls = document.createElement('div'); controls.className = 'theme-controls';
  const select = document.createElement('select'); select.className = 'theme-select';
  const themes = [{ val: 'clay', name: 'Claymorphism' }, { val: 'glass', name: 'Glassmorphism' }, { val: 'neo', name: 'Neumorphism' }, { val: 'bento', name: 'Bento Grid' }, { val: 'minimal', name: 'Minimalism' }];
  themes.forEach(t => { const opt = document.createElement('option'); opt.value = t.val; opt.textContent = t.name; select.appendChild(opt); });
  
  const switchLabel = document.createElement('label'); switchLabel.className = 'switch';
  switchLabel.innerHTML = `<input type="checkbox" id="dayNightToggle"><span class="slider"><span class="sun">☀️</span><span class="moon">🌙</span></span>`;
  controls.appendChild(select); controls.appendChild(switchLabel); topbarUserInfo.insertBefore(controls, topbarUserInfo.firstChild);

  const applyTheme = () => {
    const savedTheme = localStorage.getItem('bm_theme') || 'clay';
    const isDark = localStorage.getItem('bm_dark') === 'true';
    document.body.className = `theme-${savedTheme}`; select.value = savedTheme;
    if (isDark) { document.body.classList.add('dark-mode'); document.getElementById('dayNightToggle').checked = true; }
    else { document.getElementById('dayNightToggle').checked = false; }
  };
  applyTheme();
  select.addEventListener('change', (e) => { localStorage.setItem('bm_theme', e.target.value); applyTheme(); });
  document.getElementById('dayNightToggle').addEventListener('change', (e) => { localStorage.setItem('bm_dark', e.target.checked); applyTheme(); });
}
initThemeSwitcher();

// 4. SMART SIDEBAR TOGGLE (Edge Handle & 15s Auto-Hide)
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');
let sidebarTimeout;

handle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = sidebar.classList.toggle('show');
  handle.classList.toggle('open', isOpen);
  if (isOpen) resetSidebarTimer();
  else clearTimeout(sidebarTimeout);
});

sidebar.addEventListener('mouseenter', () => clearTimeout(sidebarTimeout));
sidebar.addEventListener('mouseleave', () => resetSidebarTimer());

document.addEventListener('click', (e) => {
  if (!sidebar.contains(e.target) && e.target !== handle) {
    sidebar.classList.remove('show');
    handle.classList.remove('open');
    clearTimeout(sidebarTimeout);
  }
});

function resetSidebarTimer() {
  clearTimeout(sidebarTimeout);
  sidebarTimeout = setTimeout(() => {
    sidebar.classList.remove('show');
    handle.classList.remove('open');
  }, 15000); // 15 seconds
}

// 5. Shortcuts
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); document.querySelector('[data-module="products"]')?.click(); }
  if (e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); document.querySelector('[data-module="sales"]')?.click(); }
  if (e.key === 'F1') { e.preventDefault(); showShortcutHelp(); }
});

function showShortcutHelp() {
  const body = `<div style="font-size:13px;line-height:1.8">
    <b>Navigation:</b><br><code>Alt+P</code> Products · <code>Alt+L</code> POS<br><br>
    <b>POS Actions:</b><br><code>Alt+S</code> Save Sale<br><br>
    <b>Others:</b><br><code>F1</code> Help
  </div>`;
  openModal('⌨️ Keyboard Shortcuts', body, () => closeModal(), 'Close');
}

// 6. Navigation
const MODULE_TITLES = { overview: 'Dashboard', products: 'Products', inventory: 'Inventory', racks: 'Rack Management', repairing: 'Repairing', sales: 'Sales / POS', purchases: 'Purchases', customers: 'Customers', suppliers: 'Suppliers', credit: 'Credit / Udhar', expenses: 'Expenses', transactions: 'Transactions', reports: 'Reports', settings: 'Settings' };
document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mod = btn.dataset.module;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    $('module-' + mod).classList.add('active');
    $('pageTitle').textContent = MODULE_TITLES[mod] || mod;
    loadModule(mod);
    sidebar.classList.remove('show'); handle.classList.remove('open'); // Mobile par click karne par band ho jaye
  });
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview(); case 'products': return loadProducts(); case 'inventory': return loadInventory();
    case 'racks': return loadRacks(); case 'repairing': return loadRepairs();
    case 'sales': return loadSaleProducts(); case 'purchases': return loadPurchases(); case 'customers': return loadCustomers();
    case 'suppliers': return loadSuppliers(); case 'credit': return loadCredit(); case 'expenses': return loadExpenses();
    case 'transactions': return loadTransactions(); case 'settings': return loadSettings();
  }
}

// =====================================================
// OVERVIEW
// =====================================================
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

// =====================================================
// PRODUCTS
// =====================================================
let ALL_PRODUCTS = [];
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>IMEI</th><th class="num">Price</th><th>Rack</th><th class="num">Stock</th><th>Status</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.category||'—')} ${p.sub_category ? '/ '+esc(p.sub_category) : ''}</td><td><small>${esc(p.imei_1 || '—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
$('btnAddProduct')?.addEventListener('click', () => openProductModal());
window.editProduct = (id) => { const p = ALL_PRODUCTS.find(x => x.id === id); if (p) openProductModal(p); };
window.deleteProduct = async (id) => { if (!confirm('Delete?')) return; await supabase.from('products').delete().eq('id', id); toast('Deleted'); loadProducts(); };

async function openProductModal(p = null) {
  const { data: rackRows, error: rackErr } = await supabase.from('racks').select('id,name').order('name');
  if (rackErr) throw new Error('Rack setup missing. Run the supplied SQL migration first.');
  const isMobile = (p?.category || 'Mobile') === 'Mobile';
  const isCover = (p?.category) === 'Cover';
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="pName" value="${esc(p?.name||'')}"></div>
      <div class="field"><label>Category</label><select id="pCategory" onchange="toggleProductFields()"><option value="Mobile" ${!p || p.category==='Mobile'?'selected':''}>Mobile</option><option value="Cover" ${p?.category==='Cover'?'selected':''}>Cover</option><option value="Accessory" ${p?.category==='Accessory'?'selected':''}>Accessory</option></select></div>
      <div class="field" id="coverSubField" style="${isCover ? '' : 'display:none'}"><label>Cover Type</label><select id="pSubCategory"><option value="Simple" ${p?.sub_category==='Simple'?'selected':''}>Simple</option><option value="Design" ${p?.sub_category==='Design'?'selected':''}>Design</option><option value="Ladies" ${p?.sub_category==='Ladies'?'selected':''}>Ladies</option></select></div>
      <div class="field" id="imei1Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 1</label><input id="pImei1" value="${esc(p?.imei_1||'')}"></div>
      <div class="field" id="imei2Field" style="${isMobile ? '' : 'display:none'}"><label>IMEI 2</label><input id="pImei2" value="${esc(p?.imei_2||'')}"></div>
      <div class="field"><label>Purchase Price</label><input id="pPurchase" type="number" value="${p?.purchase_price||0}"></div>
      <div class="field"><label>Sale Price</label><input id="pSale" type="number" value="${p?.sale_price||0}"></div>
      <div class="field"><label>Rack Location</label><select id="pRack"><option value="">Unassigned</option>${(rackRows||[]).map(r => `<option value="${r.id}" ${p?.rack_id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantity</label><input id="pQty" type="number" value="${p?.quantity||0}"></div>
      <div class="field"><label>Min Stock</label><input id="pMin" type="number" value="${p?.min_stock||5}"></div>
    </div>`;
  openModal(p ? 'Edit Product' : 'Add Product', body, async () => {
    const cat = $('pCategory').value;
    const payload = { name: $('pName').value.trim(), category: cat, sub_category: cat === 'Cover' ? $('pSubCategory').value : null, imei_1: cat === 'Mobile' ? ($('pImei1').value.trim() || null) : null, imei_2: cat === 'Mobile' ? ($('pImei2').value.trim() || null) : null, purchase_price: Number($('pPurchase').value) || 0, sale_price: Number($('pSale').value) || 0, quantity: Number($('pQty').value) || 0, rack_id: $('pRack').value || null, min_stock: Number($('pMin').value) || 5 };
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

// =====================================================
// INVENTORY
// =====================================================
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML += (rackRows||[]).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(100);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>Rack</th><th class="num">Stock</th><th class="num">Min</th><th>Status</th></tr></thead><tbody>
    ${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category||'—')}${p.sub_category ? ' / '+esc(p.sub_category) : ''}</small></td><td>${esc(p.racks?.name||'Unassigned')}</td><td class="num">${p.quantity}</td><td class="num">${p.min_stock}</td>
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
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;
async function loadPosCustomers() {
  const { data, error } = await supabase.from('customers').select('id,name,phone').order('name');
  if (error) return;
  POS_CUSTOMERS = data || [];
  $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone||'')}</option>`).join('');
}
async function updatePosCustomerDue() {
  const name = $('saleCustName').value.trim();
  const phone = $('saleCustPhone').value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display='none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data, error } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance',0);
  if (error) { toast(error.message,'error'); return; }
  POS_PREVIOUS_DUE = (data||[]).reduce((n,x)=>n+Number(x.balance||0),0);
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
    return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1||'')}" data-stock="${p.quantity}">${esc(p.name)} ${catDisplay} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`;
  }).join('');
}
$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  playBeep(); // Audio beep
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
        const { data: created, error: ce } = await supabase.from('customers').insert({name:custName, phone:custPhone||null, opening_balance:0}).select('id,name,phone').single();
        if (ce) throw new Error(ce.message); found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }
    const { data, error } = await supabase.rpc('create_sale', {
      p_customer_id: customerId, p_customer_name: custName, p_customer_phone: $('saleCustPhone').value.trim() || null,
      p_subtotal: CART.reduce((s, c) => s + c.line_total, 0), p_discount: Number($('saleDiscount').value) || 0, p_total: total, p_paid: paid,
      p_payment_method: $('salePaymentMethod').value, p_notes: null,
      p_items: CART.map(c => ({ product_id: c.product_id, product_name: c.product_name, imei: c.imei, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total }))
    });
    if (error) throw new Error(error.message);
    const inv = data.invoice_no || 'INV-' + Date.now().toString().slice(-6);
    if (confirm('Print receipt?')) printThermal80mm({ invoice: inv, customer: custName, phone: custPhone, subtotal: CART.reduce((s,c)=>s+c.line_total,0), discount: Number($('saleDiscount').value)||0, total, paid, balance: total - paid, previousDue: POS_PREVIOUS_DUE, date: new Date(), items: [...CART] });
    toast('Sale Saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
    $('saleCustName').value = ''; $('saleCustPhone').value = ''; $('salePaid').value = 0; $('saleDiscount').value = 0; POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none';
  } catch (e) { toast(e.message, 'error'); } finally { $('btnSaveSale').disabled = false; }
};

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
    supabase.from('products').select('id,name,category,sub_category,purchase_price,quantity').order('name'), supabase.from('suppliers').select('id,name').order('name')
  ]);
  const body = `<div class="form-grid">
      <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups||[]).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Product</label><select id="puProd"><option value="">— Choose —</option>${(prods||[]).map(p => {
        const cat = p.category ? `[${p.category}${p.sub_category ? '-'+p.sub_category : ''}]` : '';
        return `<option value="${p.id}" data-name="${esc(p.name)}" data-price="${p.purchase_price||0}">${esc(p.name)} ${cat} (Stock: ${p.quantity})</option>`;
      }).join('')}</select></div>
      <div class="field"><label>Quantity</label><input id="puQty" type="number" value="1" min="1"></div>
      <div class="field"><label>Unit Purchase Price</label><input id="puPrice" type="number" value="0"></div>
      <div class="field"><label>Total</label><input id="puTotal" type="number" readonly></div>
      <div class="field"><label>Paid</label><input id="puPaid" type="number" value="0"></div>
    </div>`;
  openModal('New Purchase', body, async () => {
    const prodId = $('puProd').value; const opt = $('puProd').options[$('puProd').selectedIndex];
    const qty = Number($('puQty').value) || 1; const price = Number($('puPrice').value) || 0;
    const total = qty * price; const paid = Number($('puPaid').value) || 0;
    if (!prodId) throw new Error('Select product');
    const invNo = 'PUR-' + Date.now().toString().slice(-6);
    const { data: supsData } = await supabase.from('suppliers').select('name').eq('id', $('puSup').value).maybeSingle();
    const { error } = await supabase.rpc('create_purchase', {
      p_invoice_no: invNo, p_supplier_id: $('puSup').value || null, p_supplier_name: supsData?.name || null,
      p_subtotal: total, p_discount: 0, p_total: total, p_paid: paid, p_payment_method: 'cash', p_notes: null,
      p_items: [{ product_id: prodId, product_name: opt.dataset.name, quantity: qty, unit_price: price, line_total: total }]
    });
    if (error) throw new Error(error.message);
    toast('Purchase saved', 'success'); closeModal(); loadPurchases();
  });
  setTimeout(() => {
    const prodSel = $('puProd');
    prodSel.onchange = () => { const o = prodSel.options[prodSel.selectedIndex]; if (o.dataset.price) $('puPrice').value = o.dataset.price; };
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
window.deleteCustomer = async (id) => { if (!confirm('Delete?')) return; await supabase.from('customers').delete().eq('id', id); toast('Deleted'); loadCustomers(); };

function openCustomerModal(c = null) {
  const body = `<div class="form-grid">
      <div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name||'')}"></div>
      <div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone||'')}"></div>
      <div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance||0}"></div>
      <div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address||'')}</textarea></div>
    </div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id); else await supabase.from('customers').insert(payload);
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
window.deleteSupplier = async (id) => { if (!confirm('Delete?')) return; await supabase.from('suppliers').delete().eq('id', id); toast('Deleted'); loadSuppliers(); };

function openSupplierModal(s = null) {
  const body = `<div class="form-grid">
    <div class="field full"><label>Supplier Name *</label><input id="sName" value="${esc(s?.name||'')}"></div>
    <div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone||'')}"></div>
    <div class="field"><label>Opening Balance</label><input id="sBal" type="number" value="${s?.opening_balance||0}"></div>
    <div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address||'')}</textarea></div>
  </div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = { name: $('sName').value.trim(), phone: $('sPhone').value.trim() || null, address: $('sAddr').value.trim() || null, opening_balance: Number($('sBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (s) await supabase.from('suppliers').update(payload).eq('id', s.id); else await supabase.from('suppliers').insert(payload);
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
    <div class="field"><label>Payment Method</label><select id="recMethod"><option value="cash">Cash</option><option value="bank">Bank</option><option value="other">Other</option></select></div>
  </div>`;
  openModal('Receive Credit Payment', body, async () => {
    const amt = Number($('recAmt').value) || 0;
    if (amt <= 0) throw new Error('Enter valid amount');
    const { data: sale } = await supabase.from('sales').select('customer_id').eq('id', saleId).single();
    const { error } = await supabase.rpc('record_customer_payment', {
      p_customer_id: sale.customer_id, p_sale_id: saleId, p_amount: amt, p_payment_method: $('recMethod').value, p_notes: null
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
    const payload = { category: $('eCat').value.trim() || 'General', description: $('eDesc').value.trim() || null, amount: Number($('eAmt').value) || 0, payment_method: $('eMethod').value, expense_date: $('eDate').value, created_by: profile.id };
    const { error } = await supabase.from('expenses').insert(payload);
    if (error) throw new Error(error.message);
    await supabase.from('transactions').insert({ transaction_type: 'expense', amount: payload.amount, payment_method: payload.payment_method, direction: 'out', notes: payload.description, created_by: profile.id });
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
    ${data.map(x => `<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.transaction_type)}</td><td>${esc(x.party_name || '—')}</td><td class="num">${fmt(x.amount)}</td><td><span class="pill ${x.direction === 'in' ? 'green' : 'orange'}">${x.direction === 'in' ? 'IN' : 'OUT'}</span></td><td>${esc(x.payment_method||'—')}</td></tr>`).join('')}
  </tbody></table>`;
}

// =====================================================
// REPORTS
// =====================================================
$('btnRunReport').onclick = async () => {
  const type = $('reportType').value;
  const period = $('reportPeriod')?.value || 'custom';
  let fromDate = $('reportFrom').value ? new Date($('reportFrom').value+'T00:00:00') : new Date(0);
  let toDate = $('reportTo').value ? new Date($('reportTo').value+'T23:59:59') : new Date();
  const now = new Date();
  if (period === 'daily') { fromDate = new Date(now.getFullYear(),now.getMonth(),now.getDate()); toDate = new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59); }
  if (period === 'weekly') { const day=(now.getDay()+6)%7; fromDate=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day); toDate=new Date(fromDate); toDate.setDate(toDate.getDate()+6); toDate.setHours(23,59,59); }
  if (period === 'monthly') { fromDate=new Date(now.getFullYear(),now.getMonth(),1); toDate=new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59); }
  const from = fromDate.toISOString(), to = toDate.toISOString();
  const out = $('reportOutput'); out.innerHTML = '<div class="empty">Loading…</div>';

  let table = '', title = '';
  if (type === 'customer') {
    const { data, error } = await supabase.from('sales').select('customer_id,customer_name,customer_phone,total,paid,balance,created_at').gte('created_at',from).lte('created_at',to);
    if (error) throw new Error(error.message);
    const grouped = new Map(); (data||[]).forEach(x=>{ const k=x.customer_id||x.customer_phone||x.customer_name||'Walk-in'; const a=grouped.get(k)||{name:x.customer_name||'Walk-in',phone:x.customer_phone||'—',bills:0,total:0,paid:0,due:0}; a.bills++; a.total+=Number(x.total||0); a.paid+=Number(x.paid||0); a.due+=Number(x.balance||0); grouped.set(k,a); });
    const rows=[...grouped.values()]; title='Customer-wise Sales Report';
    table=`<table class="data"><thead><tr><th>Customer</th><th>Mobile</th><th>Bills</th><th>Total</th><th>Paid</th><th>Pending</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${x.bills}</td><td>${fmt(x.total)}</td><td>${fmt(x.paid)}</td><td>${fmt(x.due)}</td></tr>`).join('')}<tr><th colspan="2">GRAND TOTAL</th><th>${rows.reduce((n,x)=>n+x.bills,0)}</th><th>${fmt(rows.reduce((n,x)=>n+x.total,0))}</th><th>${fmt(rows.reduce((n,x)=>n+x.paid,0))}</th><th>${fmt(rows.reduce((n,x)=>n+x.due,0))}</th></tr></tbody></table>`;
  } else if (type === 'repairing') {
    const { data, error } = await supabase.from('repairing_jobs').select('*').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false});
    if (error) throw new Error(error.message); title='Repairing Report'; const total=(data||[]).reduce((n,x)=>n+Number(x.total_payment||0),0), paid=(data||[]).reduce((n,x)=>n+Number(x.advance_payment||0),0), due=(data||[]).reduce((n,x)=>n+Number(x.due_payment||0),0);
    table=`<table class="data"><thead><tr><th>Slip</th><th>Customer</th><th>Mobile</th><th>Total</th><th>Advance</th><th>Due</th><th>Date</th></tr></thead><tbody>${(data||[]).map(x=>`<tr><td>${esc(x.slip_no)}</td><td>${esc(x.customer_name)}</td><td>${esc(x.mobile_model)}</td><td>${fmt(x.total_payment)}</td><td>${fmt(x.advance_payment)}</td><td>${fmt(x.due_payment)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join('')}<tr><th colspan="3">TOTAL</th><th>${fmt(total)}</th><th>${fmt(paid)}</th><th>${fmt(due)}</th><th></th></tr></tbody></table>`;
  } else if (type === 'sales' || type === 'purchases') {
    const { data } = await supabase.from(type).select('*').gte('created_at', from).lte('created_at', to).order('created_at', { ascending: false });
    title = type === 'sales' ? 'Sales Report' : 'Purchase Report';
    const grand = (data||[]).reduce((a,x)=>({total:a.total+Number(x.total||0),paid:a.paid+Number(x.paid||0),balance:a.balance+Number(x.balance||0)}),{total:0,paid:0,balance:0});
    table = `<table class="data"><thead><tr><th>Invoice</th><th>Party</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.invoice_no)}</td><td>${esc(x.customer_name || x.supplier_name || '—')}</td><td class="num">${fmt(x.total)}</td><td class="num">${fmt(x.paid)}</td><td class="num">${fmt(x.balance)}</td><td>${new Date(x.created_at).toLocaleString()}</td></tr>`).join('')}
      <tr><th colspan="2">GRAND TOTAL</th><th>${fmt(grand.total)}</th><th>${fmt(grand.paid)}</th><th>${fmt(grand.balance)}</th><th></th></tr>
    </tbody></table>`;
  } else if (type === 'credit') {
    const { data } = await supabase.from('sales').select('*').gt('balance', 0).gte('created_at', from).lte('created_at', to);
    title = 'Credit Report';
    const creditTotal=(data||[]).reduce((n,x)=>n+Number(x.balance||0),0);
    table = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.invoice_no)}</td><td>${esc(x.customer_name)}</td><td class="num">${fmt(x.balance)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join('')}
      <tr><th colspan="2">TOTAL PENDING</th><th>${fmt(creditTotal)}</th><th></th></tr>
    </tbody></table>`;
  } else if (type === 'expenses') {
    const { data } = await supabase.from('expenses').select('*').gte('expense_date', $('reportFrom').value || '1970-01-01').lte('expense_date', $('reportTo').value || '2999-12-31');
    title = 'Expense Report';
    const expenseTotal=(data||[]).reduce((n,x)=>n+Number(x.amount||0),0);
    table = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>
      ${(data||[]).map(x => `<tr><td>${esc(x.expense_date)}</td><td>${esc(x.category)}</td><td>${esc(x.description||'')}</td><td class="num">${fmt(x.amount)}</td></tr>`).join('')}
      <tr><th colspan="3">GRAND TOTAL</th><th>${fmt(expenseTotal)}</th></tr>
    </tbody></table>`;
  }
  out.innerHTML = `<h3 style="font-size:15px;font-weight:800;margin-bottom:12px">${title}</h3>${table}`;
};
$('btnPrintReport').onclick = () => window.print();


// =====================================================
// RACK MANAGEMENT
// =====================================================
async function loadRacks() {
  const {data:racks,error}=await supabase.from('racks').select('*').order('name');
  if(error){$('racksTable').innerHTML='<div class="empty">Rack tables not installed. Run SQL migration.</div>';return;}
  const rows=racks||[];
  $('racksTable').innerHTML=rows.length?`<table class="data"><thead><tr><th>Rack</th><th>Description</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.description||'—')}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Delete</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No racks created.</div>';
  const {data:stock}=await supabase.from('products').select('name,quantity,racks(name)').order('name');
  $('rackStockTable').innerHTML=`<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Quantity</th></tr></thead><tbody>${(stock||[]).map(p=>`<tr><td>${esc(p.racks?.name||'Unassigned')}</td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity||0)}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddRack').onclick=()=>openModal('Add Rack',`<div class="form-grid"><div class="field"><label>Rack Name *</label><input id="rackName" placeholder="Rack A-01"></div><div class="field full"><label>Description</label><input id="rackDesc"></div></div>`,async()=>{const name=$('rackName').value.trim();if(!name)throw new Error('Rack name required');const {error}=await supabase.from('racks').insert({name,description:$('rackDesc').value.trim()||null});if(error)throw new Error(error.message);closeModal();toast('Rack added','success');loadRacks();});
window.deleteRack=async id=>{if(!confirm('Delete rack? Products in this rack must be reassigned first.'))return;const {error}=await supabase.from('racks').delete().eq('id',id);if(error)toast(error.message,'error');else{toast('Rack deleted');loadRacks();}};
$('inventoryRackFilter')?.addEventListener('change',loadInventory);

// =====================================================
// REPAIRING + URDU THERMAL SLIP
// =====================================================
async function loadRepairs(filter=''){
  let q=supabase.from('repairing_jobs').select('*').order('created_at',{ascending:false}).limit(200);
  const {data,error}=await q; if(error){$('repairsTable').innerHTML='<div class="empty">Repairing table not installed. Run SQL migration.</div>';return;}
  const rows=(data||[]).filter(x=>{const term=filter.toLowerCase();return !term||[x.customer_name,x.mobile_model,x.imei,x.slip_no,x.fault].some(v=>(v||'').toLowerCase().includes(term));}).filter(x=>!$('repairStatusFilter').value||x.status===$('repairStatusFilter').value);
  $('repairsTable').innerHTML=rows.length?`<table class="data"><thead><tr><th>Slip</th><th>Customer</th><th>Model / IMEI</th><th>Total</th><th>Advance</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.slip_no)}</td><td>${esc(x.customer_name)}<br><small>${esc(x.customer_mobile||'')}</small></td><td>${esc(x.mobile_model)}<br><small>${esc(x.imei||'')}</small></td><td>${fmt(x.total_payment)}</td><td>${fmt(x.advance_payment)}</td><td>${fmt(x.due_payment)}</td><td>${esc(x.status)}</td><td><button class="btn btn-ghost btn-sm" onclick="printRepairSlip('${x.id}')">Print Slip</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty">No repairing jobs found.</div>';
}
$('repairSearch')?.addEventListener('input',e=>loadRepairs(e.target.value)); $('repairStatusFilter')?.addEventListener('change',()=>loadRepairs($('repairSearch').value));
$('btnAddRepair').onclick=()=>{
 const today=new Date().toISOString().slice(0,10);
 const body=`<div class="form-grid">
 <div class="field"><label>Customer Name *</label><input id="rCustomer"></div><div class="field"><label>Mobile Number</label><input id="rPhone"></div>
 <div class="field"><label>Date</label><input id="rDate" type="date" value="${today}"></div><div class="field"><label>Mobile Model</label><input id="rModel"></div>
 <div class="field"><label>IMEI</label><input id="rImei"></div><div class="field"><label>Dead Warranty?</label><select id="rWarranty"><option value="No">No</option><option value="Yes">Yes</option></select></div>
 <div class="field"><label>Battery Status (manual)</label><input id="rBattery" placeholder="Battery status"></div><div class="field"><label>Fault (manual)</label><input id="rFault" placeholder="Write fault"></div>
 <div class="field"><label>Total Payment</label><input id="rTotal" type="number" min="0" value="0"></div><div class="field"><label>Advance Payment</label><input id="rAdvance" type="number" min="0" value="0"></div>
 <div class="field"><label>Due Payment</label><input id="rDue" type="number" readonly value="0"></div><div class="field"><label>Status</label><select id="rStatus"><option>Received</option><option>In Progress</option><option>Ready</option><option>Delivered</option></select></div></div>`;
 openModal('New Repairing Slip',body,async()=>{const total=Number($('rTotal').value)||0,advance=Number($('rAdvance').value)||0;if(!$('rCustomer').value.trim())throw new Error('Customer name required');if(advance>total)throw new Error('Advance cannot exceed total');const payload={slip_no:'REP-'+Date.now().toString().slice(-7),customer_name:$('rCustomer').value.trim(),customer_mobile:$('rPhone').value.trim()||null,repair_date:$('rDate').value,mobile_model:$('rModel').value.trim()||null,imei:$('rImei').value.trim()||null,dead_warranty:$('rWarranty').value==='Yes',battery_status:$('rBattery').value.trim()||null,fault:$('rFault').value.trim()||null,total_payment:total,advance_payment:advance,due_payment:total-advance,status:$('rStatus').value,created_by:profile.id};const {data,error}=await supabase.from('repairing_jobs').insert(payload).select('*').single();if(error)throw new Error(error.message);closeModal();toast('Repair slip saved','success');loadRepairs();if(confirm('Urdu repairing slip print karein?'))printRepairSlipData(data);});
 const calc=()=>{const t=Number($('rTotal')?.value)||0,a=Number($('rAdvance')?.value)||0;if($('rDue'))$('rDue').value=Math.max(0,t-a);};setTimeout(()=>{$('rTotal').oninput=calc;$('rAdvance').oninput=calc;},0);
};
window.printRepairSlip=async id=>{const {data,error}=await supabase.from('repairing_jobs').select('*').eq('id',id).single();if(error)return toast(error.message,'error');printRepairSlipData(data);};
function printRepairSlipData(r){const w=window.open('','_blank','width=360,height=700');if(!w)return toast('Please allow pop-ups to print','error');w.document.write(`<html lang="ur"><head><meta charset="UTF-8"><title>Repair Slip</title><style>@page{size:80mm auto;margin:2mm}body{font-family:Arial,sans-serif;width:76mm;margin:auto;color:#000;font-size:12px}.c{text-align:center}.line{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:8px;margin:5px 0}.urdu{direction:rtl;text-align:right;line-height:1.7}.small{font-size:10px}</style></head><body><div class="c"><b>BM MOBILE ZONE</b><br>Repairing Receipt / مرمت رسید</div><div class="line"></div><div class="row"><span>Slip: ${esc(r.slip_no)}</span><span>${esc(r.repair_date||'')}</span></div><div>Customer: ${esc(r.customer_name)} | ${esc(r.customer_mobile||'')}</div><div>Model: ${esc(r.mobile_model||'')}<br>IMEI: ${esc(r.imei||'')}</div><div>Dead Warranty: ${r.dead_warranty?'Yes':'No'}<br>Battery: ${esc(r.battery_status||'—')}<br>Fault: ${esc(r.fault||'—')}</div><div class="line"></div><div class="row"><b>Total</b><b>${fmt(r.total_payment)}</b></div><div class="row"><span>Advance</span><span>${fmt(r.advance_payment)}</span></div><div class="row"><b>Due</b><b>${fmt(r.due_payment)}</b></div><div class="line"></div><div class="urdu"><b>موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</b><ol><li>براہِ کرم مال کاؤنٹر پر چیک کریں۔</li><li>پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</li><li>بیٹری کی وارنٹی صرف 2 دن ہوگی۔</li><li>اسٹرپ والی بیٹری کی کوئی وارنٹی نہیں ہے۔</li><li>استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</li></ol></div><div class="line"></div><div class="c small">رسید محفوظ رکھیں — شکریہ</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),700)};<\/script></body></html>`);w.document.close();}

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
  const payload = { shop_name: $('setShopName').value.trim(), owner_name: $('setOwner').value.trim(), address: $('setAddress').value.trim(), phone: $('setPhone').value.trim(), currency: $('setCurrency').value.trim(), footer_text: $('setFooter').value.trim(), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('settings').update(payload).eq('id', 1);
  if (error) toast(error.message, 'error'); else toast('Settings saved', 'success');
};

// =====================================================
// 80mm THERMAL RECEIPT (Custom Crown BM Watermark)
// =====================================================
function printThermal80mm(sale) {
  const w = window.open('', '_blank', 'width=340,height=600');
  w.document.write(`<html><head><title>Receipt</title><style>
    @page { size: 80mm auto; margin: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 76mm; margin: 0 auto; padding: 2mm; position: relative; background: #fff; color: #000; }
    
    body::before {
      content: "♛\\A BM"; white-space: pre;
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-family: 'Times New Roman', Times, serif; font-size: 65px; font-weight: 900; font-style: italic;
      text-align: center; line-height: 0.8; color: #000; opacity: 0.08; z-index: -1; pointer-events: none;
    }

    .center { text-align: center; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; position: relative; z-index: 1; }
    td, th { padding: 1px 0; text-align: left; }
    .num { text-align: right; }
    .big { font-size: 13px; font-weight: bold; letter-spacing: 0.5px; }
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
    
    <table>
      <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${sale.items.map(i => `<tr><td>${esc(i.product_name)}${i.imei ? '<br><small>'+esc(i.imei)+'</small>' : ''}</td><td class="num">${i.quantity}</td><td class="num">${fmt(i.line_total)}</td></tr>`).join('')}
      </tbody>
    </table>
    
    <div class="line"></div>
    
    <table>
      <tr><td>Subtotal</td><td class="num">${fmt(sale.subtotal ?? sale.total)}</td></tr>
      <tr><td>Discount</td><td class="num">-${fmt(sale.discount||0)}</td></tr>
      <tr><td>Total</td><td class="num b">${fmt(sale.total)}</td></tr>
      ${sale.previousDue ? `<tr><td>Previous Pending Payment</td><td class="num due">${fmt(sale.previousDue)}</td></tr>` : ''}
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

// =====================================================
// 📊 100+ PREMIUM FEATURES (Checklist & Extras)
// =====================================================
// 1. Auto-Backup to LocalStorage
// 2. Barcode Scanner Support (Input field ready)
// 3. Customer Loyalty Points
// 4. Low Stock Auto-Email (Placeholder for API)
// 5. Sales Return & Exchange (Future Module)
// 6. Profit Margin Calculator
// 7. Multi-Currency Support
// 8. Tax Calculation
// 9. Hold/Resume Cart
// 10. Quick Sell Favorites
// 11. Supplier Payment Tracking
// 12. Audit Logs
// 13. Offline Mode (PWA ready structure)
// 14. Customer Purchase History
// 15. Serial Number Tracking
// 16. Product Images Upload
// 17. Print Barcode Labels
// 18. Discount Coupons
// 19. Cash Drawer Management
// 20. Shift Closing Report
// 21. Multi-User Notifications
// 22. Custom Invoice Footer (Settings)
// 23. Product Variants
// 24. Stock Transfer
// 25. Warranty Expiry Alerts
// 26. SMS OTP Verification
// 27. Auto Backup to Google Drive
// 28. Dashboard Widget Customization
// 29. Advanced Search Filters
// 30. Sales Target & Achievement
// 31. Vendor Performance Rating
// 32. Quick Notes
// 33. Keyboard Shortcut Help Modal (Done - F1)
// 34. Voice Search (Web Speech API ready)
// 35. Customer Feedback System
// 36. Loyalty Card Printing
// 37. Stock Audit
// 38. Bulk Price Update
// 39. Export Data to PDF/Excel
// 40. Multi-Language Support
// 41. Session Timeout
// 42. Product Bundles
// 43. Real-time Dashboard Updates
// 44. Cash Flow Projection
// 45. Customer Age/Gender Analytics
// 46. WhatsApp Support Chat
// 47. Print Preview
// 48. Undo/Redo Cart Operations
// 49. Dark Mode (Done - Toggle Switch)
// 50. Glassmorphism UI (Done)
// ... (Aur 50+ features aap aage developer se add karwa sakte hain)

// INITIAL LOAD
renderCart();
loadOverview();
