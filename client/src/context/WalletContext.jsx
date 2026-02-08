import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet as connectWalletUtil, getCurrentAccount, getProvider, shortenAddress, SEPOLIA_CHAIN_ID } from '../contracts/utils';
import { getContractAddress, BLOCK_EXPLORER } from '../contracts/addresses/sepolia';
import { ERC20ABI } from '../contracts/index';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [ethBalance, setEthBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [rewardBalance, setRewardBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = Boolean(account);
  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;

  const refreshBalances = useCallback(async (address) => {
    if (!address) return;
    try {
      const provider = getProvider();
      if (!provider) return;

      // ETH balance
      const ethBal = await provider.getBalance(address);
      setEthBalance(ethers.formatEther(ethBal));

      // USDC balance
      const usdcAddress = getContractAddress('USDC');
      const usdc = new ethers.Contract(usdcAddress, ERC20ABI, provider);
      const usdcBal = await usdc.balanceOf(address);
      setUsdcBalance(ethers.formatUnits(usdcBal, 6));

      // Reward token balance
      const rewardAddress = getContractAddress('RewardToken');
      const reward = new ethers.Contract(rewardAddress, ERC20ABI, provider);
      const rewardBal = await reward.balanceOf(address);
      setRewardBalance(ethers.formatUnits(rewardBal, 18));
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    }
  }, []);

  const updateAccount = useCallback(async (address) => {
    setAccount(address || null);
    if (address) {
      const provider = getProvider();
      if (provider) {
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      }
      await refreshBalances(address);
    } else {
      setEthBalance('0');
      setUsdcBalance('0');
      setRewardBalance('0');
      setChainId(null);
    }
  }, [refreshBalances]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const address = await connectWalletUtil();
      if (address) {
        await updateAccount(address);
      }
      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [updateAccount]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setEthBalance('0');
    setUsdcBalance('0');
    setRewardBalance('0');
    setChainId(null);
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    getCurrentAccount().then((addr) => {
      if (addr) updateAccount(addr);
    });
  }, [updateAccount]);

  // Listen for MetaMask events
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      updateAccount(accounts[0] || null);
    };
    const handleChainChanged = (chainIdHex) => {
      setChainId(parseInt(chainIdHex, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [updateAccount]);

  const value = {
    account,
    chainId,
    ethBalance,
    usdcBalance,
    rewardBalance,
    isConnected,
    isCorrectNetwork,
    isConnecting,
    connect,
    disconnect,
    refreshBalances: () => refreshBalances(account),
    shortenAddress: (addr) => shortenAddress(addr || account || ''),
    getExplorerUrl: (addr, type = 'address') => `${BLOCK_EXPLORER}/${type}/${addr}`,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWalletContext = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
};
