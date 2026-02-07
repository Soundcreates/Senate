const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ProductivityEscrow", function () {
  let escrow, usdc, rewardToken;
  let owner, oracle, arbitrator, contributor1, contributor2, contributor3, outsider;

  const USDC_DECIMALS = 6;
  const toUSDC = (n) => ethers.parseUnits(n.toString(), USDC_DECIMALS);

  const DISPUTE_WINDOW = 3 * 24 * 60 * 60; // 3 days
  const ORACLE_TIMEOUT = 7 * 24 * 60 * 60; // 7 days

  async function deployAndInitialize(opts = {}) {
    [owner, oracle, arbitrator, contributor1, contributor2, contributor3, outsider] =
      await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy RewardToken
    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy("PROD", "PROD", owner.address, 500);

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("ProductivityEscrow");
    escrow = await Escrow.deploy();

    // Authorize escrow as minter
    await rewardToken.addMinter(await escrow.getAddress());

    const contributors = opts.contributors || [contributor1.address, contributor2.address];
    const budgets = opts.budgets || [toUSDC(6000), toUSDC(4000)];
    const now = await time.latest();
    const deadlines = opts.deadlines || [now + 7 * 86400, now + 14 * 86400];
    const totalBudget = budgets.reduce((a, b) => a + b, 0n);

    // Mint USDC to owner and approve
    await usdc.mint(owner.address, totalBudget);
    await usdc.connect(owner).approve(await escrow.getAddress(), totalBudget);

    // Initialize
    await escrow.initialize(
      owner.address,
      oracle.address,
      arbitrator.address,
      await usdc.getAddress(),
      await rewardToken.getAddress(),
      contributors,
      budgets,
      deadlines,
      opts.disputeWindow || DISPUTE_WINDOW,
      opts.oracleTimeout || ORACLE_TIMEOUT
    );

    return { escrow, usdc, rewardToken, totalBudget, budgets, deadlines, contributors };
  }

  describe("Initialization", function () {
    beforeEach(async function () {
      await deployAndInitialize();
    });

    it("should set project owner, oracle, arbitrator", async function () {
      expect(await escrow.projectOwner()).to.equal(owner.address);
      expect(await escrow.oracle()).to.equal(oracle.address);
      expect(await escrow.arbitrator()).to.equal(arbitrator.address);
    });

    it("should register contributors", async function () {
      const contribs = await escrow.getContributors();
      expect(contribs.length).to.equal(2);
      expect(await escrow.isContributor(contributor1.address)).to.be.true;
      expect(await escrow.isContributor(contributor2.address)).to.be.true;
      expect(await escrow.isContributor(outsider.address)).to.be.false;
    });

    it("should create milestones", async function () {
      expect(await escrow.getMilestoneCount()).to.equal(2);
      const ms0 = await escrow.getMilestone(0);
      expect(ms0.budget).to.equal(toUSDC(6000));
      expect(ms0.status).to.equal(0); // Pending
    });

    it("should hold the total budget", async function () {
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(toUSDC(10000));
    });

    it("should revert double initialization", async function () {
      const now = await time.latest();
      await expect(
        escrow.initialize(
          owner.address, oracle.address, arbitrator.address,
          await usdc.getAddress(), await rewardToken.getAddress(),
          [contributor1.address], [toUSDC(1000)], [now + 86400],
          DISPUTE_WINDOW, ORACLE_TIMEOUT
        )
      ).to.be.revertedWith("Escrow: already initialized");
    });

    it("should revert with zero contributors", async function () {
      const Escrow = await ethers.getContractFactory("ProductivityEscrow");
      const e = await Escrow.deploy();
      const now = await time.latest();
      await expect(
        e.initialize(
          owner.address, oracle.address, arbitrator.address,
          await usdc.getAddress(), ethers.ZeroAddress,
          [], [toUSDC(1000)], [now + 86400],
          DISPUTE_WINDOW, ORACLE_TIMEOUT
        )
      ).to.be.revertedWith("Escrow: no contributors");
    });
  });

  describe("submitScores", function () {
    beforeEach(async function () {
      await deployAndInitialize();
    });

    it("should allow oracle to submit scores after deadline", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);

      await expect(
        escrow.connect(oracle).submitScores(
          0,
          [contributor1.address, contributor2.address],
          [70, 30],
          "0x" // oracle calling directly, no sig needed
        )
      ).to.emit(escrow, "ScoresSubmitted").withArgs(0, 100);

      const updatedMs = await escrow.getMilestone(0);
      expect(updatedMs.status).to.equal(1); // ScoresSubmitted
      expect(updatedMs.totalScore).to.equal(100);
      expect(await escrow.getContributorScore(0, contributor1.address)).to.equal(70);
      expect(await escrow.getContributorScore(0, contributor2.address)).to.equal(30);
    });

    it("should revert if deadline not reached", async function () {
      await expect(
        escrow.connect(oracle).submitScores(0, [contributor1.address], [100], "0x")
      ).to.be.revertedWith("Escrow: milestone deadline not reached");
    });

    it("should revert if arrays mismatch", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await expect(
        escrow.connect(oracle).submitScores(0, [contributor1.address, contributor2.address], [100], "0x")
      ).to.be.revertedWith("Escrow: arrays length mismatch");
    });

    it("should revert if non-contributor in members", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await expect(
        escrow.connect(oracle).submitScores(0, [outsider.address], [100], "0x")
      ).to.be.revertedWith("Escrow: not a contributor");
    });

    it("should revert if milestone already scored", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [70, 30], "0x"
      );
      await expect(
        escrow.connect(oracle).submitScores(0, [contributor1.address], [100], "0x")
      ).to.be.revertedWith("Escrow: milestone not pending");
    });

    it("should allow anyone with valid oracle signature", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);

      const members = [contributor1.address, contributor2.address];
      const scores = [60, 40];

      // Build the same hash as ScoreVerifier
      const SCORE_TYPEHASH = ethers.keccak256(
        ethers.toUtf8Bytes("SubmitScores(address escrow,uint256 milestoneId,address[] members,uint256[] scores)")
      );
      const escrowAddr = await escrow.getAddress();

      const membersPacked = ethers.keccak256(ethers.solidityPacked(["address[]"], [members]));
      const scoresPacked = ethers.keccak256(ethers.solidityPacked(["uint256[]"], [scores]));

      const innerHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "address", "uint256", "bytes32", "bytes32"],
          [SCORE_TYPEHASH, escrowAddr, 0, membersPacked, scoresPacked]
        )
      );

      const signature = await oracle.signMessage(ethers.getBytes(innerHash));

      // Submit from outsider with oracle signature
      await expect(
        escrow.connect(outsider).submitScores(0, members, scores, signature)
      ).to.emit(escrow, "ScoresSubmitted");
    });

    it("should revert with invalid signature from wrong signer", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);

      const members = [contributor1.address, contributor2.address];
      const scores = [60, 40];

      const SCORE_TYPEHASH = ethers.keccak256(
        ethers.toUtf8Bytes("SubmitScores(address escrow,uint256 milestoneId,address[] members,uint256[] scores)")
      );
      const escrowAddr = await escrow.getAddress();
      const membersPacked = ethers.keccak256(ethers.solidityPacked(["address[]"], [members]));
      const scoresPacked = ethers.keccak256(ethers.solidityPacked(["uint256[]"], [scores]));

      const innerHash = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "address", "uint256", "bytes32", "bytes32"],
          [SCORE_TYPEHASH, escrowAddr, 0, membersPacked, scoresPacked]
        )
      );

      // Sign with outsider (not oracle)
      const badSig = await outsider.signMessage(ethers.getBytes(innerHash));

      await expect(
        escrow.connect(outsider).submitScores(0, members, scores, badSig)
      ).to.be.revertedWith("Escrow: invalid oracle signature");
    });
  });

  describe("raiseDispute", function () {
    beforeEach(async function () {
      await deployAndInitialize();
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [60, 40], "0x"
      );
    });

    it("should allow contributor to raise dispute", async function () {
      await expect(escrow.connect(contributor1).raiseDispute(0, "Scores are unfair"))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(0, contributor1.address, "Scores are unfair");

      const ms = await escrow.getMilestone(0);
      expect(ms.status).to.equal(2); // InDispute
    });

    it("should allow project owner to raise dispute", async function () {
      await expect(escrow.connect(owner).raiseDispute(0, "Need review"))
        .to.emit(escrow, "DisputeRaised");
    });

    it("should revert if outsider raises dispute", async function () {
      await expect(escrow.connect(outsider).raiseDispute(0, "reason"))
        .to.be.revertedWith("Escrow: not contributor or owner");
    });

    it("should revert if dispute window has passed", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await expect(escrow.connect(contributor1).raiseDispute(0, "Too late"))
        .to.be.revertedWith("Escrow: dispute window closed");
    });

    it("should revert if milestone not in ScoresSubmitted state", async function () {
      await escrow.connect(contributor1).raiseDispute(0, "first dispute");
      await expect(escrow.connect(contributor2).raiseDispute(0, "second"))
        .to.be.revertedWith("Escrow: scores not submitted");
    });
  });

  describe("resolveDispute", function () {
    beforeEach(async function () {
      await deployAndInitialize();
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [60, 40], "0x"
      );
      await escrow.connect(contributor1).raiseDispute(0, "unfair");
    });

    it("should allow arbitrator to resolve and auto-finalize", async function () {
      await expect(
        escrow.connect(arbitrator).resolveDispute(
          0, [contributor1.address, contributor2.address], [50, 50]
        )
      ).to.emit(escrow, "DisputeResolved").withArgs(0)
       .and.to.emit(escrow, "MilestoneFinalized").withArgs(0, toUSDC(6000));

      const ms = await escrow.getMilestone(0);
      expect(ms.status).to.equal(3); // Finalized

      // contributor1: 6000 * 50 / 100 = 3000 USDC
      expect(await escrow.pendingWithdrawals(contributor1.address)).to.equal(toUSDC(3000));
      expect(await escrow.pendingWithdrawals(contributor2.address)).to.equal(toUSDC(3000));
    });

    it("should revert if not arbitrator", async function () {
      await expect(
        escrow.connect(owner).resolveDispute(0, [contributor1.address], [100])
      ).to.be.revertedWith("Escrow: not arbitrator");
    });

    it("should revert if not in dispute", async function () {
      // Resolve first
      await escrow.connect(arbitrator).resolveDispute(
        0, [contributor1.address, contributor2.address], [50, 50]
      );
      // Try again
      await expect(
        escrow.connect(arbitrator).resolveDispute(0, [contributor1.address], [100])
      ).to.be.revertedWith("Escrow: not in dispute");
    });
  });

  describe("finalizeMilestone", function () {
    beforeEach(async function () {
      await deployAndInitialize();
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [70, 30], "0x"
      );
    });

    it("should finalize after dispute window passes (no dispute)", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);

      await expect(escrow.finalizeMilestone(0))
        .to.emit(escrow, "MilestoneFinalized")
        .withArgs(0, toUSDC(6000));

      // contributor1: 6000 * 70/100 = 4200
      expect(await escrow.pendingWithdrawals(contributor1.address)).to.equal(toUSDC(4200));
      // contributor2: 6000 * 30/100 = 1800
      expect(await escrow.pendingWithdrawals(contributor2.address)).to.equal(toUSDC(1800));
    });

    it("should revert during active dispute window", async function () {
      await expect(escrow.finalizeMilestone(0))
        .to.be.revertedWith("Escrow: dispute window active");
    });

    it("should revert for already finalized milestone", async function () {
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await escrow.finalizeMilestone(0);
      await expect(escrow.finalizeMilestone(0))
        .to.be.revertedWith("Escrow: cannot finalize");
    });

    it("should accumulate withdrawals across milestones", async function () {
      // Finalize milestone 0
      let ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await escrow.finalizeMilestone(0);

      // Submit and finalize milestone 1
      ms = await escrow.getMilestone(1);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        1, [contributor1.address, contributor2.address], [50, 50], "0x"
      );
      ms = await escrow.getMilestone(1);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await escrow.finalizeMilestone(1);

      // contributor1: 4200 (from ms0) + 2000 (from ms1) = 6200
      expect(await escrow.pendingWithdrawals(contributor1.address)).to.equal(toUSDC(6200));
      // contributor2: 1800 + 2000 = 3800
      expect(await escrow.pendingWithdrawals(contributor2.address)).to.equal(toUSDC(3800));
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await deployAndInitialize();
      const ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [70, 30], "0x"
      );
      const updatedMs = await escrow.getMilestone(0);
      await time.increaseTo(updatedMs.disputeDeadline + 1n);
      await escrow.finalizeMilestone(0);
    });

    it("should allow contributor to withdraw their share", async function () {
      const balBefore = await usdc.balanceOf(contributor1.address);
      await expect(escrow.connect(contributor1).withdraw())
        .to.emit(escrow, "PaymentReleased")
        .withArgs(contributor1.address, toUSDC(4200));

      const balAfter = await usdc.balanceOf(contributor1.address);
      expect(balAfter - balBefore).to.equal(toUSDC(4200));
      expect(await escrow.pendingWithdrawals(contributor1.address)).to.equal(0);
    });

    it("should mint reward tokens on withdrawal", async function () {
      await expect(escrow.connect(contributor1).withdraw())
        .to.emit(escrow, "RewardsMinted");

      // 5% reward: 4200 * 500 / 10000 = 210
      const rewardBal = await rewardToken.balanceOf(contributor1.address);
      expect(rewardBal).to.equal(toUSDC(210)); // same decimals as USDC base calculation
    });

    it("should revert if nothing to withdraw", async function () {
      await expect(escrow.connect(outsider).withdraw())
        .to.be.revertedWith("Escrow: nothing to withdraw");
    });

    it("should revert on double withdrawal", async function () {
      await escrow.connect(contributor1).withdraw();
      await expect(escrow.connect(contributor1).withdraw())
        .to.be.revertedWith("Escrow: nothing to withdraw");
    });
  });

  describe("refundRemaining", function () {
    it("should refund after all milestones finalized", async function () {
      await deployAndInitialize();

      // Finalize milestone 0
      let ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        0, [contributor1.address, contributor2.address], [70, 30], "0x"
      );
      ms = await escrow.getMilestone(0);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await escrow.finalizeMilestone(0);

      // Finalize milestone 1
      ms = await escrow.getMilestone(1);
      await time.increaseTo(ms.deadline);
      await escrow.connect(oracle).submitScores(
        1, [contributor1.address, contributor2.address], [50, 50], "0x"
      );
      ms = await escrow.getMilestone(1);
      await time.increaseTo(ms.disputeDeadline + 1n);
      await escrow.finalizeMilestone(1);

      // Withdraw all first
      await escrow.connect(contributor1).withdraw();
      await escrow.connect(contributor2).withdraw();

      // Any dust should be refundable by owner
      const remaining = await usdc.balanceOf(await escrow.getAddress());
      if (remaining > 0n) {
        await expect(escrow.connect(owner).refundRemaining())
          .to.emit(escrow, "Refunded");
      }
    });

    it("should refund after oracle timeout", async function () {
      await deployAndInitialize();

      // Fast forward past last deadline + oracle timeout
      const ms1 = await escrow.getMilestone(1);
      await time.increaseTo(ms1.deadline + BigInt(ORACLE_TIMEOUT) + 1n);

      const balBefore = await usdc.balanceOf(owner.address);
      await expect(escrow.connect(owner).refundRemaining())
        .to.emit(escrow, "Refunded")
        .withArgs(owner.address, toUSDC(10000));
    });

    it("should revert if not project owner", async function () {
      await deployAndInitialize();
      const ms1 = await escrow.getMilestone(1);
      await time.increaseTo(ms1.deadline + BigInt(ORACLE_TIMEOUT) + 1n);

      await expect(escrow.connect(outsider).refundRemaining())
        .to.be.revertedWith("Escrow: not project owner");
    });

    it("should revert if conditions not met", async function () {
      await deployAndInitialize();
      await expect(escrow.connect(owner).refundRemaining())
        .to.be.revertedWith("Escrow: cannot refund yet");
    });
  });

  describe("Admin functions", function () {
    beforeEach(async function () {
      await deployAndInitialize();
    });

    it("should update oracle", async function () {
      await expect(escrow.connect(owner).updateOracle(outsider.address))
        .to.emit(escrow, "OracleUpdated")
        .withArgs(oracle.address, outsider.address);
      expect(await escrow.oracle()).to.equal(outsider.address);
    });

    it("should update arbitrator", async function () {
      await expect(escrow.connect(owner).updateArbitrator(outsider.address))
        .to.emit(escrow, "ArbitratorUpdated")
        .withArgs(arbitrator.address, outsider.address);
      expect(await escrow.arbitrator()).to.equal(outsider.address);
    });

    it("should update dispute window", async function () {
      await expect(escrow.connect(owner).updateDisputeWindow(86400))
        .to.emit(escrow, "DisputeWindowUpdated")
        .withArgs(DISPUTE_WINDOW, 86400);
      expect(await escrow.disputeWindow()).to.equal(86400);
    });

    it("should revert admin calls from non-owner", async function () {
      await expect(escrow.connect(outsider).updateOracle(outsider.address))
        .to.be.revertedWith("Escrow: not project owner");
      await expect(escrow.connect(outsider).updateArbitrator(outsider.address))
        .to.be.revertedWith("Escrow: not project owner");
    });
  });
});
