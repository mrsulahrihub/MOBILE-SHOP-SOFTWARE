// =====================================================
// BM MOBILE ZONE - SINGLE SYSTEM DASHBOARD (v10.0)
// =====================================================
import { supabase } from './config.js';

// --- 1. AUTH & INIT ---
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
  phoneMain: '0307-6613232'
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
    const shortcuts = { 'o': 'overview', 'p': 'products', 'i': 'inventory', 'l': 'sales', 'u': 'purchases', 'e': 'expenses', 'r': 'reports' };
    
    if (shortcuts[key]) {
      e.preventDefault();
      document.querySelector(`[data-module="${shortcuts[key]}"]`)?.click();
    }
    
    // Save Sale Shortcut
    if (key === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  }

  if (e.key === 'Escape') closeModal();
});

// --- 4. NAVIGATION ---
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
    document.getElementById('mainSidebar').classList.remove('show');
  });
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview();
    case 'products': return loadProducts();
    case 'sales': return loadSaleProducts();
    // Baaki modules yahan add karein
  }
}

// --- 5. OVERVIEW (Single System) ---
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

  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  else $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

// --- 6. PRODUCTS (Single System) ---
let ALL_PRODUCTS = [];
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products found.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>
    ${ALL_PRODUCTS.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.category || '—')}</td><td>${fmt(p.sale_price)}</td><td>${p.quantity}</td><td><button class="btn btn-primary btn-sm" onclick="editProduct('${p.id}')">Edit</button></td></tr>`).join('')}
  </tbody></table>`;
}

// --- 7. SALES / POS (Single System) ---
let CART = [];
async function loadSaleProducts() {
  const { data } = await supabase.from('products').select('*').gt('quantity', 0).order('name');
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + (data || []).map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`).join('');
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return toast('Select product', 'error');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  playBeep();
  renderCart();
};

function renderCart() {
  if (!CART.length) $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  else $('cartItems').innerHTML = `<table class="data">${CART.map((c, i) => `<tr><td>${esc(c.product_name)}</td><td>${c.quantity}</td><td>${fmt(c.line_total)}</td><td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td></tr>`).join('')}</table>`;
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  const total = Math.max(0, sub - (Number($('saleDiscount').value) || 0));
  $('cartSubtotal').textContent = fmt(sub); $('cartTotal').textContent = fmt(total);
  if (Number($('salePaid').value) === 0) $('salePaid').value = total;
}
window.removeCart = (i) => { CART.splice(i, 1); renderCart(); };

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart empty', 'error');
  const total = CART.reduce((s, c) => s + c.line_total, 0) - (Number($('saleDiscount').value) || 0);
  const paid = Number($('salePaid').value) || 0;
  
  $('btnSaveSale').disabled = true;
  try {
    // RPC WITHOUT p_shop_id (Single System)
    const { data, error } = await supabase.rpc('create_sale_single', {
      p_customer_name: $('saleCustName').value.trim() || 'Walk-in',
      p_customer_phone: $('saleCustPhone').value.trim() || null,
      p_subtotal: CART.reduce((s, c) => s + c.line_total, 0), p_discount: Number($('saleDiscount').value) || 0, p_total: total, p_paid: paid,
      p_payment_method: 'cash', p_notes: null,
      p_items: CART.map(c => ({ product_id: c.product_id, product_name: c.product_name, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total }))
    });
    if (error) throw new Error(error.message);
    
    toast('Sale Saved!', 'success'); CART = []; renderCart(); loadSaleProducts(); loadOverview();
  } catch (e) { toast(e.message, 'error'); } finally { $('btnSaveSale').disabled = false; }
};

// INITIAL LOAD
renderCart();
loadOverview();
