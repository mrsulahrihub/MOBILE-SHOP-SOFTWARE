
import { createClient } from
'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL =
    'https://lateoozrmyzjckcgfytp.supabase.co';

const SUPABASE_ANON_KEY =
    'sb_publishable_5V9LTrlkpe5Sv-ALosMOng_hfXYNLKE';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    }
);
