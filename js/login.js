// =====================================================
// BM MOBILE ZONE — Login Controller v5.0 (Enterprise Premium)
// Features: Super Admin Login, Auto-Redirect, Brute-Force Protection, 
// Password Strength Meter, Staff Permissions Sync, Smooth UX
// =====================================================
import { supabase } from './config.js';

// =====================================================
// SECTION 1: DOM ELEMENTS & GLOBAL VARIABLES
// =====================================================
const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');
const userInp  = document.getElementById('username');
const passInp  = document.getElementById('password');

if (!form || !button || !errorEl || !okEl) throw new Error('Login HTML elements missing.');

let failedAttempts = Number(localStorage.getItem('bm_failed_attempts') || 0);
let lockoutTime = Number(localStorage.getItem('bm_lockout_time') || 0);

// =====================================================
// SECTION 2: AUTO-LOGIN (SESSION GUARD)
// Kaam: Agar user pehle se login hai aur 12 ghante nahi hue, 
// to direct dashboard par bhej dega.
// =====================================================
(function autoLogin() {
  const existingSession = localStorage.getItem('bm_staff');
  const existingShopId = localStorage.getItem('shop_id');
  const loginTime = localStorage.getItem('login_time');

  if (existingSession && existingShopId && loginTime) {
    const hoursSinceLogin = (Date.now() - Number(loginTime)) / (1000 * 60 * 60);
    if (hoursSinceLogin < 12) {
      window.location.replace('./dashboard.html');
    } else {
      ['bm_staff', 'shop_id', 'login_time', 'bm_shop_perms'].forEach(k => localStorage.removeItem(k));
    }
  }
})();

// =====================================================
// SECTION 3: SHOW/HIDE PASSWORD TOGGLE
// Kaam: Password field ke andar ek eye icon banata hai jisse 
// password show/hide ho sakta hai.
// =====================================================
(function setupPasswordToggle() {
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
  toggleBtn.style.cssText = 'position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#64748B;font-size:16px;transition:color 0.2s;';
  toggleBtn.onmouseover = () => toggleBtn.style.color = '#0ea5b7';
  toggleBtn.onmouseout = () => toggleBtn.style.color = '#64748B';

  passInp.parentNode.style.position = 'relative';
  passInp.style.paddingRight = '45px';
  passInp.parentNode.appendChild(toggleBtn);

  toggleBtn.addEventListener('click', () => {
    if (passInp.type === 'password') {
      passInp.type = 'text';
      toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    } else {
      passInp.type = 'password';
      toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
    }
  });
})();

// =====================================================
// SECTION 4: CAPS LOCK WARNING
// Kaam: Agar user Caps Lock on karke type karega, to 
// warning show karega.
// =====================================================
(function setupCapsLockWarning() {
  const capsWarning = document.createElement('div');
  capsWarning.style.cssText = 'color:#F59E0B;font-size:11px;font-weight:700;margin-top:6px;display:none;';
  capsWarning.innerHTML = '⚠️ Caps Lock is ON';
  passInp.parentNode.appendChild(capsWarning);

  passInp.addEventListener('keyup', (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      capsWarning.style.display = 'block';
    } else {
      capsWarning.style.display = 'none';
    }
  });
})();

// =====================================================
// SECTION 5: PASSWORD STRENGTH METER
// Kaam: Jaise hi password type hoga, ek line uski strength 
// batayegi (Weak = Red, Medium = Orange, Strong = Green).
// =====================================================
(function setupPasswordStrength() {
  const strengthMeter = document.createElement('div');
  strengthMeter.style.cssText = 'height:4px;background:#1E293B;border-radius:4px;margin-top:8px;overflow:hidden;display:none;';
  const strengthBar = document.createElement('div');
  strengthBar.style.cssText = 'height:100%;width:0%;background:#EF4444;transition:all 0.3s;';
  strengthMeter.appendChild(strengthBar);
  passInp.parentNode.appendChild(strengthMeter);

  passInp.addEventListener('input', () => {
    const val = passInp.value;
    if (!val) { strengthMeter.style.display = 'none'; return; }
    strengthMeter.style.display = 'block';
    
    let strength = 0;
    if (val.length >= 6) strength += 30;
    if (val.length >= 10) strength += 20;
    if (/[A-Z]/.test(val)) strength += 20;
    if (/[0-9]/.test(val)) strength += 20;
    if (/[^A-Za-z0-9]/.test(val)) strength += 10;
    
    strengthBar.style.width = strength + '%';
    if (strength < 50) strengthBar.style.background = '#EF4444'; // Red
    else if (strength < 80) strengthBar.style.background = '#F59E0B'; // Orange
    else strengthBar.style.background = '#10B981'; // Green
  });
})();

// =====================================================
// SECTION 6: KEYBOARD NAVIGATION & SHORTCUTS
// Kaam: Enter dabane par next field focus, 
// Alt+L dabane par direct login.
// =====================================================
userInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); passInp.focus(); }
});
passInp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); form.requestSubmit(); }
});
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    form.requestSubmit();
  }
});

// =====================================================
// SECTION 7: FEEDBACK HELPERS (UI UPDATES)
// Kaam: Error aur Success messages ko screen par dikhana.
// =====================================================
function clearFeedback() {
  errorEl.textContent = '';
  errorEl.classList.remove('error');
  okEl.textContent = '';
  okEl.classList.remove('success');
}

function showError(msg) {
  console.error('LOGIN ERROR:', msg);
  okEl.classList.remove('success'); okEl.textContent = '';
  errorEl.textContent = typeof msg === 'string' ? msg : (msg?.message || 'Login failed.');
  errorEl.classList.add('error');
  form.style.animation = 'smoothShake 0.4s ease-in-out';
  setTimeout(() => form.style.animation = '', 400);
}

function showSuccess(msg) {
  errorEl.classList.remove('error'); errorEl.textContent = '';
  okEl.textContent = msg;
  okEl.classList.add('success');
}

function setLoading(state) {
  button.disabled = state;
  if (state) {
    button.innerHTML = 'Authenticating... <i class="fa-solid fa-spinner fa-spin"></i>';
    button.style.opacity = '0.8';
  } else {
    button.innerHTML = 'Login to Dashboard <i class="fa-solid fa-arrow-right"></i>';
    button.style.opacity = '1';
  }
}

// =====================================================
// SECTION 8: BRUTE-FORCE PROTECTION
// Kaam: Agar koi 5 dafa galat password dalega, to 30 second 
// ke liye login lock ho jayega.
// =====================================================
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
    showError('Account locked for 30 seconds due to multiple failed attempts.');
  }
}

function resetFailedAttempts() {
  failedAttempts = 0;
  localStorage.setItem('bm_failed_attempts', 0);
  localStorage.removeItem('bm_lockout_time');
}

// =====================================================
// SECTION 9: MAIN LOGIN HANDLER (THE CORE)
// Kaam: Login form submit hone par ye function chalta hai.
// Isme Super Admin, Staff, aur Shop Owner ka login check hota hai.
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

  if (!navigator.onLine) {
    return showError('No internet connection. Please check your network.');
  }

  setLoading(true);

  try {
    // --- STEP A: SUPER ADMIN LOGIN CHECK ---
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

    // --- STEP B: STAFF LOGIN CHECK ---
    const { data: staffData, error: staffError } = await supabase
      .from('staff').select('*')
      .eq('staff_id', username).eq('password', password).maybeSingle();

    if (staffError && staffError.code !== 'PGRST116') throw staffError;

    if (staffData) {
      const shopId = localStorage.getItem('shop_id') || staffData.shop_id;
      let shopPerms = {};
      
      if (shopId) {
        const { data: shopData } = await supabase.from('shops').select('*').eq('id', shopId).maybeSingle();
        if (shopData) shopPerms = shopData;
      }

      localStorage.setItem('bm_staff', JSON.stringify({
        id: staffData.id, staff_id: staffData.staff_id, name: staffData.name,
        role: staffData.role || 'Staff', can_edit: !!staffData.can_edit, can_delete: !!staffData.can_delete
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

    // --- STEP C: SHOP OWNER LOGIN CHECK (Fallback) ---
    const { data: shop, error: shopError } = await supabase
      .from('shops').select('*')
      .eq('username', username).eq('password', password).maybeSingle();

    if (shopError && shopError.code !== 'PGRST116') throw shopError;

    if (!shop) {
      incrementFailedAttempts();
      throw new Error('Invalid Staff ID / Username or Password.');
    }
    
    if (shop.is_active === false) throw new Error('Your shop account is disabled. Contact Super Admin.');

    localStorage.setItem('bm_shop_perms', JSON.stringify(shop));
    localStorage.setItem('shop_id', shop.id);
    localStorage.setItem('shop_name', shop.shop_name || 'BM MOBILE ZONE');
    localStorage.setItem('owner_name', shop.owner_name || 'Admin');
    localStorage.setItem('login_time', Date.now().toString());
    localStorage.setItem('last_login', new Date().toISOString());

    localStorage.setItem('bm_staff', JSON.stringify({
      id: shop.id, staff_id: '01', name: shop.owner_name || shop.username || 'Admin',
      role: 'Admin', can_edit: true, can_delete: true
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

// =====================================================
// SECTION 10: EXTRA FEATURES (FORGOT PASS, REMEMBER ME, ETC)
// =====================================================
document.getElementById('forgotLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  const msg = encodeURIComponent(`Assalam o Alaikum, I forgot my BM Mobile Zone password. Please help. (Username: ${userInp.value.trim() || '___'})`);
  window.open(`https://wa.me/923099100546?text=${msg}`, '_blank');
});

const rememberBox = document.getElementById('rememberMe');
const savedUser = localStorage.getItem('bm_remember_user');
if (savedUser) { userInp.value = savedUser; if(rememberBox) rememberBox.checked = true; }

form.addEventListener('submit', () => {
  if (rememberBox && rememberBox.checked) localStorage.setItem('bm_remember_user', userInp.value.trim());
  else localStorage.removeItem('bm_remember_user');
});

// Last Login Info Display
const lastLogin = localStorage.getItem('last_login');
if (lastLogin && errorEl) {
  const date = new Date(lastLogin);
  const infoEl = document.createElement('p');
  infoEl.style.cssText = 'font-size:11px;color:#64748B;text-align:center;margin-top:15px;';
  infoEl.textContent = `Last login: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  form.appendChild(infoEl);
}

// Smooth Shake Animation
const style = document.createElement('style');
style.textContent = `
  @keyframes smoothShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }
`;
document.head.appendChild(style);

// Auto-focus
setTimeout(() => { if (!userInp.value) userInp.focus(); else passInp.focus(); }, 200);
