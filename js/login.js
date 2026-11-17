// =====================================================
// MOBILE SHOP — LOGIN CONTROLLER (Staff + Shop Support)
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
        return showError('Please enter both Staff ID and Password.');
    }

    setLoading(true);

    try {
        // =====================================================
        // STEP 1: Check in 'staff' table first (Staff ID Login)
        // =====================================================
        const { data: staffData, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('staff_id', username)
            .eq('password', password)
            .maybeSingle();

        if (staffError) throw staffError;

        // AGAR STAFF MIL GAYA
        if (staffData) {
            // Save Staff Session
            localStorage.setItem('bm_staff', JSON.stringify({
                id: staffData.id,
                staff_id: staffData.staff_id,
                name: staffData.name,
                role: staffData.role,
                can_edit: staffData.can_edit,
                can_delete: staffData.can_delete
            }));

            showSuccess('Staff Login successful — redirecting…');
            setTimeout(() => {
                window.location.replace('./dashboard.html');
            }, 500);
            return;
        }

        // =====================================================
        // STEP 2: Fallback to 'shops' table (Owner/Admin Login)
        // =====================================================
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (shopError) throw shopError;

        if (!shop) {
            throw new Error('Invalid Staff ID or Password.');
        }

        if (shop.is_active === false) {
            throw new Error('Your shop account is disabled. Please contact Super Admin.');
        }

        // Save Shop Session
        localStorage.setItem('shop_id', shop.id);
        localStorage.setItem('shop_name', shop.shop_name);
        localStorage.setItem('owner_name', shop.owner_name || '');
        localStorage.removeItem('bm_staff'); // Clear staff session

        // Success
        showSuccess('Login successful — redirecting…');
        setTimeout(() => {
            window.location.replace('./dashboard.html');
        }, 500);

    } catch (err) {
        showError(err.message || 'Login failed. Please try again.');
        setLoading(false);
        document.getElementById('password')?.focus();
    }
});
