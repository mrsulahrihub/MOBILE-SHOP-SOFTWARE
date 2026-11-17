// =====================================================
// BM MOBILE ZONE - MAIN DASHBOARD CONTROLLER (v9.7)
// =====================================================
import { supabase } from './config.js';

// --- 1. MULTI-TENANT AUTH GUARD (Super Admin Rule) ---
const SHOP_ID = localStorage.getItem('shop_id');
const SHOP_NAME = localStorage.getItem('shop_name') || 'BM MOBILE ZONE';

if (!SHOP_ID) {
  window.location.replace('./login.html');
  throw new Error('Unauthorized: No shop_id found.');
}

// UI Update
document.getElementById('userName').textContent = SHOP_NAME;
document.getElementById('userRole').textContent = 'ADMIN';
document.getElementById('welcomeName').textContent = SHOP_NAME;
document.getElementById('userAvatar').textContent = SHOP_NAME.charAt(0).toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('shop_id');
  localStorage.removeItem('shop_name');
  location.replace('./login.html');
});

// --- 2. HELPERS ---
const $ = (id) => document.getElementById(id);
const fmt = (n) => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
    // Close sidebar on mobile
    document.getElementById('mainSidebar').classList.remove('show');
  });
});

async function loadModule(mod) {
  switch (mod) {
    case 'overview': return loadOverview();
    case 'products': return loadProducts();
    case 'sales': return loadSaleProducts();
    // ... (Add other modules logic here)
  }
}

// --- 5. OVERVIEW (Data Isolation) ---
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

  // Recent Sales
  const { data: recent } = await supabase.from('sales').select('*').eq('shop_id', SHOP_ID).order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>';
  else $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Total</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

// --- 6. SALES / POS ---
let CART = [];
let POS_CUSTOMERS = [];

async function loadSaleProducts() {
  const { data: custs } = await supabase.from('customers').select('id,name,phone').eq('shop_id', SHOP_ID).order('name');
  POS_CUSTOMERS = custs || [];
  $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');

  const { data } = await supabase.from('products').select('*').eq('shop_id', SHOP_ID).gt('quantity', 0).order('name');
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + (data || []).map(p => `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}">${esc(p.name)} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`).join('');
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect'); const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return alert('Select product');
  const existing = CART.find(c => c.product_id === opt.value);
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({ product_id: opt.value, product_name: opt.dataset.name, unit_price: Number(opt.dataset.price), quantity: 1, line_total: Number(opt.dataset.price) });
  renderCart();
};

function renderCart() {
  if (!CART.length) $('cartItems').innerHTML = '<div class="empty">Cart is empty</div>';
  else $('cartItems').innerHTML = `<table class="data">...render cart items...</table>`; // (Aap apna cart render logic yahan daal sakte hain)
  
  const sub = CART.reduce((s, c) => s + c.line_total, 0);
  $('cartSubtotal').textContent = fmt(sub);
  $('cartTotal').textContent = fmt(sub - (Number($('saleDiscount').value) || 0));
}

$('btnSaveSale').onclick = async () => {
  if (!CART.length) return alert('Cart empty');
  const total = CART.reduce((s, c) => s + c.line_total, 0) - (Number($('saleDiscount').value) || 0);
  const paid = Number($('salePaid').value) || 0;
  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  
  $('btnSaveSale').disabled = true;
  try {
    // Super Admin Rule: p_shop_id pass karna lazmi hai
    const { data, error } = await supabase.rpc('create_sale', {
      p_shop_id: SHOP_ID,
      p_customer_id: null, p_customer_name: custName, p_customer_phone: $('saleCustPhone').value.trim() || null,
      p_subtotal: CART.reduce((s, c) => s + c.line_total, 0), p_discount: Number($('saleDiscount').value) || 0, p_total: total, p_paid: paid,
      p_payment_method: $('salePaymentMethod').value, p_notes: null,
      p_items: CART.map(c => ({ product_id: c.product_id, product_name: c.product_name, quantity: c.quantity, unit_price: c.unit_price, line_total: c.line_total }))
    });
    if (error) throw new Error(error.message);
    
    alert('Sale Saved Successfully!');
    CART = []; renderCart(); loadSaleProducts(); loadOverview();
  } catch (e) { alert(e.message); } finally { $('btnSaveSale').disabled = false; }
};

// INITIAL LOAD
renderCart();
loadOverview();
