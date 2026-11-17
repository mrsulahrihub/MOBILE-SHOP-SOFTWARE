// =====================================================
// BM MOBILE ZONE - DASHBOARD CONTROLLER (v9.7 Multi-Tenant)
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

document.getElementById('logoutBtn').addEventListener('click', () => {
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

// --- 3. SHORTCUTS (Keyboard Mastery) ---
document.addEventListener('keydown', (e) => {
  // Ignore if user is typing in an input
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
    if (e.key === 'Escape') closeModal(); // Esc to close modal
    return;
  }

  // Navigation Shortcuts (Alt + Key)
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
    
    // Action Shortcuts
    if (key === 's') { e.preventDefault(); $('btnSaveSale')?.click(); }
  }

  // Modal Close
  if (e.key === 'Escape') closeModal();
});

// --- 4. THEME & SIDEBAR (Waise hi rahega) ---
// ... (Aapka theme switcher aur sidebar logic yahan aayega) ...

// --- 5. NAVIGATION (Super Admin Rule: Load Module with Shop_ID) ---
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
    document.getElementById('sidebarHandle').classList.remove('open');
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
    case 'profitloss': return; // Handled by button
    case 'transactions': return loadTransactions();
    case 'settings': return loadSettings();
  }
}

// --- 6. OVERVIEW (Data Isolation) ---
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

  // ... (Low stock alert logic) ...
}

// --- 7. SALES / POS (RPC + Shop ID) ---
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;

async function loadPosCustomers() {
  const { data } = await supabase.from('customers').select('id,name,phone').eq('shop_id', SHOP_ID).order('name');
  POS_CUSTOMERS = data || [];
  $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');
}

async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*').eq('shop_id', SHOP_ID).gt('quantity', 0).order('name');
  $('saleProductSelect').innerHTML = '<option value="">— Choose product —</option>' + (data || []).map(p => {
    const catDisplay = p.category ? `[${p.category}${p.sub_category ? ' - ' + p.sub_category : ''}]` : '';
    return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-stock="${p.quantity}">${esc(p.name)} ${catDisplay} — ${fmt(p.sale_price)} (${p.quantity} stock)</option>`;
  }).join('');
}

// ... (Cart logic: Add, Render, Remove) ...

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
      let { data: found } = await supabase.from('customers')
        .select('id').eq('shop_id', SHOP_ID)
        .or(`phone.eq.${custPhone},name.ilike.${custName}`).maybeSingle();

      if (!found) {
        const { data: created, error: ce } = await supabase.from('customers')
          .insert({ shop_id: SHOP_ID, name: custName, phone: custPhone || null, opening_balance: 0 })
          .select('id').single();
        if (ce) throw new Error(ce.message);
        found = created;
      }
      customerId = found.id;
    }
    
    // Super Admin Rule: p_shop_id is mandatory in RPC
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

// ... (Baaki saara code: Products, Inventory, Racks, Repairs, Purchases, Customers, Suppliers, Credit, Expenses, P&L, Transactions, Reports, Settings waise hi rahega, bas har jagah .eq('shop_id', SHOP_ID) lazmi check karein) ...

// INITIAL LOAD
renderCart();
loadOverview();
