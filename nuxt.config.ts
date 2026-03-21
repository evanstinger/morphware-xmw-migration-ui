export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      walletConnectProjectId: process.env.NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      migrationRevertContractAddress: process.env.NUXT_PUBLIC_MIGRATION_REVERT_CONTRACT_ADDRESS || '',
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID || '1'
    }
  },

  compatibilityDate: '2026-02-20',

  nitro: {
    preset: 'cloudflare-module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'morphware-migration-ui',
        compatibility_date: '2026-01-20',
        compatibility_flags: ['nodejs_compat'],
        vars: {
          NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID: '67553a5ab5967c7fce9a5cccdb2de398',
          NUXT_PUBLIC_MIGRATION_REVERT_CONTRACT_ADDRESS: '0x7a591FCe075Ab3D220E827a79aE3D36bCCA6FD0D',
          NUXT_PUBLIC_CHAIN_ID: '1'
        }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
