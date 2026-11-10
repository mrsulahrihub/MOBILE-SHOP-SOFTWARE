
import { supabase } from './config.js';

const form = document.getElementById('loginForm');
const button = document.getElementById('loginBtn');
const message = document.getElementById('errorMessage');

const showError = (error) => {
    console.error('LOGIN ERROR:', error);
    message.textContent = error?.message || 'Login failed. Please try again.';
};

if (!form || !button || !message) {
    throw new Error(
        'Login HTML elements missing. Check loginForm, loginBtn and errorMessage IDs.'
    );
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    message.textContent = '';

    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
        message.textContent = 'Please enter email and password.';
        return;
    }

    button.disabled = true;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!data.user) {
            throw new Error('Supabase did not return a user.');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, role, is_active')
            .eq('id', data.user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (
            !profile ||
            profile.is_active !== true ||
            !['admin', 'manager', 'staff'].includes(profile.role)
        ) {
            await supabase.auth.signOut();
            throw new Error('Profile missing, inactive, or unauthorized.');
        }

        window.location.href = './dashboard.html';

    } catch (error) {
        showError(error);
    } finally {
        button.disabled = false;
    }
});
