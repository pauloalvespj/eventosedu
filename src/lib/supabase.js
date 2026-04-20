import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.\n" +
    "Copie .env.example para .env e preencha com suas credenciais do Supabase."
  );
}

export const supabase = createClient(url, key);
