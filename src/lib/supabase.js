import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnmhqwvudnjlrekkytka.supabase.co'
// Limpia corchetes o paréntesis si se pegó con formato markdown por error
const supabaseUrl = rawUrl.replace(/^\[|\]\(.*\)$/g, '').trim()
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/[`'"]/g, '').trim()

export const supabase = createClient(supabaseUrl, supabaseKey)
