import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fmmabayflgvqermwcrhs.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_TODNQbjiNGYF82RYPShZdA_dZHam5Fg";

export const supabase = createClient(supabaseUrl, supabaseKey);
