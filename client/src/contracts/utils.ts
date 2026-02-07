import { ethers } from 'ethers';
import { contracts, getContractAddress, SEPOLIA_CHAIN_ID } from './addresses/sepolia';
import {
  RewardTokenABI,
  ProductivityEscrowABI,
  ProductivityEscrowFactoryABI,
  ERC20ABI,
} from './index';

/**
 * Get ethers provider
 */
export function getProvider(): ethers.BrowserProvider | null {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

/**
 * Get signer
 */
export async function getSigner(): Promise<ethers.Signer | null> {
  const provider = getProvider();
  if (!provider) return null;
  return await provider.getSigner();
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
    signerOrProvider = await getSigner();
  }

  if (!signerOrProvider) {
    throw new Error('No signer or provider available');
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
    signerOrProvider = await getSigner();
  }

  if (!signerOrProvider) {
    throw new Error('No signer or provider available');
  }

  return new ethers.Contract(escrowAddress, ProductivityEscrowABI, signerOrProvider);
}

/**
 * Request account access
 */
export async function connectWallet(): Promise<string | null> {
  if (!window.ethereum) {
    alert('Please install MetaMask!');
    return null;
  }

  try {
    const provider = getProvider();
    if (!provider) return null;

    const accounts = await provider.send('eth_requestAccounts', []);
    
    // Check if on correct network
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        }
      }
    }

    return accounts[0];
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return null;
  }
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

/**
 * Check if wallet is connected
 */
export async function isWalletConnected(): Promise<boolean> {
  if (!window.ethereum) return false;
  
  const provider = getProvider();
  if (!provider) return false;

  const accounts = await provider.send('eth_accounts', []);
  return accounts.length > 0;
}

/**
 * Get current account
 */
export async function getCurrentAccount(): Promise<string | null> {
  if (!window.ethereum) return null;
  
  const provider = getProvider();
  if (!provider) return null;

  const accounts = await provider.send('eth_accounts', []);
  return accounts[0] || null;
}

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
