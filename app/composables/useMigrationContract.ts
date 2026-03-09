import { useContract } from './useContract'

const MORPHWARE_MIGRATION_ABI = [
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
    name: 'migrate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getMigrationMetrics',
    outputs: [{
      components: [
        { internalType: 'uint256', name: 'userMigratedAmount', type: 'uint256' },
        { internalType: 'uint256', name: 'userOldTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'userNewTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'contractNewTokenBalance', type: 'uint256' },
        { internalType: 'uint256', name: 'totalMigratedAmount', type: 'uint256' },
        { internalType: 'uint8', name: 'decimals', type: 'uint8' }
      ],
      internalType: 'struct MorphwareMigration.MigrationMetrics',
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
    name: 'totalMigrated',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userMigrated',
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
    name: 'TokensMigrated',
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

export interface MigrationMetrics {
  userMigratedAmount: bigint
  userOldTokenBalance: bigint
  userNewTokenBalance: bigint
  contractNewTokenBalance: bigint
  totalMigratedAmount: bigint
  decimals: number
}

export const useMigrationContract = () => {
  const config = useRuntimeConfig()
  const contractAddress = config.public.migrationContractAddress as string
  const chainId = Number(config.public.chainId) || 56

  const contract = useContract({
    address: contractAddress,
    abi: MORPHWARE_MIGRATION_ABI,
    chainId,
    preferWalletRead: chainId === 1
  })

  const getMetrics = async (userAddress: string): Promise<MigrationMetrics> => {
    const result = await contract.read('getMigrationMetrics', [userAddress])
    return {
      userMigratedAmount: contract.asBigInt(result.userMigratedAmount),
      userOldTokenBalance: contract.asBigInt(result.userOldTokenBalance),
      userNewTokenBalance: contract.asBigInt(result.userNewTokenBalance),
      contractNewTokenBalance: contract.asBigInt(result.contractNewTokenBalance),
      totalMigratedAmount: contract.asBigInt(result.totalMigratedAmount),
      decimals: contract.asNumber(result.decimals)
    }
  }

  const getOldTokenAddress = async (): Promise<string> => {
    return contract.read('oldToken')
  }

  const getNewTokenAddress = async (): Promise<string> => {
    return contract.read('newToken')
  }

  const migrate = async (amount: bigint) => {
    return contract.write('migrate', [amount])
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
    getMetrics,
    getOldTokenAddress,
    getNewTokenAddress,
    migrate,
    getPaused,
    getOldTokenContract,
    getNewTokenContract
  }
}
