import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnmhqwvudnjlrekkytka.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpubWhxd3Z1ZG5qbHJla2t5dGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1OTM5NzksImV4cCI6MjEwODE2OTk3OX0.QjimT9kfpEwYYiB-9T7nkIpyX7c7a1imooJNr3WGb2E'

export const supabase = createClient(supabaseUrl, supabaseKey)
