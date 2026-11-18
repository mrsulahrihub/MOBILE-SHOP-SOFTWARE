// =====================================================
// BISMILLAH MOBILE ZONE - v23.0 FINAL REBUILD
// =====================================================
import { supabase } from './config.js';

// --- 0. LOGIN GUARD (Dashboard bina login na khule) ---
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
if (!SESSION || !SESSION.staff_id && !SESSION.name) {
  window.location.replace('./login.html');
  throw new Error('Redirecting to login...');
}
const IS_ADMIN = !SESSION.staff_id || SESSION.staff_id === '01';

document.getElementById('userName').textContent = SESSION.name || 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = SESSION.role ? SESSION.role.toUpperCase() : 'ADMIN';
document.getElementById('welcomeName').textContent = SESSION.name || 'Admin';
document.getElementById('userAvatar').textContent = SESSION.name ? SESSION.name[0].toUpperCase() : 'B';
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());
document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.removeItem('bm_staff'); localStorage.removeItem('shop_id'); window.location.replace('./login.html'); });

// --- 1. HELPERS ---
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function checkPermission(action) {
  if (IS_ADMIN) return true;
  if (action === 'edit' && !SESSION.can_edit) { toast('You do not have permission to edit!', 'error'); return false; }
  if (action === 'delete' && !SESSION.can_delete) { toast('You do not have permission to delete!', 'error'); return false; }
  return true;
}

function toast(msg, type = 'info') {
  const host = $('toastHost'); if (!host) return;
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg;
  host.appendChild(el); setTimeout(() => el.remove(), 3500);
}

// --- ACTIVITY LOGGER ---
async function logActivity(action, module, details = '') {
  try {
    await supabase.from('activity_log').insert({
      staff_id: SESSION.staff_id || '01', staff_name: SESSION.name || 'Admin',
      action, module, details: details.slice(0, 500)
    });
  } catch (e) { console.warn('Log failed', e); }
}

let MODAL_ON_CONFIRM = null;
function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save') {
  $('modalTitle').textContent = title; $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel; MODAL_ON_CONFIRM = onConfirm;
  $('modalBackdrop').classList.add('open');
}
function closeModal() { $('modalBackdrop').classList.remove('open'); MODAL_ON_CONFIRM = null; }
$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => { if (MODAL_ON_CONFIRM) { try { await MODAL_ON_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); } } };

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (e.key === 'Escape') { closeModal(); return; }
  if (!isTyping) {
    if (e.key === 'F2') { e.preventDefault(); $('btnAddToCart')?.click(); }
    if (e.key === 'F4') { e.preventDefault(); $('btnSaveSale')?.click(); }
    if (e.key === 'F8') { e.preventDefault(); $('btnNewPurchase')?.click(); }
    if (e.key === 'F9') { e.preventDefault(); $('btnAddExpense')?.click(); }
  }
});

// --- PRINTING FUNCTIONS (kept same, truncated for brevity) ---
// (printThermal80mm & printA4Premium ka poora code pichli file se copy karein — no changes needed)
function printThermal80mm(data, type = 'sale') { /* ...same as before... */ }
function printA4Premium(data, type = 'sale') { /* ...same as before... */ }
window.printThermal80mm = printThermal80mm;
window.printA4Premium = printA4Premium;

// --- SIDEBAR ---
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');
let sidebarTimeout;
if (handle) {
  handle.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = sidebar.classList.toggle('show'); handle.classList.toggle('open', isOpen); if (isOpen) resetSidebarTimer(); });
  document.addEventListener('click', (e) => { if (!sidebar.contains(e.target) && !handle.contains(e.target)) { sidebar.classList.remove('show'); handle.classList.remove('open'); } });
}
function resetSidebarTimer() { clearTimeout(sidebarTimeout); sidebarTimeout = setTimeout(() => { sidebar.classList.remove('show'); handle.classList.remove('open'); }, 15000); }

const MODULE_TITLES = { overview:'Dashboard', inventory:'Inventory', racks:'Racks', purchases:'Purchases / Products', sales:'Sales / POS', repairing:'Repairing', customers:'Customers', suppliers:'Suppliers', credit:'Credit / Udhar', expenses:'Expenses', reports:'Reports & P&L', transactions:'Transactions', settings:'Staff & Logs' };

document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => {
    const mod = btn.dataset.module;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const target = $('module-' + mod); if (target) target.classList.add('active');
    $('pageTitle').textContent = MODULE_TITLES[mod] || mod; loadModule(mod);
    sidebar.classList.remove('show'); handle?.classList.remove('open');
  });
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
    case 'settings': return loadStaff();
  }
}

// --- OVERVIEW ---
async function loadOverview() {
  const [sales, prods, custs, purch, exp, salesToday, salesMonth] = await Promise.all([
    supabase.from('sales').select('balance'), supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }), supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'), supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
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

  // AUTO NOTIFICATION on load
  const { data: dueSales } = await supabase.from('sales').select('customer_name,balance').gt('balance', 0);
  if (dueSales && dueSales.length) {
    const totalDue = dueSales.reduce((s, x) => s + Number(x.balance || 0), 0);
    toast(`⚠️ ${dueSales.length} customers ka total ${fmt(totalDue)} udhar pending hai!`, 'error');
    // bell badge
    const badge = $('notifBadge');
    if (badge) { badge.textContent = dueSales.length; badge.style.display = 'inline-block'; }
    // panel
    const panel = $('notifPanel');
    if (panel) panel.innerHTML = `<h3 style="font-size:14px;margin-bottom:10px">🔔 Pending Udhar</h3>` + dueSales.slice(0,20).map(d => `<div class="notif-item"><b>${esc(d.customer_name || 'Walk-in')}</b> — ${fmt(d.balance)}</div>`).join('');
  }
}

// --- PRODUCTS (auto-synced from purchase section) ---
let ALL_PRODUCTS = [];
const CATEGORIES = ['Mobile Phones','Mobile Accessories','Chargers & Cables','Handsfree & Audio','Batteries','Memory & Storage','Mobile Parts','SIM & Network','Repairing Tools','Other Gadgets'];
const CAT_ITEMS = { 'Mobile Accessories':['Glass Protector','Back Cover','Flip Cover','Camera Lens'], 'Chargers & Cables':['Fast Charger','Type-C Cable','Lightning Cable','Power Bank'], 'Handsfree & Audio':['Handsfree','Earbuds','Bluetooth Headset'], 'Batteries':['Mobile Battery'], 'Memory & Storage':['Memory Card 32GB','Memory Card 64GB'], 'Mobile Parts':['LCD Panel','Charging Port','Camera Module'], 'SIM & Network':['SIM Ejector'], 'Repairing Tools':['Screwdriver Kit'], 'Other Gadgets':['Smart Watch'] };

async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products. Add from Purchase section.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" id="prodSelectAll" onchange="toggleAllProducts(this)"></th><th>Product</th><th>Category</th><th>Brand</th><th>IMEI 1 / 2</th><th class="num">Price</th><th class="num">Stock</th><th class="actions">Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td><input type="checkbox" class="prod-check" value="${p.id}" onchange="updateProductBulk()"></td><td><strong>${esc(p.name)}</strong><br><small>${esc(p.sub_category || '')}</small></td><td>${esc(p.category || '—')}</td><td>${esc(p.brand || '—')}</td><td><small>${esc(p.imei_1||'—')} / ${esc(p.imei_2||'—')}</small></td><td class="num">${fmt(p.sale_price)}</td><td class="num">${p.quantity}</td><td class="actions"><button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button></td></tr>`).join('')}
  </tbody></table>`;
}
$('productSearch')?.addEventListener('input', e => loadProducts(e.target.value));
window.toggleAllProducts = (cb) => { document.querySelectorAll('.prod-check').forEach(c => c.checked = cb.checked); updateProductBulk(); };
function updateProductBulk() { const n = document.querySelectorAll('.prod-check:checked').length; $('productBulkBar').style.display = n ? 'flex' : 'none'; $('productSelCount').textContent = n; }
window.bulkDeleteProducts = async () => {
  if (!checkPermission('delete')) return;
  const ids = [...document.querySelectorAll('.prod-check:checked')].map(c => c.value);
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} products?`)) return;
  for (const id of ids) {
    await supabase.from('sale_items').update({ product_id: null }).eq('product_id', id);
    await supabase.from('purchase_items').update({ product_id: null }).eq('product_id', id);
  }
  const { error } = await supabase.from('products').delete().in('id', ids);
  if (error) return toast(error.message, 'error');
  await logActivity('BULK_DELETE', 'products', `Deleted ${ids.length} products`);
  toast(`Deleted ${ids.length} products`, 'success'); loadProducts();
};
window.deleteProduct = async (id) => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete this product? Sales history preserved.')) return;
  await supabase.from('sale_items').update({ product_id: null }).eq('product_id', id);
  await supabase.from('purchase_items').update({ product_id: null }).eq('product_id', id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return toast(error.message, 'error');
  await logActivity('DELETE', 'products', `Deleted product ${id}`);
  toast('Product deleted', 'success'); loadProducts();
};

// --- INVENTORY ---
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML = '<option value="">All Racks</option>' + (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(200);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" onchange="toggleAllInv(this)"></th><th>Product</th><th>Category</th><th>IMEI</th><th>Rack</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>${low.map(p => `<tr><td><input type="checkbox" class="inv-check" value="${p.id}" onchange="updateInvBulk()"></td><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td><small>${esc(p.imei_1||'—')}</small></td><td>${esc(p.racks?.name || 'Unassigned')}</td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}</tbody></table>`;
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase.from('sale_items').select('product_name,quantity,created_at,sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchase_items').select('product_name,quantity,created_at,purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50)
  ]);
  const movements = [...(saleItems||[]).map(m => ({type:'OUT',name:m.product_name,qty:m.quantity,ref:m.sales?.invoice_no,date:m.created_at})), ...(purchItems||[]).map(m => ({type:'IN',name:m.product_name,qty:m.quantity,ref:m.purchases?.invoice_no,date:m.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,60);
  $('movementsTable').innerHTML = movements.length ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type==='IN'?'green':'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref||'—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No movements.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);
window.toggleAllInv = (cb) => { document.querySelectorAll('.inv-check').forEach(c => c.checked = cb.checked); updateInvBulk(); };
function updateInvBulk() { const n = document.querySelectorAll('.inv-check:checked').length; $('inventoryBulkBar').style.display = n ? 'flex' : 'none'; $('inventorySelCount').textContent = n; }

// --- RACKS ---
async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  const rows = racks || [];
  $('racksTable').innerHTML = rows.length ? `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th>Actions</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.description||'—')}</td><td><button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Delete</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No racks.</div>';
  const { data: stock } = await supabase.from('products').select('name,quantity,racks!fk_products_racks(name)').order('name');
  $('rackStockTable').innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Quantity</th></tr></thead><tbody>${(stock||[]).map(p => `<tr><td>${esc(p.racks?.name||'Unassigned')}</td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity||0)}</td></tr>`).join('')}</tbody></table>`;
}
$('btnAddRack').onclick = () => openModal('Add Rack', `<div class="form-grid"><div class="field"><label>Rack Name *</label><input id="rackName"></div><div class="field full"><label>Description</label><input id="rackDesc"></div></div>`, async () => {
  const name = $('rackName').value.trim(); if (!name) throw new Error('Name required');
  const { error } = await supabase.from('racks').insert({ name, description: $('rackDesc').value.trim() || null });
  if (error) throw new Error(error.message); closeModal(); toast('Rack added', 'success'); loadRacks();
});
window.deleteRack = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete rack?')) return; const { error } = await supabase.from('racks').delete().eq('id', id); if (error) toast(error.message, 'error'); else { toast('Rack deleted'); loadRacks(); } };

// =====================================================
// PURCHASES MODULE (SINGLE SOURCE OF TRUTH)
// =====================================================
async function loadPurchasesModule() {
  loadProducts(); // products auto-synced from purchases
  const { data, error } = await supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
  const t = $('purchasesTable'); if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(p => `<tr><td><b>${esc(p.invoice_no||p.id.slice(0,6))}</b></td><td>${esc(p.suppliers?.name||'—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td><small>${new Date(p.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="editPurchase('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePurchase('${p.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('btnPurchasesHistory').onclick = () => { const box = $('purchasesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadPurchasesModule(); };
$('btnRefreshPurchases').onclick = loadPurchasesModule;
window.deletePurchase = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete purchase?')) return; await supabase.from('purchases').delete().eq('id', id); await logActivity('DELETE', 'purchases', `Deleted purchase ${id}`); toast('Deleted'); loadPurchasesModule(); };
window.editPurchase = async (id) => { if (!checkPermission('edit')) return; const { data: p } = await supabase.from('purchases').select('*').eq('id', id).single(); if (p) openPurchaseModal(p); };
$('btnNewPurchase').onclick = () => openPurchaseModal();

async function openPurchaseModal(p = null) {
  const { data: sups } = await supabase.from('suppliers').select('id,name').order('name');
  const { data: existingProds } = await supabase.from('products').select('id,name,category,brand,sale_price,purchase_price').order('name');
  const body = `
    <div class="form-grid">
      <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups||[]).map(s => `<option value="${s.id}" ${p?.supplier_id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no||'')}"></div>
      <div class="field"><label>Total (PKR)</label><input id="puTotal" type="number" value="${p?.total||0}"></div>
      <div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid||0}"></div>
      <div class="field full"><label>Notes</label><textarea id="puNotes">${esc(p?.notes||'')}</textarea></div>
    </div>
    <h4 style="margin:16px 0 8px;font-size:13px;font-weight:800">Products / Items <button type="button" class="btn btn-primary btn-sm" onclick="addPurchaseItemRow()">+ Add Item</button></h4>
    <div id="purchaseItemsHost"></div>
  `;
  openModal(p ? 'Edit Purchase' : 'New Purchase', body, async () => {
    const payload = { supplier_id: $('puSup').value || null, invoice_no: $('puInv').value.trim() || null, total: Number($('puTotal').value) || 0, paid: Number($('puPaid').value) || 0, notes: $('puNotes').value.trim() || null };
    let purchaseId = p?.id;
    if (p) { await supabase.from('purchases').update(payload).eq('id', p.id); }
    else { const { data: created, error } = await supabase.from('purchases').insert(payload).select().single(); if (error) throw new Error(error.message); purchaseId = created.id; }
    // Process items
    const itemRows = document.querySelectorAll('#purchaseItemsHost .purchase-item-row');
    for (const row of itemRows) {
      const name = row.querySelector('.pi-name').value.trim(); if (!name) continue;
      const category = row.querySelector('.pi-category').value;
      const brand = row.querySelector('.pi-brand').value.trim();
      const qty = Number(row.querySelector('.pi-qty').value) || 0;
      const purchasePrice = Number(row.querySelector('.pi-pprice').value) || 0;
      const salePrice = Number(row.querySelector('.pi-sprice').value) || 0;
      const imei1 = row.querySelector('.pi-imei1').value.trim() || null;
      const imei2 = row.querySelector('.pi-imei2').value.trim() || null;
      // INSERT purchase_item
      await supabase.from('purchase_items').insert({ purchase_id: purchaseId, product_name: name, category, quantity: qty, unit_price: purchasePrice, line_total: qty * purchasePrice, imei_1: imei1, imei_2: imei2 });
      // SYNC TO products (duplicate check)
      let q = supabase.from('products').select('*').eq('name', name).eq('category', category);
      if (brand) q = q.eq('brand', brand); else q = q.is('brand', null);
      const { data: existing } = await q;
      if (existing && existing.length) {
        const old = existing[0];
        await supabase.from('products').update({ quantity: Number(old.quantity||0) + qty, purchase_price: purchasePrice || old.purchase_price, sale_price: salePrice || old.sale_price, imei_1: imei1 || old.imei_1, imei_2: imei2 || old.imei_2 }).eq('id', old.id);
      } else {
        await supabase.from('products').insert({ name, category, brand: brand||null, quantity: qty, purchase_price: purchasePrice, sale_price: salePrice, min_stock: 3, imei_1: imei1, imei_2: imei2 });
      }
    }
    await logActivity(p ? 'EDIT' : 'CREATE', 'purchases', `Purchase ${payload.invoice_no||purchaseId}`);
    closeModal(); toast('Purchase saved & products synced!', 'success'); loadPurchasesModule();
  });
  // add first empty row
  setTimeout(() => { addPurchaseItemRow(); }, 50);
}

window.addPurchaseItemRow = () => {
  const host = $('purchaseItemsHost'); if (!host) return;
  const div = document.createElement('div');
  div.className = 'purchase-item-row';
  div.style = 'display:grid;grid-template-columns:2fr 1fr 1fr 70px 90px 90px 120px 120px 40px;gap:6px;margin-bottom:8px;align-items:center;padding:8px;background:rgba(0,0,0,.03);border-radius:8px';
  div.innerHTML = `
    <input class="pi-name" placeholder="Product Name" style="padding:6px">
    <select class="pi-category" style="padding:6px">${CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select>
    <input class="pi-brand" placeholder="Brand" style="padding:6px">
    <input class="pi-qty" type="number" value="1" placeholder="Qty" style="padding:6px">
    <input class="pi-pprice" type="number" value="0" placeholder="Buy" style="padding:6px">
    <input class="pi-sprice" type="number" value="0" placeholder="Sale" style="padding:6px">
    <input class="pi-imei1" placeholder="IMEI 1" style="padding:6px">
    <input class="pi-imei2" placeholder="IMEI 2" style="padding:6px">
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentNode.remove()">×</button>
  `;
  host.appendChild(div);
};

// --- SALES / POS ---
let CART = []; let POS_CUSTOMERS = []; let POS_PREVIOUS_DUE = 0; let POS_ALL_PRODS = [];
async function loadPosCustomers() { const { data } = await supabase.from('customers').select('id,name,phone').order('name'); POS_CUSTOMERS = data || []; $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone||'')}</option>`).join(''); }
async function updatePosCustomerDue() {
  const name = $('saleCustName').value.trim(); const phone = $('saleCustPhone').value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone===phone) || (name && c.name.toLowerCase()===name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance', 0);
  POS_PREVIOUS_DUE = (data||[]).reduce((n,x)=>n+Number(x.balance||0),0);
  $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE); $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName').addEventListener('change', updatePosCustomerDue); $('saleCustPhone').addEventListener('change', updatePosCustomerDue);
async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
  POS_ALL_PRODS = data || [];
  const cats = [...new Set(POS_ALL_PRODS.map(p=>p.category).filter(Boolean))];
  $('saleCategoryFilter').innerHTML = '<option value="">— All —</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterPosProducts();
}
window.filterPosProducts = () => {
  const cat = $('saleCategoryFilter').value;
  const filtered = cat ? POS_ALL_PRODS.filter(p=>p.category===cat) : POS_ALL_PRODS;
  $('saleProductSelect').innerHTML = '<option value="">— Choose —</option>' + filtered.map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1||'')}" data-cat="${esc(p.category)}" data-stock="${p.quantity}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity})</option>`).join('');
};
$('saleCategoryFilter').addEventListener('change', filterPosProducts);
$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id===opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity*existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, imei: opt.dataset.imei, category: opt.dataset.cat, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  renderCart();
};
function renderCart() {
  if (!CART.length) $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  else $('cartItems').innerHTML = `<table class="data"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>${CART.map((c,i)=>`<tr><td>${esc(c.product_name)}</td><td class="num">${c.quantity}</td><td class="num">${fmt(c.line_total)}</td><td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td></tr>`).join('')}</tbody></table>`;
  const sub = CART.reduce((s,c)=>s+c.line_total,0); const disc = Number($('saleDiscount').value)||0; const total = Math.max(0, sub-disc);
  $('cartSubtotal').textContent = fmt(sub); $('cartTotal').textContent = fmt(total);
  if (Number($('salePaid').value)===0) $('salePaid').value = total;
  const udhar = total - (Number($('salePaid').value)||0);
  $('udharWarning').style.display = udhar>0?'block':'none';
}
window.removeCart = (i) => { CART.splice(i,1); renderCart(); };
$('saleDiscount').addEventListener('input', renderCart); $('salePaid').addEventListener('input', renderCart);
$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart empty','error');
  const subtotal = CART.reduce((s,c)=>s+c.line_total,0); const discount = Number($('saleDiscount').value)||0; const total = Math.max(0,subtotal-discount); const paid = Number($('salePaid').value)||0;
  const custName = $('saleCustName').value.trim()||'Walk-in Customer'; const custPhone = $('saleCustPhone').value.trim(); const payMethod = $('salePaymentMethod').value;
  $('btnSaveSale').disabled = true; $('btnSaveSale').textContent = 'Saving...';
  try {
    let customerId = null;
    if (custName !== 'Walk-in Customer') {
      let found = POS_CUSTOMERS.find(c => (custPhone&&c.phone===custPhone) || c.name.toLowerCase()===custName.toLowerCase());
      if (!found) { const { data: created, error: ce } = await supabase.from('customers').insert({ name: custName, phone: custPhone||null, opening_balance: 0 }).select('id,name,phone').single(); if (ce) throw new Error('Customer: '+ce.message); found = created; POS_CUSTOMERS.push(created); }
      customerId = found.id;
    }
    const invNo = 'INV-' + Date.now().toString().slice(-6);
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert({ invoice_no: invNo, customer_id: customerId, customer_name: custName, customer_phone: custPhone||null, subtotal, discount, total, paid, balance: total-paid, payment_method: payMethod }).select().single();
    if (saleErr) throw new Error('Sale: '+saleErr.message);
    const items = CART.map(c => ({ sale_id: saleData.id, product_id: c.product_id, product_name: c.product_name, imei: c.imei||null, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total, category: c.category }));
    const { error: itemsErr } = await supabase.from('sale_items').insert(items); if (itemsErr) throw new Error('Items: '+itemsErr.message);
    for (const item of CART) { const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single(); if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity-item.quantity) }).eq('id', item.product_id); }
    await logActivity('CREATE', 'sales', `Sale ${invNo} - ${fmt(total)}`);
    const printOpt = confirm('Sale saved! Print Thermal (OK) or A4 (Cancel)?');
    const payload = { invoice: invNo, customer: custName, phone: custPhone, subtotal, discount, total, paid, balance: total-paid, date: new Date(), items: [...CART] };
    if (printOpt) printThermal80mm(payload,'sale'); else printA4Premium(payload,'sale');
    toast('Sale saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
  } catch (err) { toast(err.message, 'error'); }
  finally { $('btnSaveSale').disabled = false; $('btnSaveSale').textContent = '💾 Save Sale (F4)'; }
};
$('btnSalesHistory').onclick = () => { const box = $('salesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadSalesHistory(); };
$('btnRefreshSales').onclick = loadSalesHistory;
async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at',{ascending:false}).limit(100);
  if (error) { $('salesHistoryTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  $('salesHistoryTable').innerHTML = !data?.length ? '<div class="empty">No sales.</div>' : `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Print</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name||'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${s.balance>0?`<b style="color:#dc2626">${fmt(s.balance)}</b>`:'<span class="pill green">Paid</span>'}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">🖨</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async (id) => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single(); if (!s) return;
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone, subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paid, balance: s.balance, date: s.created_at, items: items||[] };
  if (printOpt) printThermal80mm(payload,'sale'); else printA4Premium(payload,'sale');
};

// --- REPAIRING ---
const COMMON_FAULTS = ['Screen Broken','Touch Not Working','Battery Drain','Not Charging','No Power','No Display','Dead','Water Damage','Camera Not Working','Speaker Not Working','Mic Not Working','Network Issue','Face ID Not Working','Software Update'];
async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || ''; const st = $('repairStatusFilter')?.value || '';
  let query = supabase.from('repairs').select('*').order('created_at',{ascending:false});
  if (st) query = query.eq('status', st);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,mobile.ilike.%${q}%,slip_no.ilike.%${q}%`);
  const { data, error } = await query;
  const t = $('repairsTable'); if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data?.length) { t.innerHTML = '<div class="empty">No repair jobs.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Slip#</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.map(r => { const due = Number(r.charge||0)-Number(r.advance||0); return `<tr><td><b>${esc(r.slip_no||'—')}</b></td><td>${esc(r.customer_name)}<br><small>${esc(r.phone||'')}</small></td><td>${esc(r.mobile||'—')}</td><td><small>${esc(r.issue||'—')}</small></td><td class="num">${fmt(r.charge)}</td><td><span class="pill">${esc(r.status)}</span></td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewRepair('${r.id}')">Print</button><button class="btn btn-ghost btn-sm" onclick="editRepair('${r.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRepair('${r.id}')">Del</button></td></tr>`; }).join('')}</tbody></table>`;
}
$('repairSearch')?.addEventListener('input', ()=>loadRepairs()); $('repairStatusFilter')?.addEventListener('change', ()=>loadRepairs());
$('btnAddRepair').onclick = () => openRepairModal();
window.editRepair = async (id) => { if (!checkPermission('edit')) return; const { data: r } = await supabase.from('repairs').select('*').eq('id',id).single(); if (r) openRepairModal(r); };
window.deleteRepair = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('repairs').delete().eq('id',id); await logActivity('DELETE','repairs',id); toast('Deleted'); loadRepairs(); };
window.viewRepair = async (id) => {
  const { data: r } = await supabase.from('repairs').select('*').eq('id',id).single(); if (!r) return;
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: r.slip_no, customer: r.customer_name, phone: r.phone, subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, balance: r.charge-r.advance, date: r.created_at, items: [{ name: r.mobile+' - '+(r.issue||'Repair'), qty: 1, total: r.charge }] };
  if (printOpt) printThermal80mm(payload,'repair'); else printA4Premium(payload,'repair');
};
function openRepairModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field"><label>Customer *</label><input id="rCust" value="${esc(r?.customer_name||'')}"></div>
    <div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone||'')}"></div>
    <div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile||'')}"></div>
    <div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei||'')}"></div>
    <div class="field full"><label>Fault</label><input id="rIssue" list="faultsList" value="${esc(r?.issue||'')}"><datalist id="faultsList">${COMMON_FAULTS.map(f=>`<option value="${esc(f)}">`).join('')}</datalist></div>
    <div class="field"><label>Charge</label><input id="rCharge" type="number" value="${r?.charge||0}"></div>
    <div class="field"><label>Advance</label><input id="rAdvance" type="number" value="${r?.advance||0}"></div>
    <div class="field"><label>Status</label><select id="rStatus">${['Received','In Progress','Ready','Delivered'].map(s=>`<option ${r?.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="field full"><label>Notes</label><textarea id="rNotes">${esc(r?.notes||'')}</textarea></div>
  </div>`;
  openModal(r?'Edit Repair':'New Repair', body, async () => {
    const payload = { customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim()||null, mobile: $('rMobile').value.trim()||null, imei: $('rImei').value.trim()||null, issue: $('rIssue').value.trim()||null, charge: Number($('rCharge').value)||0, advance: Number($('rAdvance').value)||0, status: $('rStatus').value, notes: $('rNotes').value.trim()||null };
    if (!payload.customer_name) throw new Error('Customer required');
    if (r) await supabase.from('repairs').update(payload).eq('id', r.id); else await supabase.from('repairs').insert(payload);
    await logActivity(r?'EDIT':'CREATE','repairs', payload.customer_name);
    closeModal(); toast('Saved','success'); loadRepairs();
  });
}

// --- CUSTOMERS ---
let ALL_CUST = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at',{ascending:false});
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q; ALL_CUST = data||[];
  const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" onchange="toggleAllCust(this)"></th><th>Name</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead><tbody>${ALL_CUST.map(c=>`<tr><td><input type="checkbox" class="cust-check" value="${c.id}" onchange="updateCustBulk()"></td><td>${esc(c.name)}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.address||'—')}</td><td><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value));
$('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = (id) => { if (!checkPermission('edit')) return; openCustomerModal(ALL_CUST.find(c=>c.id===id)); };
window.deleteCustomer = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('customers').delete().eq('id',id); await logActivity('DELETE','customers',id); toast('Deleted'); loadCustomers(); };
window.toggleAllCust = (cb) => { document.querySelectorAll('.cust-check').forEach(c=>c.checked=cb.checked); updateCustBulk(); };
function updateCustBulk() { const n = document.querySelectorAll('.cust-check:checked').length; $('custBulkBar').style.display = n?'flex':'none'; $('custSelCount').textContent = n; }
window.bulkDeleteCustomers = async () => {
  if (!checkPermission('delete')) return;
  const ids = [...document.querySelectorAll('.cust-check:checked')].map(c=>c.value);
  if (!ids.length || !confirm(`Delete ${ids.length} customers?`)) return;
  const { error } = await supabase.from('customers').delete().in('id', ids);
  if (error) return toast(error.message,'error'); toast(`Deleted ${ids.length}`); loadCustomers();
};
function openCustomerModal(c = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name||'')}"></div><div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone||'')}"></div><div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance||0}"></div><div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address||'')}</textarea></div></div>`;
  openModal(c?'Edit Customer':'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim()||null, address: $('cAddr').value.trim()||null, opening_balance: Number($('cBal').value)||0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id); else await supabase.from('customers').insert(payload);
    await logActivity(c?'EDIT':'CREATE','customers', payload.name);
    toast('Saved','success'); closeModal(); loadCustomers();
  });
}

// --- SUPPLIERS ---
let ALL_SUP = [];
async function loadSuppliers() {
  const { data } = await supabase.from('suppliers').select('*').order('name'); ALL_SUP = data||[];
  const t = $('suppliersTable');
  if (!ALL_SUP.length) { t.innerHTML = '<div class="empty">No suppliers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead><tbody>${ALL_SUP.map(s=>`<tr><td>${esc(s.name)}</td><td><span class="pill blue">${esc(s.category||'General')}</span></td><td>${esc(s.phone||'—')}</td><td>${esc(s.address||'—')}</td><td><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('btnAddSupplier').onclick = () => openSupplierModal();
window.editSupplier = (id) => { if (!checkPermission('edit')) return; openSupplierModal(ALL_SUP.find(s=>s.id===id)); };
window.deleteSupplier = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('suppliers').delete().eq('id',id); await logActivity('DELETE','suppliers',id); toast('Deleted'); loadSuppliers(); };
function openSupplierModal(s = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="sName" value="${esc(s?.name||'')}"></div><div class="field"><label>Category</label><input id="sCategory" value="${esc(s?.category||'')}"></div><div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone||'')}"></div><div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address||'')}</textarea></div></div>`;
  openModal(s?'Edit Supplier':'Add Supplier', body, async () => {
    const payload = { name: $('sName').value.trim(), category: $('sCategory').value.trim()||null, phone: $('sPhone').value.trim()||null, address: $('sAddr').value.trim()||null };
    if (!payload.name) throw new Error('Name required');
    if (s) await supabase.from('suppliers').update(payload).eq('id', s.id); else await supabase.from('suppliers').insert(payload);
    toast('Saved','success'); closeModal(); loadSuppliers();
  });
}

// =====================================================
// CREDIT / UDHAR (Customer-wise print + date/status filters)
// =====================================================
let CREDIT_RANGE = 'all', CREDIT_STATUS = 'all';
$('creditDateTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditDateTabs').querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); CREDIT_RANGE = b.dataset.range; loadCredit(); });
$('creditStatusTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditStatusTabs').querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); CREDIT_STATUS = b.dataset.status; loadCredit(); });

function getDateRange(range) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (range==='today') return { from: new Date(y,m,d).toISOString(), to: new Date(y,m,d,23,59,59).toISOString() };
  if (range==='week') { const ws = new Date(now); ws.setDate(d - now.getDay()); return { from: new Date(ws.getFullYear(),ws.getMonth(),ws.getDate()).toISOString(), to: new Date(y,m,d,23,59,59).toISOString() }; }
  if (range==='month') return { from: new Date(y,m,1).toISOString(), to: new Date(y,m,d,23,59,59).toISOString() };
  return { from: null, to: null };
}

async function loadCredit() {
  const range = getDateRange(CREDIT_RANGE);
  let q = supabase.from('sales').select('customer_id,customer_name,customer_phone,balance,total,paid,invoice_no,created_at').gt('balance', 0).order('created_at',{ascending:false});
  if (range.from) q = q.gte('created_at', range.from);
  if (range.to) q = q.lte('created_at', range.to);
  const { data: sales } = await q;
  const { data: recov } = await supabase.from('credit_recoveries').select('*,customers(name,phone)').order('created_at',{ascending:false}).limit(100);

  // Pending only if status pending
  let filteredSales = sales || [];
  if (CREDIT_STATUS === 'received') filteredSales = []; // all received means no pending
  // Summary
  const map = {};
  filteredSales.forEach(s => { const key = s.customer_id || s.customer_name || 'walkin'; if (!map[key]) map[key] = { name: s.customer_name || 'Walk-in', phone: s.customer_phone, total: 0, count: 0, id: s.customer_id }; map[key].total += Number(s.balance||0); map[key].count++; });
  const summary = Object.values(map).sort((a,b)=>b.total-a.total);
  $('creditSummaryTable').innerHTML = summary.length ? `<table class="data"><thead><tr><th>Customer</th><th>Phone</th><th class="num">Invoices</th><th class="num">Outstanding</th><th>Print</th></tr></thead><tbody>${summary.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.phone||'—')}</td><td class="num">${s.count}</td><td class="num"><b>${fmt(s.total)}</b></td><td><button class="btn btn-ghost btn-sm" onclick="printCustomerUdhar('${esc(s.name)}')">🖨 Print</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No outstanding credit. 🎉</div>';
  $('creditTable').innerHTML = filteredSales.length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Recover</th></tr></thead><tbody>${filteredSales.map(s=>`<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name||'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-primary btn-sm" onclick="recoverCredit('${s.invoice_no}')">Recover</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No pending invoices in this range.</div>';
  $('recoveriesTable').innerHTML = (recov||[]).length ? `<table class="data"><thead><tr><th>Customer</th><th class="num">Amount</th><th>Method</th><th>Date</th></tr></thead><tbody>${recov.map(r=>`<tr><td>${esc(r.customers?.name||'—')}</td><td class="num">${fmt(r.amount)}</td><td>${esc(r.method||'cash')}</td><td><small>${new Date(r.created_at).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No recoveries.</div>';
}

window.printCustomerUdhar = async (customerName) => {
  const { data: sales } = await supabase.from('sales').select('*').eq('customer_name', customerName).gt('balance', 0).order('created_at',{ascending:false});
  if (!sales?.length) return toast('No pending for this customer','error');
  const total = sales.reduce((s,x)=>s+Number(x.balance||0),0);
  const printOpt = confirm(`Print ${customerName}'s udhar (${fmt(total)})?\n\nOK = Thermal, Cancel = A4`);
  const payload = { invoice: 'UDHAR-'+customerName.slice(0,8), customer: customerName, phone: sales[0].customer_phone, subtotal: total, discount: 0, total, paid: 0, balance: total, date: new Date(), items: sales.map(s => ({ name: s.invoice_no, description: s.invoice_no, qty: 1, quantity: 1, price: s.balance, total: s.balance })) };
  if (printOpt) printThermal80mm(payload,'sale'); else printA4Premium(payload,'report');
};

window.recoverCredit = async (invoice) => {
  const amountStr = prompt(`Recovery for ${invoice}:`, ''); if (!amountStr) return;
  const amount = Number(amountStr); if (!amount || amount<=0) return toast('Invalid','error');
  const { data: s } = await supabase.from('sales').select('*').eq('invoice_no', invoice).single(); if (!s) return;
  const newPaid = Number(s.paid||0) + amount; const newBal = Math.max(0, Number(s.total||0) - newPaid);
  await supabase.from('sales').update({ paid: newPaid, balance: newBal }).eq('id', s.id);
  await supabase.from('credit_recoveries').insert({ customer_id: s.customer_id, sale_id: s.id, invoice_no: invoice, amount, method: 'cash' });
  await logActivity('RECOVER', 'credit', `${invoice} - ${fmt(amount)}`);
  toast('Recovery recorded','success'); loadCredit(); loadOverview();
};
$('btnPrintCreditAll').onclick = () => {
  const rows = $('creditSummaryTable').querySelectorAll('tbody tr'); if (!rows.length) return toast('Nothing to print','error');
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  let total = 0; const items = Array.from(rows).map(r => { const c = r.querySelectorAll('td'); const amt = Number(c[3].innerText.replace(/[^0-9]/g,'')); total += amt; return { name: c[0].innerText, description: c[0].innerText, qty:1, quantity:1, price: amt, total: amt }; });
  const payload = { invoice: 'UDHAR-ALL', customer: 'All', subtotal: total, discount: 0, total, paid: 0, balance: 0, date: new Date(), items };
  if (printOpt) printThermal80mm(payload,'sale'); else printA4Premium(payload,'report');
};

// --- EXPENSES ---
const EXPENSE_CATEGORIES = ['Rent','Utilities','Salary','Transport','Repair Parts','Tea/Food','Marketing','Other'];
async function loadExpenses() {
  const catSel = $('expFilterCat'); if (catSel && catSel.options.length <= 1) catSel.innerHTML = '<option value="">All</option>' + EXPENSE_CATEGORIES.map(c=>`<option>${c}</option>`).join('');
  const from = $('expFilterFrom')?.value||''; const to = $('expFilterTo')?.value||''; const cat = $('expFilterCat')?.value||'';
  let q = supabase.from('expenses').select('*').order('expense_date',{ascending:false});
  if (from) q = q.gte('expense_date', from); if (to) q = q.lte('expense_date', to); if (cat) q = q.eq('category', cat);
  const { data } = await q; const t = $('expensesTable');
  t.innerHTML = !data?.length ? '<div class="empty">No expenses.</div>' : `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${data.map(e=>`<tr><td>${esc(e.expense_date)}</td><td><span class="pill orange">${esc(e.category||'Other')}</span></td><td>${esc(e.description||'—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
  const all = data||[]; const today = new Date().toISOString().slice(0,10); const ws = new Date(); ws.setDate(ws.getDate()-ws.getDay()); const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const sum = arr => arr.reduce((s,x)=>s+Number(x.amount||0),0);
  $('expToday').textContent = fmt(sum(all.filter(x=>x.expense_date===today)));
  $('expWeek').textContent = fmt(sum(all.filter(x=>x.expense_date>=ws.toISOString().slice(0,10))));
  $('expMonth').textContent = fmt(sum(all.filter(x=>x.expense_date>=ms)));
  $('expTotal').textContent = fmt(sum(all));
}
$('btnAddExpense').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Date *</label><input type="date" id="exDate" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Category</label><select id="exCat">${EXPENSE_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></div><div class="field"><label>Amount *</label><input type="number" id="exAmount" value="0"></div><div class="field full"><label>Description</label><input id="exDesc"></div></div>`;
  openModal('Add Expense', body, async () => { const amount = Number($('exAmount').value)||0; if (amount<=0) throw new Error('Amount > 0'); await supabase.from('expenses').insert({ expense_date: $('exDate').value, category: $('exCat').value, amount, description: $('exDesc').value.trim()||null }); await logActivity('CREATE','expenses',fmt(amount)); closeModal(); toast('Added','success'); loadExpenses(); });
};
window.deleteExpense = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('expenses').delete().eq('id',id); toast('Deleted'); loadExpenses(); };
$('btnFilterExpenses').onclick = loadExpenses;

// --- REPORTS ---
$('btnRunReport').onclick = runReport;
$('btnPrintReport').onclick = () => {
  const printOpt = confirm('Thermal (OK) or A4 (Cancel)?');
  const payload = { invoice: 'REPORT', customer: $('reportType').value.toUpperCase(), subtotal: 0, total: 0, paid: 0, balance: 0, date: new Date(), items: Array.from($('reportOutput').querySelectorAll('tbody tr')).map(r => { const c = r.querySelectorAll('td'); return { description: c[0]?.innerText+' '+(c[1]?.innerText||''), price: 0, qty: 1, total: c[c.length-1]?.innerText||c[c.length-2]?.innerText }; }) };
  if (printOpt) printThermal80mm({ ...payload, items: payload.items.map(i => ({ ...i, name: i.description, quantity: i.qty })) },'sale'); else printA4Premium(payload,'report');
};
async function runReport() {
  const type = $('reportType').value; const from = $('reportFrom').value; const to = $('reportTo').value; const search = $('reportSearch')?.value?.trim().toLowerCase()||'';
  const out = $('reportOutput'); out.innerHTML = '<div class="empty">Loading…</div>';
  try {
    if (type==='sales') {
      let q = supabase.from('sales').select('*').order('created_at',{ascending:false});
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to+'T23:59:59');
      const { data } = await q; let f = data||[];
      if (search) f = f.filter(s=>(s.customer_name||'').toLowerCase().includes(search) || (s.invoice_no||'').toLowerCase().includes(search));
      const total = f.reduce((s,r)=>s+Number(r.total||0),0);
      out.innerHTML = `<h3 style="margin-bottom:12px">Sales Report — Total: ${fmt(total)}</h3><table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${f.map(s=>`<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name||'')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
    }
    else if (type==='pl') {
      let q = supabase.from('sale_items').select('product_id,product_name,quantity,line_total,created_at');
      if (from) q = q.gte('created_at', from); if (to) q = q.lte('created_at', to+'T23:59:59');
      const { data: items } = await q; let f = items||[];
      if (search) f = f.filter(i=>(i.product_name||'').toLowerCase().includes(search));
      const { data: prods } = await supabase.from('products').select('id,purchase_price');
      const costMap = Object.fromEntries((prods||[]).map(p=>[p.id,Number(p.purchase_price||0)]));
      const map = {};
      f.forEach(it => { const k = it.product_id||it.product_name; if (!map[k]) map[k] = { name: it.product_name, qty:0, rev:0, cost:0 }; map[k].qty += Number(it.quantity||0); map[k].rev += Number(it.line_total||0); map[k].cost += Number(it.quantity||0)*(costMap[it.product_id]||0); });
      const rows = Object.values(map).map(r=>({ ...r, profit: r.rev-r.cost }));
      const tr = rows.reduce((s,r)=>s+r.rev,0), tc = rows.reduce((s,r)=>s+r.cost,0), tp = tr-tc;
      $('plSummary').style.display = 'flex';
      $('plSummary').innerHTML = `<div class="stat clay"><div class="stat-icon green">↗</div><div><strong>${fmt(tr)}</strong><small>Revenue</small></div></div><div class="stat clay"><div class="stat-icon orange">↙</div><div><strong>${fmt(tc)}</strong><small>Cost</small></div></div><div class="stat clay"><div class="stat-icon purple">▨</div><div><strong>${fmt(tp)}</strong><small>Profit</small></div></div>`;
      out.innerHTML = `<h3 style="margin-bottom:12px">P&L</h3><table class="data"><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Rev</th><th class="num">Cost</th><th class="num">Profit</th></tr></thead><tbody>${rows.sort((a,b)=>b.profit-a.profit).map(r=>`<tr><td>${esc(r.name)}</td><td class="num">${r.qty}</td><td class="num">${fmt(r.rev)}</td><td class="num">${fmt(r.cost)}</td><td class="num"><b>${fmt(r.profit)}</b></td></tr>`).join('')}</tbody></table>`;
    }
  } catch (e) { out.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// --- STAFF / SETTINGS (edit + activity logs) ---
async function loadStaff() {
  const { data, error } = await supabase.from('staff').select('*').order('created_at',{ascending:false});
  const t = $('staffTable');
  if (error) { t.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
  if (!data?.length) { t.innerHTML = '<div class="empty">No staff.</div>'; } else {
    t.innerHTML = `<table class="data"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Permissions</th><th>Actions</th></tr></thead><tbody>${data.map(s=>`<tr><td><b>${esc(s.staff_id)}</b></td><td>${esc(s.name)}</td><td><span class="pill">${esc(s.role)}</span></td><td><small>Edit: ${s.can_edit?'✅':'❌'} | Del: ${s.can_delete?'✅':'❌'}</small></td><td>${s.staff_id==='01'?'<small>Protected</small>':`<button class="btn btn-ghost btn-sm" onclick="editStaff('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Del</button>`}</td></tr>`).join('')}</tbody></table>`;
  }
  // Activity logs
  const { data: logs } = await supabase.from('activity_log').select('*').order('created_at',{ascending:false}).limit(100);
  $('activityLogTable').innerHTML = !logs?.length ? '<div class="empty">No activity yet.</div>' : `<table class="data"><thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Module</th><th>Details</th></tr></thead><tbody>${logs.map(l=>`<tr><td><small>${new Date(l.created_at).toLocaleString()}</small></td><td><b>${esc(l.staff_name||l.staff_id)}</b></td><td><span class="pill">${esc(l.action)}</span></td><td>${esc(l.module||'')}</td><td><small>${esc(l.details||'')}</small></td></tr>`).join('')}</tbody></table>`;
}
$('btnAddStaff').onclick = () => {
  const body = `<div class="form-grid"><div class="field"><label>Staff ID *</label><input id="stId"></div><div class="field"><label>Name *</label><input id="stName"></div><div class="field full"><label>Password *</label><input id="stPass" type="password"></div><div class="field"><label>Role</label><select id="stRole"><option>Staff</option><option>Manager</option><option>Admin</option></select></div><div class="field full" style="display:flex;gap:20px"><label><input type="checkbox" id="stEdit"> Can Edit</label><label><input type="checkbox" id="stDelete"> Can Delete</label></div></div>`;
  openModal('Generate Staff ID', body, async () => {
    const payload = { staff_id: $('stId').value.trim(), name: $('stName').value.trim(), password: $('stPass').value.trim(), role: $('stRole').value, can_edit: $('stEdit').checked, can_delete: $('stDelete').checked };
    if (!payload.staff_id||!payload.name||!payload.password) throw new Error('All required');
    const { error } = await supabase.from('staff').insert(payload);
    if (error) throw new Error(error.code==='23505'?'ID exists':error.message);
    await logActivity('CREATE','staff',payload.name); closeModal(); toast('Created','success'); loadStaff();
  });
};
window.editStaff = async (id) => {
  if (!IS_ADMIN) return toast('Admin only','error');
  const { data: s } = await supabase.from('staff').select('*').eq('id',id).single(); if (!s) return;
  const body = `<div class="form-grid"><div class="field"><label>Staff ID *</label><input id="stId" value="${esc(s.staff_id)}"></div><div class="field"><label>Name *</label><input id="stName" value="${esc(s.name)}"></div><div class="field full"><label>New Password (blank = keep)</label><input id="stPass" type="password"></div><div class="field"><label>Role</label><select id="stRole">${['Staff','Manager','Admin'].map(r=>`<option ${s.role===r?'selected':''}>${r}</option>`).join('')}</select></div><div class="field full" style="display:flex;gap:20px"><label><input type="checkbox" id="stEdit" ${s.can_edit?'checked':''}> Can Edit</label><label><input type="checkbox" id="stDelete" ${s.can_delete?'checked':''}> Can Delete</label></div></div>`;
  openModal('Edit Staff', body, async () => {
    const payload = { staff_id: $('stId').value.trim(), name: $('stName').value.trim(), role: $('stRole').value, can_edit: $('stEdit').checked, can_delete: $('stDelete').checked };
    if ($('stPass').value.trim()) payload.password = $('stPass').value.trim();
    if (!payload.staff_id||!payload.name) throw new Error('Required');
    const { error } = await supabase.from('staff').update(payload).eq('id',id);
    if (error) throw new Error(error.message);
    await logActivity('EDIT','staff',payload.name); closeModal(); toast('Updated','success'); loadStaff();
  });
};
window.deleteStaff = async (id) => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('staff').delete().eq('id',id); await logActivity('DELETE','staff',id); toast('Deleted'); loadStaff(); };

// --- TRANSACTIONS ---
async function loadTransactions() {
  const [{ data: s }, { data: p }, { data: e }] = await Promise.all([ supabase.from('sales').select('invoice_no,total,created_at').order('created_at',{ascending:false}).limit(50), supabase.from('purchases').select('invoice_no,total,created_at').order('created_at',{ascending:false}).limit(50), supabase.from('expenses').select('description,amount,created_at').order('created_at',{ascending:false}).limit(50) ]);
  const rows = [...(s||[]).map(x=>({t:'IN',ref:x.invoice_no,amt:x.total,date:x.created_at})), ...(p||[]).map(x=>({t:'OUT',ref:x.invoice_no,amt:x.total,date:x.created_at})), ...(e||[]).map(x=>({t:'EXPENSE',ref:x.description,amt:x.amount,date:x.created_at}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('transactionsTable').innerHTML = `<table class="data"><thead><tr><th>Type</th><th>Reference</th><th class="num">Amount</th><th>Date</th></tr></thead><tbody>${rows.map(r=>`<tr><td><span class="pill ${r.t==='IN'?'green':r.t==='OUT'?'orange':'red'}">${r.t}</span></td><td>${esc(r.ref||'—')}</td><td class="num">${fmt(r.amt)}</td><td><small>${new Date(r.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`;
}

// --- NOTIFICATION BELL ---
$('notifBell').onclick = () => { $('notifPanel').classList.toggle('open'); };
document.addEventListener('click', (e) => { if (!e.target.closest('#notifPanel') && !e.target.closest('#notifBell')) $('notifPanel').classList.remove('open'); });

// --- INIT ---
renderCart();
loadOverview();
