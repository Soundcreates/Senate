const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RewardToken", function () {
  let rewardToken, owner, minter, user;

  beforeEach(async function () {
    [owner, minter, user] = await ethers.getSigners();
    const RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy("Productivity Reward", "PROD", owner.address, 500); // 5%
  });

  describe("Deployment", function () {
    it("should set name, symbol, and reward rate", async function () {
      expect(await rewardToken.name()).to.equal("Productivity Reward");
      expect(await rewardToken.symbol()).to.equal("PROD");
      expect(await rewardToken.rewardRate()).to.equal(500);
      expect(await rewardToken.RATE_DENOMINATOR()).to.equal(10_000);
    });

    it("should set the correct owner", async function () {
      expect(await rewardToken.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("should revert if caller is not a minter", async function () {
      await expect(rewardToken.connect(user).mint(user.address, 1000))
        .to.be.revertedWith("RewardToken: caller is not a minter");
    });

    it("should allow authorized minter to mint", async function () {
      await rewardToken.addMinter(minter.address);
      await rewardToken.connect(minter).mint(user.address, 1000);
      expect(await rewardToken.balanceOf(user.address)).to.equal(1000);
    });
  });

  describe("Minter management", function () {
    it("should add and remove minters", async function () {
      await rewardToken.addMinter(minter.address);
      expect(await rewardToken.isMinter(minter.address)).to.be.true;

      await rewardToken.removeMinter(minter.address);
      expect(await rewardToken.isMinter(minter.address)).to.be.false;
    });

    it("should revert adding zero address as minter", async function () {
      await expect(rewardToken.addMinter(ethers.ZeroAddress))
        .to.be.revertedWith("RewardToken: zero address");
    });

    it("should only allow owner to manage minters", async function () {
      await expect(rewardToken.connect(user).addMinter(minter.address))
        .to.be.reverted;
    });
  });

  describe("Reward calculation", function () {
    it("should calculate rewards correctly (5% rate)", async function () {
      // 5% = 500 basis points. 10000 * 500 / 10000 = 500
      expect(await rewardToken.calculateReward(10000)).to.equal(500);
    });

    it("should allow owner to update reward rate", async function () {
      await rewardToken.setRewardRate(1000); // 10%
      expect(await rewardToken.rewardRate()).to.equal(1000);
      expect(await rewardToken.calculateReward(10000)).to.equal(1000);
    });
  });
});
