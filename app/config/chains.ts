export interface Chain {
  id: string
  token: string
  label: string
  rpcUrl: string
  icon?: string
  color?: string
}

export const CHAINS: Chain[] = [
  {
    id: '0x1',
    token: 'ETH',
    label: 'ETH Mainnet',
    rpcUrl: 'https://eth.llamarpc.com'
  }
]

export const getChainById = (chainId: string | number): Chain | undefined => {
  const id = typeof chainId === 'number' ? `0x${chainId.toString(16)}` : chainId
  return CHAINS.find(chain => chain.id === id)
}

export const getRpcUrl = (chainId: string | number): string | undefined => {
  return getChainById(chainId)?.rpcUrl
}
