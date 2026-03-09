import { Contract, BrowserProvider, Interface, type ContractTransactionResponse, type InterfaceAbi } from 'ethers'
import { getRpcProvider } from '~/utils/rpc-provider'
import { useWeb3Store } from '~/stores/web3'

interface ContractConfig {
  address: string
  abi: InterfaceAbi
  chainId: number
  preferWalletRead?: boolean
}

export const useContract = (config: ContractConfig) => {
  const web3Store = useWeb3Store()
  const pendingReads = ref(0)
  const loading = computed(() => pendingReads.value > 0)
  const submitting = ref(false)

  const asBigInt = (v: unknown, fallback: bigint = 0n): bigint => {
    if (typeof v === 'bigint') return v
    if (typeof v === 'number') return BigInt(v)
    if (typeof v === 'string') {
      try {
        return BigInt(v)
      } catch {
        return fallback
      }
    }
    return fallback
  }
  const asBoolean = (v: unknown, fallback = false): boolean => {
    if (typeof v === 'boolean') return v
    if (typeof v === 'bigint') return v !== 0n
    if (typeof v === 'number') return v !== 0
    if (typeof v === 'string') return v === 'true' || v === '1'
    return fallback
  }
  const asNumber = (v: unknown, fallback = 0): number => {
    if (typeof v === 'number') return v
    if (typeof v === 'bigint') return Number(v)
    if (typeof v === 'string') return Number(v)
    return fallback
  }
  const asString = (v: unknown, fallback = ''): string => {
    if (typeof v === 'string') return v
    return fallback
  }

  function extractRevertData(err: unknown): string | undefined {
    const e = err as { data?: string, error?: { data?: string }, info?: { error?: { data?: string } } }
    return e?.data || e?.error?.data || e?.info?.error?.data
  }

  async function getReadContract() {
    const isConnected = web3Store.isConnected
    const isOnExpectedChain = web3Store.chainId === config.chainId
    const walletProvider = web3Store.connectedWallet?.provider

    if (config.preferWalletRead && isConnected && !isOnExpectedChain) {
      throw new Error(`Wrong network. Please switch to chain ${config.chainId}`)
    }

    if (isConnected && isOnExpectedChain && walletProvider) {
      try {
        const provider = new BrowserProvider(walletProvider)
        return new Contract(config.address, config.abi, provider)
      } catch (e) {
        if (config.preferWalletRead) {
          throw new Error('Connected wallet provider unavailable for contract reads')
        }
        console.warn('[useContract] Failed to use wallet provider, falling back to RPC', e)
      }
    }

    if (config.preferWalletRead && isConnected && isOnExpectedChain && !walletProvider) {
      throw new Error('Connected wallet provider unavailable for contract reads')
    }

    const provider = await getRpcProvider(config.chainId)
    return new Contract(config.address, config.abi, provider)
  }

  async function getWriteContract() {
    if (!web3Store.isConnected || !web3Store.connectedWallet?.provider) {
      throw new Error('Wallet not connected')
    }
    if (web3Store.chainId !== config.chainId) {
      throw new Error(`Wrong network. Please switch to chain ${config.chainId}`)
    }

    const ethersProvider = new BrowserProvider(web3Store.connectedWallet.provider)
    const signer = await ethersProvider.getSigner()
    return new Contract(config.address, config.abi, signer)
  }

  async function read(method: string, args: unknown[] = []) {
    pendingReads.value += 1
    try {
      const contract = await getReadContract()
      const fn = contract.getFunction(method)
      if (!fn) throw new Error(`Method ${method} not found on contract`)
      return await fn(...args)
    } finally {
      pendingReads.value = Math.max(0, pendingReads.value - 1)
    }
  }

  async function write(method: string, args: unknown[] = []): Promise<ContractTransactionResponse> {
    submitting.value = true
    try {
      const contract = await getWriteContract()

      try {
        const fn = contract.getFunction(method)
        await fn.staticCall(...(args as []))
      } catch (preflightErr: unknown) {
        const iface = new Interface(config.abi)
        const data = extractRevertData(preflightErr)
        if (data) {
          try {
            const decoded = iface.parseError(data)
            const msg = decoded?.name === 'Error' ? String(decoded?.args?.[0]) : `${decoded?.name}`
            throw new Error(msg)
          } catch {
            throw preflightErr
          }
        } else {
          throw preflightErr
        }
      }

      const fn = contract.getFunction(method)
      const tx = await fn(...(args as []))
      return tx
    } catch (e: unknown) {
      const iface = new Interface(config.abi)
      const data = extractRevertData(e)
      if (data) {
        try {
          const decoded = iface.parseError(data)
          const msg = decoded?.name === 'Error' ? String(decoded?.args?.[0]) : `${decoded?.name}`
          console.error(`[useContract] ${method} reverted: ${msg}`)
          throw new Error(msg)
        } catch {
          console.error(`[useContract] Write error (${method}):`, e)
          throw e
        }
      } else {
        console.error(`[useContract] Write error (${method}):`, e)
        throw e
      }
    } finally {
      submitting.value = false
    }
  }

  return {
    loading: readonly(loading),
    submitting: readonly(submitting),
    read,
    write,
    getReadContract,
    getWriteContract,
    asBigInt,
    asBoolean,
    asNumber,
    asString
  }
}
