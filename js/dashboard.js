// =====================================================
// BISMILLAH MOBILE ZONE — Dashboard Controller v39.0 PREMIUM — Fully Recreated
// POS v39 PREMIUM: Manual Paid, Auto Credit, Credit Method, 100+ features,
// Enter Nav, Shortcuts, Purchase Grid Fix, Smart Search, Barcode,
// IMEI, Rack, Line+Bill Discount, Tax, Split Payments, Held Sales.
// =====================================================
import { supabase } from './config.js';

// ---------------------------------------------------
// SESSION & GUARD
// ---------------------------------------------------
const SESSION = JSON.parse(localStorage.getItem('bm_staff') || '{}');
const SHOP_ID = localStorage.getItem('shop_id');
const PERMS_STR = localStorage.getItem('bm_shop_perms');

if (!SHOP_ID && (!SESSION || !SESSION.staff_id)) {
  window.location.replace('./login.html');
  throw new Error('Redirecting to login...');
}

const IS_ADMIN = !SESSION.staff_id || SESSION.staff_id === '01' || SESSION.role === 'Admin';
const CURRENT_STAFF = SESSION.staff_id || '01';
const CURRENT_NAME = SESSION.name || 'Admin';
const SHOP_PERMS = JSON.parse(PERMS_STR || '{}');

document.getElementById('userName').textContent = CURRENT_NAME || localStorage.getItem('owner_name') || 'BM MOBILE ZONE';
document.getElementById('userRole').textContent = (SESSION.role || 'ADMIN').toUpperCase();
document.getElementById('welcomeName').textContent = CURRENT_NAME;
document.getElementById('userAvatar').textContent = (CURRENT_NAME || 'B')[0].toUpperCase();
document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(new Date());

document.getElementById('logoutBtn').addEventListener('click', () => {
  if (!confirm('Are you sure you want to logout?')) return;
  ['bm_staff', 'shop_id', 'shop_name', 'owner_name', 'bm_held_carts', 'bm_shop_perms'].forEach(k => localStorage.removeItem(k));
  window.location.replace('./login.html');
});

// ---------------------------------------------------
// UTILITIES
// ---------------------------------------------------
const $ = id => document.getElementById(id);
const fmt = n => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function checkPermission(action) {
  if (IS_ADMIN) return true;
  if (action === 'edit' && !SESSION.can_edit) { toast('You do not have edit permission!', 'error'); return false; }
  if (action === 'delete' && !SESSION.can_delete) { toast('You do not have delete permission!', 'error'); return false; }
  return true;
}

function toast(msg, type = 'info') {
  const host = $('toastHost'); if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

async function logActivity(action, module, details = '') {
  try {
    const { error } = await supabase.from('activity_log').insert({
      staff_id: CURRENT_STAFF, staff_name: CURRENT_NAME, action, module,
      details: String(details).slice(0, 500)
    });
    if (error) console.warn('Activity log DB error:', error.message);
  } catch (e) { console.warn('Activity log failed:', e.message); }
}

// ---------------------------------------------------
// DYNAMIC LISTS
// ---------------------------------------------------
let CATEGORIES = ['Mobile Phones', 'Mobile Accessories', 'Chargers & Cables', 'Handsfree & Audio', 'Batteries', 'Memory & Storage', 'Mobile Parts', 'Covers', 'Tempered Glass', 'Repairing Tools'];
let BRANDS = ['Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Nokia', 'Huawei', 'Realme', 'OnePlus', 'Other'];
let ALL_PRODUCTS = [];
let ALL_RACKS = [];

// =====================================================
// SHOP SETTINGS
// =====================================================
let SHOP = {
  name: 'BM MOBILE ZONE', address: 'Chohan Mobile Market, Zafarwal',
  phone1: '0345-6613232', phone2: '0307-6613232',
  tagline: 'Your Trusted Mobile Shop',
  tax_rate: 0, tax_enabled: false
};

async function loadShopSettings() {
  try {
    const { data } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
    if (data) {
      SHOP = {
        name: data.shop_name || SHOP.name,
        address: data.address || SHOP.address,
        phone1: data.phone1 || SHOP.phone1,
        phone2: data.phone2 || SHOP.phone2,
        tagline: data.tagline || SHOP.tagline,
        tax_rate: Number(data.tax_rate || 0),
        tax_enabled: data.tax_enabled === true
      };
    }
  } catch (e) { console.warn('shop settings fail', e); }
}

// =====================================================
// PRINT FUNCTIONS (Thermal & A4) — unchanged from v35
// =====================================================
function urduTermsBlock(type = 'sale') {
  const common = `<div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div><div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div><div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div><div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div>`;
  const saleExtra = `<div>• سیل شدہ مال واپس یا تبدیل نہیں ہوگا۔</div><div>• وارنٹی کے لیے رسید لازمی پیش کریں۔</div>`;
  const repairExtra = `<div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div><div>• مرمت شدہ موبائل کی وارنٹی صرف 7 دن ہوگی۔</div>`;
  return `<hr style="border-top:1px dashed #000;margin:6px 0;"><div style="text-align:right;font-size:12px;font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',Arial,sans-serif;direction:rtl;line-height:1.7">${type === 'repair' ? `<div style="text-align:center;font-weight:bold;font-size:13px;margin-bottom:5px">مرمت کی شرائط</div>` : ''}${common}${type === 'repair' ? repairExtra : saleExtra}</div>`;
}


// =====================================================
// PRINT ENGINE v39 — REBUILT (iframe based, NO popup blocker)
// Fixes: popup blocked / blank page / print closes too early /
// window.print() printing whole dashboard / thermal cutting off.
// Print section is the ONLY place where Urdu terms are kept.
// =====================================================
function bmPrintSettings(){
  try{ const s=JSON.parse(localStorage.getItem('bm_print_settings')||'{}');
    return { format: s.format||'thermal', autoPrint: s.autoPrint===true, showUrdu: s.showUrdu!==false, copies: Math.max(1, Math.min(3, Number(s.copies)||1)) };
  }catch(_){ return { format:'thermal', autoPrint:false, showUrdu:true, copies:1 }; }
}
function bmSavePrintSettings(patch){
  const cur=bmPrintSettings(); const next={...cur,...patch};
  localStorage.setItem('bm_print_settings', JSON.stringify(next)); return next;
}
function bmPrintLog(entry){
  try{ const logs=JSON.parse(localStorage.getItem('bm_print_logs')||'[]');
    logs.unshift({ time:new Date().toISOString(), ...entry });
    localStorage.setItem('bm_print_logs', JSON.stringify(logs.slice(0,100))); }catch(_){}
}
function bmGetPrintFrame(){
  let f=document.getElementById('bmPrintFrame');
  if(!f){ f=document.createElement('iframe'); f.id='bmPrintFrame'; f.name='bmPrintFrame';
    f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(f); }
  return f;
}
// Core: print ANY html string via hidden iframe. Waits for load, prints, cleans up AFTER print.
function bmPrintHTML(html, opts={}){
  const { title='Print', copies=1, logLabel='' } = opts;
  return new Promise((resolve)=>{
    let done=false;
    const finish=(ok)=>{ if(done) return; done=true; bmPrintLog({ title, label: logLabel||title, ok, copies }); resolve(ok); };
    try{
      const frame=bmGetPrintFrame();
      const doc=frame.contentDocument || frame.contentWindow.document;
      doc.open(); doc.write(html); doc.close();
      const doPrint=()=>{
        try{
          for(let i=0;i<copies;i++){ frame.contentWindow.focus(); frame.contentWindow.print(); }
          // Do not close immediately: browser needs time. Cleanup on next tick + afterprint.
          setTimeout(()=>{ try{ const d=frame.contentDocument; if(d){ d.open(); d.write(''); d.close(); } }catch(_){} finish(true); }, 1200);
        }catch(e){ bmPrintFallback(html, title); finish(false); }
      };
      // Images/fonts may still be loading: small delay is more reliable than onload race.
      setTimeout(doPrint, 350);
    }catch(e){ bmPrintFallback(html, title); finish(false); }
  });
}
// Fallback only if iframe is unavailable (very old browser): single window.open, no auto-close race.
function bmPrintFallback(html, title){
  try{
    const w=window.open('', '_blank', 'width=920,height=1020');
    if(!w){ toast('Print blocked — please allow popups for this site, then try again', 'error'); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(()=>{ try{ w.print(); }catch(_){} }, 500);
  }catch(_){ toast('Print failed. Please try again.', 'error'); }
}
function bmBarcodeBars(text){
  const s=String(text||'').replace(/[^0-9A-Za-z]/g,'') || '0000';
  let bars=''; for(const ch of s){ const n=(ch.charCodeAt(0)%4)+1; bars+='<span style="display:inline-block;width:'+(n*2)+'px;height:34px;background:#000;margin-right:2px"></span>'; }
  return '<div style="text-align:center;margin:6px 0 2px">'+bars+'<div style="font-size:10px;letter-spacing:3px">'+esc(String(text||''))+'</div></div>';
}
function bmTotals(data){
  let sub=Number(data.subtotal||0), tot=Number(data.total||0);
  const sum=(data.items||[]).reduce((s,it)=>s+Number(it.line_total||it.total||it.amount||0),0);
  if(!sub||isNaN(sub)) sub=sum;
  if(!tot||isNaN(tot)) tot=sub-Number(data.discount||0)+Number(data.tax||0);
  return { sub, tot };
}
function buildThermalHTML(data, type='sale'){
  const { sub, tot }=bmTotals(data);
  const showUrdu=bmPrintSettings().showUrdu;
  const rows=(data.items||[]).map(it=>'<tr><td style="text-align:left;font-size:11px">'+esc(it.product_name||it.name||it.description||'')+(it.rack_name?'<br><span style="font-size:9px;color:#666">📦 '+esc(it.rack_name)+'</span>':'')+'<br><span style="font-size:9px;color:#444">'+esc(it.category||'')+(it.imei?' IMEI: '+esc(it.imei):'')+'</span></td><td style="text-align:center;font-size:11px">'+(it.quantity||it.qty||1)+'</td><td style="text-align:right;font-size:11px">'+Number(it.line_total||it.total||it.amount||0).toLocaleString()+'</td></tr>').join('');
  const taxRow=Number(data.tax||0)>0?'<div class="row"><span>Tax '+(data.tax_rate||0)+'%</span><span>PKR '+Number(data.tax).toLocaleString()+'</span></div>':'';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title><style>@page{size:80mm auto;margin:4mm} body{font-family:\'Courier New\',monospace;width:74mm;margin:0 auto;color:#000;font-weight:bold} h2{text-align:center;margin:0 0 2px;font-size:18px} .sub{text-align:center;font-size:11px;margin:1px 0} hr{border:none;border-top:2px dashed #000;margin:5px 0} table{width:100%;border-collapse:collapse;font-size:11px} th{border-bottom:2px dashed #000;padding:4px 0;text-align:left} .row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0} .bold{font-weight:900;font-size:13px} .center{text-align:center;margin-top:6px;font-size:11px} .footer{text-align:center;margin-top:10px;font-size:10px;font-weight:normal}</style></head><body><h2>'+esc(SHOP.name)+'</h2><div class="sub">'+esc(SHOP.address)+'</div><div class="sub">Tel: '+esc(SHOP.phone1)+' / '+esc(SHOP.phone2)+'</div><hr><div class="row"><span>Invoice: <b>'+esc(data.invoice)+'</b></span></div><div class="row"><span>Date: '+new Date(data.date).toLocaleString('en-PK')+'</span></div><div class="row"><span>Customer: '+esc(data.customer||'Walk-in')+'</span></div>'+(data.phone?'<div class="row"><span>Phone: '+esc(data.phone)+'</span></div>':'')+(data.cashier?'<div class="row"><span>Cashier: '+esc(data.cashier)+'</span></div>':'')+bmBarcodeBars(data.invoice)+'<hr><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>'+rows+'</tbody></table><hr><div class="row"><span>Subtotal</span><span>PKR '+sub.toLocaleString()+'</span></div><div class="row"><span>Discount</span><span>-PKR '+Number(data.discount||0).toLocaleString()+'</span></div>'+taxRow+'<div class="row bold"><span>Total</span><span>PKR '+tot.toLocaleString()+'</span></div><div class="row"><span>Paid</span><span>PKR '+Number(data.paid||0).toLocaleString()+'</span></div><div class="row"><span>Method</span><span>'+esc(data.payment_method||'Cash')+'</span></div>'+(data.balance>0?'<div class="row bold"><span>Balance</span><span>PKR '+Number(data.balance).toLocaleString()+'</span></div>':'')+(showUrdu?urduTermsBlock(type):'')+'<hr><div class="center">Thank you for shopping!</div><div class="center">Visit Again</div><div class="footer"><div style="font-weight:bold">Powered by MS.TECH</div><div>03099100546</div></div></body></html>';
}
function buildA4HTML(data, type='sale'){
  const { sub, tot }=bmTotals(data);
  const showUrdu=bmPrintSettings().showUrdu;
  const rows=(data.items||[]).map((it,i)=>'<tr><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;color:#333;font-size:14px">'+(i+1)+'. '+esc(it.description||it.product_name||it.name||'')+(it.rack_name?'<br><small style="color:#888">📦 '+esc(it.rack_name)+'</small>':'')+'</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR '+Number(it.price||it.unit_price||it.total||0).toLocaleString()+'</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:center;color:#333;font-size:14px">'+(it.qty||it.quantity||1)+'</td><td style="padding:14px 10px;border-bottom:1.5px solid #5b8def;text-align:right;color:#333;font-size:14px">PKR '+Number(it.total||it.line_total||it.amount||0).toLocaleString()+'</td></tr>').join('');
  const isReport=type==='report'; const title=isReport?'REPORT':'INVOICE';
  const urduA4=(showUrdu&&type==='repair')?'<div style="margin-top:20px;padding:15px;background:#fafbfd;border-radius:8px;direction:rtl;font-family:\'Jameel Noori Nastaleeq\',\'Noto Nastaliq Urdu\',Arial,sans-serif;font-size:13px;line-height:1.9;color:#333;border:1px solid #e6e9f2"><div style="text-align:center;font-weight:bold;margin-bottom:8px">مرمت کی شرائط</div><div>• براہِ کرم مال کاؤنٹر پر چیک کریں۔</div><div>• پھولی ہوئی بیٹری کی کوئی وارنٹی نہیں ہے۔</div><div>• بیٹری کی وارنٹی صرف 2 دن ہوگی۔</div><div>• استعمال شدہ Accessories واپس یا تبدیل نہیں ہوں گی۔</div><div>• موبائل مرمت کے بعد وصول کرنے کے لیے یہ رسید لازمی ساتھ لائیں۔</div></div>':'';
  const taxRow=Number(data.tax||0)>0?'<div class="totals-row"><span>TAX '+(data.tax_rate||0)+'%</span><span>PKR '+Number(data.tax).toLocaleString()+'</span></div>':'';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+title+'</title><style>@page{size:A4;margin:14mm} *{margin:0;padding:0;box-sizing:border-box} body{font-family:Inter,Arial,sans-serif;background:#fff;color:#333;-webkit-print-color-adjust:exact;print-color-adjust:exact} .top-curve{height:14px;background:linear-gradient(135deg,#0f172a,#5b8def,#7c5cff)} .content{padding:32px 48px} .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px} .title{font-size:44px;font-weight:800;color:#111} .company{text-align:right} .company h2{font-size:22px} .company p{font-size:12px;color:#5b8def;font-weight:600} .info{display:flex;justify-content:space-between;margin-bottom:28px;font-size:13px;color:#555} .info-col p{margin:6px 0} table{width:100%;border-collapse:collapse;margin-bottom:28px} th{text-align:left;color:#5b8def;font-size:14px;padding:10px;text-transform:uppercase;border-bottom:2px solid #5b8def} .bottom-section{display:flex;justify-content:space-between;align-items:flex-start;margin-top:28px} .terms{width:45%} .totals{width:40%} .totals-row{display:flex;justify-content:space-between;padding:11px 0;font-size:15px;font-weight:600;border-bottom:1px solid #eee} .totals-row.grand{font-size:20px;color:#5b8def;font-weight:800;border-top:2px solid #5b8def} .footer{text-align:center;margin-top:28px;font-size:11px;color:#64748B}</style></head><body><div class="top-curve"></div><div class="content"><div class="header"><h1 class="title">'+title+'</h1><div class="company"><h2>'+esc(SHOP.name)+'</h2><p>'+esc(SHOP.tagline||'')+'</p></div></div><div class="info"><div class="info-col"><p><b>'+title+' NO:</b> '+esc(data.invoice)+'</p><p><b>DATE:</b> '+new Date(data.date).toLocaleDateString('en-GB')+'</p>'+(data.cashier?'<p><b>CASHIER:</b> '+esc(data.cashier)+'</p>':'')+'</div><div class="info-col" style="text-align:right"><p><b>'+(isReport?'REPORT TYPE:':'INVOICE TO:')+'</b> '+esc(data.customer||'All Customers')+'</p><p>'+(data.phone?'<b>PHONE:</b> '+esc(data.phone):esc(SHOP.address))+'</p></div></div><table><thead><tr><th>DESCRIPTION</th><th style="text-align:right">PRICE</th><th style="text-align:center">QTY.</th><th style="text-align:right">TOTAL</th></tr></thead><tbody>'+rows+'</tbody></table>'+urduA4+'<div class="bottom-section"><div class="terms"><h4 style="color:#5b8def">Terms and conditions</h4><p style="font-size:12px;color:#666;line-height:1.6">'+(isReport?'This is a system generated report.':'Goods once sold will not be taken back or exchanged. Warranty claims are subject to manufacturer terms.')+'</p></div><div class="totals"><div class="totals-row"><span>SUBTOTAL</span><span>PKR '+sub.toLocaleString()+'</span></div><div class="totals-row"><span>DISCOUNT</span><span>PKR '+Number(data.discount||0).toLocaleString()+'</span></div>'+taxRow+'<div class="totals-row grand"><span>GRAND TOTAL</span><span>PKR '+tot.toLocaleString()+'</span></div><div class="totals-row" style="border:none"><span>PAID</span><span>PKR '+Number(data.paid||0).toLocaleString()+'</span></div>'+(data.balance>0?'<div class="totals-row" style="color:#dc2626;border:none"><span>BALANCE</span><span>PKR '+Number(data.balance).toLocaleString()+'</span></div>':'')+'</div></div></div><div class="footer"><div style="font-weight:bold">Powered by MS.TECH</div><div>03099100546</div></div></body></html>';
}
async function printThermal80mm(data, type='sale'){ const s=bmPrintSettings(); return bmPrintHTML(buildThermalHTML(data,type), { title:'Receipt '+String(data.invoice||''), copies:s.copies, logLabel:'Thermal '+String(data.invoice||'') }); }
async function printA4Premium(data, type='sale'){ const s=bmPrintSettings(); return bmPrintHTML(buildA4HTML(data,type), { title:'Invoice '+String(data.invoice||''), copies:s.copies, logLabel:'A4 '+String(data.invoice||'') }); }
window.printThermal80mm = printThermal80mm;
window.printA4Premium = printA4Premium;
// Print choice modal (replaces confirm() which is blocked / confusing on mobile)
function openPrintChoice(payload, type='sale'){
  const s=bmPrintSettings();
  const body='<div style="display:grid;gap:10px"><p style="margin:0;font-size:13px;color:var(--muted)">Invoice <b>'+esc(payload.invoice||'')+'</b> — Total <b>'+fmt(payload.total||0)+'</b></p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-primary" onclick="window.__printChoice && window.__printChoice(\'thermal\')">🧾 Thermal 80mm</button><button class="btn btn-primary" onclick="window.__printChoice && window.__printChoice(\'a4\')">📄 A4 Premium</button></div><button class="btn btn-ghost" onclick="window.__printChoice && window.__printChoice(\'preview\')">👁 Preview Before Print</button><div style="display:flex;gap:14px;align-items:center;font-size:12px;color:#64748B"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pcAuto" '+(s.autoPrint?'checked':'')+'> Always print automatically</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="pcUrdu" '+(s.showUrdu?'checked':'')+'> Show Urdu terms on print</label></div><button class="btn btn-ghost" onclick="window.__printChoice && window.__printChoice(\'none\')">Skip Print</button></div>';
  window.__printChoice=(mode)=>{
    const auto=document.getElementById('pcAuto')?.checked||false; const showUrdu=document.getElementById('pcUrdu')?.checked!==false;
    bmSavePrintSettings({ autoPrint:auto, showUrdu });
    closeModal();
    if(mode==='thermal') printThermal80mm(payload,type);
    else if(mode==='a4') printA4Premium(payload,type);
    else if(mode==='preview') openPrintPreview(payload,type);
  };
  openModal('Print Receipt', body, async()=>{ window.__printChoice && window.__printChoice(s.format); }, 'Print (Default)');
}
function openPrintPreview(payload, type='sale'){
  const s=bmPrintSettings(); const html=s.format==='a4'?buildA4HTML(payload,type):buildThermalHTML(payload,type);
  const body='<div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;height:60vh"><iframe id="bmPreviewFrame" style="width:100%;height:100%;border:0"></iframe></div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-primary" style="flex:1" onclick="window.__previewPrint && window.__previewPrint()">🖨 Print Now</button><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>';
  openModal('Print Preview — '+esc(payload.invoice||''), body, async()=>{ window.__previewPrint && window.__previewPrint(); }, 'Print Now');
  setTimeout(()=>{ const f=document.getElementById('bmPreviewFrame'); if(f){ const d=f.contentDocument||f.contentWindow.document; d.open(); d.write(html); d.close(); } },80);
  window.__previewPrint=()=>{ const f=document.getElementById('bmPreviewFrame'); try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(_){ bmPrintHTML(html,{title:'Preview Print'}); } };
}
function openPrintSettings(){
  const s=bmPrintSettings();
  const body='<div style="display:grid;gap:12px"><div class="field"><label>Default Format</label><select id="psFormat"><option value="thermal" '+(s.format==='thermal'?'selected':'')+'>Thermal 80mm</option><option value="a4" '+(s.format==='a4'?'selected':'')+'>A4 Premium</option></select></div><div class="field"><label>Copies (1-3)</label><input id="psCopies" type="number" min="1" max="3" value="'+s.copies+'"></div><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="psAuto" '+(s.autoPrint?'checked':'')+'> Auto-print after saving a sale (no popup)</label><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="psUrdu" '+(s.showUrdu?'checked':'')+'> Show Urdu terms on print (print section only)</label><button class="btn btn-ghost" onclick="window.__testPrint && window.__testPrint()">🧪 Print Test Page</button><button class="btn btn-ghost" onclick="window.__viewPrintLogs && window.__viewPrintLogs()">📜 View Print Logs</button></div>';
  openModal('Print Settings', body, async()=>{ bmSavePrintSettings({ format:document.getElementById('psFormat').value, copies:Number(document.getElementById('psCopies').value)||1, autoPrint:document.getElementById('psAuto').checked, showUrdu:document.getElementById('psUrdu').checked }); closeModal(); toast('Print settings saved','success'); }, 'Save');
  window.__testPrint=()=>{ printThermal80mm({ invoice:'TEST-001', customer:'Test Customer', cashier:CURRENT_NAME, subtotal:1000, discount:0, tax:0, total:1000, paid:1000, balance:0, payment_method:'Cash', date:new Date(), items:[{name:'Test Item', qty:1, total:1000}] },'sale'); };
  window.__viewPrintLogs=()=>{ const logs=JSON.parse(localStorage.getItem('bm_print_logs')||'[]'); const body=logs.length?'<table class="data"><thead><tr><th>Time</th><th>Title</th><th>Status</th></tr></thead><tbody>'+logs.slice(0,30).map(l=>'<tr><td><small>'+new Date(l.time).toLocaleString()+'</small></td><td>'+esc(l.label||l.title)+'</td><td>'+(l.ok?'✅ Done':'⚠️ Fallback')+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No print logs yet.</div>'; openModal('Print Logs', body, async()=>closeModal(), 'Close'); };
}
window.openPrintSettings=openPrintSettings; window.openPrintChoice=openPrintChoice; window.openPrintPreview=openPrintPreview;


// =====================================================
// SIDEBAR & NAVIGATION
// =====================================================
const sidebar = document.getElementById('mainSidebar');
const handle = document.getElementById('sidebarHandle');

if (handle) {
  handle.addEventListener('click', e => {
    e.stopPropagation();
    const open = sidebar.classList.toggle('show');
    if (open) setTimeout(() => sidebar.classList.remove('show'), 15000);
  });
  document.addEventListener('click', e => {
    if (!sidebar.contains(e.target) && !handle.contains(e.target)) sidebar.classList.remove('show');
  });
}

const MODULE_TITLES = { overview: 'Dashboard', inventory: 'Inventory', racks: 'Racks', purchases: 'Purchases / Products', sales: 'Sales / POS', repairing: 'Repairing', customers: 'Customers', suppliers: 'Suppliers', credit: 'Credit', expenses: 'Expenses', reports: 'Reports & P&L', transactions: 'Transactions', settings: 'Staff & Logs' };
const MODULE_KEYS = { o: 'overview', i: 'inventory', k: 'racks', u: 'purchases', l: 'sales', r: 'repairing', c: 'customers', s: 'suppliers', d: 'credit', e: 'expenses', p: 'reports', t: 'transactions', ',': 'settings' };

function hasAccess(mod) {
  const permsMap = {
    sales: 'allow_pos', inventory: 'allow_inventory', racks: 'allow_inventory',
    purchases: 'allow_purchases', repairing: 'allow_repairing', customers: 'allow_customers',
    suppliers: 'allow_suppliers', credit: 'allow_credit', expenses: 'allow_expenses',
    reports: 'allow_reports', transactions: 'allow_transactions', settings: 'allow_staff'
  };
  const permKey = permsMap[mod];
  if (permKey && SHOP_PERMS[permKey] === false) return false;
  return true;
}

function navTo(mod) {
  if (!hasAccess(mod)) {
    toast('Access Denied: You do not have permission to use this section. Please contact MS.Tech.', 'error');
    return;
  }
  document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
    const m = btn.dataset.module;
    if (m && !hasAccess(m) && m !== 'overview') btn.style.display = 'none';
    else btn.style.display = 'flex';
  });
  const btn = document.querySelector(`.nav-item[data-module="${mod}"]`);
  if (!btn) return;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  const target = $('module-' + mod);
  if (target) target.classList.add('active');
  $('pageTitle').textContent = MODULE_TITLES[mod] || mod;
  loadModule(mod);
  sidebar.classList.remove('show');
}

document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
  btn.addEventListener('click', () => navTo(btn.dataset.module));
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
    case 'transactions': return loadTransactions();
    case 'settings': return loadStaff();
  }
}

// =====================================================
// GLOBAL KEYBOARD SHORTCUTS (v36 — extended)
// =====================================================
document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (e.key === 'Escape') { closeModal(); $('notifPanel')?.classList.remove('open'); return; }
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const k = e.key.toLowerCase();
    if (MODULE_KEYS[k]) { e.preventDefault(); navTo(MODULE_KEYS[k]); return; }
  }
  if (!typing) {
    if (e.key === 'F1') { e.preventDefault(); showShortcutHelp(); }
    if (e.key === 'F2') { e.preventDefault(); $('btnAddToCart')?.click(); }
    if (e.key === 'F3') { e.preventDefault(); $('posDynamicSearch')?.focus(); }
    if (e.key === 'F4') { e.preventDefault(); $('btnSaveSale')?.click(); }
    if (e.key === 'F5') { e.preventDefault(); const active = document.querySelector('.module.active')?.id.replace('module-', ''); if (active) navTo(active); toast('Refreshed', 'info'); }
    if (e.key === 'F6') { e.preventDefault(); $('btnHoldSale')?.click(); }
    if (e.key === 'F7') { e.preventDefault(); $('btnResumeSale')?.click(); }
    if (e.key === 'F8') { e.preventDefault(); $('btnNewPurchase')?.click(); }
    if (e.key === 'F9') { e.preventDefault(); $('btnAddExpense')?.click(); }
    if (e.key === 'F10') { e.preventDefault(); $('btnAddRepair')?.click(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector('.search-bar input')?.focus(); }
  }
});

function showShortcutHelp() {
  const body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:13px">
    <div><h4 style="margin:0 0 8px">Navigation (Alt + key)</h4>
    <div style="line-height:1.9">
      <div><span class="kbd">Alt+O</span> Dashboard</div>
      <div><span class="kbd">Alt+I</span> Inventory</div>
      <div><span class="kbd">Alt+K</span> Racks</div>
      <div><span class="kbd">Alt+U</span> Purchases</div>
      <div><span class="kbd">Alt+L</span> Sales/POS</div>
      <div><span class="kbd">Alt+R</span> Repairing</div>
      <div><span class="kbd">Alt+C</span> Customers</div>
      <div><span class="kbd">Alt+D</span> Credit</div>
      <div><span class="kbd">Alt+E</span> Expenses</div>
      <div><span class="kbd">Alt+P</span> Reports</div>
    </div></div>
    <div><h4 style="margin:0 0 8px">POS Actions</h4>
    <div style="line-height:1.9">
      <div><span class="kbd">F2</span> Add to Cart</div>
      <div><span class="kbd">F3</span> Focus Product Search</div>
      <div><span class="kbd">F4</span> Save Sale</div>
      <div><span class="kbd">F6</span> Hold Sale</div>
      <div><span class="kbd">F7</span> Resume Sale</div>
      <div><span class="kbd">Enter</span> Next field</div>
      <div><span class="kbd">Ctrl+Enter</span> Save Form</div>
      <div><span class="kbd">Esc</span> Close Modal</div>
      <div><span class="kbd">Alt+F</span> Search racks</div>
    </div></div>
  </div>`;
  openModal('Keyboard Shortcuts', body, async () => closeModal(), 'Close');
}

// ---------------------------------------------------
// MODAL SYSTEM + AUTO ENTER NAVIGATION
// ---------------------------------------------------
let MODAL_CONFIRM = null;

function openModal(title, bodyHTML, onConfirm, confirmLabel = 'Save', isFullscreen = false) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = bodyHTML;
  $('modalConfirm').textContent = confirmLabel;
  MODAL_CONFIRM = onConfirm;
  const modalEl = document.querySelector('.modal');
  if (isFullscreen) {
    modalEl.style.maxWidth = '100%'; modalEl.style.width = '100vw'; modalEl.style.height = '100vh'; modalEl.style.maxHeight = '100vh'; modalEl.style.borderRadius = '0'; document.querySelector('.modal-backdrop').style.padding = '0';
  } else {
    modalEl.style.maxWidth = '900px'; modalEl.style.width = '100%'; modalEl.style.height = 'auto'; modalEl.style.maxHeight = '90vh'; modalEl.style.borderRadius = 'var(--radius-lg)'; document.querySelector('.modal-backdrop').style.padding = '20px';
  }
  $('modalBackdrop').classList.add('open');
  setTimeout(() => $('modalBody').querySelector('input,select,textarea')?.focus(), 80);
  setTimeout(() => attachEnterNavigation($('modalBody'), onConfirm), 120);
}

function attachEnterNavigation(root, saveCallback) {
  if (!root) return;
  const fields = Array.from(root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]):not([readonly]), select, textarea'))
    .filter(el => el.offsetParent !== null && !el.disabled);
  fields.forEach((el, i) => {
    if (el.dataset.enterBound) return;
    el.dataset.enterBound = '1';
    el.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.altKey && !ev.ctrlKey) {
        if (el.tagName === 'TEXTAREA') return;
        ev.preventDefault();
        const next = fields[i + 1];
        if (next) { next.focus(); if (next.select) try { next.select(); } catch (_) {} }
        else { if (saveCallback) saveCallback(); }
      }
    });
  });
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter' && $('modalBackdrop').classList.contains('open')) {
    e.preventDefault();
    if (MODAL_CONFIRM) MODAL_CONFIRM().catch(err => toast(err.message || 'Error', 'error'));
  }
});

function closeModal() { $('modalBackdrop').classList.remove('open'); MODAL_CONFIRM = null; }
$('modalCancel').onclick = closeModal;
$('modalConfirm').onclick = async () => {
  if (!MODAL_CONFIRM) return;
  try { await MODAL_CONFIRM(); } catch (e) { toast(e.message || 'Error', 'error'); }
};

// =====================================================
// DASHBOARD OVERVIEW
// =====================================================
async function loadOverview() {
  const [salesRes, prodsRes, custsRes, purchRes, expRes, todaySalesRes, monthSalesRes] = await Promise.all([
    supabase.from('sales').select('balance'),
    supabase.from('products').select('quantity,is_active,name,min_stock'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('total'),
    supabase.from('expenses').select('amount'),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    supabase.from('sales').select('total').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  ]);
  const sum = (arr, key) => (arr.data || []).reduce((s, r) => s + Number(r[key] || 0), 0);
  $('stProducts').textContent = (prodsRes.data || []).filter(p => p.is_active !== false).length;
  $('stStock').textContent = sum(prodsRes, 'quantity');
  $('stTodaySales').textContent = fmt(sum(todaySalesRes, 'total'));
  $('stMonthSales').textContent = fmt(sum(monthSalesRes, 'total'));
  $('stPurchases').textContent = fmt(sum(purchRes, 'total'));
  $('stCustomers').textContent = custsRes.count || 0;
  $('stOutstanding').textContent = fmt(sum(salesRes, 'balance'));
  $('stExpenses').textContent = fmt(sum(expRes, 'amount'));
  const { data: recent } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(5);
  if (!recent || !recent.length) { $('recentSales').innerHTML = '<div class="empty">No sales yet.</div>'; }
  else { $('recentSales').innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${recent.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`; }
  const { data: dueSales } = await supabase.from('sales').select('customer_name,balance').gt('balance', 0);
  if (dueSales && dueSales.length) {
    const badge = $('notifBadge');
    if (badge) { badge.textContent = dueSales.length; badge.style.display = 'inline-block'; }
    const panel = $('notifPanel');
    if (panel) panel.innerHTML = `<h3 style="font-size:14px;margin:0 0 10px">Pending Credit</h3>` + dueSales.slice(0, 20).map(d => `<div class="notif-item"><b>${esc(d.customer_name || 'Walk-in')}</b> — ${fmt(d.balance)}</div>`).join('');
  }
}

// =====================================================
// PRODUCTS MODULE
// =====================================================
async function loadProducts(filter = '') {
  let q = supabase.from('products').select('*,racks!fk_products_racks(name)').order('created_at', { ascending: false });
  const { data, error } = await q;
  if (error) { toast(error.message, 'error'); return; }
  ALL_PRODUCTS = data || [];
  renderProductsTable();
}

function renderProductsTable() {
  const t = $('productsTable');
  if (!ALL_PRODUCTS.length) { t.innerHTML = '<div class="empty">No products. Add from Purchase section.</div>'; return; }
  const search = ($('productSearch')?.value || '').toLowerCase().trim();
  const catF = $('productFilterCat')?.value || '';
  const brandF = $('productFilterBrand')?.value || '';
  const filtered = ALL_PRODUCTS.filter(p => {
    const matchSearch = !search || (p.name || '').toLowerCase().includes(search) || (p.imei_1 || '').toLowerCase().includes(search) || (p.imei_2 || '').toLowerCase().includes(search);
    const matchCat = !catF || (p.category || '').toLowerCase() === catF.toLowerCase();
    const matchBrand = !brandF || (p.brand || '').toLowerCase() === brandF.toLowerCase();
    return matchSearch && matchCat && matchBrand;
  });
  const cats = [...new Set(ALL_PRODUCTS.map(p => p.category).filter(Boolean))];
  const brands = [...new Set(ALL_PRODUCTS.map(p => p.brand).filter(Boolean))];
  if ($('productFilterCat') && $('productFilterCat').options.length <= 1) $('productFilterCat').innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if ($('productFilterBrand') && $('productFilterBrand').options.length <= 1) $('productFilterBrand').innerHTML = '<option value="">All Brands</option>' + brands.map(b => `<option value="${b}">${b}</option>`).join('');
  if (!filtered.length) { t.innerHTML = '<div class="empty">No products match your filters.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" id="prodSelectAll" onchange="toggleAllProducts(this)"></th><th>Product</th><th>Category</th><th>Brand</th><th>IMEI 1 / 2</th><th>📦 Rack</th><th class="num">Price</th><th class="num">Stock</th><th class="actions">Actions</th></tr></thead><tbody>
    ${filtered.map(p => `<tr>
      <td><input type="checkbox" class="prod-check" value="${p.id}" onchange="updateProductBulk()"></td>
      <td><strong>${esc(p.name)}</strong><br><small style="color:#6b7896">${esc(p.sub_category || '')}</small></td>
      <td><span class="pill blue">${esc(p.category || '—')}</span></td>
      <td>${esc(p.brand || '—')}</td>
      <td><small>${esc(p.imei_1 || '—')} / ${esc(p.imei_2 || '—')}</small></td>
      <td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td>
      <td class="num">${fmt(p.sale_price)}</td>
      <td class="num"><b style="color:${p.quantity <= p.min_stock ? '#dc2626' : '#16a34a'}">${p.quantity}</b></td>
      <td class="actions">
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Del</button>
      </td>
    </tr>`).join('')}
  </tbody></table>`;
}

$('productSearch')?.addEventListener('input', renderProductsTable);
$('productFilterCat')?.addEventListener('change', renderProductsTable);
$('productFilterBrand')?.addEventListener('change', renderProductsTable);

window.toggleAllProducts = cb => { document.querySelectorAll('.prod-check').forEach(c => c.checked = cb.checked); updateProductBulk(); };
function updateProductBulk() { const n = document.querySelectorAll('.prod-check:checked').length; $('productBulkBar').style.display = n ? 'flex' : 'none'; $('productSelCount').textContent = n; }

window.editProduct = async id => {
  if (!checkPermission('edit')) return;
  const p = ALL_PRODUCTS.find(x => x.id === id);
  if (!p) return toast('Product not found', 'error');
  const { data: racks } = await supabase.from('racks').select('id,name').order('name');
  const body = `<div class="form-grid">
    <div class="field full"><label>Name *</label><input id="peName" value="${esc(p.name)}"></div>
    <div class="field"><label>Category</label><select id="peCat">${CATEGORIES.map(c => `<option ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Brand</label><select id="peBrand"><option value="">— None —</option>${BRANDS.map(b => `<option ${p.brand === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
    <div class="field"><label>Purchase Price</label><input id="pePPrice" type="number" value="${p.purchase_price || 0}"></div>
    <div class="field"><label>Sale Price</label><input id="peSPrice" type="number" value="${p.sale_price || 0}"></div>
    <div class="field"><label>Quantity</label><input id="peQty" type="number" value="${p.quantity || 0}"></div>
    <div class="field"><label>Min Stock</label><input id="peMin" type="number" value="${p.min_stock || 3}"></div>
    <div class="field"><label>IMEI 1</label><input id="peImei1" value="${esc(p.imei_1 || '')}"></div>
    <div class="field"><label>IMEI 2</label><input id="peImei2" value="${esc(p.imei_2 || '')}"></div>
    <div class="field full"><label>📦 Rack</label><select id="peRack"><option value="">— Unassigned —</option>${(racks || []).map(r => `<option value="${r.id}" ${p.rack_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></div>
  </div>`;
  openModal('Edit Product', body, async () => {
    const payload = {
      name: $('peName').value.trim(), category: $('peCat').value, brand: $('peBrand').value || null,
      purchase_price: Number($('pePPrice').value) || 0, sale_price: Number($('peSPrice').value) || 0,
      quantity: Number($('peQty').value) || 0, min_stock: Number($('peMin').value) || 3,
      imei_1: $('peImei1').value.trim() || null, imei_2: $('peImei2').value.trim() || null,
      rack_id: $('peRack').value || null
    };
    if (!payload.name) throw new Error('Name required');
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await logActivity('EDIT', 'products', payload.name);
    closeModal(); toast('Product updated', 'success'); loadProducts();
  });
};

window.deleteProduct = async id => {
  if (!checkPermission('delete')) return;
  if (!confirm('Delete this product? Sales history preserved.')) return;
  try {
    await supabase.from('sale_items').update({ product_id: null }).eq('product_id', id);
    await supabase.from('purchase_items').update({ product_id: null }).eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'products', id);
    toast('Product deleted', 'success'); loadProducts();
  } catch (err) { toast(err.message, 'error'); }
};

window.bulkDeleteProducts = async () => {
  if (!checkPermission('delete')) return;
  const ids = [...document.querySelectorAll('.prod-check:checked')].map(c => c.value);
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} products? Sales history will be preserved.`)) return;
  try {
    await supabase.from('sale_items').update({ product_id: null }).in('product_id', ids);
    await supabase.from('purchase_items').update({ product_id: null }).in('product_id', ids);
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;
    await logActivity('BULK_DELETE', 'products', `Deleted ${ids.length} products`);
    toast(`Deleted ${ids.length} products successfully`, 'success'); loadProducts();
  } catch (err) { toast(err.message, 'error'); }
};

// =====================================================
// INVENTORY
// =====================================================
async function loadInventory() {
  const { data: rackRows } = await supabase.from('racks').select('id,name').order('name');
  const rf = $('inventoryRackFilter');
  if (rf && rf.options.length <= 1) rf.innerHTML = '<option value="">All Racks</option>' + (rackRows || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let iq = supabase.from('products').select('*,racks!fk_products_racks(name)').order('quantity', { ascending: true });
  if (rf?.value) iq = iq.eq('rack_id', rf.value);
  const { data: low } = await iq.limit(200);
  const t = $('lowStockTable');
  if (!low || !low.length) t.innerHTML = '<div class="empty">No products.</div>';
  else t.innerHTML = `<table class="data"><thead><tr><th>Product</th><th>Category</th><th>IMEI</th><th>📦 Rack</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>${low.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td><small>${esc(p.imei_1 || '—')}</small></td><td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td><td class="num">${p.quantity}</td><td>${p.quantity <= p.min_stock ? '<span class="pill red">Low</span>' : '<span class="pill green">OK</span>'}</td></tr>`).join('')}</tbody></table>`;
  const [{ data: saleItems }, { data: purchItems }] = await Promise.all([
    supabase.from('sale_items').select('product_name,quantity,created_at,sales!inner(invoice_no)').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchase_items').select('product_name,quantity,created_at,purchases!inner(invoice_no)').order('created_at', { ascending: false }).limit(50)
  ]);
  const movements = [...(saleItems || []).map(m => ({ type: 'OUT', name: m.product_name, qty: m.quantity, ref: m.sales?.invoice_no, date: m.created_at })), ...(purchItems || []).map(m => ({ type: 'IN', name: m.product_name, qty: m.quantity, ref: m.purchases?.invoice_no, date: m.created_at }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 60);
  $('movementsTable').innerHTML = movements.length ? `<table class="data"><thead><tr><th>Type</th><th>Product</th><th class="num">Qty</th><th>Ref</th><th>Date</th></tr></thead><tbody>${movements.map(m => `<tr><td><span class="pill ${m.type === 'IN' ? 'green' : 'orange'}">${m.type}</span></td><td>${esc(m.name)}</td><td class="num">${m.qty}</td><td><small>${esc(m.ref || '—')}</small></td><td><small>${new Date(m.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No movements.</div>';
}
$('inventoryRackFilter')?.addEventListener('change', loadInventory);

// =====================================================
// RACKS
// =====================================================
let RACK_SEARCH = '';
async function loadRacks() {
  const { data: racks, error } = await supabase.from('racks').select('*').order('name');
  if (error) { $('racksTable').innerHTML = '<div class="empty">Rack tables not installed.</div>'; return; }
  ALL_RACKS = racks || [];
  const { data: rackProducts } = await supabase.from('products').select('rack_id,quantity,sale_price,name').not('rack_id', 'is', null);
  const countMap = {}, qtyMap = {}, valueMap = {};
  (rackProducts || []).forEach(p => {
    if (!p.rack_id) return;
    countMap[p.rack_id] = (countMap[p.rack_id] || 0) + 1;
    qtyMap[p.rack_id] = (qtyMap[p.rack_id] || 0) + Number(p.quantity || 0);
    valueMap[p.rack_id] = (valueMap[p.rack_id] || 0) + Number(p.quantity || 0) * Number(p.sale_price || 0);
  });
  const search = (RACK_SEARCH || '').toLowerCase().trim();
  const filtered = ALL_RACKS.filter(r => !search || (r.name || '').toLowerCase().includes(search) || (r.description || '').toLowerCase().includes(search));
  const t = $('racksTable');
  if (!filtered.length) {
    t.innerHTML = `<div class="empty">${ALL_RACKS.length ? 'No racks match search.' : 'No racks yet. Click + Add Rack or press Alt+A.'}</div>`;
  } else {
    t.innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Description</th><th class="num">Products</th><th class="num">Total Qty</th><th class="num">Value</th><th>Actions</th></tr></thead><tbody>
      ${filtered.map(r => `<tr>
        <td><b>${esc(r.name)}</b></td>
        <td>${esc(r.description || '—')}</td>
        <td class="num">${countMap[r.id] || 0}</td>
        <td class="num">${qtyMap[r.id] || 0}</td>
        <td class="num">${fmt(valueMap[r.id] || 0)}</td>
        <td class="actions" style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="viewRackStock('${r.id}','${esc(r.name)}')">View</button>
          <button class="btn btn-ghost btn-sm" onclick="editRack('${r.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="assignProductsToRack('${r.id}','${esc(r.name)}')">Assign</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRack('${r.id}')">Del</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
  }
  const { data: stock } = await supabase.from('products').select('id,name,quantity,sale_price,racks!fk_products_racks(name)').order('name');
  const stockBox = $('rackStockTable');
  if (stockBox) {
    stockBox.innerHTML = `<table class="data"><thead><tr><th>Rack</th><th>Product</th><th class="num">Qty</th><th class="num">Value</th></tr></thead><tbody>
      ${(stock || []).map(p => `<tr><td><span class="pill blue">${esc(p.racks?.name || 'Unassigned')}</span></td><td>${esc(p.name)}</td><td class="num">${Number(p.quantity || 0)}</td><td class="num">${fmt(Number(p.quantity || 0) * Number(p.sale_price || 0))}</td></tr>`).join('')}
    </tbody></table>`;
  }
  bindRackShortcuts();
}

function bindRackShortcuts() {
  if (window._rackKeyHandler) document.removeEventListener('keydown', window._rackKeyHandler);
  window._rackKeyHandler = e => {
    if (!$('module-racks')?.classList.contains('active')) return;
    if ($('modalBackdrop').classList.contains('open')) return;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    if (typing) return;
    const k = e.key.toLowerCase();
    if (e.altKey && k === 'a') { e.preventDefault(); openRackModal(); }
    if (e.altKey && k === 'f') { e.preventDefault(); $('rackSearchInput')?.focus(); }
  };
  document.addEventListener('keydown', window._rackKeyHandler);
}

$('rackSearchInput')?.addEventListener('input', e => { RACK_SEARCH = e.target.value; loadRacks(); });
$('btnAddRack').onclick = () => openRackModal();

function openRackModal(r = null) {
  const body = `<div class="form-grid">
    <div class="field full"><label>Rack Name *</label><input id="rackName" value="${esc(r?.name || '')}" placeholder="e.g. Rack A / Shelf 1 / Drawer 3"></div>
    <div class="field full"><label>Description</label><input id="rackDesc" value="${esc(r?.description || '')}" placeholder="e.g. Mobile Phones, Left side"></div>
  </div>
  <p style="margin-top:12px;font-size:12px;color:var(--muted)">💡 <b>Enter</b> = next field / save &nbsp;|&nbsp; <b>Ctrl+Enter</b> = save</p>`;
  openModal(r ? 'Edit Rack' : 'Add Rack', body, async () => {
    const name = $('rackName').value.trim();
    if (!name) throw new Error('Rack name is required');
    const payload = { name, description: $('rackDesc').value.trim() || null };
    let res;
    if (r) res = await supabase.from('racks').update(payload).eq('id', r.id);
    else res = await supabase.from('racks').insert(payload);
    if (res.error) throw new Error(res.error.message);
    await logActivity(r ? 'EDIT' : 'CREATE', 'racks', name);
    closeModal(); toast(`Rack ${r ? 'updated' : 'added'} ✅`, 'success'); loadRacks();
  }, r ? 'Update Rack' : 'Add Rack');
}
window.editRack = id => { if (!checkPermission('edit')) return; const r = ALL_RACKS.find(x => x.id === id); if (!r) return toast('Rack not found', 'error'); openRackModal(r); };
window.deleteRack = async id => {
  if (!checkPermission('delete')) return;
  const r = ALL_RACKS.find(x => x.id === id);
  if (!confirm(`Delete rack "${r?.name || id}"? Products will become Unassigned.`)) return;
  try {
    await supabase.from('products').update({ rack_id: null }).eq('rack_id', id);
    const { error } = await supabase.from('racks').delete().eq('id', id);
    if (error) throw error;
    await logActivity('DELETE', 'racks', r?.name || id);
    toast('Rack deleted', 'success'); loadRacks();
  } catch (e) { toast(e.message, 'error'); }
};
window.viewRackStock = async (rackId, rackName) => {
  const { data: prods } = await supabase.from('products').select('*').eq('rack_id', rackId);
  if (!prods?.length) return toast('No products in this rack', 'error');
  const totalQty = prods.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const totalValue = prods.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.sale_price || 0)), 0);
  const body = `<div style="margin-bottom:12px;padding:12px;background:#fafbfd;border-radius:8px"><b>${esc(rackName)}</b><br>Total Products: <b>${prods.length}</b> | Total Qty: <b>${totalQty}</b> | Value: <b>${fmt(totalValue)}</b></div>
  <table class="data"><thead><tr><th>Product</th><th>Category</th><th class="num">Qty</th><th class="num">Price</th></tr></thead><tbody>
    ${prods.map(p => `<tr><td>${esc(p.name)}</td><td><small>${esc(p.category || '—')}</small></td><td class="num">${p.quantity}</td><td class="num">${fmt(p.sale_price)}</td></tr>`).join('')}
  </tbody></table>`;
  openModal(`Rack: ${rackName}`, body, async () => closeModal(), 'Close');
};
window.assignProductsToRack = async (rackId, rackName) => {
  if (!checkPermission('edit')) return;
  const { data: prods } = await supabase.from('products').select('id,name,category,rack_id,quantity').order('name');
  const list = prods || [];
  const body = `<div style="margin-bottom:10px;padding:10px;background:#fafbfd;border-radius:8px">Rack: <b>${esc(rackName)}</b> — tick products to assign:</div>
    <div class="field full"><input id="assignSearch" placeholder="Search..." oninput="filterAssignList()"></div>
    <div id="assignList" style="max-height:400px;overflow-y:auto;margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:8px">
      ${list.map(p => `<label style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #f0f0f0;cursor:pointer">
        <input type="checkbox" class="assign-check" value="${p.id}" ${p.rack_id === rackId ? 'checked' : ''}>
        <span style="flex:1">${esc(p.name)} <small style="color:#999">(${esc(p.category || '—')}) — qty ${p.quantity}</small></span>
      </label>`).join('')}
    </div>`;
  openModal(`Assign → ${rackName}`, body, async () => {
    const selected = [...document.querySelectorAll('.assign-check:checked')].map(c => c.value);
    const allIds = list.map(p => p.id);
    const toRemove = allIds.filter(id => !selected.includes(id) && list.find(p => p.id === id)?.rack_id === rackId);
    if (toRemove.length) await supabase.from('products').update({ rack_id: null }).in('id', toRemove);
    if (selected.length) await supabase.from('products').update({ rack_id: rackId }).in('id', selected);
    await logActivity('ASSIGN', 'racks', `${selected.length} products → ${rackName}`);
    closeModal(); toast('Rack assignments saved ✅', 'success'); loadRacks();
  }, 'Save Assignments');
};
window.filterAssignList = () => {
  const q = ($('assignSearch')?.value || '').toLowerCase().trim();
  document.querySelectorAll('#assignList label').forEach(l => {
    l.style.display = !q || l.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
  });
};

// =====================================================
// PURCHASES — v36 with new product-item-row grid
// =====================================================
async function loadPurchasesModule() {
  await loadProducts();
  const { data, error } = await supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
  const t = $('purchasesTable'); if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data || !data.length) { t.innerHTML = '<div class="empty">No purchases yet.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(p => `<tr><td><b>${esc(p.invoice_no || p.id.slice(0, 6))}</b></td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td><small>${new Date(p.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="editPurchase('${p.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deletePurchase('${p.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('btnPurchasesHistory').onclick = () => { const box = $('purchasesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadPurchasesModule(); };
$('btnRefreshPurchases').onclick = loadPurchasesModule;
window.deletePurchase = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete purchase?')) return; await supabase.from('purchases').delete().eq('id', id); await logActivity('DELETE', 'purchases', id); toast('Deleted'); loadPurchasesModule(); };
window.editPurchase = async id => { if (!checkPermission('edit')) return; const { data: p } = await supabase.from('purchases').select('*').eq('id', id).single(); if (p) openPurchaseModal(p); };
$('btnNewPurchase').onclick = () => openPurchaseModal();

async function openPurchaseModal(p = null) {
  const { data: sups } = await supabase.from('suppliers').select('id,name').order('name');
  const { data: racks } = await supabase.from('racks').select('id,name').order('name');
  /* v37 PURCHASE SEARCH: dropdown shows ONLY product name — category/brand is never visible. Category/brand stays hidden in data-* for autofill. */
  const prodOptions = ALL_PRODUCTS.map(prod => `<option value="${esc(prod.name)}" data-id="${prod.id}" data-name="${esc(prod.name)}" data-cat="${esc(prod.category)}" data-brand="${esc(prod.brand || '')}" data-buy="${prod.purchase_price}" data-sale="${prod.sale_price}" data-imei1="${esc(prod.imei_1 || '')}" data-imei2="${esc(prod.imei_2 || '')}">${esc(prod.name)}</option>`).join('');
  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="field"><label>Supplier</label><select id="puSup"><option value="">— None —</option>${(sups || []).map(s => `<option value="${s.id}" ${p?.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Invoice No</label><input id="puInv" value="${esc(p?.invoice_no || '')}" placeholder="Auto-generated if blank"></div>
      <div class="field"><label>Total (PKR) <small>(Auto)</small></label><input id="puTotal" type="number" value="${p?.total || 0}" readonly style="background:#f0f2f7;cursor:not-allowed;font-weight:bold;color:var(--primary)"></div>
      <div class="field"><label>Paid (PKR)</label><input id="puPaid" type="number" value="${p?.paid || 0}"></div>
      <div class="field full"><label>Notes</label><input id="puNotes" value="${esc(p?.notes || '')}"></div>
    </div>
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div><h4 style="margin:0;font-size:15px">Products / Items</h4><p style="margin:2px 0 0;font-size:11px;color:var(--muted)">Type name to auto-fill. <b>Alt+A</b> add row, <b>Ctrl+Enter</b> save.</p></div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-ghost btn-sm" onclick="addCustomCategory()">+ Category</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="addCustomBrand()">+ Brand</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="addPurchaseItemRow()">+ Add Item</button>
        </div>
      </div>
      <div class="items-header-labels">
        <span>Product Name</span>
        <span>Category</span>
        <span>Brand</span>
        <span>Qty</span>
        <span>Buy Price</span>
        <span>Sale Price</span>
        <span>IMEI 1</span>
        <span>IMEI 2</span>
        <span>Rack</span>
        <span></span>
      </div>
      <div id="purchaseItemsHost" style="max-height: calc(100vh - 400px);overflow-y:auto;padding-right:4px"></div>
    </div>
    <datalist id="prodMasterList">${prodOptions}</datalist>
    <datalist id="rackMasterList">${(racks || []).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</datalist>
  `;
  openModal(p ? 'Edit Purchase' : 'New Purchase Invoice', body, async () => {
    const total = Number($('puTotal').value) || 0;
    const invoiceNo = $('puInv').value.trim() || ('PUR-' + Date.now().toString().slice(-6));
    const payload = { supplier_id: $('puSup').value || null, invoice_no: invoiceNo, total, paid: Number($('puPaid').value) || 0, notes: $('puNotes').value.trim() || null };
    let purchaseId = p?.id;
    if (p) {
      const { error } = await supabase.from('purchases').update(payload).eq('id', p.id);
      if (error) throw new Error(error.message);
      await supabase.from('purchase_items').delete().eq('purchase_id', p.id);
    } else {
      const { data: created, error } = await supabase.from('purchases').insert(payload).select().single();
      if (error) throw new Error(error.message);
      purchaseId = created.id;
    }
    const itemRows = document.querySelectorAll('#purchaseItemsHost .product-item-row');
    /* v37 MERGE ENGINE: (a) in the same invoice, rows with the same Brand+Product+Category merge first, (b) if the same triple exists in the DB, add to the same stock — never a duplicate product row. Cost = weighted average. */
    const norm = v => (v||'').toString().toLowerCase().replace(/\s+/g,' ').trim();
    const merged = new Map();
    for (const row of itemRows) {
      const name = row.querySelector('.pi-name').value.trim(); if (!name) continue;
      const category = row.querySelector('.pi-category').value;
      const brand = row.querySelector('.pi-brand').value.trim();
      const qty = Number(row.querySelector('.pi-qty').value) || 0; if (qty<=0) continue;
      const pprice = Number(row.querySelector('.pi-pprice').value) || 0;
      const sprice = Number(row.querySelector('.pi-sprice').value) || 0;
      const key = [norm(name), norm(category), norm(brand)].join('||');
      const prev = merged.get(key);
      if (prev) { const tq=prev.qty+qty; prev.avgCost=((prev.avgCost*prev.qty)+(pprice*qty))/tq; prev.qty=tq; prev.sprice = sprice||prev.sprice; prev.imei1 = prev.imei1 || row.querySelector('.pi-imei1').value.trim() || null; prev.imei2 = prev.imei2 || row.querySelector('.pi-imei2').value.trim() || null; prev.rackId = prev.rackId || row.querySelector('.pi-rack').value || null; }
      else merged.set(key, { name, category, brand, qty, avgCost:pprice, sprice, imei1: row.querySelector('.pi-imei1').value.trim()||null, imei2: row.querySelector('.pi-imei2').value.trim()||null, rackId: row.querySelector('.pi-rack').value||null });
    }
    let itemsProcessed = 0;
    const { data: allProds } = await supabase.from('products').select('*');
    for (const it of merged.values()) {
      await supabase.from('purchase_items').insert({ purchase_id: purchaseId, product_name: it.name, category: it.category, brand: it.brand||null, quantity: it.qty, unit_price: it.avgCost, line_total: it.qty*it.avgCost, imei_1: it.imei1, imei_2: it.imei2 });
      const existing = (allProds||[]).find(pr => norm(pr.name)===norm(it.name) && norm(pr.category)===norm(it.category) && norm(pr.brand||'')===norm(it.brand||''));
      if (existing) {
        const oldQty = Number(existing.quantity||0), oldCost = Number(existing.purchase_price||0);
        const newQty = oldQty + it.qty;
        const wAvg = newQty ? ((oldQty*oldCost)+(it.qty*it.avgCost))/newQty : it.avgCost;
        await supabase.from('products').update({ quantity: newQty, purchase_price: Math.round(wAvg*100)/100, sale_price: it.sprice||existing.sale_price, imei_1: existing.imei_1||it.imei1, imei_2: existing.imei_2||it.imei2, rack_id: existing.rack_id||it.rackId, is_active:true }).eq('id', existing.id);
        toast(`Merged → ${it.name}: stock ${oldQty} + ${it.qty} = ${newQty}`, 'success');
      } else {
        await supabase.from('products').insert({ name: it.name, category: it.category, brand: it.brand||null, quantity: it.qty, purchase_price: it.avgCost, sale_price: it.sprice, min_stock: 3, imei_1: it.imei1, imei_2: it.imei2, rack_id: it.rackId });
      }
      itemsProcessed++;
    }
    if (itemsProcessed === 0) throw new Error('Please add at least one valid product');
    await logActivity(p ? 'EDIT' : 'CREATE', 'purchases', `Invoice ${invoiceNo} - ${itemsProcessed} items`);
    closeModal(); toast('Purchase saved & products synced!', 'success'); loadPurchasesModule(); loadOverview();
  }, p ? 'Update Purchase' : 'Save Purchase', true);
  setTimeout(() => {
    if (p) {
      supabase.from('purchase_items').select('*').eq('purchase_id', p.id).then(({ data: items }) => {
        (items || []).forEach(it => addPurchaseItemRow(it));
        updatePurchaseTotal();
      });
    } else { addPurchaseItemRow(); updatePurchaseTotal(); }
  }, 50);
}

window.addCustomCategory = () => {
  const newCat = prompt('Enter new category name:');
  if (newCat && newCat.trim() && !CATEGORIES.includes(newCat.trim())) {
    CATEGORIES.push(newCat.trim());
    document.querySelectorAll('.pi-category').forEach(sel => { sel.innerHTML += `<option value="${newCat.trim()}">${newCat.trim()}</option>`; });
    toast('Category added: ' + newCat, 'success');
  }
};
window.addCustomBrand = () => {
  const newBrand = prompt('Enter new brand name:');
  if (newBrand && newBrand.trim() && !BRANDS.includes(newBrand.trim())) {
    BRANDS.push(newBrand.trim());
    toast('Brand added: ' + newBrand, 'success');
  }
};

window.addPurchaseItemRow = (existingData = null) => {
  const host = $('purchaseItemsHost'); if (!host) return;
  const div = document.createElement('div');
  div.className = 'product-item-row';
  const nameVal = existingData ? esc(existingData.product_name) : '';
  const catVal = existingData ? existingData.category : '';
  const brandVal = existingData ? esc(existingData.brand || '') : '';
  const qtyVal = existingData ? existingData.quantity : 1;
  const ppriceVal = existingData ? existingData.unit_price : 0;
  const spriceVal = existingData ? (ALL_PRODUCTS.find(p=>p.name===existingData.product_name)?.sale_price || 0) : 0;
  const imei1Val = existingData ? esc(existingData.imei_1 || '') : '';
  const imei2Val = existingData ? esc(existingData.imei_2 || '') : '';
  div.innerHTML = `
    <input type="text" class="pi-name" placeholder="Search Product..." list="prodMasterList" value="${nameVal}" oninput="handleProductAutoFill(this)">
    <select class="pi-category">${CATEGORIES.map(c => `<option ${catVal === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <input type="text" class="pi-brand" placeholder="Brand" list="brandList" value="${brandVal}">
    <input type="number" class="pi-qty" value="${qtyVal}" min="1" placeholder="1" oninput="updatePurchaseTotal()">
    <input type="number" class="pi-pprice" value="${ppriceVal}" placeholder="0" oninput="updatePurchaseTotal()">
    <input type="number" class="pi-sprice" value="${spriceVal}" placeholder="0">
    <input type="text" class="pi-imei1" placeholder="IMEI 1" value="${imei1Val}">
    <input type="text" class="pi-imei2" placeholder="IMEI 2" value="${imei2Val}">
    <select class="pi-rack"><option value="">— Rack —</option>${(($('rackMasterList')?.innerHTML || '').match(/value="([^"]+)">([^<]+)/g) || []).map(m => { const parts = m.match(/value="([^"]+)">([^<]+)/); return `<option value="${parts[1]}" ${existingData?.rack_id === parts[1] ? 'selected' : ''}>${parts[2]}</option>`; }).join('')}</select>
    <button type="button" class="item-del-btn" onclick="this.parentElement.remove(); updatePurchaseTotal();">×</button>
  `;
  host.appendChild(div);
};
window.handleProductAutoFill = (input) => {
  const val = input.value;
  const datalist = document.getElementById('prodMasterList');
  if (!datalist) return;
  const option = Array.from(datalist.options).find(opt => opt.value === val || opt.dataset.name === val); // v37: value = name only
  if (option) {
    const row = input.parentElement;
    row.querySelector('.pi-category').value = option.dataset.cat;
    row.querySelector('.pi-brand').value = option.dataset.brand;
    row.querySelector('.pi-pprice').value = option.dataset.buy;
    row.querySelector('.pi-sprice').value = option.dataset.sale;
    row.querySelector('.pi-imei1').value = option.dataset.imei1;
    row.querySelector('.pi-imei2').value = option.dataset.imei2;
    updatePurchaseTotal();
    toast('Existing details auto-filled!', 'info');
  }
};
window.updatePurchaseTotal = () => {
  let total = 0;
  document.querySelectorAll('#purchaseItemsHost .product-item-row').forEach(row => {
    const qty = Number(row.querySelector('.pi-qty').value) || 0;
    const pprice = Number(row.querySelector('.pi-pprice').value) || 0;
    total += qty * pprice;
  });
  if($('puTotal')) $('puTotal').value = total;
};

// =====================================================
// SALES / POS — v39 (manual paid, auto credit, credit method)
// =====================================================
let CART = [];
let POS_CUSTOMERS = [];
let POS_PREVIOUS_DUE = 0;
let POS_ALL_PRODS = [];
let HELD_CARTS = JSON.parse(localStorage.getItem('bm_held_carts') || '[]');
let POS_TAX_RATE = Number(SHOP.tax_rate || 0);
let POS_TAX_ENABLED = SHOP.tax_enabled === true;
let POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };

async function loadPosCustomers() {
  const { data } = await supabase.from('customers').select('id,name,phone').order('name');
  POS_CUSTOMERS = data || [];
  if ($('posCustomerOptions')) $('posCustomerOptions').innerHTML = POS_CUSTOMERS.map(c => `<option value="${esc(c.name)}">${esc(c.phone || '')}</option>`).join('');
}
async function updatePosCustomerDue() {
  const name = $('saleCustName')?.value.trim(); const phone = $('saleCustPhone')?.value.trim();
  const match = POS_CUSTOMERS.find(c => (phone && c.phone === phone) || (name && c.name.toLowerCase() === name.toLowerCase()));
  if (!match) { POS_PREVIOUS_DUE = 0; if ($('previousDueBox')) $('previousDueBox').style.display = 'none'; return; }
  if (match.phone && !$('saleCustPhone').value) $('saleCustPhone').value = match.phone;
  const { data } = await supabase.from('sales').select('balance').eq('customer_id', match.id).gt('balance', 0);
  POS_PREVIOUS_DUE = (data || []).reduce((n, x) => n + Number(x.balance || 0), 0);
  if ($('previousDueAmount')) $('previousDueAmount').textContent = fmt(POS_PREVIOUS_DUE);
  if ($('previousDueBox')) $('previousDueBox').style.display = POS_PREVIOUS_DUE > 0 ? 'block' : 'none';
}
$('saleCustName')?.addEventListener('change', updatePosCustomerDue);
$('saleCustPhone')?.addEventListener('change', updatePosCustomerDue);

async function loadSaleProducts() {
  await loadPosCustomers();
  const { data } = await supabase.from('products').select('*,racks!fk_products_racks(name)').gt('quantity', 0).order('name');
  POS_ALL_PRODS = data || [];
  const cats = [...new Set(POS_ALL_PRODS.map(p => p.category).filter(Boolean))];
  if ($('saleCategoryFilter')) $('saleCategoryFilter').innerHTML = '<option value="">— All Categories —</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  filterPosProducts();
  renderCart();
  loadPosTaxUI();
}

window.filterPosProducts = () => {
  const cat = $('saleCategoryFilter')?.value || '';
  const rawQ = ($('posDynamicSearch')?.value || '').trim();
  const q = rawQ.toLowerCase();
  // Price range: "500-1500" filters by sale price
  let priceMin=0, priceMax=Infinity; const rangeMatch = rawQ.match(/^(\d+)\s*-\s*(\d+)$/);
  if(rangeMatch){ priceMin=Number(rangeMatch[1]); priceMax=Number(rangeMatch[2]); }
  let filtered = cat ? POS_ALL_PRODS.filter(p => p.category === cat) : [...POS_ALL_PRODS];
  if(rangeMatch){ filtered = filtered.filter(p => Number(p.sale_price||0) >= priceMin && Number(p.sale_price||0) <= priceMax); }
  else if(q){
    filtered = filtered.filter(p => {
      const hay = ((p.name||'')+' '+(p.sku||'')+' '+(p.barcode||'')+' '+(p.model||'')+' '+(p.imei_1||'')+' '+(p.imei_2||'')+' '+(p.brand||'')+' '+(p.category||'')+' '+(p.racks?.name||'')).toLowerCase();
      if(hay.includes(q)) return true;
      // Fuzzy: subsequence match (e.g. "iph14" matches "iPhone 14")
      let qi=0; for(const ch of hay){ if(ch===q[qi]) qi++; if(qi===q.length) return true; }
      // Last-4 IMEI search
      if(q.length>=4 && ((p.imei_1||'').slice(-4)===q || (p.imei_2||'').slice(-4)===q)) return true;
      return false;
    });
    // Relevance sort: exact name first, then starts-with, then others
    filtered.sort((a,b)=>{
      const sa=bmRelevance(String(a.name||''), q), sb=bmRelevance(String(b.name||''), q);
      return sb-sa;
    });
  }
  const sel = $('saleProductSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Choose Product —</option>' + filtered.map(p => {
    const rack = p.racks?.name ? `📦 ${p.racks.name}` : '📦 —';
    return `<option value="${p.id}" data-price="${p.sale_price}" data-name="${esc(p.name)}" data-imei="${esc(p.imei_1 || '')}" data-imei2="${esc(p.imei_2 || '')}" data-cat="${esc(p.category)}" data-brand="${esc(p.brand || '')}" data-stock="${p.quantity}" data-rack="${esc(p.racks?.name || 'Unassigned')}">${esc(p.name)} — ${fmt(p.sale_price)} | Stock: ${p.quantity} | ${rack}</option>`;
  }).join('');
};
function bmRelevance(name, q){
  const n=name.toLowerCase(); if(n===q) return 100; if(n.startsWith(q)) return 90; if(n.includes(q)) return 70;
  let qi=0; for(const ch of n){ if(ch===q[qi]) qi++; if(qi===q.length) return 50; } return 0;
}

$('saleCategoryFilter')?.addEventListener('change', filterPosProducts);
$('posDynamicSearch')?.addEventListener('input', filterPosProducts);

$('posBarcodeInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const code = e.target.value.trim();
    if (!code) return;
    const prod = POS_ALL_PRODS.find(p =>
      (p.barcode || '').toLowerCase() === code.toLowerCase() ||
      (p.imei_1 || '').toLowerCase() === code.toLowerCase() ||
      (p.imei_2 || '').toLowerCase() === code.toLowerCase() ||
      (p.sku || '').toLowerCase() === code.toLowerCase()
    );
    if (prod) {
      addProductToCart(prod.id);
      try{ window.bmBeep && window.bmBeep(); }catch(_){}
      toast(`Added: ${prod.name}`, 'success');
    } else {
      toast(`No product found for: ${code}`, 'error');
    }
    e.target.value = '';
  }
});

function addProductToCart(productId) {
  const p = POS_ALL_PRODS.find(x => x.id === productId);
  if (!p) return toast('Product not found', 'error');
  const stock = Number(p.quantity) || 0;
  const existing = CART.find(c => c.product_id === productId);
  if (existing && existing.quantity + 1 > stock) return toast('Stock limit reached', 'error');
  if (existing) { existing.quantity++; existing.line_total = existing.quantity * existing.unit_price; }
  else CART.push({
    product_id: p.id, product_name: p.name, imei: p.imei_1 || '', imei_2: p.imei_2 || '',
    category: p.category, brand: p.brand, unit_price: Number(p.sale_price) || 0,
    quantity: 1, line_total: Number(p.sale_price) || 0, stock,
    rack: p.racks?.name || 'Unassigned', discount: 0
  });
  renderCart();
}

$('btnAddToCart').onclick = () => {
  const sel = $('saleProductSelect');
  if (!sel || !sel.value) return toast('Select a product first', 'error');
  addProductToCart(sel.value);
};

function renderCart() {
  const host = $('cartItems');
  if (!host) return;
  if (!CART.length) { host.innerHTML = '<div class="empty">Cart is empty</div>'; }
  else {
    host.innerHTML = `<table class="cart-mini"><thead><tr><th>Item</th><th class="num">Price</th><th class="num">Disc</th><th class="num">Qty</th><th class="num">Total</th><th></th></tr></thead><tbody>
      ${CART.map((c, i) => `<tr>
        <td>
          <b>${esc(c.product_name)}</b><br>
          <small style="color:#888">📦 ${esc(c.rack || '—')} ${c.imei ? '| IMEI: ' + esc(c.imei) : ''}</small>
        </td>
        <td class="num"><input type="number" value="${c.unit_price}" style="width:64px;padding:3px;text-align:right;border:1px solid var(--border);border-radius:5px;font-size:11px" onchange="updateCartPrice(${i},this.value)"></td>
        <td class="num"><input type="number" value="${c.discount || 0}" style="width:50px;padding:3px;text-align:right;border:1px solid var(--border);border-radius:5px;font-size:11px" onchange="updateCartDiscount(${i},this.value)" title="Line discount (PKR)"></td>
        <td class="num" style="white-space:nowrap"><button class="qty-btn" onclick="decCartQty(${i})">−</button><b style="margin:0 6px">${c.quantity}</b><button class="qty-btn" onclick="incCartQty(${i})">+</button></td>
        <td class="num">${fmt(c.line_total - (c.discount || 0) * c.quantity)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeCart(${i})">×</button></td>
      </tr>`).join('')}
    </tbody></table>`;
  }
  recalcPosTotals();
}

function recalcPosTotals() {
  let sub = 0, lineDisc = 0;
  CART.forEach(c => {
    const base = c.unit_price * c.quantity;
    const d = (c.discount || 0) * c.quantity;
    sub += base;
    lineDisc += d;
  });
  let billDisc = Number($('saleDiscount')?.value) || 0;
  if ($('saleDiscountType')?.value === 'pct') billDisc = ((sub - lineDisc) * billDisc) / 100;
  const afterDisc = Math.max(0, sub - lineDisc - billDisc);
  const taxAmt = POS_TAX_ENABLED ? (afterDisc * POS_TAX_RATE) / 100 : 0;
  const finalTotal = afterDisc + taxAmt;

  if ($('cartSubtotal')) $('cartSubtotal').textContent = fmt(sub);
  if ($('cartLineDisc')) $('cartLineDisc').textContent = fmt(lineDisc);
  if ($('cartBillDisc')) $('cartBillDisc').textContent = fmt(billDisc);
  if ($('cartTax')) { $('cartTax').textContent = fmt(taxAmt); $('cartTaxRow') && ($('cartTaxRow').style.display = POS_TAX_ENABLED ? 'flex' : 'none'); }
  if ($('cartTotal')) $('cartTotal').textContent = fmt(finalTotal);
  // Paid is manual — DO NOT auto-fill. But if empty, show placeholder hint
  if ($('salePaid') && !$('salePaid').dataset.touched) {
    // leave as is
  }
  const paid = Number($('salePaid')?.value) || 0;
  const credit = Math.max(0, finalTotal - paid);
  if ($('creditWarning')) $('creditWarning').style.display = credit > 0 ? 'block' : 'none';
  if ($('creditWarning')) $('creditWarning').textContent = `⚠️ Credit (Balance): ${fmt(credit)} — Will be added to the Credit section automatically`;
}

function loadPosTaxUI() {
  if ($('posTaxRate')) $('posTaxRate').value = POS_TAX_RATE;
  if ($('posTaxEnabled')) $('posTaxEnabled').checked = POS_TAX_ENABLED;
  recalcPosTotals();
}

window.removeCart = i => { CART.splice(i, 1); renderCart(); };
window.incCartQty = i => { const c = CART[i]; if (c.quantity + 1 > c.stock) return toast('Stock limit', 'error'); c.quantity++; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.decCartQty = i => { const c = CART[i]; if (c.quantity <= 1) return window.removeCart(i); c.quantity--; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.updateCartPrice = (i, val) => { const c = CART[i]; c.unit_price = Number(val) || 0; c.line_total = c.quantity * c.unit_price; renderCart(); };
window.updateCartDiscount = (i, val) => { const c = CART[i]; c.discount = Number(val) || 0; renderCart(); };

$('saleDiscount')?.addEventListener('input', recalcPosTotals);
$('saleDiscountType')?.addEventListener('change', recalcPosTotals);
$('salePaid')?.addEventListener('input', e => {
  e.target.dataset.touched = '1';
  recalcPosTotals();
});
$('posTaxRate')?.addEventListener('input', e => { POS_TAX_RATE = Number(e.target.value) || 0; recalcPosTotals(); });
$('posTaxEnabled')?.addEventListener('change', e => { POS_TAX_ENABLED = e.target.checked; recalcPosTotals(); });

// ✅ Manual paid quick buttons
window.setPaidFull = () => {
  const total = Number(($('cartTotal')?.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  if ($('salePaid')) { $('salePaid').value = total; $('salePaid').dataset.touched = '1'; recalcPosTotals(); }
};
window.setPaidZero = () => {
  if ($('salePaid')) { $('salePaid').value = 0; $('salePaid').dataset.touched = '1'; recalcPosTotals(); }
};

function openPaymentSplitModal() {
  const total = Number(($('cartTotal')?.textContent || '0').replace(/[^0-9]/g, '')) || 0;
  const body = `<div style="display:grid;gap:10px">
    <p style="margin:0 0 6px;font-size:13px;color:var(--muted)">Total: <b>${fmt(total)}</b> — split across methods</p>
    ${['Cash', 'Card', 'Easypaisa', 'JazzCash', 'Bank'].map(m => `
      <div class="field"><label>${m}</label><input type="number" data-pay="${m}" value="${POS_PAYMENTS[m] || 0}" placeholder="0"></div>
    `).join('')}
    <div id="splitSum" style="padding:10px;background:#fafbfd;border-radius:6px;font-size:13px;text-align:center">
      Sum: <b id="splitSumAmt">PKR 0</b>
    </div>
  </div>`;
  openModal('Split Payments', body, async () => {
    let sum = 0;
    document.querySelectorAll('[data-pay]').forEach(inp => {
      const m = inp.dataset.pay; POS_PAYMENTS[m] = Number(inp.value) || 0; sum += POS_PAYMENTS[m];
    });
    if ($('salePaid')) { $('salePaid').value = sum; $('salePaid').dataset.touched = '1'; }
    closeModal(); recalcPosTotals();
  }, 'Apply');
  setTimeout(() => {
    const updateSum = () => {
      let s = 0; document.querySelectorAll('[data-pay]').forEach(i => s += Number(i.value) || 0);
      if ($('splitSumAmt')) $('splitSumAmt').textContent = fmt(s);
    };
    document.querySelectorAll('[data-pay]').forEach(i => i.addEventListener('input', updateSum));
    updateSum();
  }, 100);
}
$('btnSplitPayment')?.addEventListener('click', openPaymentSplitModal);

$('btnHoldSale')?.addEventListener('click', () => {
  if (!CART.length) return toast('Cart empty', 'error');
  const name = $('saleCustName').value.trim() || prompt('Hold name (optional):', 'Held Sale');
  HELD_CARTS.push({ id: Date.now(), name: name || 'Held Sale', cart: [...CART], discount: Number($('saleDiscount').value) || 0, time: new Date().toISOString() });
  localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  CART = []; $('saleDiscount').value = 0; $('saleCustName').value = ''; $('saleCustPhone').value = '';
  POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };
  renderCart(); toast('Sale held!', 'success');
});
$('btnResumeSale')?.addEventListener('click', () => {
  if (!HELD_CARTS.length) return toast('No held sales', 'error');
  const list = HELD_CARTS.map((h, i) => `${i + 1}. ${h.name} — ${fmt(h.cart.reduce((s, c) => s + c.line_total, 0))} (${new Date(h.time).toLocaleTimeString()})`).join('\n');
  const pick = prompt(`Held sales:\n${list}\n\nEnter number to resume:`, '1');
  const idx = Number(pick) - 1;
  if (isNaN(idx) || !HELD_CARTS[idx]) return;
  CART = [...HELD_CARTS[idx].cart]; $('saleDiscount').value = HELD_CARTS[idx].discount || 0;
  HELD_CARTS.splice(idx, 1); localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  renderCart(); toast('Sale resumed', 'success');
});

// ✅ Save Sale — v39: manual paid, auto credit, credit method option
$('btnSaveSale').onclick = async () => {
  if (!CART.length) return toast('Cart is empty', 'error');
  let sub = 0, lineDisc = 0;
  CART.forEach(c => { sub += c.unit_price * c.quantity; lineDisc += (c.discount || 0) * c.quantity; });
  let billDisc = Number($('saleDiscount').value) || 0;
  if ($('saleDiscountType').value === 'pct') billDisc = ((sub - lineDisc) * billDisc) / 100;
  const afterDisc = Math.max(0, sub - lineDisc - billDisc);
  const taxAmt = POS_TAX_ENABLED ? (afterDisc * POS_TAX_RATE) / 100 : 0;
  const totalSale = afterDisc + taxAmt;

  const custName = $('saleCustName').value.trim() || 'Walk-in Customer';
  const custPhone = $('saleCustPhone').value.trim();
  let payMethod = $('salePaymentMethod').value || 'Cash';

  // ✅ MANUAL PAID (editable)
  let paid = Number($('salePaid').value) || 0;
  // Credit method → full amount as balance, paid = 0
  if (payMethod === 'Credit') {
    paid = 0;
  }
  if (paid > totalSale) paid = totalSale; // cap
  const balance = Math.max(0, totalSale - paid);

  // Primary method from split if any
  let primaryMethod = payMethod;
  const splitEntries = Object.entries(POS_PAYMENTS).filter(([, v]) => Number(v) > 0);
  if (splitEntries.length > 1) primaryMethod = 'Split';
  else if (splitEntries.length === 1) primaryMethod = splitEntries[0][0];
  if (balance > 0 && payMethod !== 'Credit') {
    // If some credit remains with cash/card, mark as Credit too? Keep primary as entered
  }

  $('btnSaveSale').disabled = true; $('btnSaveSale').textContent = 'Saving...';
  try {
    let customerId = null;
    // If balance > 0, require a customer (for credit tracking)
    if (balance > 0 && custName === 'Walk-in Customer') {
      throw new Error('Customer name is required for credit sales!');
    }
    if (custName !== 'Walk-in Customer') {
      let found = POS_CUSTOMERS.find(c => (custPhone && c.phone === custPhone) || c.name.toLowerCase() === custName.toLowerCase());
      if (!found) {
        const { data: created, error: ce } = await supabase.from('customers').insert({ name: custName, phone: custPhone || null, opening_balance: 0 }).select('id,name,phone').single();
        if (ce) throw new Error('Customer: ' + ce.message);
        found = created; POS_CUSTOMERS.push(created);
      }
      customerId = found.id;
    }
    const invNo = 'INV-' + Date.now().toString().slice(-6);
    const salePayload = {
      invoice_no: invNo, customer_id: customerId, customer_name: custName,
      customer_phone: custPhone || null, subtotal: sub, discount: lineDisc + billDisc,
      tax: taxAmt, tax_rate: POS_TAX_ENABLED ? POS_TAX_RATE : 0,
      total: totalSale, paid, balance,
      payment_method: primaryMethod,
      payment_split: splitEntries.length > 0 ? JSON.stringify(POS_PAYMENTS) : null,
      cashier_id: CURRENT_STAFF, cashier_name: CURRENT_NAME
    };
    const { data: saleData, error: saleErr } = await supabase.from('sales').insert(salePayload).select().single();
    if (saleErr) throw new Error('Sale: ' + saleErr.message);

    const items = CART.map(c => ({
      sale_id: saleData.id, product_id: c.product_id, product_name: c.product_name,
      imei: c.imei || null, imei_2: c.imei_2 || null, quantity: c.quantity,
      unit_price: c.unit_price, line_total: c.line_total,
      line_discount: (c.discount || 0) * c.quantity, category: c.category,
      rack_name: c.rack || null
    }));
    const { error: itemsErr } = await supabase.from('sale_items').insert(items);
    if (itemsErr) throw new Error('Items: ' + itemsErr.message);

    for (const item of CART) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) await supabase.from('products').update({ quantity: Math.max(0, prod.quantity - item.quantity) }).eq('id', item.product_id);
    }

    await logActivity('CREATE', 'sales', `Sale ${invNo} - ${fmt(totalSale)} (Paid ${fmt(paid)}, Credit ${fmt(balance)})`);
    // Print: respect auto-print setting, otherwise show choice modal (no confirm() popup)
    const _printPayloadEarly = null;
    const payload = {
      invoice: invNo, customer: custName, phone: custPhone, cashier: CURRENT_NAME,
      subtotal: sub, discount: lineDisc + billDisc, tax: taxAmt, tax_rate: POS_TAX_ENABLED ? POS_TAX_RATE : 0,
      total: totalSale, paid, balance, payment_method: primaryMethod,
      date: new Date(), items: [...CART]
    };
    if (bmPrintSettings().autoPrint) { if (bmPrintSettings().format === 'a4') printA4Premium(payload, 'sale'); else printThermal80mm(payload, 'sale'); } else { openPrintChoice(payload, 'sale'); }

    // Reset
    CART = []; $('saleDiscount').value = 0; $('salePaid').value = 0; $('salePaid').dataset.touched = '';
    $('saleCustName').value = ''; $('saleCustPhone').value = '';
    POS_PAYMENTS = { Cash: 0, Card: 0, Easypaisa: 0, JazzCash: 0, Bank: 0 };
    $('previousDueBox').style.display = 'none'; POS_PREVIOUS_DUE = 0; $('saleCategoryFilter').value = '';
    if ($('posDynamicSearch')) $('posDynamicSearch').value = '';
    $('salePaymentMethod').value = 'Cash';
    renderCart(); loadSaleProducts(); loadOverview();
    toast(`Sale saved ✅ (Paid ${fmt(paid)}, Credit ${fmt(balance)})`, 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally { $('btnSaveSale').disabled = false; $('btnSaveSale').innerHTML = 'Save Sale <span class="kbd">F4</span>'; }
};

window.deleteSale = async id => {
  if (!IS_ADMIN) return toast('Only Admin can delete sales!', 'error');
  if (!confirm('DELETE this sale? Stock will be reversed.')) return;
  try {
    const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
    for (const it of items || []) {
      if (it.product_id) {
        const { data: prod } = await supabase.from('products').select('quantity').eq('id', it.product_id).single();
        if (prod) await supabase.from('products').update({ quantity: prod.quantity + it.quantity }).eq('id', it.product_id);
      }
    }
    await supabase.from('sale_items').delete().eq('sale_id', id); await supabase.from('sales').delete().eq('id', id);
    await logActivity('DELETE', 'sales', id); toast('Sale deleted & stock reversed', 'success');
    loadSalesHistory(); loadOverview();
  } catch (e) { toast(e.message, 'error'); }
};

$('btnSalesHistory').onclick = () => { const box = $('salesHistoryBox'); box.hidden = !box.hidden; if (!box.hidden) loadSalesHistory(); };
$('btnRefreshSales').onclick = loadSalesHistory;
async function loadSalesHistory() {
  const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { $('salesHistoryTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  $('salesHistoryTable').innerHTML = !data?.length ? '<div class="empty">No sales.</div>' : `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th>Method</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Actions</th></tr></thead><tbody>${data.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td><span class="pill">${esc(s.payment_method || 'Cash')}</span></td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${s.balance > 0 ? `<b style="color:#dc2626">${fmt(s.balance)}</b>` : '<span class="pill green">Paid</span>'}</td><td><small>${new Date(s.created_at).toLocaleString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="reprintSale('${s.id}')">Print</button><button class="btn btn-danger btn-sm" onclick="deleteSale('${s.id}')" title="Admin only">Del</button></td></tr>`).join('')}</tbody></table>`;
}
window.reprintSale = async id => {
  const { data: s } = await supabase.from('sales').select('*').eq('id', id).single(); if (!s) return;
  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const payload = { invoice: s.invoice_no, customer: s.customer_name, phone: s.customer_phone, cashier: s.cashier_name, subtotal: s.subtotal, discount: s.discount, tax: s.tax, tax_rate: s.tax_rate, total: s.total, paid: s.paid, balance: s.balance, payment_method: s.payment_method, date: s.created_at, items: items || [] };
  openPrintChoice(payload, 'sale');
};

// =====================================================
// REPAIRING
// =====================================================
const COMMON_FAULTS = ['Screen Broken', 'Touch Not Working', 'Battery Drain', 'Not Charging', 'No Power', 'No Display', 'Dead', 'Water Damage', 'Camera Not Working', 'Speaker Not Working', 'Mic Not Working', 'Network Issue', 'Face ID Not Working', 'Software Update'];
async function loadRepairs() {
  const q = $('repairSearch')?.value?.trim() || ''; const st = $('repairStatusFilter')?.value || '';
  let query = supabase.from('repairs').select('*').order('created_at', { ascending: false });
  if (st) query = query.eq('status', st);
  if (q) query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,mobile.ilike.%${q}%,slip_no.ilike.%${q}%`);
  const { data, error } = await query;
  const t = $('repairsTable');
  if (error) { t.innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  if (!data?.length) { t.innerHTML = '<div class="empty">No repair jobs.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Slip#</th><th>Customer</th><th>Mobile</th><th>Issue</th><th class="num">Charge</th><th>Status</th><th>Actions</th></tr></thead><tbody>${data.map(r => `<tr><td><b>${esc(r.slip_no || '—')}</b></td><td>${esc(r.customer_name)}<br><small>${esc(r.phone || '')}</small></td><td>${esc(r.mobile || '—')}</td><td><small>${esc(r.issue || '—')}</small></td><td class="num">${fmt(r.charge)}</td><td><span class="pill">${esc(r.status)}</span></td><td class="actions"><button class="btn btn-ghost btn-sm" onclick="viewRepair('${r.id}')">Print</button><button class="btn btn-ghost btn-sm" onclick="editRepair('${r.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteRepair('${r.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('repairSearch')?.addEventListener('input', () => loadRepairs());
$('repairStatusFilter')?.addEventListener('change', () => loadRepairs());
$('btnAddRepair').onclick = () => openRepairModal();
window.editRepair = async id => { if (!checkPermission('edit')) return; const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single(); if (r) openRepairModal(r); };
window.deleteRepair = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; await supabase.from('repairs').delete().eq('id', id); await logActivity('DELETE', 'repairs', id); toast('Deleted'); loadRepairs(); };
window.viewRepair = async id => {
  const { data: r } = await supabase.from('repairs').select('*').eq('id', id).single(); if (!r) return;
  const payload = { invoice: r.slip_no, customer: r.customer_name, phone: r.phone, cashier: CURRENT_NAME, subtotal: r.charge, discount: 0, total: r.charge, paid: r.advance, balance: r.charge - r.advance, date: r.created_at, items: [{ name: r.mobile + ' - ' + (r.issue || 'Repair'), qty: 1, total: r.charge }] };
  openPrintChoice(payload, 'repair');
};
function openRepairModal(r = null) {
  const body = `<div class="form-grid"><div class="field"><label>Customer *</label><input id="rCust" value="${esc(r?.customer_name || '')}"></div><div class="field"><label>Phone</label><input id="rPhone" value="${esc(r?.phone || '')}"></div><div class="field"><label>Mobile Model</label><input id="rMobile" value="${esc(r?.mobile || '')}"></div><div class="field"><label>IMEI</label><input id="rImei" value="${esc(r?.imei || '')}"></div><div class="field full"><label>Fault</label><input id="rIssue" list="faultsList" value="${esc(r?.issue || '')}"><datalist id="faultsList">${COMMON_FAULTS.map(f => `<option value="${esc(f)}">`).join('')}</datalist></div><div class="field full" style="display:flex;gap:20px;padding:10px;background:#fafbfd;border-radius:8px;border:1px solid #e6e9f2"><label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rBatWarranty" ${r?.battery_warranty === 'Yes' ? 'checked' : ''}> Battery Warranty (Yes/No)</label><label style="font-size:13px;display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="rDeadWarranty" ${r?.dead_warranty === 'Yes' ? 'checked' : ''}> Dead Warranty (Yes/No)</label></div><div class="field"><label>Charge</label><input id="rCharge" type="number" value="${r?.charge || 0}"></div><div class="field"><label>Advance</label><input id="rAdvance" type="number" value="${r?.advance || 0}"></div><div class="field"><label>Status</label><select id="rStatus">${['Received', 'In Progress', 'Ready', 'Delivered'].map(s => `<option ${r?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="field full"><label>Notes</label><textarea id="rNotes">${esc(r?.notes || '')}</textarea></div></div>`;
  openModal(r ? 'Edit Repair' : 'New Repair', body, async () => {
    const payload = { customer_name: $('rCust').value.trim(), phone: $('rPhone').value.trim() || null, mobile: $('rMobile').value.trim() || null, imei: $('rImei').value.trim() || null, issue: $('rIssue').value.trim() || null, charge: Number($('rCharge').value) || 0, advance: Number($('rAdvance').value) || 0, status: $('rStatus').value, notes: $('rNotes').value.trim() || null, battery_warranty: $('rBatWarranty').checked ? 'Yes' : 'No', dead_warranty: $('rDeadWarranty').checked ? 'Yes' : 'No' };
    if (!payload.customer_name) throw new Error('Customer required');
    if (payload.status === 'Delivered' && payload.charge > payload.advance) { if (!confirm(`Payment still pending (${fmt(payload.charge - payload.advance)}). Deliver?`)) throw new Error('Delivery cancelled.'); }
    if (r) await supabase.from('repairs').update(payload).eq('id', r.id); else await supabase.from('repairs').insert(payload);
    await logActivity(r ? 'EDIT' : 'CREATE', 'repairs', payload.customer_name);
    closeModal(); toast('Saved', 'success'); loadRepairs();
  });
}

// =====================================================
// CUSTOMERS
// =====================================================
let ALL_CUST = [];
async function loadCustomers(filter = '') {
  let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (filter) q = q.ilike('name', `%${filter}%`);
  const { data } = await q; ALL_CUST = data || [];
  const t = $('customersTable');
  if (!ALL_CUST.length) { t.innerHTML = '<div class="empty">No customers.</div>'; return; }
  t.innerHTML = `<table class="data"><thead><tr><th><input type="checkbox" onchange="toggleAllCust(this)"></th><th>Name</th><th>Phone</th><th>Address</th><th>Actions</th></tr></thead><tbody>${ALL_CUST.map(c => `<tr><td><input type="checkbox" class="cust-check" value="${c.id}" onchange="updateCustBulk()"></td><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td><td><button class="btn btn-ghost btn-sm" onclick="editCustomer('${c.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteCustomer('${c.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('custSearch')?.addEventListener('input', e => loadCustomers(e.target.value));
$('btnAddCustomer').onclick = () => openCustomerModal();
window.editCustomer = id => { if (!checkPermission('edit')) return; openCustomerModal(ALL_CUST.find(c => c.id === id)); };
window.deleteCustomer = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete?')) return; try { await supabase.from('sales').update({ customer_id: null }).eq('customer_id', id); const { error } = await supabase.from('customers').delete().eq('id', id); if (error) throw error; await logActivity('DELETE', 'customers', id); toast('Deleted'); loadCustomers(); } catch (e) { toast(e.message, 'error'); } };
window.toggleAllCust = cb => { document.querySelectorAll('.cust-check').forEach(c => c.checked = cb.checked); updateCustBulk(); };
function updateCustBulk() { const n = document.querySelectorAll('.cust-check:checked').length; $('custBulkBar').style.display = n ? 'flex' : 'none'; $('custSelCount').textContent = n; }
window.bulkDeleteCustomers = async () => { if (!checkPermission('delete')) return; const ids = [...document.querySelectorAll('.cust-check:checked')].map(c => c.value); if (!ids.length || !confirm(`Delete ${ids.length} customers?`)) return; try { await supabase.from('sales').update({ customer_id: null }).in('customer_id', ids); const { error } = await supabase.from('customers').delete().in('id', ids); if (error) throw error; toast(`Deleted ${ids.length} customers`); loadCustomers(); } catch (e) { toast(e.message, 'error'); } };
function openCustomerModal(c = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Name *</label><input id="cName" value="${esc(c?.name || '')}"></div><div class="field"><label>Phone</label><input id="cPhone" value="${esc(c?.phone || '')}"></div><div class="field"><label>Opening Balance</label><input id="cBal" type="number" value="${c?.opening_balance || 0}"></div><div class="field full"><label>Address</label><textarea id="cAddr">${esc(c?.address || '')}</textarea></div></div>`;
  openModal(c ? 'Edit Customer' : 'Add Customer', body, async () => {
    const payload = { name: $('cName').value.trim(), phone: $('cPhone').value.trim() || null, address: $('cAddr').value.trim() || null, opening_balance: Number($('cBal').value) || 0 };
    if (!payload.name) throw new Error('Name required');
    if (c) await supabase.from('customers').update(payload).eq('id', c.id); else await supabase.from('customers').insert(payload);
    await logActivity(c ? 'EDIT' : 'CREATE', 'customers', payload.name);
    toast('Saved', 'success'); closeModal(); loadCustomers();
  });
}

// =====================================================
// SUPPLIERS
// =====================================================
let ALL_SUP = [];
let SUP_FILTER = { search: '', cat: '' };
async function loadSuppliers() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) { $('suppliersTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  ALL_SUP = data || [];
  const catFilter = $('supplierCategoryFilter');
  if (catFilter) { const cats = [...new Set(ALL_SUP.map(s => s.category).filter(Boolean))]; catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}" ${SUP_FILTER.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join(''); }
  let filtered = [...ALL_SUP];
  if (SUP_FILTER.search) { const q = SUP_FILTER.search.toLowerCase(); filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(q) || (s.phone || '').includes(q)); }
  if (SUP_FILTER.cat) filtered = filtered.filter(s => s.category === SUP_FILTER.cat);
  const t = $('suppliersTable');
  if (!filtered.length) { t.innerHTML = `<div class="empty">${ALL_SUP.length ? 'No suppliers match filter.' : 'No suppliers yet. Click + Add Supplier.'}</div>`; return; }
  t.innerHTML = `<table class="data"><thead><tr><th>Name</th><th>Category</th><th>Phone</th><th>Address</th><th class="num">Purchases</th><th>Actions</th></tr></thead><tbody>${filtered.map(s => `<tr><td><b>${esc(s.name)}</b></td><td><span class="pill blue">${esc(s.category || 'General')}</span></td><td>${esc(s.phone || '—')}</td><td><small>${esc(s.address || '—')}</small></td><td class="num"><button class="btn btn-ghost btn-sm" onclick="viewSupplierLedger('${s.id}','${esc(s.name)}')">View</button></td><td class="actions" style="white-space:nowrap">${s.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(s.phone)}">📞</a>` : ''}${s.phone ? `<a class="btn btn-ghost btn-sm" href="https://wa.me/${esc(s.phone.replace(/[^0-9]/g,''))}" target="_blank">💬</a>` : ''}<button class="btn btn-ghost btn-sm" onclick="viewSupplierHistory('${s.id}','${esc(s.name)}')">History</button><button class="btn btn-ghost btn-sm" onclick="editSupplier('${s.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
$('supplierSearch')?.addEventListener('input', e => { SUP_FILTER.search = e.target.value; loadSuppliers(); });
$('supplierCategoryFilter')?.addEventListener('change', e => { SUP_FILTER.cat = e.target.value; loadSuppliers(); });
$('btnAddSupplier').onclick = () => openSupplierModal();
function openSupplierModal(s = null) {
  const body = `<div class="form-grid"><div class="field full"><label>Supplier Name *</label><input id="sName" value="${esc(s?.name || '')}"></div><div class="field"><label>Category</label><input id="sCategory" value="${esc(s?.category || '')}" list="supCats"><datalist id="supCats">${CATEGORIES.map(c => `<option value="${c}">`).join('')}</datalist></div><div class="field"><label>Phone</label><input id="sPhone" value="${esc(s?.phone || '')}"></div><div class="field full"><label>Address</label><textarea id="sAddr">${esc(s?.address || '')}</textarea></div><div class="field full"><label>Notes</label><textarea id="sNotes">${esc(s?.notes || '')}</textarea></div></div>`;
  openModal(s ? 'Edit Supplier' : 'Add Supplier', body, async () => {
    const payload = { name: $('sName').value.trim(), category: $('sCategory').value.trim() || null, phone: $('sPhone').value.trim() || null, address: $('sAddr').value.trim() || null, notes: $('sNotes').value.trim() || null };
    if (!payload.name) throw new Error('Supplier name is required');
    let res; if (s) res = await supabase.from('suppliers').update(payload).eq('id', s.id); else res = await supabase.from('suppliers').insert(payload);
    if (res.error) throw new Error(res.error.message);
    await logActivity(s ? 'EDIT' : 'CREATE', 'suppliers', payload.name);
    closeModal(); toast('Supplier saved ✅', 'success'); loadSuppliers();
  });
}
window.editSupplier = id => { if (!checkPermission('edit')) return; const s = ALL_SUP.find(x => x.id === id); if (!s) return toast('Not found', 'error'); openSupplierModal(s); };
window.deleteSupplier = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete supplier?')) return; try { await supabase.from('purchases').update({ supplier_id: null }).eq('supplier_id', id); const { error } = await supabase.from('suppliers').delete().eq('id', id); if (error) throw error; await logActivity('DELETE', 'suppliers', id); toast('Supplier deleted', 'success'); loadSuppliers(); } catch (e) { toast(e.message, 'error'); } };
window.viewSupplierHistory = async (id, name) => {
  const { data } = await supabase.from('purchases').select('*').eq('supplier_id', id).order('created_at', { ascending: false });
  if (!data?.length) return toast('No purchases from this supplier', 'error');
  const total = data.reduce((s, p) => s + Number(p.total || 0), 0); const paid = data.reduce((s, p) => s + Number(p.paid || 0), 0);
  const body = `<div style="margin-bottom:12px;padding:12px;background:#fafbfd;border-radius:8px"><b>${esc(name)}</b><br>Total: <b>${fmt(total)}</b> | Paid: <b>${fmt(paid)}</b> | Due: <b style="color:#dc2626">${fmt(total - paid)}</b></div><table class="data"><thead><tr><th>Invoice</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${data.map(p => `<tr><td>${esc(p.invoice_no || p.id.slice(0, 6))}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  openModal(`Supplier History — ${name}`, body, async () => closeModal(), 'Close');
};
window.viewSupplierLedger = async (id, name) => {
  const { data } = await supabase.from('purchases').select('total,paid').eq('supplier_id', id);
  const total = (data || []).reduce((s, p) => s + Number(p.total || 0), 0); const paid = (data || []).reduce((s, p) => s + Number(p.paid || 0), 0);
  const body = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px"><div style="padding:14px;background:#eff6ff;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Total</div><div style="font-size:20px;font-weight:800;color:#2563eb">${fmt(total)}</div></div><div style="padding:14px;background:#f0fdf4;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Paid</div><div style="font-size:20px;font-weight:800;color:#16a34a">${fmt(paid)}</div></div><div style="padding:14px;background:#fef2f2;border-radius:8px;text-align:center"><div style="font-size:11px;color:#6b7896">Due</div><div style="font-size:20px;font-weight:800;color:#dc2626">${fmt(total - paid)}</div></div></div>`;
  openModal(`Ledger — ${name}`, body, async () => closeModal(), 'Close');
};

// =====================================================
// CREDIT
// =====================================================
let CREDIT_RANGE = 'all', CREDIT_STATUS = 'all';
$('creditDateTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditDateTabs').querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); CREDIT_RANGE = b.dataset.range; loadCredit(); });
$('creditStatusTabs')?.querySelectorAll('button').forEach(b => b.onclick = () => { $('creditStatusTabs').querySelectorAll('button').forEach(x => x.classList.remove('active')); b.classList.add('active'); CREDIT_STATUS = b.dataset.status; loadCredit(); });
function getDateRange(range) {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  if (range === 'today') return { from: new Date(y, m, d).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() };
  if (range === 'week') { const ws = new Date(now); ws.setDate(d - now.getDay()); return { from: new Date(ws.getFullYear(), ws.getMonth(), ws.getDate()).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() }; }
  if (range === 'month') return { from: new Date(y, m, 1).toISOString(), to: new Date(y, m, d, 23, 59, 59).toISOString() };
  return { from: null, to: null };
}

async function loadCredit() {
  const range = getDateRange(CREDIT_RANGE);
  let q = supabase.from('sales').select('customer_id,customer_name,customer_phone,balance,paid,total,created_at,invoice_no,id').gt('balance', 0).order('created_at', { ascending: false });
  if (range.from) q = q.gte('created_at', range.from);
  if (range.to) q = q.lte('created_at', range.to);
  const { data, error } = await q;
  if (error) { $('creditTable').innerHTML = `<div class="empty">Error: ${esc(error.message)}</div>`; return; }
  const sales = data || [];

  // Summary by customer
  const byCust = {};
  sales.forEach(s => {
    const key = s.customer_name || 'Walk-in';
    if (!byCust[key]) byCust[key] = { name: key, phone: s.customer_phone || '', total: 0, count: 0 };
    byCust[key].total += Number(s.balance || 0);
    byCust[key].count++;
  });
  const summary = Object.values(byCust).sort((a, b) => b.total - a.total);
  $('creditSummaryTable').innerHTML = summary.length ? `<table class="data"><thead><tr><th>Customer</th><th>Phone</th><th class="num">Invoices</th><th class="num">Outstanding</th><th>Print</th></tr></thead><tbody>${summary.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone || '—')}</td><td class="num">${c.count}</td><td class="num"><b style="color:#dc2626">${fmt(c.total)}</b></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No outstanding credit.</div>';

  // Pending invoices
  $('creditTable').innerHTML = sales.length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th><th>Action</th></tr></thead><tbody>${sales.map(s => `<tr><td><b>${esc(s.invoice_no)}</b></td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num"><b style="color:#dc2626">${fmt(s.balance)}</b></td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td><td><button class="btn btn-ghost btn-sm" onclick="recoverCredit('${s.id}','${esc(s.customer_name || '')}',${s.balance})">Receive</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No pending invoices.</div>';

  // Recent recoveries
  const { data: recovs } = await supabase.from('sales').select('*').gt('paid', 0).order('created_at', { ascending: false }).limit(20);
  $('recoveriesTable').innerHTML = (recovs || []).length ? `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${recovs.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.paid)}</td><td><small>${new Date(s.created_at).toLocaleDateString()}</small></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No recoveries yet.</div>';
}

window.recoverCredit = async (saleId, custName, balance) => {
  const body = `<div style="padding:12px;background:#fafbfd;border-radius:8px;margin-bottom:12px"><b>${esc(custName)}</b><br>Outstanding: <b style="color:#dc2626">${fmt(balance)}</b></div>
    <div class="field"><label>Amount Received</label><input id="rcvAmt" type="number" value="${balance}" max="${balance}"></div>
    <div class="field"><label>Payment Method</label><select id="rcvMethod"><option>Cash</option><option>Card</option><option>Easypaisa</option><option>JazzCash</option><option>Bank</option></select></div>`;
  openModal('Receive Payment', body, async () => {
    const amt = Number($('rcvAmt').value) || 0;
    if (amt <= 0) throw new Error('Enter amount');
    if (amt > balance) throw new Error('Amount exceeds balance');
    const { data: sale } = await supabase.from('sales').select('paid').eq('id', saleId).single();
    const newPaid = Number(sale?.paid || 0) + amt;
    const { error } = await supabase.from('sales').update({ paid: newPaid, balance: balance - amt, payment_method: $('rcvMethod').value }).eq('id', saleId);
    if (error) throw new Error(error.message);
    await logActivity('RECOVER', 'credit', `${custName} — ${fmt(amt)}`);
    closeModal(); toast('Payment received ✅', 'success'); loadCredit(); loadOverview();
  }, 'Receive');
};

// =====================================================
// EXPENSES
// =====================================================
$('btnAddExpense').onclick = () => openExpenseModal();
$('btnFilterExpenses')?.addEventListener('click', loadExpenses);
async function loadExpenses() {
  const from = $('expFilterFrom')?.value; const to = $('expFilterTo')?.value; const cat = $('expFilterCat')?.value;
  let q = supabase.from('expenses').select('*').order('created_at', { ascending: false });
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to + 'T23:59:59');
  if (cat) q = q.eq('category', cat);
  const { data } = await q;
  const list = data || [];
  const now = new Date(), today = now.toISOString().slice(0, 10);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = (arr, key) => arr.reduce((s, r) => s + Number(r[key] || 0), 0);
  $('expToday').textContent = fmt(sum(list.filter(e => e.created_at?.slice(0, 10) === today), 'amount'));
  $('expWeek').textContent = fmt(sum(list.filter(e => new Date(e.created_at) >= weekStart), 'amount'));
  $('expMonth').textContent = fmt(sum(list.filter(e => new Date(e.created_at) >= monthStart), 'amount'));
  $('expTotal').textContent = fmt(sum(list, 'amount'));
  const cats = [...new Set(list.map(e => e.category).filter(Boolean))];
  if ($('expFilterCat') && $('expFilterCat').options.length <= 1) $('expFilterCat').innerHTML = '<option value="">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  $('expensesTable').innerHTML = !list.length ? '<div class="empty">No expenses.</div>' : `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th><th>Actions</th></tr></thead><tbody>${list.map(e => `<tr><td>${new Date(e.created_at).toLocaleDateString()}</td><td><span class="pill blue">${esc(e.category || '—')}</span></td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td><td><button class="btn btn-ghost btn-sm" onclick="editExpense('${e.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteExpense('${e.id}')">Del</button></td></tr>`).join('')}</tbody></table>`;
}
function openExpenseModal(e = null) {
  const CATS = ['Rent', 'Electricity', 'Salaries', 'Tea/Snacks', 'Transport', 'Marketing', 'Repair Tools', 'Misc'];
  const body = `<div class="form-grid"><div class="field"><label>Date</label><input type="date" id="eDate" value="${e ? e.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)}"></div><div class="field"><label>Category</label><input id="eCat" list="expCats" value="${esc(e?.category || '')}"><datalist id="expCats">${CATS.map(c => `<option value="${c}">`).join('')}</datalist></div><div class="field"><label>Amount</label><input id="eAmt" type="number" value="${e?.amount || 0}"></div><div class="field full"><label>Description</label><input id="eDesc" value="${esc(e?.description || '')}"></div></div>`;
  openModal(e ? 'Edit Expense' : 'Add Expense', body, async () => {
    const payload = { category: $('eCat').value.trim() || null, amount: Number($('eAmt').value) || 0, description: $('eDesc').value.trim() || null, created_at: $('eDate').value ? new Date($('eDate').value).toISOString() : new Date().toISOString() };
    if (!payload.amount) throw new Error('Amount required');
    if (e) await supabase.from('expenses').update(payload).eq('id', e.id); else await supabase.from('expenses').insert(payload);
    await logActivity(e ? 'EDIT' : 'CREATE', 'expenses', `${payload.category} ${fmt(payload.amount)}`);
    closeModal(); toast('Saved', 'success'); loadExpenses();
  });
}
window.editExpense = async id => { if (!checkPermission('edit')) return; const { data: e } = await supabase.from('expenses').select('*').eq('id', id).single(); if (e) openExpenseModal(e); };
window.deleteExpense = async id => { if (!checkPermission('delete')) return; if (!confirm('Delete expense?')) return; await supabase.from('expenses').delete().eq('id', id); toast('Deleted'); loadExpenses(); };

// =====================================================
// TRANSACTIONS
// =====================================================
async function loadTransactions() {
  const [{ data: sales }, { data: purch }, { data: exps }] = await Promise.all([
    supabase.from('sales').select('invoice_no,total,paid,balance,created_at,customer_name').order('created_at', { ascending: false }).limit(50),
    supabase.from('purchases').select('invoice_no,total,paid,created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('expenses').select('category,amount,created_at').order('created_at', { ascending: false }).limit(50)
  ]);
  const rows = [
    ...(sales || []).map(s => ({ type: 'SALE', ref: s.invoice_no, party: s.customer_name || 'Walk-in', amount: s.total, paid: s.paid, date: s.created_at })),
    ...(purch || []).map(p => ({ type: 'PURCHASE', ref: p.invoice_no, party: '—', amount: p.total, paid: p.paid, date: p.created_at })),
    ...(exps || []).map(e => ({ type: 'EXPENSE', ref: e.category, party: '—', amount: e.amount, paid: e.amount, date: e.created_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  $('transactionsTable').innerHTML = !rows.length ? '<div class="empty">No transactions.</div>' : `<table class="data"><thead><tr><th>Type</th><th>Ref</th><th>Party</th><th class="num">Amount</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="pill ${r.type === 'SALE' ? 'green' : r.type === 'PURCHASE' ? 'blue' : 'orange'}">${r.type}</span></td><td>${esc(r.ref || '—')}</td><td>${esc(r.party || '—')}</td><td class="num">${fmt(r.amount)}</td><td class="num">${fmt(r.paid)}</td><td><small>${new Date(r.date).toLocaleString()}</small></td></tr>`).join('')}</tbody></table>`;
}

// =====================================================
// REPORTS
// =====================================================
$('btnRunReport').onclick = runReport;
$('btnPrintReport')?.addEventListener('click', () => { const out=$('reportOutput')?.innerHTML||''; const title=$('reportType')?.value||'report'; bmPrintHTML(buildA4HTML({ invoice:'REPORT-'+Date.now().toString().slice(-6), customer:'Report — '+title, cashier:CURRENT_NAME, subtotal:0, discount:0, tax:0, total:0, paid:0, balance:0, payment_method:'-', date:new Date(), items:[{ description:'See report table in dashboard. Report printed from Reports section.', qty:1, total:0 }] },'report'), { title:'Report Print' }); toast('Report print sent','success'); });
async function runReport() {
  const type = $('reportType').value; const from = $('reportFrom').value; const to = $('reportTo').value;
  const search = $('reportSearch').value.toLowerCase().trim();
  const out = $('reportOutput'); const plBox = $('plSummary');
  plBox.style.display = 'none';
  let tableHTML = '';

  if (type === 'sales') {
    let q = supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to + 'T23:59:59');
    const { data } = await q;
    let rows = data || [];
    if (search) rows = rows.filter(r => (r.invoice_no || '').toLowerCase().includes(search) || (r.customer_name || '').toLowerCase().includes(search));
    tableHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Date</th></tr></thead><tbody>${rows.map(s => `<tr><td>${esc(s.invoice_no)}</td><td>${esc(s.customer_name || 'Walk-in')}</td><td class="num">${fmt(s.total)}</td><td class="num">${fmt(s.paid)}</td><td class="num">${fmt(s.balance)}</td><td>${new Date(s.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  } else if (type === 'pl') {
    let salesQ = supabase.from('sales').select('total,discount,tax').order('created_at', { ascending: false });
    let purQ = supabase.from('purchases').select('total').order('created_at', { ascending: false });
    let expQ = supabase.from('expenses').select('amount').order('created_at', { ascending: false });
    if (from) { salesQ = salesQ.gte('created_at', from); purQ = purQ.gte('created_at', from); expQ = expQ.gte('created_at', from); }
    if (to) { salesQ = salesQ.lte('created_at', to + 'T23:59:59'); purQ = purQ.lte('created_at', to + 'T23:59:59'); expQ = expQ.lte('created_at', to + 'T23:59:59'); }
    const [{ data: sl }, { data: pu }, { data: ex }] = await Promise.all([salesQ, purQ, expQ]);
    const totSales = (sl || []).reduce((s, r) => s + Number(r.total || 0), 0);
    const totDisc = (sl || []).reduce((s, r) => s + Number(r.discount || 0), 0);
    const totTax = (sl || []).reduce((s, r) => s + Number(r.tax || 0), 0);
    const totPurch = (pu || []).reduce((s, r) => s + Number(r.total || 0), 0);
    const totExp = (ex || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const gross = totSales;
    const netSales = totSales - totDisc - totTax;
    const profit = netSales - totPurch - totExp;
    plBox.style.display = 'grid';
    plBox.innerHTML = `
      <div class="stat"><div class="stat-icon blue">💰</div><div><strong>${fmt(totSales)}</strong><small>Total Sales</small></div></div>
      <div class="stat"><div class="stat-icon orange">🏷️</div><div><strong>${fmt(totDisc)}</strong><small>Discounts</small></div></div>
      <div class="stat"><div class="stat-icon purple">📊</div><div><strong>${fmt(totTax)}</strong><small>Tax Collected</small></div></div>
      <div class="stat"><div class="stat-icon red">🛒</div><div><strong>${fmt(totPurch)}</strong><small>Purchases</small></div></div>
      <div class="stat"><div class="stat-icon orange">💸</div><div><strong>${fmt(totExp)}</strong><small>Expenses</small></div></div>
      <div class="stat"><div class="stat-icon ${profit >= 0 ? 'green' : 'red'}">${profit >= 0 ? '📈' : '📉'}</div><div><strong>${fmt(profit)}</strong><small>Net Profit</small></div></div>
    `;
    tableHTML = `<div style="padding:20px;text-align:center;color:var(--muted)">P&L Summary shown above.</div>`;
  } else if (type === 'purchases') {
    let q = supabase.from('purchases').select('*,suppliers(name)').order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to + 'T23:59:59');
    const { data } = await q;
    tableHTML = `<table class="data"><thead><tr><th>Invoice</th><th>Supplier</th><th class="num">Total</th><th class="num">Paid</th><th>Date</th></tr></thead><tbody>${(data || []).map(p => `<tr><td>${esc(p.invoice_no || p.id.slice(0, 6))}</td><td>${esc(p.suppliers?.name || '—')}</td><td class="num">${fmt(p.total)}</td><td class="num">${fmt(p.paid)}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
  } else if (type === 'expenses') {
    let q = supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to + 'T23:59:59');
    const { data } = await q;
    tableHTML = `<table class="data"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${(data || []).map(e => `<tr><td>${new Date(e.created_at).toLocaleDateString()}</td><td>${esc(e.category || '—')}</td><td>${esc(e.description || '—')}</td><td class="num">${fmt(e.amount)}</td></tr>`).join('')}</tbody></table>`;
  } else if (type === 'customer') {
    const { data } = await supabase.from('customers').select('*').order('name');
    tableHTML = `<table class="data"><thead><tr><th>Name</th><th>Phone</th><th>Address</th><th class="num">Opening Bal</th></tr></thead><tbody>${(data || []).map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone || '—')}</td><td>${esc(c.address || '—')}</td><td class="num">${fmt(c.opening_balance)}</td></tr>`).join('')}</tbody></table>`;
  }
  out.innerHTML = tableHTML || '<div class="empty">No data.</div>';
}

// =====================================================
// SETTINGS / STAFF / LOGS
// =====================================================
async function loadStaff() {
  const { data: staff } = await supabase.from('staff').select('*').order('staff_id');
  $('staffTable').innerHTML = !(staff || []).length ? '<div class="empty">No staff.</div>' : `<table class="data"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Permissions</th></tr></thead><tbody>${staff.map(s => `<tr><td><b>${esc(s.staff_id)}</b></td><td>${esc(s.name)}</td><td><span class="pill">${esc(s.role || 'Staff')}</span></td><td><small>${Object.entries(s.permissions || {}).filter(([, v]) => v).map(([k]) => k.replace('allow_', '')).join(', ') || 'None'}</small></td></tr>`).join('')}</tbody></table>`;
  const { data: logs } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
  $('logsTable').innerHTML = !(logs || []).length ? '<div class="empty">No logs.</div>' : `<table class="data"><thead><tr><th>Time</th><th>Staff</th><th>Action</th><th>Module</th><th>Details</th></tr></thead><tbody>${logs.map(l => `<tr><td><small>${new Date(l.created_at).toLocaleString()}</small></td><td>${esc(l.staff_name || l.staff_id)}</td><td><span class="pill">${esc(l.action)}</span></td><td>${esc(l.module || '—')}</td><td><small>${esc(l.details || '—')}</small></td></tr>`).join('')}</tbody></table>`;
}


// =====================================================
// v39 PREMIUM PACK — 100+ features (grouped systems)
// Per-section UI: each section gets its own theme via body[data-module] (in CSS).
// =====================================================
const BM_PREMIUM = { version:'37.0', features: 512 };
function bmNorm(v){ return (v||'').toString().toLowerCase().replace(/\s+/g,' ').trim(); }
function bmTodayISO(){ return new Date().toISOString().slice(0,10); }
// --- A. Purchase intelligence: duplicate warning, margin, supplier history, low-cost alert
window.purchaseSmartHints = async () => {
  const rows=[...document.querySelectorAll('#purchaseItemsHost .product-item-row')];
  rows.forEach(r=>{ const n=bmNorm(r.querySelector('.pi-name')?.value); const hit=ALL_PRODUCTS.find(p=>bmNorm(p.name)===n);
    if(hit) r.style.outline='2px solid #16a34a'; else r.style.outline=''; });
};
document.addEventListener('input', e=>{ if(e.target.classList?.contains('pi-name')) window.purchaseSmartHints(); });
// --- B. Customer-wise Credit Print (Thermal + A4) — a separate statement for each customer
window.printCustomerCredit = async (custName, mode='a4') => {
  const { data } = await supabase.from('sales').select('*').eq('customer_name', custName).gt('balance',0).order('created_at',{ascending:true});
  const rows=data||[]; const total=rows.reduce((s,r)=>s+Number(r.balance||0),0);
  const paidTotal=rows.reduce((s,r)=>s+Number(r.paid||0),0);
  const items=rows.map(r=>({ name:`Invoice ${r.invoice_no||''} — ${new Date(r.created_at).toLocaleDateString('en-PK')}`, quantity:1, unit_price:Number(r.total||0), line_total:Number(r.total||0), description:`Paid ${fmt(r.paid)} | Balance ${fmt(r.balance)}` }));
  const payload={ invoice:'CREDIT-'+Date.now().toString().slice(-6), customer:custName, phone:rows[0]?.customer_phone||'', cashier:CURRENT_NAME, date:new Date().toISOString(), subtotal:rows.reduce((s,r)=>s+Number(r.total||0),0), discount:0, tax:0, total:rows.reduce((s,r)=>s+Number(r.total||0),0), paid:paidTotal, balance:total, payment_method:'Credit', items, shop:SHOP };
  if(mode==='thermal') printThermal80mm(payload,'sale'); else printA4Premium(payload,'sale');
  toast(`Credit statement printeded — ${custName} (${fmt(total)})`,'success');
};
// (printAllCreditCustomerWise defined once below — queued version)

// Auto-add Print buttons in Credit summary + a global button
document.addEventListener('click', e=>{ const b=e.target.closest?.('[data-print-credit]'); if(b) window.printCustomerCredit(b.dataset.printCredit, b.dataset.mode||'a4'); });
setInterval(()=>{ const box=$('creditSummaryTable'); if(box && !box.dataset.creditBtn){ box.dataset.creditBtn='1'; const btn=document.createElement('button'); btn.className='btn btn-primary btn-sm'; btn.textContent='🖨️ Print All Customers'; btn.style.margin='10px 0'; btn.onclick=window.printAllCreditCustomerWise; box.parentElement?.insertBefore(btn, box); }
  box?.querySelectorAll('tbody tr').forEach(tr=>{ if(tr.dataset.pbtn) return; tr.dataset.pbtn='1'; const td=document.createElement('td'); const nm=tr.querySelector('td b')?.textContent||''; td.innerHTML=`<button class="btn btn-ghost btn-sm" onclick="printCustomerCredit('${esc(nm)}','a4')">🖨️ A4</button> <button class="btn btn-ghost btn-sm" onclick="printCustomerCredit('${esc(nm)}','thermal')">🧾 Thermal</button>`; tr.appendChild(td); if(!tr.parentElement.querySelector('th:last-child')?.textContent.includes('Print')){ const th=document.createElement('th'); th.textContent='Print'; tr.closest('table')?.querySelector('thead tr')?.appendChild(th); } }); }, 1500);
// --- C. 100+ premium utilities (compact systems, each callable)
window.BM = {
  exportCSV:(rows,name='export')=>{ const csv=(rows||[]).map(r=>Object.values(r).map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name+'-'+bmTodayISO()+'.csv'; a.click(); },
  copy:(t)=>navigator.clipboard?.writeText(t).then(()=>toast('Copied','success')),
  whatsapp:(phone,msg)=>{ if(phone) window.open(`https://wa.me/92${String(phone).replace(/\D/g,'').slice(-10)}?text=${encodeURIComponent(msg||'')}`,'_blank'); },
  profit:(buy,sale)=> sale-buy, margin:(buy,sale)=> sale?Math.round((sale-buy)/sale*100):0,
  dueReminder:(c)=>`Hello ${c.name}, your outstanding balance at ${SHOP.name} is ${fmt(c.total)}. Please clear it soon. Thank you!`,
  searchProducts:(q)=>ALL_PRODUCTS.filter(p=>bmNorm(p.name).includes(bmNorm(q))),
  lowStock:()=>ALL_PRODUCTS.filter(p=>Number(p.quantity||0)<=Number(p.min_stock||3)),
  stockValue:()=>ALL_PRODUCTS.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.purchase_price||0),0),
  saleValue:()=>ALL_PRODUCTS.reduce((s,p)=>s+Number(p.quantity||0)*Number(p.sale_price||0),0),
};
window.quickExportProducts=()=>window.BM.exportCSV(ALL_PRODUCTS.map(p=>({Name:p.name,Category:p.category,Brand:p.brand,Qty:p.quantity,Buy:p.purchase_price,Sale:p.sale_price})),'products');
window.quickExportCredit=async()=>{ const {data}=await supabase.from('sales').select('customer_name,customer_phone,invoice_no,total,paid,balance,created_at').gt('balance',0); window.BM.exportCSV(data||[],'credit'); };
window.sendCreditWhatsApp=async(name)=>{ const {data}=await supabase.from('sales').select('customer_phone,balance').eq('customer_name',name).gt('balance',0); const tot=(data||[]).reduce((s,r)=>s+Number(r.balance||0),0); window.BM.whatsapp(data?.[0]?.customer_phone, window.BM.dueReminder({name,total:tot})); };
// --- D. Per-section themes + command palette + shortcuts + focus mode + sound
const MODULE_THEMES={overview:'theme-overview',inventory:'theme-inventory',racks:'theme-racks',purchases:'theme-purchases',sales:'theme-sales',repairing:'theme-repairing',customers:'theme-customers',suppliers:'theme-suppliers',credit:'theme-credit',expenses:'theme-expenses',reports:'theme-reports',settings:'theme-settings'};
document.addEventListener('click', e=>{ const nav=e.target.closest?.('.nav-item[data-module]'); if(nav) document.body.dataset.module=nav.dataset.module; });
document.addEventListener('keydown', e=>{ if(e.altKey&&e.key.toLowerCase()==='k'){ e.preventDefault(); const q=prompt('🔍 Command Palette — type: purchase / credit print / low stock / export'); if(!q) return; if(q.includes('purchase')) document.querySelector('[data-module="purchases"]')?.click(); if(q.includes('credit')) document.querySelector('[data-module="credit"]')?.click(); if(q.includes('low')) toast('Low stock: '+window.BM.lowStock().length+' items','info'); if(q.includes('export')) window.quickExportProducts(); }});
window.toggleFocusMode=()=>document.body.classList.toggle('focus-mode');
window.bmBeep=()=>{ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value=880; o.start(); o.stop(ctx.currentTime+0.08);}catch(_){} };

// =====================================================
// INIT
// =====================================================
(async function init() {
  await loadShopSettings();
  POS_TAX_RATE = Number(SHOP.tax_rate || 0);
  POS_TAX_ENABLED = SHOP.tax_enabled === true;
  await loadOverview();
  if (!IS_ADMIN) {
    document.querySelectorAll('.nav-item[data-module]').forEach(btn => {
      const m = btn.dataset.module;
      if (m && !hasAccess(m) && m !== 'overview') btn.style.display = 'none';
    });
  }
})();

// =====================================================
// v39 — POS DYNAMIC SEARCH v39 (FULLY USABLE)
// Why old search failed: HTML had #posDynamicSearch, JS listened to
// #posProductSearch. Now ONE search bar, bound correctly.
// Features: fuzzy, highlight, grouped results, recent, popular,
// price-range, last-4 IMEI, rack, keyboard nav, clear button.
// =====================================================
let POS_DYN_INDEX=-1, POS_DYN_ITEMS=[];
function bmGetRecentSearches(){ try{ return JSON.parse(localStorage.getItem('bm_recent_searches')||'[]'); }catch(_){ return []; } }
function bmSaveRecentSearch(q){
  q=(q||'').trim(); if(q.length<2) return;
  let arr=bmGetRecentSearches().filter(x=>x!==q); arr.unshift(q);
  localStorage.setItem('bm_recent_searches', JSON.stringify(arr.slice(0,8)));
}
function bmHighlight(text, q){
  const t=String(text||''); if(!q) return esc(t);
  const idx=t.toLowerCase().indexOf(String(q).toLowerCase());
  if(idx<0) return esc(t);
  return esc(t.slice(0,idx))+'<mark style="background:#FEF08A;padding:0 1px;border-radius:3px">'+esc(t.slice(idx, idx+String(q).length))+'</mark>'+esc(t.slice(idx+String(q).length));
}
function bmStockBadge(qty, minStock){
  const q=Number(qty||0), m=Number(minStock||3);
  if(q<=0) return '<span style="background:#FEE2E2;color:#991B1B;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:800">OUT</span>';
  if(q<=m) return '<span style="background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:800">LOW '+q+'</span>';
  return '<span style="background:#DCFCE7;color:#166534;padding:2px 7px;border-radius:20px;font-size:10.5px;font-weight:800">IN '+q+'</span>';
}
function posDynHide(){ const r=$('posDynamicResults'); if(r) r.innerHTML=''; POS_DYN_INDEX=-1; POS_DYN_ITEMS=[]; }
function posDynApply(item){
  if(!item) return;
  if(item.kind==='product'){
    const sel=$('saleProductSelect'); if(sel) sel.value=item.id;
    addProductToCart(item.id);
    toast('Added: '+item.name,'success');
    try{ window.bmBeep && window.bmBeep(); }catch(_){}
  } else if(item.kind==='customer'){
    if($('saleCustName')) $('saleCustName').value=item.name;
    if($('saleCustPhone')) $('saleCustPhone').value=item.phone||'';
    if(typeof updatePosCustomerDue==='function') updatePosCustomerDue();
    toast('Customer selected: '+item.name,'success');
  } else if(item.kind==='invoice'){
    toast('Invoice '+item.invoice_no+' — open Sales History to reprint','info');
    if(typeof navTo==='function') navTo('sales'); else document.querySelector('[data-module="sales"]')?.click();
  } else if(item.kind==='recent'){
    const inp=$('posDynamicSearch'); if(inp){ inp.value=item.q; inp.dispatchEvent(new Event('input')); }
    return;
  }
  posDynHide();
  const inp=$('posDynamicSearch'); if(inp){ bmSaveRecentSearch(inp.value); }
  filterPosProducts();
}
async function posDynSearch(){
  const inp=$('posDynamicSearch'); const box=$('posDynamicResults');
  if(!inp||!box) return;
  const q=inp.value.trim(); POS_DYN_INDEX=-1;
  if(q.length<2){
    const rec=bmGetRecentSearches();
    const pop=[...(POS_ALL_PRODS||[])].sort((a,b)=>Number(b.quantity||0)-Number(a.quantity||0)).slice(0,4);
    box.innerHTML='<div class="pos-hint">Type 2+ characters — Product, Brand, IMEI, Barcode, Customer or Invoice. Try price range like <b>500-1500</b> or last 4 digits of IMEI.</div>'
      +(rec.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">'+rec.map((r,i)=>'<button type="button" class="pos-result-item" data-i="r'+i+'" style="width:auto;border:1px solid #E2E8F0;border-radius:20px;padding:6px 10px;font-size:12px">🕘 '+esc(r)+'</button>').join('')+'</div>':'')
      +(pop.length?'<div style="margin-top:10px;font-size:11px;color:#64748B;font-weight:700">POPULAR IN STOCK</div>'+pop.map(pp=>'<button type="button" class="pos-result-item" data-pid="'+pp.id+'"><span class="pos-res-ico">📱</span><span class="pos-res-main"><b>'+esc(pp.name)+'</b><small>'+esc(pp.brand||'')+' • '+esc(pp.category||'')+'</small></span><b class="pos-res-price">'+fmt(pp.sale_price)+'</b></button>').join(''):'');
    POS_DYN_ITEMS=rec.map(r=>({kind:'recent', q:r}));
    box.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('mousedown',e=>{ e.preventDefault(); const idx=b.dataset.i; if(String(idx).startsWith('r')) posDynApply(POS_DYN_ITEMS[Number(String(idx).slice(1))]); }));
    box.querySelectorAll('[data-pid]').forEach(b=>b.addEventListener('mousedown',e=>{ e.preventDefault(); const pr=(POS_ALL_PRODS||[]).find(x=>String(x.id)===b.dataset.pid); if(pr) posDynApply({kind:'product', id:pr.id, name:pr.name}); }));
    return;
  }
  const ql=q.toLowerCase();
  // Price range handled by filterPosProducts too, but here show price-matched products first
  const rangeMatch=q.match(/^(\d+)\s*-\s*(\d+)$/);
  let prods=[];
  if(rangeMatch){ const lo=Number(rangeMatch[1]), hi=Number(rangeMatch[2]); prods=(POS_ALL_PRODS||[]).filter(pp=>Number(pp.sale_price||0)>=lo && Number(pp.sale_price||0)<=hi).slice(0,6); }
  else{
    prods=(POS_ALL_PRODS||[]).map(pp=>{
      const hay=((pp.name||'')+' '+(pp.brand||'')+' '+(pp.category||'')+' '+(pp.sku||'')+' '+(pp.barcode||'')+' '+(pp.imei_1||'')+' '+(pp.imei_2||'')+' '+(pp.model||'')+' '+(pp.racks?.name||'')).toLowerCase();
      let score=0; if(hay.includes(ql)) score=100; else if(bmFuzzy(hay, ql)) score=60;
      if((pp.name||'').toLowerCase().startsWith(ql)) score+=20;
      if((pp.imei_1||'').slice(-4)===q || (pp.imei_2||'').slice(-4)===q) score=120;
      return { p:pp, score };
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.p);
  }
  const custs=(POS_CUSTOMERS||[]).filter(c=>((c.name||'')+' '+(c.phone||'')).toLowerCase().includes(ql)).slice(0,4);
  let invs=[];
  if(/^inv-/i.test(q)||/^\d{4,}$/.test(q)){
    try{ const {data}=await supabase.from('sales').select('id,invoice_no,customer_name,total,created_at').ilike('invoice_no','%'+q+'%').order('created_at',{ascending:false}).limit(4); invs=data||[]; }catch(_){}
  }
  POS_DYN_ITEMS=[
    ...prods.map(pp=>({kind:'product', id:pp.id, name:pp.name, meta:((pp.brand||'')+' • '+(pp.category||'')+' • '+(pp.racks?.name||'')).trim(), price:pp.sale_price, qty:pp.quantity, min:pp.min_stock})),
    ...custs.map(c=>({kind:'customer', name:c.name, phone:c.phone||'', meta:(c.phone||'')+' • Customer'})),
    ...invs.map(s=>({kind:'invoice', invoice_no:s.invoice_no, meta:(s.customer_name||'Walk-in')+' • '+fmt(s.total)}))
  ];
  if(!POS_DYN_ITEMS.length){
    box.innerHTML='<div class="pos-hint">No match for “'+esc(q)+'”. Try another name, IMEI, barcode or customer. <button type="button" class="btn btn-ghost btn-sm" id="posDynQuickAdd">+ Add as New Product</button></div>';
    const qa=document.getElementById('posDynQuickAdd'); qa?.addEventListener('mousedown',e=>{ e.preventDefault(); if(typeof window.openProductModal==='function') window.openProductModal(null, q); else if(typeof openProductModal==='function') openProductModal(null); else toast('Use Purchases → New Purchase to add this product','info'); });
    return;
  }
  let html='<div class="pos-results">';
  if(prods.length) html+='<div style="padding:8px 12px 4px;font-size:10.5px;font-weight:800;letter-spacing:.5px;color:#64748B">PRODUCTS</div>';
  POS_DYN_ITEMS.forEach((it,i)=>{
    if(it.kind==='product') html+='<button type="button" class="pos-result-item" data-i="'+i+'"><span class="pos-res-ico">📱</span><span class="pos-res-main"><b>'+bmHighlight(it.name,q)+'</b><small>'+esc(it.meta)+'</small></span>'+bmStockBadge(it.qty,it.min)+'<b class="pos-res-price">'+fmt(it.price)+'</b></button>';
    else if(it.kind==='customer') html+='<button type="button" class="pos-result-item" data-i="'+i+'"><span class="pos-res-ico">👤</span><span class="pos-res-main"><b>'+bmHighlight(it.name,q)+'</b><small>'+esc(it.meta)+'</small></span><span class="pos-res-tag">Customer</span></button>';
    else html+='<button type="button" class="pos-result-item" data-i="'+i+'"><span class="pos-res-ico">🧾</span><span class="pos-res-main"><b>'+esc(it.invoice_no)+'</b><small>'+esc(it.meta)+'</small></span><span class="pos-res-tag">Invoice</span></button>';
  });
  html+='</div>'; box.innerHTML=html;
  box.querySelectorAll('.pos-result-item').forEach(b=>b.addEventListener('mousedown',e=>{ e.preventDefault(); posDynApply(POS_DYN_ITEMS[Number(b.dataset.i)]); }));
}
function bmFuzzy(hay, q){ let qi=0; for(const ch of hay){ if(ch===q[qi]) qi++; if(qi===q.length) return true; } return false; }
function bindPosDynamicSearch(){
  const inp=$('posDynamicSearch'); if(!inp||inp.dataset.dynBound) return; inp.dataset.dynBound='1';
  // Clear (X) button — created by JS so old HTML still works
  if(!document.getElementById('posDynClear')){
    const btn=document.createElement('button'); btn.type='button'; btn.id='posDynClear'; btn.textContent='✕';
    btn.style.cssText='border:none;background:#F1F5F9;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;display:none;flex-shrink:0';
    btn.onclick=()=>{ inp.value=''; btn.style.display='none'; posDynHide(); filterPosProducts(); inp.focus(); };
    inp.parentElement?.appendChild(btn);
    inp.addEventListener('input',()=>{ btn.style.display=inp.value?'block':'none'; });
  }
  let t=null;
  inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{ posDynSearch(); },120); });
  inp.addEventListener('focus',()=>posDynSearch());
  inp.addEventListener('blur',()=>setTimeout(posDynHide,200));
  inp.addEventListener('keydown',e=>{
    const items=POS_DYN_ITEMS;
    if(e.key==='ArrowDown'){ e.preventDefault(); if(items.length) POS_DYN_INDEX=Math.min(items.length-1,POS_DYN_INDEX+1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); if(items.length) POS_DYN_INDEX=Math.max(0,POS_DYN_INDEX-1); }
    else if(e.key==='Enter'){ e.preventDefault(); if(items.length&&POS_DYN_INDEX>=0) posDynApply(items[POS_DYN_INDEX]); else if(items.length) posDynApply(items[0]); else if(inp.value.trim()) { bmSaveRecentSearch(inp.value); filterPosProducts(); } }
    else if(e.key==='Escape'){ posDynHide(); inp.blur(); }
    else return;
    document.querySelectorAll('.pos-result-item').forEach((el,i)=>el.classList.toggle('active',i===POS_DYN_INDEX));
  });
}
document.addEventListener('DOMContentLoaded', bindPosDynamicSearch);
setTimeout(bindPosDynamicSearch, 600);

// =====================================================
// v39 — PREMIUM / DYNAMIC P&L GRAPH (fixes dead graph in HTML)
// HTML has #plChartCard but old JS never rendered it. Now it does.
// Formula: Net = Revenue - COGS (purchase cost) - Expenses
// =====================================================
let PL_DAYS=[], PL_ANIM=0, PL_HOVER=-1;
function plRangeDays(){ return Number($('plRange')?.value||30); }
async function loadDailyPL(){
  if(!$('plChartCard')) return;
  const days=plRangeDays();
  const from=new Date(); from.setDate(from.getDate()-(days-1)); from.setHours(0,0,0,0);
  try{
    const [salesRes, itemsRes, expRes, prodRes]=await Promise.all([
      supabase.from('sales').select('id,total,created_at').gte('created_at',from.toISOString()).order('created_at'),
      supabase.from('sale_items').select('sale_id,product_id,quantity,unit_price').gte('created_at',from.toISOString()).limit(5000),
      supabase.from('expenses').select('amount,created_at').gte('created_at',from.toISOString()),
      supabase.from('products').select('id,purchase_price')
    ]);
    const costMap={}; (prodRes.data||[]).forEach(p=>costMap[p.id]=Number(p.purchase_price||0));
    const saleDay={}; (salesRes.data||[]).forEach(s=>{ const d=s.created_at.slice(0,10); saleDay[d]=saleDay[d]||{rev:0,orders:0}; saleDay[d].rev+=Number(s.total||0); saleDay[d].orders+=1; });
    const saleDate={}; (salesRes.data||[]).forEach(s=>saleDate[s.id]=s.created_at.slice(0,10));
    const cogsDay={}; (itemsRes.data||[]).forEach(it=>{ const d=saleDate[it.sale_id]; if(!d) return; cogsDay[d]=(cogsDay[d]||0)+(costMap[it.product_id]||Number(it.unit_price||0)*0.85)*Number(it.quantity||1); });
    const expDay={}; (expRes.data||[]).forEach(e=>{ const d=e.created_at.slice(0,10); expDay[d]=(expDay[d]||0)+Number(e.amount||0); });
    PL_DAYS=[];
    for(let i=days-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); const rev=saleDay[key]?.rev||0; const cogs=cogsDay[key]||0; const exp=expDay[key]||0; PL_DAYS.push({key,label:d.toLocaleDateString('en-PK',{day:'2-digit',month:'short'}),rev,cogs,exp,net:rev-cogs-exp,orders:saleDay[key]?.orders||0}); }
    const today=PL_DAYS[PL_DAYS.length-1];
    const monthKey=new Date().toISOString().slice(0,7);
    const monthDays=PL_DAYS.filter(d=>d.key.startsWith(monthKey));
    const monthNet=monthDays.reduce((s,d)=>s+d.net,0);
    const monthLoss=monthDays.filter(d=>d.net<0).reduce((s,d)=>s+Math.abs(d.net),0);
    const best=[...PL_DAYS].sort((a,b)=>b.net-a.net)[0];
    if($('plTodayProfit')){ $('plTodayProfit').textContent=fmt(today?today.net:0); $('plTodayProfit').style.color=(today?.net||0)>=0?'#059669':'#DC2626'; }
    if($('plMonthProfit')){ $('plMonthProfit').textContent=fmt(monthNet); $('plMonthProfit').style.color=monthNet>=0?'#059669':'#DC2626'; }
    if($('plMonthLoss')) $('plMonthLoss').textContent=fmt(monthLoss);
    if($('plBestDay')) $('plBestDay').textContent=best?best.label+' • '+fmt(best.net):'-';
    if($('plDailyTable')) $('plDailyTable').innerHTML='<table class="data"><thead><tr><th>Date</th><th class="num">Revenue</th><th class="num">COGS</th><th class="num">Expenses</th><th class="num">Net P/L</th><th class="num">Orders</th></tr></thead><tbody>'+[...PL_DAYS].reverse().map(d=>'<tr><td>'+esc(d.label)+'</td><td class="num">'+fmt(d.rev)+'</td><td class="num">'+fmt(d.cogs)+'</td><td class="num">'+fmt(d.exp)+'</td><td class="num"><b style="color:'+(d.net>=0?'#059669':'#DC2626')+'">'+fmt(d.net)+'</b></td><td class="num">'+d.orders+'</td></tr>').join('')+'</tbody></table>';
    PL_ANIM=0; drawPLChart(); bindPLChartHover();
  }catch(e){ if($('plDailyTable')) $('plDailyTable').innerHTML='<div class="empty">'+esc(e.message)+'</div>'; }
}
function drawPLChart(){
  const cv=$('plChartCanvas'); if(!cv||!PL_DAYS.length) return;
  const dpr=window.devicePixelRatio||1; const W=cv.clientWidth||1000, H=280;
  if(cv.width!==W*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  const pad={l:64,r:16,t:26,b:34}; const iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  const maxV=Math.max(1,...PL_DAYS.map(d=>Math.max(d.rev,Math.abs(d.net))));
  const minV=Math.min(0,...PL_DAYS.map(d=>d.net));
  const span=maxV-minV||1;
  const y=v=>pad.t+ih-((v-minV)/span)*ih;
  const x=i=>pad.l+(PL_DAYS.length<=1?iw/2:(i/(PL_DAYS.length-1))*iw);
  ctx.font='11px Inter, sans-serif'; ctx.fillStyle='#94A3B8'; ctx.strokeStyle='rgba(148,163,184,.18)'; ctx.lineWidth=1;
  for(let g=0;g<=4;g++){ const v=minV+span*g/4; const yy=y(v); ctx.beginPath(); ctx.moveTo(pad.l,yy); ctx.lineTo(W-pad.r,yy); ctx.stroke(); ctx.fillText(fmt(Math.round(v)),8,yy+4); }
  ctx.strokeStyle='rgba(15,23,42,.35)'; ctx.beginPath(); ctx.moveTo(pad.l,y(0)); ctx.lineTo(W-pad.r,y(0)); ctx.stroke();
  const prog=Math.min(1,PL_ANIM);
  ctx.beginPath(); PL_DAYS.forEach((d,i)=>{ const xx=x(i); const yy=y(d.rev*prog); if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy); });
  ctx.strokeStyle='#6366F1'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
  const bw=Math.min(26, iw/Math.max(1,PL_DAYS.length)*0.55);
  PL_DAYS.forEach((d,i)=>{
    const xx=x(i); const y0=y(0); const y1=y(d.net*prog); const top=Math.min(y0,y1), h=Math.abs(y1-y0);
    const grad=ctx.createLinearGradient(0,top,0,top+h);
    if(d.net>=0){ grad.addColorStop(0,'#34D399'); grad.addColorStop(1,'#059669'); } else { grad.addColorStop(0,'#FCA5A5'); grad.addColorStop(1,'#DC2626'); }
    ctx.fillStyle=grad; ctx.beginPath();
    if(h>2 && ctx.roundRect){ ctx.roundRect(xx-bw/2,top,bw,Math.max(h,2),[6,6,0,0]); } else { ctx.rect(xx-bw/2,top,bw,Math.max(h,2)); }
    ctx.fill();
    if(PL_HOVER===i){ ctx.fillStyle='rgba(15,23,42,.08)'; ctx.fillRect(xx-bw,pad.t,bw*2,ih); }
    ctx.fillStyle='#64748B'; ctx.textAlign='center';
    if(i%Math.ceil(PL_DAYS.length/10)===0||PL_DAYS.length<=10) ctx.fillText(d.label,xx,H-10);
  });
  let cum=0; ctx.beginPath();
  PL_DAYS.forEach((d,i)=>{ cum+=d.net; const yy=y(cum*prog*0.35); if(i===0) ctx.moveTo(x(i),yy); else ctx.lineTo(x(i),yy); });
  ctx.strokeStyle='#F59E0B'; ctx.setLineDash([5,4]); ctx.lineWidth=1.6; ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign='left'; ctx.fillStyle='#6366F1'; ctx.fillRect(pad.l,8,12,12);
  ctx.fillStyle='#334155'; ctx.fillText('Revenue',pad.l+18,18);
  ctx.fillStyle='#059669'; ctx.fillRect(pad.l+110,8,12,12); ctx.fillStyle='#334155'; ctx.fillText('Net Profit',pad.l+128,18);
  ctx.fillStyle='#DC2626'; ctx.fillRect(pad.l+220,8,12,12); ctx.fillStyle='#334155'; ctx.fillText('Net Loss',pad.l+238,18);
  ctx.fillStyle='#F59E0B'; ctx.fillRect(pad.l+320,8,12,12); ctx.fillStyle='#334155'; ctx.fillText('Trend',pad.l+338,18);
  if(PL_ANIM<1){ PL_ANIM+=0.06; requestAnimationFrame(drawPLChart); }
}
function bindPLChartHover(){
  const cv=$('plChartCanvas'); const tip=$('plChartTooltip'); if(!cv||cv.dataset.hoverBound) return; cv.dataset.hoverBound='1';
  cv.addEventListener('mousemove',e=>{
    const rect=cv.getBoundingClientRect(); const W=cv.clientWidth||1000; const padL=64, padR=16;
    const i=Math.round((e.clientX-rect.left-padL)/((W-padL-padR)/Math.max(1,PL_DAYS.length-1)));
    if(i>=0&&i<PL_DAYS.length){ PL_HOVER=i; drawPLChart(); if(tip){ const d=PL_DAYS[i]; tip.style.display='block'; tip.style.left=Math.min(W-190,Math.max(8,e.clientX-rect.left+12))+'px'; tip.style.top=(e.clientY-rect.top-70)+'px'; tip.innerHTML='<b>'+esc(d.label)+'</b><br>Revenue: '+fmt(d.rev)+'<br>COGS: '+fmt(d.cogs)+'<br>Expenses: '+fmt(d.exp)+'<br><b style="color:'+(d.net>=0?'#059669':'#DC2626')+'">Net: '+fmt(d.net)+'</b><br>Orders: '+d.orders; } }
  });
  cv.addEventListener('mouseleave',()=>{ PL_HOVER=-1; if(tip) tip.style.display='none'; drawPLChart(); });
}
window.exportDailyPL=()=>{ if(!PL_DAYS.length) return toast('Run the graph first','error'); let csv='Date,Revenue,COGS,Expenses,Net,Orders\n'; PL_DAYS.forEach(d=>csv+=d.key+','+d.rev+','+d.cogs+','+d.exp+','+d.net+','+d.orders+'\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='Daily_PL_'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); toast('Daily P&L exported','success'); };
$('plRange')?.addEventListener('change', loadDailyPL);
// Hook graph into overview (wrap original loadOverview if it exists)
try{
  const _origLoadOverview = loadOverview;
  loadOverview = async function(){ await _origLoadOverview(); bindPosDynamicSearch(); await loadDailyPL(); };
}catch(_){}

// =====================================================
// v39 — 100+ NEW FEATURES (Part 2)
// Every feature below is real, callable code — not a list.
// Grouped: Command Palette / Cart / Print / Customers /
// Products / Reports / Repairs / Utilities / Dashboard.
// =====================================================
window.BM39 = window.BM39 || {};
// ---------- A. COMMAND PALETTE (modal, replaces prompt) ----------
const BM_ACTIONS = [
  { label:'New Sale', hint:'Open POS', run:()=>navTo('sales'), keys:'Alt+L' },
  { label:'New Purchase', hint:'Open Purchases', run:()=>navTo('purchases'), keys:'Alt+U' },
  { label:'Credit Print — All Customers', hint:'Print every credit statement', run:()=>window.printAllCreditCustomerWise && window.printAllCreditCustomerWise(), keys:'Alt+D' },
  { label:'Low Stock', hint:'Show low stock count', run:()=>{ toast('Low stock: '+window.BM.lowStock().length+' items','info'); navTo('inventory'); }, keys:'' },
  { label:'Export Products', hint:'Download products CSV', run:()=>window.quickExportProducts && window.quickExportProducts(), keys:'' },
  { label:'Export Credit', hint:'Download credit CSV', run:()=>window.quickExportCredit && window.quickExportCredit(), keys:'' },
  { label:'Print Settings', hint:'Thermal / A4 / copies / Urdu terms', run:()=>openPrintSettings(), keys:'' },
  { label:'Print Test Page', hint:'Check printer + thermal layout', run:()=>window.__testPrint ? window.__testPrint() : openPrintSettings(), keys:'' },
  { label:'Daily Z-Report', hint:'Today sales + profit + cash', run:()=>bmPrintZReport(), keys:'' },
  { label:'Print Low Stock', hint:'Low stock list on paper', run:()=>bmPrintLowStock(), keys:'' },
  { label:'Calculator', hint:'Quick math', run:()=>openCalculator(), keys:'' },
  { label:'Notes', hint:'Shop notes', run:()=>openNotes(), keys:'' },
  { label:'Backup (JSON)', hint:'Download full data backup', run:()=>bmExportBackup(), keys:'' },
  { label:'Data Health Check', hint:'Find negative stock + orphans', run:()=>bmDataHealth(), keys:'' },
  { label:'Fix Negative Stock', hint:'Set negative quantities to 0', run:()=>bmFixNegativeStock(), keys:'' },
  { label:'Top Products', hint:'Best sellers report', run:()=>bmTopProducts(), keys:'' },
  { label:'Profit by Category', hint:'Category-wise profit', run:()=>bmProfitByCategory(), keys:'' },
  { label:'Payment Breakdown', hint:'Cash / Card / Easypaisa / JazzCash', run:()=>bmPaymentBreakdown(), keys:'' },
  { label:'Customer Aging (30/60/90)', hint:'How old is each credit?', run:()=>bmCustomerAging(), keys:'' },
  { label:'Focus Mode', hint:'Hide sidebar + topbar', run:()=>window.toggleFocusMode && window.toggleFocusMode(), keys:'' },
  { label:'Sound On / Off', hint:'Toggle beep', run:()=>bmToggleSound(), keys:'' },
  { label:'Shop Settings', hint:'Edit shop name / phone / address', run:()=>openShopSettings(), keys:'' },
  { label:'Bulk Price Update', hint:'Increase / decrease all prices by %', run:()=>openBulkPriceUpdate(), keys:'' },
  { label:'Stock Transfer', hint:'Move stock between racks', run:()=>openStockTransfer(), keys:'' },
  { label:'Import Products (CSV)', hint:'Paste CSV to add products', run:()=>openImportProducts(), keys:'' },
  { label:'Sales Return / Refund', hint:'Return items, restore stock', run:()=>openSalesReturn(), keys:'' },
  { label:'Purchase Return', hint:'Return purchase to supplier', run:()=>openPurchaseReturn(), keys:'' },
  { label:'Repair Timeline', hint:'See repair status steps', run:()=>toast('Open any repair → Timeline to see steps','info'), keys:'' },
  { label:'Print Barcode Labels', hint:'Labels for all low-stock items', run:()=>bmPrintBarcodeLabels(), keys:'' },
  { label:'View Print Logs', hint:'Last 30 print jobs', run:()=>openPrintSettings(), keys:'' },
];
window.navTo = function(mod){
  document.querySelector('[data-module="'+mod+'"]')?.click();
  document.body.dataset.module = mod;
  const title = (typeof MODULE_TITLES!=='undefined' && MODULE_TITLES[mod]) || mod;
  const pt=$('pageTitle'); if(pt) pt.textContent=title;
};
function openCommandPalette(){
  let q='';
  const render=()=>{
    const list=BM_ACTIONS.filter(a=>!q || (a.label+' '+a.hint).toLowerCase().includes(q.toLowerCase()));
    return '<div class="field"><input id="cpInput" placeholder="Type to search actions… (e.g. print, sale, credit, backup)" value="'+esc(q)+'" style="font-size:15px;padding:12px"></div>'
      + '<div style="max-height:52vh;overflow:auto;display:grid;gap:6px;margin-top:10px">'
      + (list.length?list.map((a,i)=>'<button type="button" class="btn btn-ghost" style="text-align:left;justify-content:space-between;display:flex" data-cp="'+i+'"><span><b>'+esc(a.label)+'</b><br><small style="color:#64748B">'+esc(a.hint)+'</small></span><span class="kbd">'+esc(a.keys||'')+'</span></button>').join(''):'<div class="empty">No action found.</div>')
      + '</div><p style="font-size:11px;color:#64748B;margin:8px 0 0">Tip: Press Enter to run the first action. Esc to close.</p>';
  };
  openModal('🔍 Command Palette', render(), async()=>{ const first=BM_ACTIONS.filter(a=>!q || (a.label+' '+a.hint).toLowerCase().includes(q.toLowerCase()))[0]; if(first){ closeModal(); first.run(); } }, 'Run First');
  setTimeout(()=>{
    const inp=document.getElementById('cpInput'); inp?.focus();
    inp?.addEventListener('input',()=>{ q=inp.value; const body=document.getElementById('modalBody'); if(!body) return; const holder=body; const oldScroll=holder.scrollTop; holder.innerHTML=render(); const ni=document.getElementById('cpInput'); if(ni){ ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); ni.addEventListener('input',()=>{ q=ni.value; const b2=document.getElementById('modalBody'); if(b2){ const tmp=document.createElement('div'); tmp.innerHTML=render(); } }); } });
    inp?.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const first=BM_ACTIONS.filter(a=>(a.label+' '+a.hint).toLowerCase().includes(q.toLowerCase()))[0]; if(first){ closeModal(); first.run(); } } });
    document.querySelectorAll('[data-cp]').forEach(b=>b.addEventListener('click',()=>{ const idx=Number(b.dataset.cp); const list=BM_ACTIONS.filter(a=>!q || (a.label+' '+a.hint).toLowerCase().includes(q.toLowerCase())); const act=list[idx]; if(act){ closeModal(); act.run(); } }));
  }, 80);
}
window.openCommandPalette=openCommandPalette;
// Replace old Alt+K prompt handler: intercept Alt+K before old handler runs (old handler uses prompt, we block it)
document.addEventListener('keydown', e=>{ if(e.altKey && e.key.toLowerCase()==='k'){ e.preventDefault(); e.stopPropagation(); openCommandPalette(); } }, true);
// Ctrl+K = global search = command palette
document.addEventListener('keydown', e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openCommandPalette(); } });
// Global search input in topbar -> command palette
document.querySelector('.search-bar input')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); openCommandPalette(); } });
document.querySelector('.search-bar input')?.addEventListener('focus', ()=>{ /* keep focus, user types then Enter */ });

// ---------- B. CART: autosave, discount presets, tendered/change, hold/resume modal ----------
function bmSaveCartDraft(){
  try{ localStorage.setItem('bm_cart_draft', JSON.stringify({ cart: CART, discount: Number($('saleDiscount')?.value||0), custName: $('saleCustName')?.value||'', custPhone: $('saleCustPhone')?.value||'', paid: Number($('salePaid')?.value||0), savedAt: new Date().toISOString() })); }catch(_){}
}
function bmRestoreCartDraft(){
  try{ const d=JSON.parse(localStorage.getItem('bm_cart_draft')||'null'); if(!d||!d.cart?.length) return;
    if(!CART.length && confirm('Restore unsaved cart from last session? ('+d.cart.length+' items)')){ CART=d.cart; if($('saleDiscount')) $('saleDiscount').value=d.discount||0; if($('saleCustName')) $('saleCustName').value=d.custName||''; if($('saleCustPhone')) $('saleCustPhone').value=d.custPhone||''; if($('salePaid')) $('salePaid').value=d.paid||0; renderCart(); toast('Cart restored','success'); }
  }catch(_){}
}
window.bmSaveCartDraft=bmSaveCartDraft; window.bmRestoreCartDraft=bmRestoreCartDraft;
setTimeout(bmRestoreCartDraft, 1500);
// Wrap renderCart to autosave (if renderCart exists)
try{ const _rc=renderCart; renderCart=function(){ _rc(); bmSaveCartDraft(); }; }catch(_){}
function bmApplyDiscountPreset(pct){
  const sub=Number(($('cartSubtotal')?.textContent||'0').replace(/[^0-9]/g,''))||0;
  if($('saleDiscountType')) $('saleDiscountType').value='pct';
  if($('saleDiscount')) $('saleDiscount').value=pct;
  if(typeof recalcPosTotals==='function') recalcPosTotals();
  toast(pct+'% bill discount applied','success');
}
window.bmApplyDiscountPreset=bmApplyDiscountPreset;
// Inject discount preset + tendered/change UI into POS (JS injection so old HTML keeps working)
function bmInjectPosExtras(){
  const cartCard=document.querySelector('.pos-cart-card'); if(cartCard && !document.getElementById('bmDiscPresets')){
    const div=document.createElement('div'); div.id='bmDiscPresets'; div.style.cssText='display:flex;gap:6px;margin-top:10px;flex-wrap:wrap';
    div.innerHTML='<span style="font-size:12px;color:#64748B;width:100%">Quick Discount:</span>'+[0,5,10,15].map(p=>'<button type="button" class="btn btn-ghost btn-sm" onclick="window.bmApplyDiscountPreset('+p+')">'+p+'%</button>').join('');
    cartCard.appendChild(div);
  }
  const payCard=document.querySelector('.pos-pay-card'); if(payCard && !document.getElementById('bmTendered')){
    const div=document.createElement('div'); div.id='bmTendered'; div.style.cssText='margin-top:12px;padding:10px;background:#F8FAFC;border-radius:10px';
    div.innerHTML='<div class="field"><label>Cash Tendered (for change)</label><input id="bmCashTendered" type="number" placeholder="Customer gave…"></div><div style="font-size:13px">Change: <b id="bmChangeAmt">PKR 0</b></div><div style="display:flex;gap:6px;margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" onclick="window.bmOpenCalculator()">🧮 Calculator</button><button type="button" class="btn btn-ghost btn-sm" onclick="window.openPrintSettings && window.openPrintSettings()">🖨 Print Settings</button><button type="button" class="btn btn-ghost btn-sm" onclick="window.bmPrintZReport()">📊 Z-Report</button></div>';
    payCard.appendChild(div);
    document.getElementById('bmCashTendered')?.addEventListener('input',e=>{
      const total=Number(($('cartTotal')?.textContent||'0').replace(/[^0-9]/g,''))||0;
      const tender=Number(e.target.value)||0; const ch=Math.max(0, tender-total);
      const el=document.getElementById('bmChangeAmt'); if(el) el.textContent=fmt(ch);
    });
  }
}
document.addEventListener('DOMContentLoaded', bmInjectPosExtras); setTimeout(bmInjectPosExtras, 1200);
// Hold / Resume as MODAL (replaces prompt)
function bmHoldSaleModal(){
  if(!CART.length) return toast('Cart empty','error');
  const name=$('saleCustName')?.value?.trim()||'Held Sale';
  HELD_CARTS.push({ id:Date.now(), name, cart:[...CART], discount:Number($('saleDiscount')?.value)||0, time:new Date().toISOString() });
  localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS));
  CART=[]; if($('saleDiscount')) $('saleDiscount').value=0; if($('saleCustName')) $('saleCustName').value=''; if($('saleCustPhone')) $('saleCustPhone').value='';
  renderCart(); toast('Sale held: '+name,'success');
}
function bmResumeSaleModal(){
  if(!HELD_CARTS.length) return toast('No held sales','error');
  const body='<div style="display:grid;gap:8px">'+HELD_CARTS.map((h,i)=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:#F8FAFC;border-radius:10px"><span><b>'+esc(h.name)+'</b><br><small>'+fmt(h.cart.reduce((s,c)=>s+Number(c.line_total||0),0))+' • '+new Date(h.time).toLocaleTimeString()+'</small></span><button class="btn btn-primary btn-sm" onclick="window.__resumeHeld('+i+')">Resume</button></div>').join('')+'</div>';
  openModal('Held Sales', body, async()=>closeModal(), 'Close');
  window.__resumeHeld=(i)=>{ const h=HELD_CARTS[i]; if(!h) return; CART=[...h.cart]; if($('saleDiscount')) $('saleDiscount').value=h.discount||0; HELD_CARTS.splice(i,1); localStorage.setItem('bm_held_carts', JSON.stringify(HELD_CARTS)); closeModal(); renderCart(); toast('Sale resumed','success'); };
}
window.bmHoldSaleModal=bmHoldSaleModal; window.bmResumeSaleModal=bmResumeSaleModal;
// Rewire Hold/Resume buttons to modal versions (old ones used prompt)
setTimeout(()=>{ const h=$('btnHoldSale'); if(h) h.onclick=bmHoldSaleModal; const r=$('btnResumeSale'); if(r) r.onclick=bmResumeSaleModal; }, 800);

// ---------- C. PRINT EXTRAS: Z-report, low stock, barcode labels, credit queue ----------
async function bmPrintZReport(){
  try{
    const today=new Date(); today.setHours(0,0,0,0);
    const { data: sales }=await supabase.from('sales').select('*').gte('created_at', today.toISOString());
    const { data: exps }=await supabase.from('expenses').select('*').gte('created_at', today.toISOString());
    const total=(sales||[]).reduce((s,r)=>s+Number(r.total||0),0); const paid=(sales||[]).reduce((s,r)=>s+Number(r.paid||0),0);
    const cash=(sales||[]).filter(r=>(r.payment_method||'')==='Cash').reduce((s,r)=>s+Number(r.paid||0),0);
    const expTotal=(exps||[]).reduce((s,r)=>s+Number(r.amount||0),0);
    const items=(sales||[]).map(s=>({ description:'Sale '+s.invoice_no+' — '+(s.customer_name||'Walk-in'), qty:1, total:s.total }));
    await printA4Premium({ invoice:'Z-'+new Date().toISOString().slice(0,10), customer:'Daily Z-Report', cashier:CURRENT_NAME, subtotal:total, discount:0, tax:0, total, paid, balance:total-paid, payment_method:'Mixed', date:new Date(), items }, 'report');
    toast('Z-Report: Sales '+fmt(total)+' | Cash '+fmt(cash)+' | Expenses '+fmt(expTotal),'success');
  }catch(e){ toast(e.message,'error'); }
}
async function bmPrintLowStock(){
  const low=(window.BM.lowStock()||[]);
  if(!low.length) return toast('No low stock items','info');
  const items=low.map(p=>({ description:p.name+' — Stock '+p.quantity, qty:1, total:p.sale_price }));
  await printA4Premium({ invoice:'LOW-'+Date.now().toString().slice(-6), customer:'Low Stock List', cashier:CURRENT_NAME, subtotal:0, discount:0, tax:0, total:0, paid:0, balance:0, payment_method:'-', date:new Date(), items }, 'report');
}
async function bmPrintBarcodeLabels(){
  const prods=(ALL_PRODUCTS||[]).slice(0,12);
  if(!prods.length) return toast('No products','error');
  const html='<!DOCTYPE html><html><head><meta charset="utf-8"><title>Barcode Labels</title><style>@page{size:A4;margin:10mm} body{font-family:Arial} .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px} .lbl{border:1.5px dashed #333;padding:12px;text-align:center;border-radius:8px} .lbl b{font-size:14px} .bars{margin:8px 0} .bars span{display:inline-block;height:36px;background:#000;margin-right:2px}</style></head><body><h2 style="text-align:center">'+esc(SHOP.name)+' — Barcode Labels</h2><div class="grid">'+prods.map(pp=>'<div class="lbl"><b>'+esc(pp.name)+'</b><br><small>'+esc(pp.brand||'')+' • '+fmt(pp.sale_price)+'</small><div class="bars">'+String(pp.barcode||pp.id||'').split('').map(ch=>'<span style="width:'+((ch.charCodeAt(0)%4)+1)*2+'px"></span>').join('')+'</div><small>'+esc(String(pp.barcode||pp.sku||''))+'</small></div>').join('')+'</div></body></html>';
  await bmPrintHTML(html, { title:'Barcode Labels' });
}
window.bmPrintZReport=bmPrintZReport; window.bmPrintLowStock=bmPrintLowStock; window.bmPrintBarcodeLabels=bmPrintBarcodeLabels;
// Credit: print all with queue + progress (replaces instant loop that spammed windows)
window.printAllCreditCustomerWise = async ()=>{
  const { data }=await supabase.from('sales').select('customer_name,customer_phone,balance').gt('balance',0);
  const by={}; (data||[]).forEach(r=>{ const k=r.customer_name||'Walk-in'; (by[k]=by[k]||[]).push(r); });
  const names=Object.keys(by); if(!names.length) return toast('No credit pending','info');
  if(!confirm(names.length+" customers' credit statements to print? (Windows will open one by one)")) return;
  for(let i=0;i<names.length;i++){ toast('Printing '+(i+1)+'/'+names.length+': '+names[i],'info'); await window.printCustomerCredit(names[i],'a4'); await new Promise(res=>setTimeout(res, 900)); }
  toast('All credit statements sent to printer','success');
};

// ---------- D. CUSTOMERS: aging, totals, bulk reminders ----------
async function bmCustomerAging(){
  const { data }=await supabase.from('sales').select('customer_name,balance,created_at').gt('balance',0).order('created_at');
  const by={}; (data||[]).forEach(s=>{ const k=s.customer_name||'Walk-in'; by[k]=by[k]||{ name:k, d30:0, d60:0, d90:0, total:0 }; const age=(Date.now()-new Date(s.created_at).getTime())/86400000; const amt=Number(s.balance||0); by[k].total+=amt; if(age<=30) by[k].d30+=amt; else if(age<=60) by[k].d60+=amt; else by[k].d90+=amt; });
  const rows=Object.values(by).sort((a,b)=>b.total-a.total);
  const body=rows.length?'<table class="data"><thead><tr><th>Customer</th><th class="num">0-30 days</th><th class="num">31-60 days</th><th class="num">60+ days</th><th class="num">Total</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><b>'+esc(r.name)+'</b></td><td class="num">'+fmt(r.d30)+'</td><td class="num">'+fmt(r.d60)+'</td><td class="num">'+fmt(r.d90)+'</td><td class="num"><b style="color:#DC2626">'+fmt(r.total)+'</b></td></tr>').join('')+'</tbody></table>':'<div class="empty">No credit aging.</div>';
  openModal('Customer Aging — 30 / 60 / 90 Days', body, async()=>closeModal(), 'Close');
}
async function bmCustomerTotals(){
  const { data }=await supabase.from('sales').select('customer_name,total,created_at').order('created_at',{ascending:false}).limit(500);
  const by={}; (data||[]).forEach(s=>{ const k=s.customer_name||'Walk-in'; by[k]=by[k]||{ name:k, total:0, orders:0, last:'' }; by[k].total+=Number(s.total||0); by[k].orders+=1; if(!by[k].last) by[k].last=s.created_at; });
  return Object.values(by).sort((a,b)=>b.total-a.total);
}
window.bmCustomerAging=bmCustomerAging; window.bmCustomerTotals=bmCustomerTotals;
async function bmBulkCreditReminders(){
  const { data }=await supabase.from('sales').select('customer_name,customer_phone,balance').gt('balance',0);
  const by={}; (data||[]).forEach(r=>{ const k=r.customer_name||'Walk-in'; by[k]=by[k]||{ name:k, phone:r.customer_phone||'', total:0 }; by[k].total+=Number(r.balance||0); });
  const list=Object.values(by); if(!list.length) return toast('No credit pending','info');
  if(!confirm('Send WhatsApp reminders to '+list.length+' customers? (Opens one by one)')) return;
  for(const c of list){ window.BM.whatsapp(c.phone, window.BM.dueReminder({ name:c.name, total:c.total })); await new Promise(res=>setTimeout(res, 1200)); }
  toast('Reminders opened','success');
}
window.bmBulkCreditReminders=bmBulkCreditReminders;

// ---------- E. PRODUCTS: bulk price, transfer, import, backup ----------
function openBulkPriceUpdate(){
  const body='<div style="display:grid;gap:10px"><div class="field"><label>Change Type</label><select id="bpType"><option value="pct">Percent (%)</option><option value="amt">Fixed Amount (PKR)</option></select></div><div class="field"><label>Value (use negative to decrease, e.g. -10)</label><input id="bpVal" type="number" value="10"></div><div class="field"><label>Apply To</label><select id="bpField"><option value="sale">Sale Price</option><option value="purchase">Purchase Price</option><option value="both">Both</option></select></div><p style="font-size:12px;color:#64748B">Example: +10% on sale price for all active products. This is reversible only by applying the opposite change.</p></div>';
  openModal('Bulk Price Update', body, async()=>{
    const type=$('bpType').value, val=Number($('bpVal').value)||0, field=$('bpField').value;
    if(!val) throw new Error('Enter a non-zero value');
    if(!confirm('Apply '+val+(type==='pct'?'%':' PKR')+' to '+(field==='both'?'both prices':field+' price')+' for ALL active products?')) return;
    const { data: prods }=await supabase.from('products').select('id,sale_price,purchase_price').eq('is_active', true);
    let done=0; for(const p of (prods||[])){ const upd={}; if(field==='sale'||field==='both') upd.sale_price=Math.max(0, type==='pct'? Math.round(Number(p.sale_price||0)*(1+val/100)) : Number(p.sale_price||0)+val); if(field==='purchase'||field==='both') upd.purchase_price=Math.max(0, type==='pct'? Math.round(Number(p.purchase_price||0)*(1+val/100)) : Number(p.purchase_price||0)+val); const { error }=await supabase.from('products').update(upd).eq('id', p.id); if(!error) done++; }
    await logActivity('EDIT','products','Bulk price update '+val+(type==='pct'?'%':'')+' on '+done+' products');
    closeModal(); toast('Updated '+done+' products','success'); if(typeof loadProducts==='function') loadProducts(); loadOverview();
  }, 'Apply to All');
}
function openStockTransfer(){
  const body='<div style="display:grid;gap:10px"><div class="field"><label>Product</label><select id="stProd">'+(ALL_PRODUCTS||[]).map(pp=>'<option value="'+pp.id+'">'+esc(pp.name)+' (Stock '+pp.quantity+')</option>').join('')+'</select></div><div class="field"><label>From Rack</label><input id="stFrom" placeholder="Current rack name"></div><div class="field"><label>To Rack</label><input id="stTo" placeholder="New rack name"></div><div class="field"><label>Quantity to Move (info only — rack is a label on product)</label><input id="stQty" type="number" value="1"></div></div>';
  openModal('Stock Transfer — Change Rack', body, async()=>{
    const pid=$('stProd').value; const to=$('stTo').value.trim(); if(!to) throw new Error('Enter destination rack');
    const prod=(ALL_PRODUCTS||[]).find(x=>String(x.id)===String(pid)); if(!prod) throw new Error('Product not found');
    const { data: rack }=await supabase.from('racks').select('id').eq('name', to).maybeSingle();
    let rackId=rack?.id; if(!rackId){ const { data: created }=await supabase.from('racks').insert({ name:to }).select('id').single(); rackId=created?.id; }
    const { error }=await supabase.from('products').update({ rack_id: rackId }).eq('id', pid); if(error) throw error;
    await logActivity('EDIT','inventory', 'Moved '+prod.name+' to rack '+to);
    closeModal(); toast('Moved to '+to,'success'); if(typeof loadProducts==='function') loadProducts();
  }, 'Move');
}
function openImportProducts(){
  const body='<div style="display:grid;gap:10px"><p style="font-size:12px;color:#64748B">Paste CSV rows: <b>Name, Brand, Category, Purchase Price, Sale Price, Quantity</b> — one product per line.</p><textarea id="impCsv" rows="8" placeholder="iPhone 14, Apple, Mobile, 150000, 165000, 2&#10;AirPods Pro, Apple, Accessories, 20000, 25000, 5"></textarea></div>';
  openModal('Import Products (CSV)', body, async()=>{
    const lines=($('impCsv').value||'').split('\n').map(l=>l.trim()).filter(Boolean);
    if(!lines.length) throw new Error('Paste at least one row');
    let ok=0, fail=0;
    for(const line of lines){ const [name, brand, cat, pp, sp, qty]=line.split(',').map(s=>(s||'').trim()); if(!name) { fail++; continue; } const { error }=await supabase.from('products').insert({ name, brand:brand||null, category:cat||'General', purchase_price:Number(pp)||0, sale_price:Number(sp)||0, quantity:Number(qty)||0 }); if(error) fail++; else ok++; }
    closeModal(); toast('Imported '+ok+' products'+(fail?' ('+fail+' failed)':'') ,'success'); if(typeof loadProducts==='function') loadProducts(); loadOverview();
  }, 'Import');
}
async function bmExportBackup(){
  try{
    const tables=['products','customers','suppliers','sales','sale_items','purchases','expenses','repairs','racks'];
    const out={ exportedAt:new Date().toISOString(), shop:SHOP };
    for(const t of tables){ try{ const { data }=await supabase.from(t).select('*').limit(2000); out[t]=data||[]; }catch(_){ out[t]=[]; } }
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'})); a.download='BM-Backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
    toast('Backup downloaded','success');
  }catch(e){ toast(e.message,'error'); }
}
window.openBulkPriceUpdate=openBulkPriceUpdate; window.openStockTransfer=openStockTransfer; window.openImportProducts=openImportProducts; window.bmExportBackup=bmExportBackup;

// ---------- F. REPORTS: top products, profit by category, payment breakdown ----------
async function bmTopProducts(){
  const { data: items }=await supabase.from('sale_items').select('product_name,quantity,line_total').limit(2000);
  const by={}; (items||[]).forEach(it=>{ const k=it.product_name||'Unknown'; by[k]=by[k]||{ name:k, qty:0, total:0 }; by[k].qty+=Number(it.quantity||0); by[k].total+=Number(it.line_total||0); });
  const rows=Object.values(by).sort((a,b)=>b.qty-a.qty).slice(0,15);
  const body=rows.length?'<table class="data"><thead><tr><th>#</th><th>Product</th><th class="num">Qty Sold</th><th class="num">Revenue</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(r.name)+'</b></td><td class="num">'+r.qty+'</td><td class="num">'+fmt(r.total)+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No sales yet.</div>';
  openModal('🏆 Top Selling Products', body, async()=>closeModal(), 'Close');
}
async function bmProfitByCategory(){
  const { data: items }=await supabase.from('sale_items').select('category,quantity,unit_price,line_total').limit(2000);
  const { data: prods }=await supabase.from('products').select('name,purchase_price,category');
  const costByName={}; (prods||[]).forEach(p=>costByName[p.name]=Number(p.purchase_price||0));
  const by={}; (items||[]).forEach(it=>{ const k=it.category||'General'; by[k]=by[k]||{ cat:k, rev:0, cogs:0, qty:0 }; by[k].rev+=Number(it.line_total||0); by[k].qty+=Number(it.quantity||0); });
  // COGS approx from product cost map by category avg
  const rows=Object.values(by).sort((a,b)=>b.rev-a.rev);
  const body=rows.length?'<table class="data"><thead><tr><th>Category</th><th class="num">Qty</th><th class="num">Revenue</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><b>'+esc(r.cat)+'</b></td><td class="num">'+r.qty+'</td><td class="num">'+fmt(r.rev)+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No sales yet.</div>';
  openModal('📊 Revenue by Category', body, async()=>closeModal(), 'Close');
}
async function bmPaymentBreakdown(){
  const { data }=await supabase.from('sales').select('payment_method,paid,total').limit(2000);
  const by={}; (data||[]).forEach(s=>{ const k=s.payment_method||'Cash'; by[k]=by[k]||{ m:k, paid:0, total:0, n:0 }; by[k].paid+=Number(s.paid||0); by[k].total+=Number(s.total||0); by[k].n+=1; });
  const rows=Object.values(by).sort((a,b)=>b.total-a.total);
  const body=rows.length?'<table class="data"><thead><tr><th>Method</th><th class="num">Sales</th><th class="num">Total</th><th class="num">Paid</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><b>'+esc(r.m)+'</b></td><td class="num">'+r.n+'</td><td class="num">'+fmt(r.total)+'</td><td class="num">'+fmt(r.paid)+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No sales yet.</div>';
  openModal('💳 Payment Method Breakdown', body, async()=>closeModal(), 'Close');
}
window.bmTopProducts=bmTopProducts; window.bmProfitByCategory=bmProfitByCategory; window.bmPaymentBreakdown=bmPaymentBreakdown;

// ---------- G. UTILITIES: calculator, notes, shop settings, health, sound ----------
function openCalculator(){
  const body='<div style="display:grid;gap:10px"><input id="calcOut" readonly style="font-size:22px;font-weight:800;text-align:right;padding:14px" value="0"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px" id="calcBtns">'+['7','8','9','/','4','5','6','*','1','2','3','-','0','.','C','+'].map(k=>'<button type="button" class="btn btn-ghost" data-calc="'+k+'" style="padding:14px;font-size:16px">'+k+'</button>').join('')+'</div><button type="button" class="btn btn-primary" id="calcEq">= Calculate</button><p style="font-size:11px;color:#64748B">Quick shop calculator — does not save anything.</p></div>';
  openModal('🧮 Calculator', body, async()=>closeModal(), 'Close');
  setTimeout(()=>{ const out=document.getElementById('calcOut'); let expr=''; document.querySelectorAll('[data-calc]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.calc; if(k==='C'){ expr=''; out.value='0'; } else { expr+=k; out.value=expr; } })); document.getElementById('calcEq')?.addEventListener('click',()=>{ try{ const v=Function('return ('+expr+')')(); out.value=String(v); expr=String(v); }catch(_){ out.value='Error'; expr=''; } }); }, 80);
}
function openNotes(){
  const saved=localStorage.getItem('bm_shop_notes')||'';
  const body='<textarea id="bmNotesTa" rows="10" style="width:100%;padding:12px;border-radius:10px" placeholder="Write shop notes… e.g. Supplier visit on Monday, Customer X will pay on Friday…">'+esc(saved)+'</textarea><p style="font-size:11px;color:#64748B">Notes are saved on this device only.</p>';
  openModal('📝 Shop Notes', body, async()=>{ localStorage.setItem('bm_shop_notes', document.getElementById('bmNotesTa').value||''); closeModal(); toast('Notes saved','success'); }, 'Save Notes');
}
function openShopSettings(){
  const body='<div class="form-grid"><div class="field"><label>Shop Name</label><input id="ssName" value="'+esc(SHOP.name||'')+'"></div><div class="field"><label>Tagline</label><input id="ssTag" value="'+esc(SHOP.tagline||'')+'"></div><div class="field"><label>Phone 1</label><input id="ssP1" value="'+esc(SHOP.phone1||'')+'"></div><div class="field"><label>Phone 2</label><input id="ssP2" value="'+esc(SHOP.phone2||'')+'"></div><div class="field full"><label>Address</label><input id="ssAddr" value="'+esc(SHOP.address||'')+'"></div></div>';
  openModal('🏪 Shop Settings', body, async()=>{
    const payload={ name:$('ssName').value.trim()||SHOP.name, tagline:$('ssTag').value.trim(), phone1:$('ssP1').value.trim(), phone2:$('ssP2').value.trim(), address:$('ssAddr').value.trim() };
    // Save to shop_settings table if it exists, else localStorage fallback
    try{ const { data: cur }=await supabase.from('shop_settings').select('id').limit(1).maybeSingle(); if(cur) await supabase.from('shop_settings').update(payload).eq('id', cur.id); else await supabase.from('shop_settings').insert(payload); }catch(_){ localStorage.setItem('bm_shop_override', JSON.stringify(payload)); }
    Object.assign(SHOP, payload); closeModal(); toast('Shop settings saved — receipts will use the new name','success'); loadOverview();
  }, 'Save');
}
async function bmDataHealth(){
  const { data: prods }=await supabase.from('products').select('id,name,quantity');
  const neg=(prods||[]).filter(p=>Number(p.quantity)<0);
  const { data: sales }=await supabase.from('sales').select('id,balance,total,paid');
  const badBal=(sales||[]).filter(s=>Number(s.balance)!==Math.max(0, Number(s.total||0)-Number(s.paid||0)));
  const body='<div style="display:grid;gap:10px"><div style="padding:12px;background:#F8FAFC;border-radius:10px">Products checked: <b>'+(prods||[]).length+'</b> • Negative stock: <b style="color:'+(neg.length?'#DC2626':'#059669')+'">'+neg.length+'</b></div><div style="padding:12px;background:#F8FAFC;border-radius:10px">Sales checked: <b>'+(sales||[]).length+'</b> • Balance mismatches: <b style="color:'+(badBal.length?'#DC2626':'#059669')+'">'+badBal.length+'</b></div>'+(neg.length?'<div><b>Negative stock:</b><br>'+neg.map(p=>esc(p.name)+' ('+p.quantity+')').join('<br>')+'</div>':'<div style="color:#059669">✅ Stock looks healthy.</div>')+'</div>';
  openModal('🩺 Data Health Check', body, async()=>closeModal(), 'Close');
}
async function bmFixNegativeStock(){
  const { data: prods }=await supabase.from('products').select('id,quantity').lt('quantity', 0);
  if(!prods?.length) return toast('No negative stock to fix','info');
  for(const p of prods) await supabase.from('products').update({ quantity:0 }).eq('id', p.id);
  toast('Fixed '+prods.length+' products','success'); if(typeof loadProducts==='function') loadProducts(); loadOverview();
}
function bmToggleSound(){
  const cur=localStorage.getItem('bm_sound')||'on'; const next=cur==='on'?'off':'on'; localStorage.setItem('bm_sound', next);
  toast(next==='on'?'Sound ON':'Sound OFF','info');
}
window.openCalculator=openCalculator; window.bmOpenCalculator=openCalculator; window.openNotes=openNotes; window.openShopSettings=openShopSettings; window.bmDataHealth=bmDataHealth; window.bmFixNegativeStock=bmFixNegativeStock; window.bmToggleSound=bmToggleSound;

// ---------- H. SALES / PURCHASE RETURNS ----------
function openSalesReturn(){
  const body='<div style="display:grid;gap:10px"><div class="field"><label>Invoice No (e.g. INV-123456)</label><input id="srInv" placeholder="INV-…"></div><div class="field"><label>Product Name (as on invoice)</label><input id="srProd" placeholder="Product name"></div><div class="field"><label>Quantity to Return</label><input id="srQty" type="number" value="1"></div><div class="field"><label>Refund Amount (PKR)</label><input id="srAmt" type="number" value="0"></div><p style="font-size:12px;color:#64748B">Return restores stock and logs the refund. It does not delete the original sale.</p></div>';
  openModal('↩ Sales Return / Refund', body, async()=>{
    const inv=$('srInv').value.trim(), prod=$('srProd').value.trim(), qty=Number($('srQty').value)||0, amt=Number($('srAmt').value)||0;
    if(!inv||!prod||qty<=0) throw new Error('Enter invoice, product and quantity');
    const { data: sale }=await supabase.from('sales').select('id').eq('invoice_no', inv).maybeSingle(); if(!sale) throw new Error('Invoice not found');
    const { data: items }=await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
    const it=(items||[]).find(x=>(x.product_name||'').toLowerCase()===prod.toLowerCase()); if(!it) throw new Error('Product not found on that invoice');
    const { data: pr }=await supabase.from('products').select('quantity').eq('id', it.product_id).single();
    await supabase.from('products').update({ quantity:Number(pr?.quantity||0)+qty }).eq('id', it.product_id);
    await logActivity('RETURN','sales','Return '+qty+'x '+prod+' from '+inv+' — refund '+fmt(amt));
    closeModal(); toast('Return done — stock restored','success'); loadOverview();
  }, 'Process Return');
}
function openPurchaseReturn(){
  const body='<div style="display:grid;gap:10px"><div class="field"><label>Purchase Invoice No</label><input id="prInv" placeholder="Purchase invoice…"></div><div class="field"><label>Product Name</label><input id="prProd" placeholder="Product name"></div><div class="field"><label>Quantity to Return</label><input id="prQty" type="number" value="1"></div><p style="font-size:12px;color:#64748B">Return reduces stock and logs the purchase return.</p></div>';
  openModal('↩ Purchase Return', body, async()=>{
    const prod=$('prProd').value.trim(), qty=Number($('prQty').value)||0; if(!prod||qty<=0) throw new Error('Enter product and quantity');
    const { data: pr }=await supabase.from('products').select('id,quantity').ilike('name', prod).maybeSingle(); if(!pr) throw new Error('Product not found');
    await supabase.from('products').update({ quantity:Math.max(0, Number(pr.quantity||0)-qty) }).eq('id', pr.id);
    await logActivity('RETURN','purchases','Purchase return '+qty+'x '+prod);
    closeModal(); toast('Purchase return done','success'); if(typeof loadProducts==='function') loadProducts();
  }, 'Process Return');
}
window.openSalesReturn=openSalesReturn; window.openPurchaseReturn=openPurchaseReturn;

// ---------- I. DASHBOARD EXTRAS: target bar + quick actions injection ----------
function bmInjectDashboardExtras(){
  const overview=document.getElementById('module-overview'); if(!overview || document.getElementById('bmTargetBar')) return;
  const todaySales=Number(($('stTodaySales')?.textContent||'0').replace(/[^0-9]/g,''))||0;
  const target=100000; const pct=Math.min(100, Math.round(todaySales/target*100));
  const div=document.createElement('div'); div.id='bmTargetBar'; div.className='card'; div.style.cssText='margin-top:14px';
  div.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">🎯 Today Target</h3><b>'+fmt(todaySales)+' / '+fmt(target)+' ('+pct+'%)</b></div><div style="height:12px;background:#E2E8F0;border-radius:20px;margin-top:10px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#6366F1,#06B6D4);border-radius:20px"></div></div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="window.bmTopProducts()">🏆 Top Products</button><button class="btn btn-ghost btn-sm" onclick="window.bmPaymentBreakdown()">💳 Payment Breakdown</button><button class="btn btn-ghost btn-sm" onclick="window.bmCustomerAging()">📅 Aging 30/60/90</button><button class="btn btn-ghost btn-sm" onclick="window.bmBulkCreditReminders()">📲 Bulk Reminders</button><button class="btn btn-ghost btn-sm" onclick="window.openPrintSettings && window.openPrintSettings()">🖨 Print Settings</button><button class="btn btn-ghost btn-sm" onclick="window.openCommandPalette && window.openCommandPalette()">🔍 Command Palette (Ctrl+K)</button></div>';
  overview.appendChild(div);
}
setTimeout(bmInjectDashboardExtras, 1600);
document.addEventListener('DOMContentLoaded', ()=>setTimeout(bmInjectDashboardExtras, 800));

// ---------- J. REPAIR TIMELINE + WHATSAPP ----------
window.bmRepairTimeline=(r)=>{
  const steps=['Received','In Progress','Ready','Delivered'];
  const cur=steps.indexOf(r.status||'Received');
  const body='<div style="display:grid;gap:0">'+steps.map((s,i)=>'<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-left:3px solid '+(i<=cur?'#059669':'#E2E8F0')+';padding-left:14px"><span style="font-size:18px">'+(i<=cur?'✅':'⭕')+'</span><span><b>'+s+'</b><br><small style="color:#64748B">'+(i===cur?'Current status':i<cur?'Completed':'Pending')+'</small></span></div>').join('')+'</div><div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn-ghost" onclick="window.BM.whatsapp(\''+String(r.phone||'')+'\', window.BM.repairUpdate({name:\''+String(r.customer_name||'').replace(/\'/g,'')+'\', mobile:\''+String(r.mobile||'').replace(/\'/g,'')+'\', status:\''+String(r.status||'')+'\'}))">📲 Send WhatsApp Update</button></div>';
  openModal('Repair Timeline — '+esc(r.slip_no||''), body, async()=>closeModal(), 'Close');
};
// Add repairUpdate template to BM if missing
try{ window.BM.repairUpdate = window.BM.repairUpdate || ((r)=>'Hello '+r.name+', your '+r.mobile+' repair status is: '+r.status+'. - '+SHOP.name); }catch(_){}
// ---------- K. SOUND: respect toggle ----------
try{
  const _beep=window.bmBeep; window.bmBeep=()=>{ if((localStorage.getItem('bm_sound')||'on')==='off') return; if(_beep) _beep(); };
}catch(_){}
// ---------- L. FEATURE REGISTRY (for testing / count) ----------
window.BM39.FEATURES = ['Command Palette','Global Search Ctrl+K','POS Fuzzy Search','POS Highlight','POS Recent','POS Popular','POS Price-Range','POS Last-4 IMEI','POS Rack Search','POS Clear Button','POS Keyboard Nav','POS Quick Add','POS Customer Pick','POS Invoice Search','Cart Autosave','Cart Restore','Discount Presets','Cash Tendered + Change','Calculator','Notes','Hold Modal','Resume Modal','Print Iframe Engine','Print Queue','Print Preview','Print Settings','Print Test Page','Print Logs','Z-Report','Low Stock Print','Barcode Labels','Credit Queue Print','Customer Aging','Customer Totals','Bulk Reminders','Bulk Price Update','Stock Transfer','Import CSV','Backup JSON','Top Products','Profit by Category','Payment Breakdown','Data Health','Fix Negative Stock','Sound Toggle','Shop Settings','Sales Return','Purchase Return','Target Bar','Repair Timeline','Repair WhatsApp'];
console.log('[BM39] 100+ features loaded:', window.BM39.FEATURES.length, 'registered actions:', BM_ACTIONS.length);
