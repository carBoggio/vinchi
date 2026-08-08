/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** undeployed | preview | preprod — see /midnight/.env, read by back/contracts too. */
  readonly MIDNIGHT_NETWORK?: string;
  /** Deployed VinchiNotes contract address on MIDNIGHT_NETWORK, or unset if not deployed there yet. */
  readonly VINCHI_NOTES_ADDRESS?: string;
  /** Deployed MerchantRegistry contract address on MIDNIGHT_NETWORK, or unset if not deployed there yet. */
  readonly MERCHANT_REGISTRY_ADDRESS?: string;
  /** Supabase project URL for the note_backups store — see src/midnight/noteBackup.ts. */
  readonly SUPABASE_URL?: string;
  /** Supabase publishable (anon) key — safe client-side, gated by RLS. See src/midnight/noteBackup.ts. */
  readonly SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
