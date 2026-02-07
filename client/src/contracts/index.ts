/**
 * Contract ABIs Export
 */

import RewardTokenABI from './abis/RewardToken.json';
import ProductivityEscrowABI from './abis/ProductivityEscrow.json';
import ProductivityEscrowFactoryABI from './abis/ProductivityEscrowFactory.json';
import ERC20ABI from './abis/ERC20.json';

export { RewardTokenABI, ProductivityEscrowABI, ProductivityEscrowFactoryABI, ERC20ABI };

export const ABIs = {
  RewardToken: RewardTokenABI,
  ProductivityEscrow: ProductivityEscrowABI,
  ProductivityEscrowFactory: ProductivityEscrowFactoryABI,
  ERC20: ERC20ABI,
  USDC: ERC20ABI, // USDC uses standard ERC20 interface
} as const;

export default ABIs;
