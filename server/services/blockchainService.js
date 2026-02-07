/**
 * Blockchain Service — Server-side provider, wallet, and contract helpers.
 * Uses ethers v6, configured for Sepolia testnet.
 */
const { ethers } = require("ethers");

// --- Contract addresses (Sepolia) ---
const ADDRESSES = {
	RewardToken: "0x27a90bE82CF59d286634a5A49F384d4B369A1E84",
	ProductivityEscrowFactory: "0x7fC3446ae26286EF5668Df02f7C1c96a6a1c458B",
	USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
};

const SEPOLIA_CHAIN_ID = 11155111;

// --- Minimal ABIs (only the functions the oracle/backend needs) ---

const ESCROW_ABI = [
	"function projectOwner() view returns (address)",
	"function oracle() view returns (address)",
	"function arbitrator() view returns (address)",
	"function totalBudget() view returns (uint256)",
	"function disputeWindow() view returns (uint256)",
	"function getMilestoneCount() view returns (uint256)",
	"function getMilestone(uint256) view returns (tuple(uint256 budget, uint256 deadline, uint256 disputeDeadline, uint8 status, uint256 totalScore))",
	"function getContributors() view returns (address[])",
	"function getContributorScore(uint256, address) view returns (uint256)",
	"function pendingWithdrawals(address) view returns (uint256)",
	"function submitScores(uint256 milestoneId, address[] members, uint256[] scores, bytes oracleSignature)",
	"function finalizeMilestone(uint256 milestoneId)",
	"event ScoresSubmitted(uint256 indexed milestoneId, uint256 totalScore)",
	"event MilestoneFinalized(uint256 indexed milestoneId, uint256 budget)",
];

const FACTORY_ABI = [
	"function getEscrows() view returns (address[])",
	"function getEscrowCount() view returns (uint256)",
	"function isEscrow(address) view returns (bool)",
	"function allowedOracles(address) view returns (bool)",
	"function allowedArbitrators(address) view returns (bool)",
];

// --- Provider ---

let _provider = null;

function getProvider() {
	if (_provider) return _provider;

	let rpcUrl = (process.env.SEPOLIA_RPC_URL || "").trim();
	if (!rpcUrl) {
		const alchemyKey = (process.env.ALCHEMY_API_KEY || "").trim();
		if (alchemyKey) {
			rpcUrl = alchemyKey.startsWith("http")
				? alchemyKey
				: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
		} else {
			rpcUrl = "https://rpc.sepolia.org";
		}
	}

	_provider = new ethers.JsonRpcProvider(rpcUrl, SEPOLIA_CHAIN_ID);
	return _provider;
}

// --- Oracle Wallet (server-side private key) ---

function getOracleWallet() {
	let pk = (process.env.ORACLE_PRIVATE_KEY || "").trim();
	if (!pk) throw new Error("ORACLE_PRIVATE_KEY env var not set");
	if (!pk.startsWith("0x")) pk = "0x" + pk;
	return new ethers.Wallet(pk, getProvider());
}

function getOracleAddress() {
	let pk = (process.env.ORACLE_PRIVATE_KEY || "").trim();
	if (!pk) return null;
	if (!pk.startsWith("0x")) pk = "0x" + pk;
	return new ethers.Wallet(pk).address;
}

// --- Contract Instances ---

function getEscrowContract(escrowAddress, signerOrProvider) {
	return new ethers.Contract(escrowAddress, ESCROW_ABI, signerOrProvider || getProvider());
}

function getFactoryContract(signerOrProvider) {
	return new ethers.Contract(
		ADDRESSES.ProductivityEscrowFactory,
		FACTORY_ABI,
		signerOrProvider || getProvider()
	);
}

// --- Read helpers ---

async function getEscrowData(escrowAddress) {
	const escrow = getEscrowContract(escrowAddress);
	const [projectOwner, oracle, arbitrator, totalBudget, disputeWindow, contributors, milestoneCount] =
		await Promise.all([
			escrow.projectOwner(),
			escrow.oracle(),
			escrow.arbitrator(),
			escrow.totalBudget(),
			escrow.disputeWindow(),
			escrow.getContributors(),
			escrow.getMilestoneCount(),
		]);

	const milestones = [];
	for (let i = 0; i < Number(milestoneCount); i++) {
		const ms = await escrow.getMilestone(i);
		milestones.push({
			budget: ethers.formatUnits(ms.budget, 6),
			deadline: Number(ms.deadline),
			disputeDeadline: Number(ms.disputeDeadline),
			status: Number(ms.status),
			totalScore: Number(ms.totalScore),
		});
	}

	return {
		projectOwner,
		oracle,
		arbitrator,
		totalBudget: ethers.formatUnits(totalBudget, 6),
		disputeWindow: Number(disputeWindow),
		contributors,
		milestones,
	};
}

async function getAllEscrowAddresses() {
	const factory = getFactoryContract();
	return factory.getEscrows();
}

module.exports = {
	ADDRESSES,
	SEPOLIA_CHAIN_ID,
	getProvider,
	getOracleWallet,
	getOracleAddress,
	getEscrowContract,
	getFactoryContract,
	getEscrowData,
	getAllEscrowAddresses,
};
