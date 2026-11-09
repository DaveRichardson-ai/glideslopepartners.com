declare module 'virtual:tokens.css';

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
