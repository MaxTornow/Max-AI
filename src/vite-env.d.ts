/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FASTSAVER_API_TOKEN: string;
  readonly VITE_ASSEMBLY_AI_API_KEY: string;
  readonly VITE_CLAUDE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
