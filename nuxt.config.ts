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
      chainId: process.env.NUXT_PUBLIC_CHAIN_ID || '1'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2026-02-20',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
