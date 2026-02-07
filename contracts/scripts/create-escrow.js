const hre = require("hardhat");

// Update these with your deployment addresses
const FACTORY_ADDRESS = "YOUR_FACTORY_ADDRESS_HERE";
const ORACLE_ADDRESS = "YOUR_ORACLE_ADDRESS_HERE";
const ARBITRATOR_ADDRESS = "YOUR_ARBITRATOR_ADDRESS_HERE";

// Project configuration
const PROJECT_CONFIG = {
  contributors: [
    "0x...", // contributor 1
    "0x...", // contributor 2
  ],
  milestoneBudgets: [
    hre.ethers.parseUnits("6000", 6),  // 6000 USDC (6 decimals)
    hre.ethers.parseUnits("4000", 6),  // 4000 USDC
  ],
  milestoneDeadlines: [
    Math.floor(Date.now() / 1000) + 7 * 86400,   // 7 days from now
    Math.floor(Date.now() / 1000) + 14 * 86400,  // 14 days from now
  ],
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Creating ProductivityEscrow...");
  console.log("Deployer:", deployer.address);

  // Get factory instance
  const Factory = await hre.ethers.getContractFactory("ProductivityEscrowFactory");
  const factory = Factory.attach(FACTORY_ADDRESS);

  // Calculate total budget
  const totalBudget = PROJECT_CONFIG.milestoneBudgets.reduce((a, b) => a + b, 0n);
  console.log("Total budget:", hre.ethers.formatUnits(totalBudget, 6), "USDC");

  // Get USDC address from factory
  const usdcAddress = await factory.defaultPaymentToken();
  console.log("USDC address:", usdcAddress);

  // Approve factory to spend USDC
  console.log("\nApproving USDC spend...");
  const USDC = await hre.ethers.getContractAt("IERC20", usdcAddress);
  const approveTx = await USDC.approve(FACTORY_ADDRESS, totalBudget);
  await approveTx.wait();
  console.log("✓ Approved");

  // Create escrow
  console.log("\nCreating escrow...");
  const createTx = await factory.createEscrow(
    ORACLE_ADDRESS,
    ARBITRATOR_ADDRESS,
    hre.ethers.ZeroAddress, // use default USDC
    PROJECT_CONFIG.contributors,
    PROJECT_CONFIG.milestoneBudgets,
    PROJECT_CONFIG.milestoneDeadlines,
    0, // use default dispute window
    0  // use default oracle timeout
  );

  const receipt = await createTx.wait();
  
  // Find EscrowCreated event
  const event = receipt.logs
    .map(log => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(e => e && e.name === "EscrowCreated");

  if (event) {
    console.log("✓ Escrow created at:", event.args.escrow);
    console.log("  Total budget:", hre.ethers.formatUnits(event.args.totalBudget, 6), "USDC");
    console.log("  Milestones:", event.args.milestoneCount.toString());
  }

  console.log("\nDone!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
