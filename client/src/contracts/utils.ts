import { ethers } from 'ethers';
import { contracts, getContractAddress, SEPOLIA_CHAIN_ID } from './addresses/sepolia';
import {
  RewardTokenABI,
  ProductivityEscrowABI,
  ProductivityEscrowFactoryABI,
  ERC20ABI,
} from './index';

// Re-export SEPOLIA_CHAIN_ID for use in other modules
export { SEPOLIA_CHAIN_ID };

/**
 * Get a read-only ethers provider.
 * Wallet connection has been removed from the client; contract reads use RPC.
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || RPC_URLS.public;
  return new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID);
}

/**
 * Get contract instance with signer
 */
export async function getContract(
  contractName: 'RewardToken' | 'ProductivityEscrowFactory' | 'USDC',
  signerOrProvider?: ethers.Signer | ethers.Provider
): Promise<ethers.Contract> {
  const address = getContractAddress(contractName);
  
  let abiToUse;
  switch (contractName) {
    case 'RewardToken':
      abiToUse = RewardTokenABI;
      break;
    case 'ProductivityEscrowFactory':
      abiToUse = ProductivityEscrowFactoryABI;
      break;
    case 'USDC':
      abiToUse = ERC20ABI;
      break;
  }

  if (!signerOrProvider) {
    signerOrProvider = getProvider();
  }

  return new ethers.Contract(address, abiToUse, signerOrProvider);
}

/**
 * Get ProductivityEscrow instance by address
 */
export async function getEscrowContract(
  escrowAddress: string,
  signerOrProvider?: ethers.Signer | ethers.Provider
): Promise<ethers.Contract> {
  if (!signerOrProvider) {
    signerOrProvider = getProvider();
  }

  return new ethers.Contract(escrowAddress, ProductivityEscrowABI, signerOrProvider);
}

/**
 * Format token amount (handle decimals)
 */
export function formatTokenAmount(amount: bigint | string, decimals: number = 6): string {
  return ethers.formatUnits(amount, decimals);
}

/**
 * Parse token amount (handle decimals)
 */
export function parseTokenAmount(amount: string, decimals: number = 6): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

