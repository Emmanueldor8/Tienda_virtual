/* ═══════════════════════════════════════════════════════════════
   StreamVault · Supabase Client Configuration
   Conexión oficial con PostgreSQL / Supabase
   ═══════════════════════════════════════════════════════════════ */

// ── CONFIGURACIÓN DE TU PROYECTO SUPABASE ──
// Pega aquí tus credenciales obtenidas en Project Settings -> API
const SUPABASE_CONFIG = {
  // Project URL obtenido de tu dashboard de Supabase
  url: 'https://eiuckjkdfimroiehzevd.supabase.co',
  
  // Clave pública oficial (Publishable Key)
  anonKey: 'sb_publishable_PO10dj-w89_ihTrP7c8i0Q_5RpnBmgV'
};

// Variable global del cliente Supabase
let supabaseClient = null;

/**
 * Determina si las credenciales de Supabase ya fueron configuradas
 */
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url && 
         SUPABASE_CONFIG.anonKey && 
         !SUPABASE_CONFIG.url.includes('TU_PROYECTO') && 
         !SUPABASE_CONFIG.anonKey.includes('TU_SUPABASE_ANON_KEY');
}

/**
 * Inicializa el cliente oficial de Supabase
 */
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('⚠️ SDK de Supabase (@supabase/supabase-js) no está cargado aún en window.supabase.');
    return null;
  }

  if (!isSupabaseConfigured()) {
    console.warn('ℹ️ StreamVault: Supabase no está configurado aún con tus credenciales reales en "supabase-client.js". Funcionando en modo de respaldo.');
    return null;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    });
    console.log('✅ StreamVault: Conectado exitosamente a Supabase (' + SUPABASE_CONFIG.url + ')');
    return supabaseClient;
  } catch (err) {
    console.error('❌ Error al inicializar cliente Supabase:', err);
    return null;
  }
}

// Inicialización inmediata si el script de Supabase ya cargó
if (typeof window !== 'undefined') {
  if (window.supabase) {
    initSupabase();
  } else {
    window.addEventListener('DOMContentLoaded', initSupabase);
  }
}

