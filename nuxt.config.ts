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
      migrationContractAddress: process.env.NUXT_PUBLIC_MIGRATION_CONTRACT_ADDRESS || '',
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID || '56'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'morphware-xmw-migration-ui',
        compatibility_date: '2026-01-20',
        vars: {
          NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID: '67553a5ab5967c7fce9a5cccdb2de398',
          NUXT_PUBLIC_MIGRATION_CONTRACT_ADDRESS: '0xC1567D4793dD42804ec25884B72eCc7AC339bef9',
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
