import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Desativa o navigator.locks que causa deadlock no browser quando há
    // múltiplas operações concorrentes ou abas anteriores com lock pendurado.
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
})
