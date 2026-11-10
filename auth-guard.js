
import { supabase } from './config.js';

const ALLOWED_ROLES = ['admin', 'manager', 'staff'];

export async function getActiveProfile() {

    const {
        data: { session },
        error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
        return null;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('id', session.user.id)
        .maybeSingle();

    if (
        error ||
        !profile ||
        profile.is_active !== true ||
        !ALLOWED_ROLES.includes(profile.role)
    ) {
        await supabase.auth.signOut();
        return null;
    }

    return {
        session,
        profile
    };
}
