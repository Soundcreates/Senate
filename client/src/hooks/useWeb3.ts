import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  connectWallet as connectWalletUtil, 
  getCurrentAccount,
  getProvider,
  SEPOLIA_CHAIN_ID 
} from '../contracts/utils';

/**
 * Hook to manage wallet connection
 */
export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>('0');

  const updateAccount = useCallback(async (address: string | null) => {
    setAccount(address);
    if (address) {
      const provider = getProvider();
      if (provider) {
        const balance = await provider.getBalance(address);
        setBalance(ethers.formatEther(balance));
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }
    } else {
      setBalance('0');
      setChainId(null);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    try {
      const address = await connectWalletUtil();
      await updateAccount(address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [updateAccount]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setBalance('0');
    setChainId(null);
  }, []);

  useEffect(() => {
    // Check if already connected
    getCurrentAccount().then(updateAccount);

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      updateAccount(accounts[0] || null);
    };

    const handleChainChanged = (chainIdHex: string) => {
      // Update chain ID without reloading
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [updateAccount]);

  return {
    account,
    balance,
    chainId,
    isConnected: !!account,
    isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}

/**
 * Hook to interact with contracts
 */
export function useContract(contractAddress: string, abi: any) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const { account } = useWallet();

  useEffect(() => {
    const initContract = async () => {
      if (!account) {
        setContract(null);
        return;
      }

      const provider = getProvider();
      if (!provider) return;

      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(contractAddress, abi, signer);
      setContract(contractInstance);
    };

    initContract();
  }, [contractAddress, abi, account]);

  return contract;
}

/**
 * Hook for contract read operations
 */
export function useContractRead<T = any>(
  contract: ethers.Contract | null,
  method: string,
  args: any[] = [],
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!contract) return;

    setLoading(true);
    setError(null);

    try {
      const result = await contract[method](...args);
      setData(result);
    } catch (err: any) {
      setError(err);
      console.error(`Error calling ${method}:`, err);
    } finally {
      setLoading(false);
    }
  }, [contract, method, ...args]);

  useEffect(() => {
    refetch();
  }, [contract, method, ...dependencies]);

  return { data, loading, error, refetch };
}

/**
 * Hook for contract write operations
 */
export function useContractWrite(contract: ethers.Contract | null, method: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const write = useCallback(
    async (...args: any[]) => {
      if (!contract) throw new Error('Contract not initialized');

      setLoading(true);
      setError(null);
      setTxHash(null);

      try {
        const tx = await contract[method](...args);
        setTxHash(tx.hash);
        const receipt = await tx.wait();
        return receipt;
      } catch (err: any) {
        setError(err);
        console.error(`Error calling ${method}:`, err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [contract, method]
  );

  return { write, loading, error, txHash };
}

/**
 * Hook to get USDC balance
 */
export function useUSDCBalance(address?: string) {
  const { account } = useWallet();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    const targetAddress = address || account;
    if (!targetAddress) return;

    setLoading(true);
    try {
      const provider = getProvider();
      if (!provider) return;

      const { getContractAddress } = await import('../contracts/addresses/sepolia');
      const { ERC20ABI } = await import('../contracts/index');
      
      const usdcAddress = getContractAddress('USDC');
      const usdc = new ethers.Contract(usdcAddress, ERC20ABI, provider);
      const bal = await usdc.balanceOf(targetAddress);
      setBalance(ethers.formatUnits(bal, 6)); // USDC has 6 decimals
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
    } finally {
      setLoading(false);
    }
  }, [address, account]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
