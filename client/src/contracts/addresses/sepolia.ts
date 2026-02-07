/**
 * Sepolia Testnet Contract Addresses
 * Deployed: 2026-02-07
 * Network: Sepolia (Chain ID: 11155111)
 */

export const SEPOLIA_CHAIN_ID = 11155111;

export const contracts = {
  // UUPS Proxy Addresses (Use These!)
  RewardToken: {
    proxy: "0x27a90bE82CF59d286634a5A49F384d4B369A1E84",
    implementation: "0x403b2EC12dc4721d6E9328E892c150eC0749a9B5",
  },
  ProductivityEscrowFactory: {
    proxy: "0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B",
    implementation: "0x7b333b656da52f96CcECC83f94Cb960650AE4349",
  },
  // Circle USDC on Sepolia
  USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
} as const;

/**
 * Get contract address by name
 * For upgradeable contracts, returns the proxy address
 */
export function getContractAddress(contractName: keyof typeof contracts): string {
  const contract = contracts[contractName];
  
  if (typeof contract === 'string') {
    return contract;
  }
  
  // Return proxy address for upgradeable contracts
  return contract.proxy;
}

/**
 * Sepolia RPC URLs (Public)
 */
export const RPC_URLS = {
  alchemy: `https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY || ''}`,
  infura: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY || ''}`,
  public: 'https://rpc.sepolia.org',
} as const;

/**
 * Block Explorer
 */
export const BLOCK_EXPLORER = 'https://sepolia.etherscan.io';

/**
 * Get block explorer URL for address
 */
export function getExplorerUrl(address: string, type: 'address' | 'tx' = 'address'): string {
  return `${BLOCK_EXPLORER}/${type}/${address}`;
}

export default contracts;
