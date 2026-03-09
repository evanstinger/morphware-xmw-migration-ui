import { defineStore } from 'pinia'
import type { InitOptions, OnboardAPI, AppState, WalletState, ConnectOptions } from '@web3-onboard/core'
import Onboard from '@web3-onboard/core'
import type { ChainId } from '~/types'

export const useWeb3Store = defineStore('Web3', () => {
  const onboard = shallowRef<OnboardAPI | null>(null)
  const onboardState = shallowRef<AppState | null>(null)
  const isConnecting = ref(false)

  const wallets = computed(() => onboardState.value?.wallets ?? [])
  const connectedWallet = computed<WalletState | null>(() => wallets.value[0] ?? null)

  const connectedChain = computed(() => connectedWallet.value?.chains[0] ?? null)
  const chainId = computed(() => connectedChain.value ? Number(connectedChain.value.id) as ChainId : null)

  const address = computed(() => connectedWallet.value?.accounts[0]?.address ?? null)

  const isConnected = computed(() => !!connectedWallet.value)

  const resetPersistedSession = () => {
    if (!import.meta.client) return

    const keys = Object.keys(localStorage)
    for (const key of keys) {
      const normalized = key.toLowerCase()
      if (
        normalized.includes('alreadyconnectedwallets')
        || normalized.includes('onboard.js')
        || normalized.includes('walletconnect')
        || normalized.includes('wc@2')
      ) {
        localStorage.removeItem(key)
      }
    }
  }

  const init = (options: InitOptions) => {
    if (onboard.value) {
      console.warn('Web3Onboard already initialized')
      return onboard.value
    }

    resetPersistedSession()
    const instance = Onboard(options)
    onboard.value = instance
    onboardState.value = instance.state.get()

    instance.state.select().subscribe((update) => {
      onboardState.value = update
    })

    return instance
  }

  const connectWallet = async (options?: ConnectOptions) => {
    if (!onboard.value) throw new Error('Onboard not initialized')
    isConnecting.value = true
    try {
      const wallets = await onboard.value.connectWallet(options)
      return wallets
    } catch (e) {
      console.error('Failed to connect wallet:', e)
      throw e
    } finally {
      isConnecting.value = false
    }
  }

  const disconnectWallet = async (wallet?: WalletState) => {
    if (!onboard.value) throw new Error('Onboard not initialized')
    const w = wallet || connectedWallet.value
    if (w) {
      await onboard.value.disconnectWallet({ label: w.label })
    }
  }

  const setChain = async (chainIdHex: string) => {
    if (!onboard.value) throw new Error('Onboard not initialized')
    await onboard.value.setChain({ chainId: chainIdHex })
  }

  return {
    onboard,
    onboardState,
    wallets,
    connectedWallet,
    connectedChain,
    chainId,
    address,
    isConnected,
    isConnecting,
    resetPersistedSession,
    init,
    connectWallet,
    disconnectWallet,
    setChain
  }
})
