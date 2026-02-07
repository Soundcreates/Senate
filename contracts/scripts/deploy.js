const hre = require("hardhat");
const { upgrades } = require("hardhat");

// Sepolia USDC address (Circle's official deployment)
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("=".repeat(60));
  console.log("Deploying UPGRADEABLE ProductivityEscrow Protocol");
  console.log("=".repeat(60));
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("=".repeat(60));

  // 1. Deploy RewardToken (UUPS Proxy)
  console.log("\n[1/2] Deploying RewardToken (UUPS Proxy)...");
  const RewardToken = await hre.ethers.getContractFactory("RewardToken");
  const rewardToken = await upgrades.deployProxy(
    RewardToken,
    [
      "Productivity Reward Token",
      "PROD",
      deployer.address,
      500 // 5% reward rate (500 basis points)
    ],
    { kind: 'uups' }
  );
  await rewardToken.waitForDeployment();
  const rewardTokenAddress = await rewardToken.getAddress();
  console.log("✓ RewardToken Proxy deployed to:", rewardTokenAddress);

  // 2. Deploy ProductivityEscrowFactory (UUPS Proxy)
  console.log("\n[2/2] Deploying ProductivityEscrowFactory (UUPS Proxy)...");
  const Factory = await hre.ethers.getContractFactory("ProductivityEscrowFactory");
  const factory = await upgrades.deployProxy(
    Factory,
    [
      deployer.address,    // protocol owner
      SEPOLIA_USDC,        // default payment token
      rewardTokenAddress   // reward token
    ],
    { kind: 'uups' }
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✓ ProductivityEscrowFactory Proxy deployed to:", factoryAddress);

  // 3. Transfer RewardToken ownership to Factory so it can add minters
  console.log("\n[3/3] Transferring RewardToken ownership to Factory...");
  const tx = await rewardToken.transferOwnership(factoryAddress);
  await tx.wait();
  console.log("✓ RewardToken ownership transferred to Factory");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE (UPGRADEABLE)");
  console.log("=".repeat(60));
  console.log("\n🔄 Proxy Contract Addresses:");
  console.log("├─ RewardToken (Proxy):            ", rewardTokenAddress);
  console.log("├─ ProductivityEscrowFactory (Proxy):", factoryAddress);
  console.log("└─ USDC (Sepolia):                  ", SEPOLIA_USDC);

  // Get implementation addresses
  const rewardTokenImpl = await upgrades.erc1967.getImplementationAddress(rewardTokenAddress);
  const factoryImpl = await upgrades.erc1967.getImplementationAddress(factoryAddress);

  console.log("\n📦 Implementation Contract Addresses:");
  console.log("├─ RewardToken (Implementation):   ", rewardTokenImpl);
  console.log("└─ Factory (Implementation):       ", factoryImpl);

  console.log("\nNext Steps:");
  console.log("1. Allow oracle addresses:    factory.allowOracle(<oracle_address>)");
  console.log("2. Allow arbitrator addresses: factory.allowArbitrator(<arbitrator_address>)");
  console.log("3. Create escrow:             factory.createEscrow(...)");

  console.log("\n🔧 To upgrade contracts in the future:");
  console.log("   const NewContract = await ethers.getContractFactory('NewVersion');");
  console.log("   await upgrades.upgradeProxy(PROXY_ADDRESS, NewContract);");

  // Save deployment addresses
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    upgradeable: true,
    contracts: {
      RewardToken: {
        proxy: rewardTokenAddress,
        implementation: rewardTokenImpl,
      },
      ProductivityEscrowFactory: {
        proxy: factoryAddress,
        implementation: factoryImpl,
      },
      USDC: SEPOLIA_USDC,
    },
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/${network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✓ Deployment info saved to:", filename);

  console.log("\n" + "=".repeat(60));

  if (network.name === "sepolia") {
    console.log("\n📝 To verify contracts on Etherscan:");
    console.log(`\nRewardToken Implementation:`);
    console.log(`npx hardhat verify --network sepolia ${rewardTokenImpl}`);
    console.log(`\nProductivityEscrowFactory Implementation:`);
    console.log(`npx hardhat verify --network sepolia ${factoryImpl}`);
    console.log(`\nNote: Proxy contracts are automatically verified by the upgrades plugin.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
