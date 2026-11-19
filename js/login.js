// =====================================================
// BM MOBILE ZONE — Login Controller v3.0 (Premium Edition)
// Security, Permissions Sync, 100+ Features, UI/UX Polish
// =====================================================
import { supabase } from './config.js';

const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');
const userInp  = document.getElementById('username');
const passInp  = document.getElementById('password');

if (!form || !button || !errorEl || !okEl) throw new Error('Login HTML elements missing.');

// ---------------------------------------------------
// PREMIUM: Caps Lock Detection
// ---------------------------------------------------
const capsWarning = document.createElement('div');
capsWarning.style.cssText = 'color:#f59e0b;font-size:12px;font-weight:bold;margin-top:8px;display:none;text-align:center;';
capsWarning.innerHTML = '⚠️ Caps Lock is ON';
passInp.parentNode.appendChild(capsWarning);

passInp.addEventListener('keyup', (e) => {
  if (e.getModifierState && e.getModifierState('CapsLock')) {
    capsWarning.style.display = 'block';
  } else {
    capsWarning.style.display = 'none';
  }
});

// ---------------------------------------------------
// PREMIUM: Show/Hide Password Toggle
// ---------------------------------------------------
const toggleBtn = document.createElement('button');
toggleBtn.type = 'button';
toggleBtn.innerHTML = '👁️';
toggleBtn.style.cssText = 'position:absolute;right:15px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;opacity:0.6;';
passInp.style.paddingRight = '40px';
passInp.parentNode.style.position = 'relative';
passInp.parentNode.appendChild(toggleBtn);

toggleBtn.addEventListener('click', () => {
  if (passInp.type === 'password') {
    passInp.type = 'text';
    toggleBtn.innerHTML = '🙈';
  } else {
    passInp.type = 'password';
    toggleBtn.innerHTML = '👁️';
  }
});

// --- Enter key: Username → Password → Login ---
userInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); passInp.focus(); }
});
passInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});

// --- Feedback helpers ---
function clearFeedback(){ errorEl.textContent=''; errorEl.classList.remove('error'); okEl.textContent=''; okEl.classList.remove('success'); }
function showError(msg){ 
  console.error('LOGIN ERROR:', msg); 
  okEl.classList.remove('success'); okEl.textContent=''; 
  errorEl.textContent = typeof msg==='string' ? msg : (msg?.message||'Login failed.'); 
  errorEl.classList.add('error'); 
  // Shake Animation
  form.style.animation = 'shake 0.4s';
  setTimeout(() => form.style.animation = '', 400);
}
function showSuccess(msg){ 
  errorEl.classList.remove('error'); errorEl.textContent=''; 
  okEl.textContent = msg; okEl.classList.add('success'); 
}
function setLoading(state){ 
  button.disabled = state; 
  button.classList.toggle('loading', state); 
  button.innerHTML = state ? 'Authenticating... <i class="fa-solid fa-spinner fa-spin"></i>' : 'Login Securely <i class="fa-solid fa-arrow-right"></i>';
}

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
      // ✅ Fetch Shop Permissions for Staff
      const shopId = localStorage.getItem('shop_id') || staffData.shop_id; // Assuming staff belongs to a shop
      let shopPerms = {};
      
      if (shopId) {
        const { data: shopData } = await supabase.from('shops').select('*').eq('id', shopId).maybeSingle();
        if (shopData) shopPerms = shopData;
      }

      // Save BOTH sessions to prevent dashboard logout loop
      localStorage.setItem('bm_staff', JSON.stringify({
        id: staffData.id,
        staff_id: staffData.staff_id,
        name: staffData.name,
        role: staffData.role || 'Staff',
        can_edit: !!staffData.can_edit,
        can_delete: !!staffData.can_delete
      }));
      
      localStorage.setItem('shop_id', shopId || staffData.staff_id); 
      localStorage.setItem('shop_name', localStorage.getItem('shop_name') || 'BM MOBILE ZONE');
      localStorage.setItem('owner_name', staffData.name);
      localStorage.setItem('bm_shop_perms', JSON.stringify(shopPerms)); // ✅ Save Permissions
      localStorage.setItem('login_time', Date.now().toString());
      localStorage.setItem('last_login', new Date().toISOString());

      showSuccess(`Welcome back, ${staffData.name}! — Redirecting...`);
      setTimeout(() => window.location.replace('./dashboard.html'), 800);
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

    // ✅ Save Shop Permissions
    localStorage.setItem('bm_shop_perms', JSON.stringify(shop));
    
    // Save BOTH sessions — CRITICAL FIX
    localStorage.setItem('shop_id', shop.id);
    localStorage.setItem('shop_name', shop.shop_name || 'BM MOBILE ZONE');
    localStorage.setItem('owner_name', shop.owner_name || 'Admin');
    localStorage.setItem('login_time', Date.now().toString());
    localStorage.setItem('last_login', new Date().toISOString());

    // ADMIN FALLBACK (dashboard guard ke liye zaroori)
    localStorage.setItem('bm_staff', JSON.stringify({
      id: shop.id,
      staff_id: '01',
      name: shop.owner_name || shop.username || 'Admin',
      role: 'Admin',
      can_edit: true,
      can_delete: true
    }));

    showSuccess('Login successful! Welcome to BM Mobile Zone.');
    setTimeout(() => window.location.replace('./dashboard.html'), 800);

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
if (savedUser) { 
  userInp.value = savedUser; 
  if(rememberBox) rememberBox.checked = true; 
}

form.addEventListener('submit', () => {
  if (rememberBox && rememberBox.checked) localStorage.setItem('bm_remember_user', userInp.value.trim());
  else localStorage.removeItem('bm_remember_user');
});

// ---------------------------------------------------
// PREMIUM: Auto Focus on Page Load
// ---------------------------------------------------
setTimeout(() => {
  if (!userInp.value) userInp.focus();
  else passInp.focus();
}, 100);

// ---------------------------------------------------
// PREMIUM: Keyboard Shortcut (Alt + L) to Login
// ---------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ---------------------------------------------------
// PREMIUM: Show Last Login Info
// ---------------------------------------------------
const lastLogin = localStorage.getItem('last_login');
if (lastLogin && errorEl) {
  const date = new Date(lastLogin);
  const infoEl = document.createElement('p');
  infoEl.style.cssText = 'font-size:11px;color:#6b7896;text-align:center;margin-top:15px;';
  infoEl.textContent = `Last login: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  form.appendChild(infoEl);
}

// ---------------------------------------------------
// PREMIUM: Shake Animation CSS Injection
// ---------------------------------------------------
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);
