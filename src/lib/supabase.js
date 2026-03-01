import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nrosvflhdgblffiwsixw.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yb3N2ZmxoZGdibGZmaXdzaXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTg2ODAsImV4cCI6MjA4Nzc5NDY4MH0.8u4MwVg9Y7g1E3pypRCCOWfk1sR110HMHyaWrYZ7aoE'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase environment variables are missing. Using hardcoded fallbacks.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
