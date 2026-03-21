import { useContract } from './useContract'

const MORPHWARE_REVERT_MIGRATION_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_oldToken', type: 'address' },
      { internalType: 'address', name: '_newToken', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'revertMigration',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getRevertMetrics',
    outputs: [{
      components: [
        { internalType: 'uint256', name: 'userReverted', type: 'uint256' },
        { internalType: 'uint256', name: 'userOldTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'userNewTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'contractOldTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'contractNewTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'totalReverted', type: 'uint256' },
        { internalType: 'uint8', name: 'decimals', type: 'uint8' }
      ],
      internalType: 'struct MorphwareRevert.RevertMetrics',
      name: 'metrics',
      type: 'tuple'
    }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'oldToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'newToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalReverted',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userReverted',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'tokenDecimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'paused',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'MigrationReverted',
    type: 'event'
  }
]

const ERC20_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
]

export interface RevertMetrics {
  userReverted: bigint
  userOldTokenBalance: bigint
  userNewTokenBalance: bigint
  contractOldTokenBalance: bigint
  contractNewTokenBalance: bigint
  totalReverted: bigint
  decimals: number
}

export const useMigrationRevertContract = () => {
  const config = useRuntimeConfig()
  const contractAddress = config.public.migrationRevertContractAddress as string
  const chainId = Number(config.public.chainId) || 56

  const contract = useContract({
    address: contractAddress,
    abi: MORPHWARE_REVERT_MIGRATION_ABI,
    chainId,
    preferWalletRead: chainId === 1
  })

  const getRevertMetrics = async (userAddress: string): Promise<RevertMetrics> => {
    const result = await contract.read('getRevertMetrics', [userAddress])
    return {
      userReverted: contract.asBigInt(result.userReverted),
      userOldTokenBalance: contract.asBigInt(result.userOldTokenBalance),
      userNewTokenBalance: contract.asBigInt(result.userNewTokenBalance),
      contractOldTokenBalance: contract.asBigInt(result.contractOldTokenBalance),
      contractNewTokenBalance: contract.asBigInt(result.contractNewTokenBalance),
      totalReverted: contract.asBigInt(result.totalReverted),
      decimals: contract.asNumber(result.decimals)
    }
  }

  const getOldTokenAddress = async (): Promise<string> => {
    return contract.read('oldToken')
  }

  const getNewTokenAddress = async (): Promise<string> => {
    return contract.read('newToken')
  }

  const revertMigration = async (amount: bigint) => {
    return contract.write('revertMigration', [amount])
  }

  const getPaused = async (): Promise<boolean> => {
    return contract.asBoolean(await contract.read('paused'))
  }

  const getOldTokenContract = (tokenAddress: string) => {
    return useContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      chainId,
      preferWalletRead: chainId === 1
    })
  }

  const getNewTokenContract = (tokenAddress: string) => {
    return useContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      chainId,
      preferWalletRead: chainId === 1
    })
  }

  return {
    ...contract,
    address: contractAddress,
    chainId,
    getRevertMetrics,
    getOldTokenAddress,
    getNewTokenAddress,
    revertMigration,
    getPaused,
    getOldTokenContract,
    getNewTokenContract
  }
}
