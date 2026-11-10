// =====================================================
// MOBILE SHOP — LOGIN CONTROLLER
// Handles Supabase email/password auth + role check
// =====================================================

import { supabase } from './config.js';

const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

// ---------- DOM ----------
const form     = document.getElementById('loginForm');
const button   = document.getElementById('loginBtn');
const errorEl  = document.getElementById('errorMessage');
const okEl     = document.getElementById('successMessage');

// Guard: fail fast if markup is missing
if (!form || !button || !errorEl || !okEl) {
    throw new Error(
        'Login HTML elements missing. Check IDs: loginForm, loginBtn, errorMessage, successMessage.'
    );
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
    errorEl.textContent =
        typeof message === 'string'
            ? message
            : message?.message || 'Login failed. Please try again.';
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

// ---------- Validation ----------
function validate(email, password) {
    if (!email) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
}

// ---------- Friendly Supabase error mapping ----------
function mapAuthError(err) {
    const code = err?.code || '';
    const raw  = (err?.message || '').toLowerCase();

    if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
        return 'Incorrect email or password.';
    }
    if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) {
        return 'Your email is not confirmed yet. Please check your inbox.';
    }
    if (code === 'too_many_requests' || raw.includes('too many')) {
        return 'Too many attempts. Please wait a minute and try again.';
    }
    if (raw.includes('network') || raw.includes('fetch')) {
        return 'Network error. Please check your internet connection.';
    }
    return err?.message || 'Login failed. Please try again.';
}

// ---------- Submit handler ----------
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFeedback();

    const email    = document.getElementById('email')?.value.trim().toLowerCase() || '';
    const password = document.getElementById('password')?.value || '';

    const validationError = validate(email, password);
    if (validationError) {
        showError(validationError);
        return;
    }

    setLoading(true);

    try {
        // 1) Authenticate with Supabase
        const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({ email, password });

        if (authError) throw authError;

        const user = authData?.user;
        if (!user) throw new Error('Supabase did not return a user.');

        // 2) Fetch profile + verify role / active flag
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, is_active')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        const authorized =
            profile &&
            profile.is_active === true &&
            ALLOWED_ROLES.includes(profile.role);

        if (!authorized) {
            // Roll back the session so a blocked user cannot stay signed in
            await supabase.auth.signOut();
            throw new Error(
                'Your account is inactive or does not have access. Please contact an administrator.'
            );
        }

        // 3) Success — show message and redirect
        showSuccess('Login successful — redirecting to dashboard…');
        window.location.replace('./dashboard.html');

    } catch (err) {
        showError(mapAuthError(err));
        setLoading(false);
        // Focus password for quick retry
        document.getElementById('password')?.focus();
    }
    // Note: on success we intentionally do NOT call setLoading(false)
    // so the spinner stays on while the redirect happens.
});

// ---------- Auto-redirect if already signed in ----------
// If a valid session exists, skip the login form entirely.
(async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_active')
            .eq('id', session.user.id)
            .maybeSingle();

        if (
            profile &&
            profile.is_active === true &&
            ALLOWED_ROLES.includes(profile.role)
        ) {
            window.location.replace('./dashboard.html');
        }
    } catch {
        /* silent — let the user log in manually */
    }
})();
