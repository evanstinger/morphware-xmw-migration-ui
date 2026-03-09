export const DAPP_METADATA = {
  name: 'Morphware XMW Migration',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icon: 'https://framerusercontent.com/images/0wJIpnHR4fliia1jeMqNRxw13k.png',
  logo: 'https://framerusercontent.com/images/0wJIpnHR4fliia1jeMqNRxw13k.png',
  description: 'Migrate your XMW tokens from old to new contract',
  recommendedInjectedWallets: [
    { name: 'MetaMask', url: 'https://metamask.io' },
    { name: 'Rabby', url: 'https://rabby.io' }
  ]
}
