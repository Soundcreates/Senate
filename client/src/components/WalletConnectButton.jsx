import React from 'react';
import { useWalletContext } from '../context/WalletContext';
import { Wallet, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * WalletConnectButton — a reusable button that handles wallet connection and shows status.
 * Supports compact and full variants.
 */
const WalletConnectButton = ({ variant = 'full', className = '' }) => {
  const {
    account,
    isConnected,
    isCorrectNetwork,
    isConnecting,
    usdcBalance,
    connect,
    disconnect,
    shortenAddress,
    getExplorerUrl,
  } = useWalletContext();

  if (isConnecting) {
    return (
      <button
        disabled
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#fbf7ef] border border-[#a9927d]/20 text-[#a9927d] text-sm font-['Jost'] ${className}`}
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a9927d] hover:bg-[#8c7a6b] text-white text-sm font-medium transition-all font-['Jost'] shadow-lg shadow-[#a9927d]/20 ${className}`}
      >
        <Wallet size={16} />
        {variant === 'compact' ? 'Connect' : 'Connect Wallet'}
      </button>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <button
        onClick={connect}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-sm font-medium transition-all font-['Jost'] ${className}`}
      >
        <AlertTriangle size={16} />
        Wrong Network
      </button>
    );
  }

  // Connected and correct network
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#a9927d] font-['Jost']">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
        <button
          onClick={() => window.open(getExplorerUrl(account), '_blank')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fbf7ef] border border-[#a9927d]/20 text-[#2d2a26] text-sm font-['Jost'] hover:bg-[#f0eadd] transition-all ${className}`}
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {shortenAddress(account)}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#fbf7ef] border border-[#a9927d]/10 font-['Jost']">
        <span className="text-sm font-medium text-[#2d2a26]">{parseFloat(usdcBalance).toFixed(2)}</span>
        <span className="text-xs text-[#a9927d]">USDC</span>
      </div>
      <div className="relative group">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#fbf7ef] border border-[#a9927d]/20 text-[#2d2a26] text-sm font-['Jost'] hover:bg-[#f0eadd] transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          {shortenAddress(account)}
        </button>
        <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
          <div className="bg-white rounded-xl border border-[#a9927d]/15 shadow-lg p-2 min-w-[160px]">
            <a
              href={getExplorerUrl(account)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5e503f] hover:bg-[#fbf7ef] transition-colors font-['Jost']"
            >
              <ExternalLink size={14} /> View on Explorer
            </a>
            <button
              onClick={disconnect}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors font-['Jost']"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnectButton;
