
import { supabase } from './config.js';
import { getActiveProfile } from './auth-guard.js';

const result = await getActiveProfile();

if (!result) {

    location.replace('./login.html');

} else {

    const { session, profile } = result;

    document.getElementById('userName').textContent =
        profile.full_name;

    document.getElementById('userRole').textContent =
        profile.role.toUpperCase();

    document.getElementById('welcomeName').textContent =
        profile.full_name;

    document.getElementById('userAvatar').textContent =
        profile.full_name.charAt(0).toUpperCase();

    document.getElementById('todayDate').textContent =
        new Intl.DateTimeFormat('en-PK', {
            dateStyle: 'full'
        }).format(new Date());

    document.getElementById('logoutBtn')
        .addEventListener('click', async () => {

            const { error } = await supabase.auth.signOut();

            if (error) {
                alert('Unable to sign out. Please retry.');
                return;
            }

            location.replace('./login.html');
        });
}
