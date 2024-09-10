import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_USER_MAIL, SUPABASE_USER_PASSWORD } from '$env/static/private';
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
