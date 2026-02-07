# Web3 Contract Integration

All contract ABIs, addresses, and utilities for interacting with the deployed Sepolia contracts.

## 📁 Directory Structure

```
src/contracts/
├── abis/                          # Contract ABIs (auto-generated)
│   ├── ERC20.json                 # Standard ERC20 ABI (for USDC)
│   ├── ProductivityEscrow.json    # Escrow contract ABI
│   ├── ProductivityEscrowFactory.json
│   └── RewardToken.json
├── addresses/
│   └── sepolia.ts                 # Deployed contract addresses
├── index.ts                       # ABI exports
└── utils.ts                       # Web3 utility functions
```

## 🚀 Quick Start

### 1. Connect Wallet

```typescript
import { useWallet } from '@/hooks/useWeb3';

function MyComponent() {
  const { account, isConnected, connectWallet } = useWallet();

  return (
    <button onClick={connectWallet}>
      {isConnected ? `Connected: ${account}` : 'Connect Wallet'}
    </button>
  );
}
```

### 2. Get Contract Instance

```typescript
import { getContract } from '@/contracts/utils';

// Get RewardToken contract
const rewardToken = await getContract('RewardToken');

// Get Factory contract
const factory = await getContract('ProductivityEscrowFactory');

// Get USDC contract
const usdc = await getContract('USDC');

// Get a specific escrow by address
import { getEscrowContract } from '@/contracts/utils';
const escrow = await getEscrowContract('0x...');
```

### 3. Read Contract Data

```typescript
import { useContract, useContractRead } from '@/hooks/useWeb3';
import { getContractAddress } from '@/contracts/addresses/sepolia';
import { RewardTokenABI } from '@/contracts';

function TokenBalance({ address }: { address: string }) {
  const tokenAddress = getContractAddress('RewardToken');
  const contract = useContract(tokenAddress, RewardTokenABI);
  
  const { data: balance, loading } = useContractRead(
    contract,
    'balanceOf',
    [address],
    [address] // dependencies
  );

  if (loading) return <div>Loading...</div>;
  return <div>Balance: {balance?.toString()}</div>;
}
```

### 4. Write to Contract

```typescript
import { useContract, useContractWrite } from '@/hooks/useWeb3';
import { getContractAddress } from '@/contracts/addresses/sepolia';
import { ProductivityEscrowFactoryABI } from '@/contracts';

function CreateEscrow() {
  const factoryAddress = getContractAddress('ProductivityEscrowFactory');
  const contract = useContract(factoryAddress, ProductivityEscrowFactoryABI);
  const { write, loading, txHash } = useContractWrite(contract, 'createEscrow');

  const handleCreate = async () => {
    try {
      const receipt = await write(
        oracleAddress,
        arbitratorAddress,
        ethers.ZeroAddress, // use default USDC
        [contributor1, contributor2],
        [parseTokenAmount('6000', 6), parseTokenAmount('4000', 6)],
        [deadline1, deadline2],
        0, // default dispute window
        0  // default oracle timeout
      );
      console.log('Escrow created!', receipt);
    } catch (error) {
      console.error('Failed to create escrow:', error);
    }
  };

  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? 'Creating...' : 'Create Escrow'}
    </button>
  );
}
```

### 5. Check USDC Balance

```typescript
import { useUSDCBalance } from '@/hooks/useWeb3';

function USDCBalance() {
  const { balance, loading } = useUSDCBalance();
  
  return <div>USDC: {balance}</div>;
}
```

## 🔧 Utility Functions

### Format Token Amounts

```typescript
import { formatTokenAmount, parseTokenAmount } from '@/contracts/utils';

// Format from contract (6 decimals for USDC)
const readable = formatTokenAmount('1000000', 6); // "1.0"

// Parse for contract input
const amount = parseTokenAmount('100.5', 6); // 100500000n
```

### Shorten Addresses

```typescript
import { shortenAddress } from '@/contracts/utils';

shortenAddress('0x1234...5678'); // "0x1234...5678"
```

### Get Explorer URLs

```typescript
import { getExplorerUrl } from '@/contracts/addresses/sepolia';

// Address
getExplorerUrl('0x...', 'address'); 
// https://sepolia.etherscan.io/address/0x...

// Transaction
getExplorerUrl('0x...', 'tx');
// https://sepolia.etherscan.io/tx/0x...
```

## 📝 Contract Addresses (Sepolia)

```typescript
import { contracts } from '@/contracts/addresses/sepolia';

console.log(contracts.RewardToken.proxy);
// 0x27a90bE82CF59d286634a5A49F384d4B369A1E84

console.log(contracts.ProductivityEscrowFactory.proxy);
// 0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B

console.log(contracts.USDC);
// 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

## 🔐 Environment Variables

Create `.env` in the client root:

```bash
# Optional: Custom RPC endpoints
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_INFURA_API_KEY=your_infura_key
```

## 🎯 Common Workflows

### Approve USDC for Factory

```typescript
const usdc = await getContract('USDC');
const factoryAddress = getContractAddress('ProductivityEscrowFactory');
const amount = parseTokenAmount('10000', 6); // 10,000 USDC

const tx = await usdc.approve(factoryAddress, amount);
await tx.wait();
```

### Withdraw from Escrow

```typescript
const escrow = await getEscrowContract(escrowAddress);
const pending = await escrow.pendingWithdrawals(userAddress);

if (pending > 0n) {
  const tx = await escrow.withdraw();
  await tx.wait();
}
```

### Listen to Events

```typescript
const factory = await getContract('ProductivityEscrowFactory');

factory.on('EscrowCreated', (escrowAddress, owner, budget, milestones) => {
  console.log('New escrow created:', escrowAddress);
});
```

## 📚 TypeScript Support

All functions are fully typed with TypeScript. Import types from ethers:

```typescript
import type { Contract, ContractTransaction, ContractReceipt } from 'ethers';
```

## 🌐 Network Check

The wallet hook automatically checks if user is on Sepolia and prompts to switch:

```typescript
const { isCorrectNetwork, chainId } = useWallet();

if (!isCorrectNetwork) {
  return <div>Please switch to Sepolia Testnet</div>;
}
```
