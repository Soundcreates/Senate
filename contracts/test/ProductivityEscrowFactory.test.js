const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProductivityEscrowFactory", function () {
  let factory, usdc, rewardToken;
  let protocolOwner, oracle, arbitrator, projectOwner, contributor1, contributor2;

  const USDC_DECIMALS = 6;
  const toUSDC = (n) => ethers.parseUnits(n.toString(), USDC_DECIMALS);
  const DISPUTE_WINDOW = 3 * 86400;
  const ORACLE_TIMEOUT = 7 * 86400;

  beforeEach(async function () {
    [protocolOwner, oracle, arbitrator, projectOwner, contributor1, contributor2] =
      await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy RewardToken
    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy("PROD", "PROD", protocolOwner.address, 500);

    // Deploy Factory
    const Factory = await ethers.getContractFactory("ProductivityEscrowFactory");
    factory = await Factory.deploy(protocolOwner.address, await usdc.getAddress(), await rewardToken.getAddress());

    // Transfer reward token ownership to factory so it can addMinter
    await rewardToken.transferOwnership(await factory.getAddress());

    // Allow oracle and arbitrator
    await factory.allowOracle(oracle.address);
    await factory.allowArbitrator(arbitrator.address);
  });

  describe("Deployment", function () {
    it("should set correct defaults", async function () {
      expect(await factory.defaultPaymentToken()).to.equal(await usdc.getAddress());
      expect(await factory.owner()).to.equal(protocolOwner.address);
      expect(await factory.defaultDisputeWindow()).to.equal(DISPUTE_WINDOW);
      expect(await factory.defaultOracleTimeout()).to.equal(ORACLE_TIMEOUT);
    });
  });

  describe("Oracle / Arbitrator management", function () {
    it("should allow and revoke oracles", async function () {
      expect(await factory.allowedOracles(oracle.address)).to.be.true;
      await factory.revokeOracle(oracle.address);
      expect(await factory.allowedOracles(oracle.address)).to.be.false;
    });

    it("should allow and revoke arbitrators", async function () {
      expect(await factory.allowedArbitrators(arbitrator.address)).to.be.true;
      await factory.revokeArbitrator(arbitrator.address);
      expect(await factory.allowedArbitrators(arbitrator.address)).to.be.false;
    });
  });

  describe("createEscrow", function () {
    it("should deploy a new escrow and register it", async function () {
      const now = await time.latest();
      const budgets = [toUSDC(6000), toUSDC(4000)];
      const deadlines = [now + 7 * 86400, now + 14 * 86400];
      const totalBudget = toUSDC(10000);

      // Mint and approve
      await usdc.mint(projectOwner.address, totalBudget);
      await usdc.connect(projectOwner).approve(await factory.getAddress(), totalBudget);

      const tx = await factory.connect(projectOwner).createEscrow(
        oracle.address,
        arbitrator.address,
        ethers.ZeroAddress, // use default token
        [contributor1.address, contributor2.address],
        budgets,
        deadlines,
        0, // default dispute window
        0  // default oracle timeout
      );

      const receipt = await tx.wait();

      expect(await factory.getEscrowCount()).to.equal(1);
      const escrows = await factory.getEscrows();
      expect(escrows.length).to.equal(1);
      expect(await factory.isEscrow(escrows[0])).to.be.true;

      // Check escrow is funded
      expect(await usdc.balanceOf(escrows[0])).to.equal(totalBudget);
    });

    it("should revert if oracle not allowed", async function () {
      const now = await time.latest();
      await usdc.mint(projectOwner.address, toUSDC(1000));
      await usdc.connect(projectOwner).approve(await factory.getAddress(), toUSDC(1000));

      await expect(
        factory.connect(projectOwner).createEscrow(
          contributor1.address, // not allowed oracle
          arbitrator.address,
          ethers.ZeroAddress,
          [contributor1.address],
          [toUSDC(1000)],
          [now + 86400],
          0, 0
        )
      ).to.be.revertedWith("Factory: oracle not allowed");
    });

    it("should revert if arbitrator not allowed", async function () {
      const now = await time.latest();
      await usdc.mint(projectOwner.address, toUSDC(1000));
      await usdc.connect(projectOwner).approve(await factory.getAddress(), toUSDC(1000));

      await expect(
        factory.connect(projectOwner).createEscrow(
          oracle.address,
          contributor1.address, // not allowed arbitrator
          ethers.ZeroAddress,
          [contributor1.address],
          [toUSDC(1000)],
          [now + 86400],
          0, 0
        )
      ).to.be.revertedWith("Factory: arbitrator not allowed");
    });

    it("should use custom dispute window and oracle timeout", async function () {
      const now = await time.latest();
      const totalBudget = toUSDC(5000);
      await usdc.mint(projectOwner.address, totalBudget);
      await usdc.connect(projectOwner).approve(await factory.getAddress(), totalBudget);

      await factory.connect(projectOwner).createEscrow(
        oracle.address,
        arbitrator.address,
        ethers.ZeroAddress,
        [contributor1.address],
        [totalBudget],
        [now + 86400],
        86400,   // 1 day dispute window
        2 * 86400 // 2 day oracle timeout
      );

      const escrows = await factory.getEscrows();
      const ProductivityEscrow = await ethers.getContractFactory("ProductivityEscrow");
      const escrow = ProductivityEscrow.attach(escrows[0]);

      expect(await escrow.disputeWindow()).to.equal(86400);
      expect(await escrow.oracleTimeout()).to.equal(2 * 86400);
    });
  });

  describe("Full lifecycle via factory", function () {
    it("should create escrow, submit scores, finalize, and withdraw", async function () {
      const now = await time.latest();
      const budgets = [toUSDC(10000)];
      const deadlines = [now + 86400]; // 1 day
      const totalBudget = toUSDC(10000);

      await usdc.mint(projectOwner.address, totalBudget);
      await usdc.connect(projectOwner).approve(await factory.getAddress(), totalBudget);

      await factory.connect(projectOwner).createEscrow(
        oracle.address,
        arbitrator.address,
        ethers.ZeroAddress,
        [contributor1.address, contributor2.address],
        budgets,
        deadlines,
        DISPUTE_WINDOW,
        ORACLE_TIMEOUT
      );

      const escrows = await factory.getEscrows();
      const ProductivityEscrow = await ethers.getContractFactory("ProductivityEscrow");
      const escrow = ProductivityEscrow.attach(escrows[0]);

      // Advance past deadline
      await time.increaseTo(deadlines[0]);

      // Oracle submits scores
      await escrow.connect(oracle).submitScores(
        0,
        [contributor1.address, contributor2.address],
        [80, 20],
        "0x"
      );

      // Advance past dispute window
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);

      // Finalize
      await escrow.finalizeMilestone(0);

      // Check allocations: 80% of 10000 = 8000, 20% = 2000
      expect(await escrow.pendingWithdrawals(contributor1.address)).to.equal(toUSDC(8000));
      expect(await escrow.pendingWithdrawals(contributor2.address)).to.equal(toUSDC(2000));

      // Withdraw
      await escrow.connect(contributor1).withdraw();
      expect(await usdc.balanceOf(contributor1.address)).to.equal(toUSDC(8000));

      await escrow.connect(contributor2).withdraw();
      expect(await usdc.balanceOf(contributor2.address)).to.equal(toUSDC(2000));

      // Check reward tokens minted
      expect(await rewardToken.balanceOf(contributor1.address)).to.be.gt(0);
      expect(await rewardToken.balanceOf(contributor2.address)).to.be.gt(0);
    });
  });

  describe("Admin config updates", function () {
    it("should update default payment token", async function () {
      const MockUSDC = await ethers.getContractFactory("MockUSDC");
      const newToken = await MockUSDC.deploy();
      await factory.setDefaultPaymentToken(await newToken.getAddress());
      expect(await factory.defaultPaymentToken()).to.equal(await newToken.getAddress());
    });

    it("should update default dispute window and oracle timeout", async function () {
      await factory.setDefaultDisputeWindow(86400);
      expect(await factory.defaultDisputeWindow()).to.equal(86400);

      await factory.setDefaultOracleTimeout(14 * 86400);
      expect(await factory.defaultOracleTimeout()).to.equal(14 * 86400);
    });

    it("should revert admin calls from non-owner", async function () {
      await expect(factory.connect(projectOwner).allowOracle(projectOwner.address))
        .to.be.reverted;
    });
  });
});
