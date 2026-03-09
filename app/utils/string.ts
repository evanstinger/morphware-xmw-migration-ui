export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export const formatTokenAmount = (amount: bigint, decimals: number): string => {
  const divisor = 10n ** BigInt(decimals)
  const integerPart = amount / divisor
  const fractionalPart = amount % divisor
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')
  
  if (trimmedFractional === '') {
    return integerPart.toString()
  }
  
  return `${integerPart}.${trimmedFractional}`
}
