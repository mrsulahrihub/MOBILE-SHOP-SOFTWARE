// =====================================================
// INVENTORY MODULE — Standalone JS
// =====================================================
import { supabase } from './config.js';

// ---------- SESSION GUARD ----------
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
const SHOP_ID = localStorage.getItem('shop_id');

if (!SHOP_ID && (!SESSION || !SESSION.staff_id)) {
  window.location.replace('./login.html');
  throw new Error('Redirecting to login...');
}

// ---------- HELPERS ----------
const $ = id => document.getElementById(id);
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function toast(msg, type = 'info') {
  const host = $('toastHost') || document.body;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:12px 18px;border-radius:8px;z-index:9999;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,.2)';
  if (type === 'error') el.style.background = '#dc2626';
  if (type === 'success') el.style.background = '#16a34a';
  host.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ---------- INVENTORY LOGIC ----------
async function loadInventory() {
  // 1. Load racks into the filter dropdown (only once)
  const { data: rackRows } = await supabase
    .from('racks')
    .select('id,name')
    .order('name');

  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) {
    rf.innerHTML =
      '<option value="">All Racks</option>' +
      (rackRows || [])
        .map(r => `<option value="${r.id}">${esc(r.name)}</option>`)
        .join('');
  }

  // 2. Load products (lowest stock first), optionally filtered by rack
  let iq = supabase
    .from('products')
    .select('*,racks!fk_products_racks(name)')
    .order('quantity', { ascending: true });

  if (rf?.value) iq = iq.eq('rack_id', rf.value);

  const { data: low } = await iq.limit(200);

  // 3. Render Low Stock table
  const t = $('lowStockTable');
  if (!low || !low.length) {
    t.innerHTML = '<div class="empty">No products.</div>';
  } else {
    t.innerHTML = `
      <table class="data">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>IMEI</th>
            <th>📦 Rack</th>
            <th class="num">Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${low.map(p => `
            <tr>
              <td>${esc(p.name)}</td>
              <td><small>${esc(p.category || '—')}</small></td>
              <td><small>${esc(p.imei_1 || '—')}</small></td>
              <td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td>
              <td class="num">${p.quantity}</td>
              <td>
                ${p.quantity <= p.min_stock
                  ? '<span class="pill red">Low</span>'
                  : '<span class="pill green">OK</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // 4. Load stock movements (sales OUT + purchases IN)
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase
      .from('sale_items')
      .select('product_name,quantity,created_at,sales!inner(invoice_no)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('purchase_items')
      .select('product_name,quantity,created_at,purchases!inner(invoice_no)')
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  const movements = [
    ...(saleItems || []).map(m => ({
      type: 'OUT',
      name: m.product_name,
      qty: m.quantity,
      ref: m.sales?.invoice_no,
      date: m.created_at
    })),
    ...(purchItems || []).map(m => ({
      type: 'IN',
      name: m.product_name,
      qty: m.quantity,
      ref: m.purchases?.invoice_no,
      date: m.created_at
    }))
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 60);

  $('movementsTable').innerHTML = movements.length
    ? `
      <table class="data">
        <thead>
          <tr>
            <th>Type</th>
            <th>Product</th>
            <th class="num">Qty</th>
            <th>Ref</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${movements.map(m => `
            <tr>
              <td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td>
              <td>${esc(m.name)}</td>
              <td class="num">${m.qty}</td>
              <td><small>${esc(m.ref || '—')}</small></td>
              <td><small>${new Date(m.date).toLocaleString()}</small></td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<div class="empty">No movements.</div>';
}

// ---------- EVENT BINDINGS ----------
$('inventoryRackFilter')?.addEventListener('change', loadInventory);
$('btnRefreshInventory')?.addEventListener('click', () => {
  toast('Refreshing inventory...', 'info');
  loadInventory();
});

// ---------- INITIAL LOAD ----------
loadInventory();
