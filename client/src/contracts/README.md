# Contract Integration

This folder contains the ABIs, addresses, and read-only helpers used to inspect deployed Sepolia contracts.

## Contents

- `abis/` - Contract ABIs
- `addresses/sepolia.ts` - Deployed contract addresses and RPC URLs
- `index.ts` - ABI exports
- `utils.ts` - Read-only contract utilities

## Usage

### Get a contract instance

```typescript
import { getContract, getEscrowContract } from '@/contracts/utils';

const rewardToken = await getContract('RewardToken');
const factory = await getContract('ProductivityEscrowFactory');
const escrow = await getEscrowContract('0x...');
```

### Read contract data

```typescript
import { getContractAddress } from '@/contracts/addresses/sepolia';
import { RewardTokenABI } from '@/contracts';
import { getContract } from '@/contracts/utils';

const tokenAddress = getContractAddress('RewardToken');
const contract = await getContract('RewardToken');
const balance = await contract.balanceOf('0x...');
```

### Format values

```typescript
import { formatTokenAmount, parseTokenAmount, shortenAddress } from '@/contracts/utils';

formatTokenAmount('1000000', 6); // 1.0
parseTokenAmount('100.5', 6);     // 100500000n
shortenAddress('0x1234567890abcdef1234567890abcdef12345678');
```

## Notes

- Client-side wallet connection has been removed.
- Read-only RPC access is used for contract inspection.
- Transactional flows are handled outside this frontend build.
