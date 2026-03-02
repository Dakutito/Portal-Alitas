import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wztlxgiokazeulwszjef.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dGx4Z2lva2F6ZXVsd3N6amVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTA5NTIsImV4cCI6MjA4Nzk2Njk1Mn0.VQXK5igmE4Qom2lkkGn3CYoXPvRPJ0CkFeE_rZmut_k'

// persistSession: true (default) — Supabase guarda la sesión en localStorage automáticamente
// Cuando recargas, onAuthStateChange dispara INITIAL_SESSION con la sesión guardada
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,       // Guarda sesión en localStorage
        autoRefreshToken: true,     // Renueva el token automáticamente
        detectSessionInUrl: false,  // No necesario para este proyecto
    }
})
