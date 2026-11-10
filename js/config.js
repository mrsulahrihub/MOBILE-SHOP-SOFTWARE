
import { createClient } from
'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
    'https://lateoozrmyzjckcgfytp.supabase.co',
    '6b9199b2-8cd1-4f9c-ab3f-87de6ca67102',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
