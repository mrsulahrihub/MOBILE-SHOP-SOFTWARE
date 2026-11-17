// =====================================================
// MOBILE SHOP — LOGIN CONTROLLER (Custom Shops Table)
// =====================================================

import { supabase } from './config.js';

// ---------- DOM ----------
const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');

// Guard
if (!form || !button || !errorEl || !okEl) {
    throw new Error('Login HTML elements missing.');
}

// ---------- Feedback helpers ----------
function clearFeedback() {
    errorEl.textContent = '';
    errorEl.classList.remove('error');
    okEl.textContent = '';
    okEl.classList.remove('success');
}

function showError(message) {
    console.error('LOGIN ERROR:', message);
    okEl.classList.remove('success');
    okEl.textContent = '';
    errorEl.textContent = typeof message === 'string' ? message : (message?.message || 'Login failed.');
    errorEl.classList.add('error');
}

function showSuccess(message) {
    errorEl.classList.remove('error');
    errorEl.textContent = '';
    okEl.textContent = message;
    okEl.classList.add('success');
}

function setLoading(state) {
    button.disabled = state;
    button.classList.toggle('loading', state);
}

// ---------- Submit handler ----------
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFeedback();

    const username = document.getElementById('username')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';

    if (!username || !password) {
        return showError('Please enter both username and password.');
    }

    setLoading(true);

    try {
        // 1) Check in 'shops' table
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (shopError) throw shopError;

        if (!shop) {
            throw new Error('Invalid username or password.');
        }

        if (!shop.is_active) {
            throw new Error('Your shop account is disabled. Please contact Super Admin.');
        }

        // 2) Save to LocalStorage for Dashboard Multi-Tenant
        localStorage.setItem('shop_id', shop.id);
        localStorage.setItem('shop_name', shop.shop_name);
        localStorage.setItem('owner_name', shop.owner_name || '');

        // 3) Success
        showSuccess('Login successful — redirecting…');
        window.location.replace('./dashboard.html');

    } catch (err) {
        showError(err.message || 'Login failed. Please try again.');
        setLoading(false);
        document.getElementById('password')?.focus();
    }
});
