// =====================================================
// BM MOBILE ZONE — Login Controller v2.0 (FINAL)
// =====================================================
import { supabase } from './config.js';

const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');
const userInp  = document.getElementById('username');
const passInp  = document.getElementById('password');

if (!form || !button || !errorEl || !okEl) throw new Error('Login HTML elements missing.');

// --- Enter key: Username → Password → Login ---
userInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); passInp.focus(); }
});
passInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});

// --- Feedback helpers ---
function clearFeedback(){ errorEl.textContent=''; errorEl.classList.remove('error'); okEl.textContent=''; okEl.classList.remove('success'); }
function showError(msg){ console.error('LOGIN ERROR:', msg); okEl.classList.remove('success'); okEl.textContent=''; errorEl.textContent = typeof msg==='string' ? msg : (msg?.message||'Login failed.'); errorEl.classList.add('error'); }
function showSuccess(msg){ errorEl.classList.remove('error'); errorEl.textContent=''; okEl.textContent = msg; okEl.classList.add('success'); }
function setLoading(state){ button.disabled = state; button.classList.toggle('loading', state); }

// =====================================================
// MAIN LOGIN HANDLER
// =====================================================
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();

  const username = userInp.value.trim();
  const password = passInp.value;

  if (!username || !password) return showError('Please enter both Staff ID / Username and Password.');

  setLoading(true);

  try {
    // ============================================================
    // STEP 1: STAFF LOGIN
    // ============================================================
    const { data: staffData, error: staffError } = await supabase
      .from('staff').select('*')
      .eq('staff_id', username).eq('password', password).maybeSingle();

    if (staffError && staffError.code !== 'PGRST116') throw staffError;

    if (staffData) {
      // Save BOTH sessions to prevent dashboard logout loop
      localStorage.setItem('bm_staff', JSON.stringify({
        id: staffData.id,
        staff_id: staffData.staff_id,
        name: staffData.name,
        role: staffData.role || 'Staff',
        can_edit: !!staffData.can_edit,
        can_delete: !!staffData.can_delete
      }));
      localStorage.setItem('shop_id', staffData.staff_id); // fallback for dashboard
      localStorage.setItem('shop_name', 'BM MOBILE ZONE');
      localStorage.setItem('owner_name', staffData.name);
      localStorage.setItem('login_time', Date.now().toString());

      showSuccess(`Welcome ${staffData.name} — redirecting…`);
      setTimeout(() => window.location.replace('./dashboard.html'), 600);
      return;
    }

    // ============================================================
    // STEP 2: SHOP OWNER LOGIN (fallback)
    // ============================================================
    const { data: shop, error: shopError } = await supabase
      .from('shops').select('*')
      .eq('username', username).eq('password', password).maybeSingle();

    if (shopError && shopError.code !== 'PGRST116') throw shopError;

    if (!shop) throw new Error('Invalid Staff ID / Username or Password.');
    if (shop.is_active === false) throw new Error('Your shop account is disabled. Please contact Super Admin.');

    // Save BOTH sessions — CRITICAL FIX
    localStorage.setItem('shop_id', shop.id);
    localStorage.setItem('shop_name', shop.shop_name || 'BM MOBILE ZONE');
    localStorage.setItem('owner_name', shop.owner_name || 'Admin');
    localStorage.setItem('login_time', Date.now().toString());
    // ADMIN FALLBACK (dashboard guard ke liye zaroori)
    localStorage.setItem('bm_staff', JSON.stringify({
      id: shop.id,
      staff_id: '01',
      name: shop.owner_name || shop.username || 'Admin',
      role: 'Admin',
      can_edit: true,
      can_delete: true
    }));

    showSuccess('Login successful — redirecting…');
    setTimeout(() => window.location.replace('./dashboard.html'), 600);

  } catch (err) {
    showError(err.message || 'Login failed. Please try again.');
    setLoading(false);
    passInp.focus();
  }
});

// --- Forgot password (WhatsApp) ---
document.getElementById('forgotLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  const msg = encodeURIComponent('Assalam o Alaikum, I forgot my BM Mobile Zone password. Please help. (Username: ' + (userInp.value.trim() || '___') + ')');
  window.open('https://wa.me/923099100546?text=' + msg, '_blank');
});

// --- Remember me ---
const rememberBox = document.getElementById('rememberMe');
const savedUser = localStorage.getItem('bm_remember_user');
if (savedUser) { userInp.value = savedUser; rememberBox.checked = true; }
form.addEventListener('submit', () => {
  if (rememberBox.checked) localStorage.setItem('bm_remember_user', userInp.value.trim());
  else localStorage.removeItem('bm_remember_user');
});
