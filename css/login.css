// =====================================================
// BM MOBILE ZONE — Login Controller v4.0 (Ultimate Premium)
// Features: Super Admin Login, Staff Sync, Security, 
// Permissions Sync, Auto-Redirect, Smooth UX
// =====================================================
import { supabase } from './config.js';

// ---------------------------------------------------
// DOM ELEMENTS
// ---------------------------------------------------
const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');
const userInp  = document.getElementById('username');
const passInp  = document.getElementById('password');

if (!form || !button || !errorEl || !okEl) throw new Error('Login HTML elements missing.');

// ---------------------------------------------------
// PREMIUM: Auto-Login (Session Guard)
// ---------------------------------------------------
const existingSession = localStorage.getItem('bm_staff');
const existingShopId = localStorage.getItem('shop_id');
const loginTime = localStorage.getItem('login_time');

if (existingSession && existingShopId && loginTime) {
  const hoursSinceLogin = (Date.now() - Number(loginTime)) / (1000 * 60 * 60);
  if (hoursSinceLogin < 12) {
    // Session valid, redirect to dashboard
    window.location.replace('./dashboard.html');
  } else {
    // Session expired, clear it
    ['bm_staff', 'shop_id', 'login_time', 'bm_shop_perms'].forEach(k => localStorage.removeItem(k));
  }
}

// ---------------------------------------------------
// PREMIUM: Password Visibility Toggle
// ---------------------------------------------------
const toggleBtn = document.createElement('button');
toggleBtn.type = 'button';
toggleBtn.innerHTML = '👁️';
toggleBtn.style.cssText = 'position:absolute;right:15px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;opacity:0.6;transition:opacity 0.2s;';
toggleBtn.onmouseover = () => toggleBtn.style.opacity = '1';
toggleBtn.onmouseout = () => toggleBtn.style.opacity = '0.6';

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

// ---------------------------------------------------
// PREMIUM: Caps Lock Detection
// ---------------------------------------------------
const capsWarning = document.createElement('div');
capsWarning.style.cssText = 'color:#fbbf24;font-size:11px;font-weight:bold;margin-top:8px;display:none;text-align:center;transition:all 0.3s;';
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
// PREMIUM: Password Strength Meter
// ---------------------------------------------------
const strengthMeter = document.createElement('div');
strengthMeter.style.cssText = 'height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:8px;overflow:hidden;display:none;';
const strengthBar = document.createElement('div');
strengthBar.style.cssText = 'height:100%;width:0%;background:var(--danger);transition:all 0.3s;';
strengthMeter.appendChild(strengthBar);
passInp.parentNode.appendChild(strengthMeter);

passInp.addEventListener('input', () => {
  const val = passInp.value;
  if (!val) {
    strengthMeter.style.display = 'none';
    return;
  }
  strengthMeter.style.display = 'block';
  
  let strength = 0;
  if (val.length >= 6) strength += 30;
  if (val.length >= 10) strength += 20;
  if (/[A-Z]/.test(val)) strength += 20;
  if (/[0-9]/.test(val)) strength += 20;
  if (/[^A-Za-z0-9]/.test(val)) strength += 10;
  
  strengthBar.style.width = strength + '%';
  if (strength < 50) strengthBar.style.background = 'var(--danger)';
  else if (strength < 80) strengthBar.style.background = 'var(--warning)';
  else strengthBar.style.background = 'var(--success)';
});

// ---------------------------------------------------
// PREMIUM: Enter Key Navigation
// ---------------------------------------------------
userInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); passInp.focus(); }
});
passInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});

// ---------------------------------------------------
// PREMIUM: Feedback Helpers (Smooth Shake)
// ---------------------------------------------------
function clearFeedback() {
  errorEl.textContent = '';
  errorEl.classList.remove('error');
  okEl.textContent = '';
  okEl.classList.remove('success');
}

function showError(msg) {
  console.error('LOGIN ERROR:', msg);
  okEl.classList.remove('success');
  okEl.textContent = '';
  errorEl.textContent = typeof msg === 'string' ? msg : (msg?.message || 'Login failed.');
  errorEl.classList.add('error');
  
  // Smooth Shake Animation
  form.style.animation = 'smoothShake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)';
  setTimeout(() => form.style.animation = '', 500);
}

function showSuccess(msg) {
  errorEl.classList.remove('error');
  errorEl.textContent = '';
  okEl.textContent = msg;
  okEl.classList.add('success');
}

function setLoading(state) {
  button.disabled = state;
  button.classList.toggle('loading', state);
  if (state) {
    button.innerHTML = 'Authenticating... <i class="fa-solid fa-spinner fa-spin"></i>';
  } else {
    button.innerHTML = 'Login to Dashboard <i class="fa-solid fa-arrow-right"></i>';
  }
}

// ---------------------------------------------------
// PREMIUM: Brute-Force Protection (Max 5 Attempts)
// ---------------------------------------------------
let failedAttempts = Number(localStorage.getItem('bm_failed_attempts') || 0);
let lockoutTime = Number(localStorage.getItem('bm_lockout_time') || 0);

function checkLockout() {
  if (lockoutTime && Date.now() < lockoutTime) {
    const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
    showError(`Too many failed attempts. Please wait ${remaining} seconds.`);
    return true;
  }
  return false;
}

function incrementFailedAttempts() {
  failedAttempts++;
  localStorage.setItem('bm_failed_attempts', failedAttempts);
  if (failedAttempts >= 5) {
    lockoutTime = Date.now() + 30000; // 30 seconds lock
    localStorage.setItem('bm_lockout_time', lockoutTime);
    showError('Too many failed attempts. Account locked for 30 seconds.');
  }
}

function resetFailedAttempts() {
  failedAttempts = 0;
  localStorage.setItem('bm_failed_attempts', 0);
  localStorage.removeItem('bm_lockout_time');
}

// =====================================================
// MAIN LOGIN HANDLER
// =====================================================
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFeedback();

  if (checkLockout()) return;

  const username = userInp.value.trim();
  const password = passInp.value;

  if (!username || !password) {
    return showError('Please enter both Staff ID / Username and Password.');
  }

  // Network Check
  if (!navigator.onLine) {
    return showError('No internet connection. Please check your network.');
  }

  setLoading(true);

  try {
    // ============================================================
    // STEP 1: SUPER ADMIN LOGIN
    // ============================================================
    const { data: saData, error: saError } = await supabase
      .from('shops').select('*')
      .eq('username', username).eq('password', password).eq('shop_name', 'SUPER ADMIN').maybeSingle();

    if (saError && saError.code !== 'PGRST116') throw saError;

    if (saData) {
      localStorage.setItem('isSuperAdmin', 'true');
      showSuccess('Welcome Super Admin! Redirecting to Management Panel...');
      setTimeout(() => window.location.replace('./superadmin.html'), 1000);
      return;
    }

    // ============================================================
    // STEP 2: STAFF LOGIN
    // ============================================================
    const { data: staffData, error: staffError } = await supabase
      .from('staff').select('*')
      .eq('staff_id', username).eq('password', password).maybeSingle();

    if (staffError && staffError.code !== 'PGRST116') throw staffError;

    if (staffData) {
      // Fetch Shop Permissions for Staff
      const shopId = localStorage.getItem('shop_id') || staffData.shop_id;
      let shopPerms = {};
      
      if (shopId) {
        const { data: shopData } = await supabase.from('shops').select('*').eq('id', shopId).maybeSingle();
        if (shopData) shopPerms = shopData;
      }

      // Save Sessions & Permissions
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
      localStorage.setItem('bm_shop_perms', JSON.stringify(shopPerms));
      localStorage.setItem('login_time', Date.now().toString());
      localStorage.setItem('last_login', new Date().toISOString());

      resetFailedAttempts();
      showSuccess(`Welcome back, ${staffData.name}! Redirecting...`);
      setTimeout(() => window.location.replace('./dashboard.html'), 1000);
      return;
    }

    // ============================================================
    // STEP 3: SHOP OWNER LOGIN (Fallback)
    // ============================================================
    const { data: shop, error: shopError } = await supabase
      .from('shops').select('*')
      .eq('username', username).eq('password', password).maybeSingle();

    if (shopError && shopError.code !== 'PGRST116') throw shopError;

    if (!shop) {
      incrementFailedAttempts();
      throw new Error('Invalid Staff ID / Username or Password.');
    }
    
    if (shop.is_active === false) {
      throw new Error('Your shop account is disabled. Please contact Super Admin.');
    }

    // Save Shop Permissions & Sessions
    localStorage.setItem('bm_shop_perms', JSON.stringify(shop));
    localStorage.setItem('shop_id', shop.id);
    localStorage.setItem('shop_name', shop.shop_name || 'BM MOBILE ZONE');
    localStorage.setItem('owner_name', shop.owner_name || 'Admin');
    localStorage.setItem('login_time', Date.now().toString());
    localStorage.setItem('last_login', new Date().toISOString());

    localStorage.setItem('bm_staff', JSON.stringify({
      id: shop.id,
      staff_id: '01',
      name: shop.owner_name || shop.username || 'Admin',
      role: 'Admin',
      can_edit: true,
      can_delete: true
    }));

    resetFailedAttempts();
    showSuccess('Login successful! Redirecting...');
    setTimeout(() => window.location.replace('./dashboard.html'), 1000);

  } catch (err) {
    showError(err.message || 'Login failed. Please try again.');
    setLoading(false);
    passInp.focus();
  }
});

// ---------------------------------------------------
// PREMIUM: Forgot Password (WhatsApp)
// ---------------------------------------------------
document.getElementById('forgotLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  const msg = encodeURIComponent(`Assalam o Alaikum, I forgot my BM Mobile Zone password. Please help. (Username: ${userInp.value.trim() || '___'})`);
  window.open(`https://wa.me/923099100546?text=${msg}`, '_blank');
});

// ---------------------------------------------------
// PREMIUM: Remember Me
// ---------------------------------------------------
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
// PREMIUM: Auto Focus
// ---------------------------------------------------
setTimeout(() => {
  if (!userInp.value) userInp.focus();
  else passInp.focus();
}, 200);

// ---------------------------------------------------
// PREMIUM: Global Shortcut (Alt + L)
// ---------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    form.requestSubmit();
  }
});

// ---------------------------------------------------
// PREMIUM: Last Login Info Display
// ---------------------------------------------------
const lastLogin = localStorage.getItem('last_login');
if (lastLogin && errorEl) {
  const date = new Date(lastLogin);
  const infoEl = document.createElement('p');
  infoEl.style.cssText = 'font-size:11px;color:var(--muted);text-align:center;margin-top:15px;';
  infoEl.textContent = `Last login: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  form.appendChild(infoEl);
}

// ---------------------------------------------------
// PREMIUM: Smooth Shake Animation Injection
// ---------------------------------------------------
const style = document.createElement('style');
style.textContent = `
  @keyframes smoothShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .fa-spinner { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);
