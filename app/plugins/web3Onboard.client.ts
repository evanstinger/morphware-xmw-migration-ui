import injectedModule from '@web3-onboard/injected-wallets'
import metamaskModule from '@web3-onboard/metamask'
import walletconnectModule from '@web3-onboard/walletconnect'
import okxModule from '@web3-onboard/okx'
import binanceModule from '@binance/w3w-blocknative-connector'
import coinbaseModule from '@web3-onboard/coinbase'
import type { Pinia } from 'pinia'

import { CHAINS, DAPP_METADATA } from '~/config'
import { useWeb3Store } from '~/stores/web3'

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const web3Store = useWeb3Store(nuxtApp.$pinia as Pinia)

  const config = useRuntimeConfig()

  const injectedWallets = injectedModule()
  const metamask = metamaskModule({
    options: {
      extensionOnly: false,
      dappMetadata: DAPP_METADATA
    }
  })

  const requiredChainId = Number(config.public.chainId || '1')

  const walletconnect = walletconnectModule({
    projectId: config.public.walletConnectProjectId as string || '',
    requiredChains: [requiredChainId],
    optionalChains: [],
    dappUrl: window.location.origin
  })

  web3Store.init({
    appMetadata: {
      name: DAPP_METADATA.name,
      icon: DAPP_METADATA.icon,
      logo: DAPP_METADATA.logo,
      description: DAPP_METADATA.description
    },
    wallets: [
      binanceModule(),
      okxModule(),
      coinbaseModule(),
      injectedWallets,
      metamask,
      walletconnect
    ],
    chains: CHAINS,
    theme: 'dark',
    connect: {
      autoConnectLastWallet: false
    }
  })
})
