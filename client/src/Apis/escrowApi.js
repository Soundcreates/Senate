import { ethers } from 'ethers';
import { getProvider, formatTokenAmount } from '../contracts/utils';
import { getContractAddress } from '../contracts/addresses/sepolia';
import { ProductivityEscrowFactoryABI, ProductivityEscrowABI, ERC20ABI } from '../contracts/index';

/**
 * Check current USDC allowance for the Factory contract
 */
export async function checkUSDCAllowance(ownerAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const usdcAddress = getContractAddress('USDC');
  const factoryAddress = getContractAddress('ProductivityEscrowFactory');
  const usdc = new ethers.Contract(usdcAddress, ERC20ABI, provider);
  const allowance = await usdc.allowance(ownerAddress, factoryAddress);
  return allowance;
}

/**
 * Approve USDC spending for the Factory contract
 * @param {string} amount - Amount in USDC (human readable, e.g., "1000")
 * @returns {object} Transaction receipt
 */
export async function approveUSDC(amount) {
  throw new Error('Wallet-based approvals are disabled in this client');
}

/**
 * Create a new escrow via the Factory contract
 * @param {object} params
 * @param {string} params.oracle - Oracle address
 * @param {string} params.arbitrator - Arbitrator address
 * @param {string[]} params.contributors - Contributor wallet addresses
 * @param {string[]} params.milestoneBudgets - Budgets per milestone in USDC (human readable)
 * @param {number[]} params.milestoneDeadlines - Unix timestamps per milestone
 * @param {number} [params.disputeWindow=0] - Override dispute window in seconds (0 = use contract default)
 * @param {number} [params.oracleTimeout=0] - Override oracle timeout in seconds (0 = use contract default)
 * @returns {object} { escrowAddress, txHash, receipt }
 */
export async function createEscrow({
  oracle,
  arbitrator,
  contributors,
  milestoneBudgets,
  milestoneDeadlines,
  disputeWindow = 0,
  oracleTimeout = 0,
}) {
  throw new Error('Wallet-based escrow creation is disabled in this client');
}

/**
 * Read escrow data from a deployed escrow contract
 */
export async function getEscrowData(escrowAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const escrow = new ethers.Contract(escrowAddress, ProductivityEscrowABI, provider);

  const [
    projectOwner,
    oracle,
    arbitrator,
    totalBudget,
    disputeWindow,
    contributorAddresses,
    milestoneCount,
  ] = await Promise.all([
    escrow.projectOwner(),
    escrow.oracle(),
    escrow.arbitrator(),
    escrow.totalBudget(),
    escrow.disputeWindow(),
    escrow.getContributors(),
    escrow.getMilestoneCount(),
  ]);

  // Fetch all milestones
  const milestones = [];
  for (let i = 0; i < Number(milestoneCount); i++) {
    const ms = await escrow.getMilestone(i);
    milestones.push({
      budget: formatTokenAmount(ms.budget, 6),
      deadline: Number(ms.deadline),
      disputeDeadline: Number(ms.disputeDeadline),
      status: Number(ms.status), // 0=Pending, 1=ScoresSubmitted, 2=InDispute, 3=Finalized
      totalScore: Number(ms.totalScore),
    });
  }

  return {
    projectOwner,
    oracle,
    arbitrator,
    totalBudget: formatTokenAmount(totalBudget, 6),
    disputeWindow: Number(disputeWindow),
    contributors: contributorAddresses,
    milestones,
  };
}

/**
 * Get pending withdrawals for a contributor
 */
export async function getPendingWithdrawals(escrowAddress, contributorAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const escrow = new ethers.Contract(escrowAddress, ProductivityEscrowABI, provider);
  const pending = await escrow.pendingWithdrawals(contributorAddress);
  return formatTokenAmount(pending, 6);
}

/**
 * Withdraw pending payments from an escrow
 */
export async function withdrawFromEscrow(escrowAddress) {
  throw new Error('Wallet-based withdrawals are disabled in this client');
}

/**
 * Get contributor score for a specific milestone
 */
export async function getContributorScore(escrowAddress, milestoneId, contributorAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const escrow = new ethers.Contract(escrowAddress, ProductivityEscrowABI, provider);
  const score = await escrow.getContributorScore(milestoneId, contributorAddress);
  return Number(score);
}

/**
 * Raise a dispute for a milestone
 */
export async function raiseDispute(escrowAddress, milestoneId, reason) {
  throw new Error('Wallet-based disputes are disabled in this client');
}

/**
 * Finalize a milestone (after dispute window closes)
 */
export async function finalizeMilestone(escrowAddress, milestoneId) {
  throw new Error('Wallet-based finalization is disabled in this client');
}

/**
 * Get all escrows from the factory
 */
export async function getAllEscrows() {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const factoryAddress = getContractAddress('ProductivityEscrowFactory');
  const factory = new ethers.Contract(factoryAddress, ProductivityEscrowFactoryABI, provider);
  const escrowAddresses = await factory.getEscrows();
  return escrowAddresses;
}

/**
 * Check if an oracle is allowed
 */
export async function isOracleAllowed(oracleAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const factoryAddress = getContractAddress('ProductivityEscrowFactory');
  const factory = new ethers.Contract(factoryAddress, ProductivityEscrowFactoryABI, provider);
  return factory.allowedOracles(oracleAddress);
}

/**
 * Check if an arbitrator is allowed
 */
export async function isArbitratorAllowed(arbitratorAddress) {
  const provider = getProvider();
  if (!provider) throw new Error('No provider');

  const factoryAddress = getContractAddress('ProductivityEscrowFactory');
  const factory = new ethers.Contract(factoryAddress, ProductivityEscrowFactoryABI, provider);
  return factory.allowedArbitrators(arbitratorAddress);
}

/**
 * Resolve dispute (arbitrator only)
 */
export async function resolveDispute(escrowAddress, milestoneId, members, correctedScores) {
  throw new Error('Wallet-based dispute resolution is disabled in this client');
}

/**
 * Refund remaining balance (project owner only)
 */
export async function refundRemaining(escrowAddress) {
  throw new Error('Wallet-based refunds are disabled in this client');
}

/**
 * Milestone status enum mapping
 */
export const MilestoneStatusLabels = {
  0: 'Pending',
  1: 'Scores Submitted',
  2: 'In Dispute',
  3: 'Finalized',
};

export const MilestoneStatusColors = {
  0: { bg: 'rgba(169, 146, 125, 0.1)', text: '#5e503f' },
  1: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
  2: { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c' },
  3: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a' },
};
