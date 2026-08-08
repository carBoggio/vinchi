/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** undeployed | preview | preprod — see /midnight/.env, read by back/contracts too. */
  readonly MIDNIGHT_NETWORK?: string;
  /** Deployed VinchiNotes contract address on MIDNIGHT_NETWORK, or unset if not deployed there yet. */
  readonly VINCHI_NOTES_ADDRESS?: string;
  /** Deployed MerchantRegistry contract address on MIDNIGHT_NETWORK, or unset if not deployed there yet. */
  readonly MERCHANT_REGISTRY_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
