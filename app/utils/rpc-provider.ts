import { JsonRpcProvider, FallbackProvider } from 'ethers'
import { getRpcUrl } from '~/config/chains'

const RPC_ENDPOINTS: Record<number, string[]> = {
  56: [
    'https://bsc-rpc.publicnode.com',
    'https://bsc.drpc.org',
    'https://binance.llamarpc.com'
  ],
  97: [
    'https://bsc-testnet-rpc.publicnode.com',
    'https://bsc-testnet.drpc.org'
  ]
}

export const getRpcProvider = async (chainId: number) => {
  const endpoints = RPC_ENDPOINTS[chainId] || [getRpcUrl(chainId)].filter(Boolean) as string[]
  
  if (endpoints.length === 0) {
    throw new Error(`No RPC endpoints configured for chain ${chainId}`)
  }

  if (endpoints.length === 1) {
    return new JsonRpcProvider(endpoints[0], chainId)
  }

  const providers = endpoints.map(url => ({
    provider: new JsonRpcProvider(url, chainId),
    priority: 1,
    stallTimeout: 2000
  }))

  return new FallbackProvider(providers, chainId)
}
