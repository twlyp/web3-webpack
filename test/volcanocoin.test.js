const { expect } = require("chai");
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const ether = (n) => new BN(web3.utils.toWei(String(n), "ether"));

const VolcanoCoin = artifacts.require("VolcanoCoin");

contract("VolcanoCoin", (accounts) => {
  const [owner, admin, user1] = accounts;
  let instance;

  beforeEach(async () => {
    instance = await VolcanoCoin.new(admin);
  });

  contract("deployment", () => {
    it("should set the correct admin", async () => {
      const isAdmin = await instance.hasRole.call("0x0", admin);
      expect(isAdmin).to.be.true;
    });

    it("should give the owner all the money", async () => {
      const ownerBalance = await instance.balanceOf.call(owner);
      const totalSupply = await instance.totalSupply.call();
      expect(ownerBalance).to.be.bignumber.equal(totalSupply);
    });
  });

  contract("transfer()", () => {
    it("should transfer tokens between accounts", async () => {
      const receipt = await instance.transfer(admin, ether(100), {
        from: owner,
      });
      const adminBalance = await instance.balanceOf.call(admin);

      expectEvent(receipt, "Transfer", {
        value: ether(100),
        from: owner,
        to: admin,
      });
      expect(adminBalance).to.be.bignumber.equal(ether(100));
    });

    it("should revert if the sender doesn't have enough tokens", async () => {
      const ownerStartBalance = await instance.balanceOf.call(owner);
      const adminStartBalance = await instance.balanceOf.call(admin);
      const tx = instance.transfer(owner, 100, {
        from: admin,
      });
      await expectRevert(tx, "ERC20: transfer amount exceeds balance.");

      const ownerEndBalance = await instance.balanceOf.call(owner);
      const adminEndBalance = await instance.balanceOf.call(admin);
      expect(ownerEndBalance).to.be.bignumber.equal(ownerStartBalance);
      expect(adminEndBalance).to.be.bignumber.equal(adminStartBalance);
    });

    it("should update balances after transfer", async () => {
      const ownerStartBalance = await instance.balanceOf.call(owner);
      await instance.transfer(admin, ether(100), {
        from: owner,
      });
      const ownerEndBalance = await instance.balanceOf.call(owner);
      expect(ownerEndBalance).to.be.bignumber.equal(
        ownerStartBalance.sub(ether(100))
      );
    });

    it("should record transfers in 'payments'", async () => {
      await instance.transfer(admin, ether(100), { from: owner });
      const record = await instance.paymentsFromId.call(0);
      const payment = await instance.payments.call(owner, 0);

      expect(record.sender).to.equal(owner);
      expect(payment.amount).to.be.bignumber.equal(ether(100));
    });
  });

  contract("increaseSupply()", async () => {
    it("should let the owner mint an amount of tokens equal to the total supply", async () => {
      const ownerStartBalance = await instance.balanceOf.call(owner);
      const startTotalSupply = await instance.totalSupply.call();
      await instance.increaseSupply({ from: owner });
      const ownerEndBalance = await instance.balanceOf.call(owner);

      expect(ownerEndBalance).to.be.bignumber.equal(
        ownerStartBalance.add(startTotalSupply)
      );
    });

    it("shouldn't let other users mint more token", async () => {
      const tx = instance.increaseSupply({ from: admin });
      await expectRevert(tx, "AccessControl");
    });
  });

  contract("updateDetails()", () => {
    const testComment = "my test comment";

    beforeEach(async () => {
      await instance.transfer(user1, ether(100), { from: owner });
      await instance.transfer(admin, ether(50), { from: user1 });
    });

    it("should allow users to update details on their own payments", async () => {
      await instance.updateDetails(1, 2, testComment, { from: user1 });
      const payment = await instance.payments(user1, 0);

      expect(payment.paymentType.toString()).to.equal("2");
      expect(payment.comment).to.equal(testComment);
    });

    it("shouldn't allow users to update details on other users' payments", async () => {
      const tx = instance.updateDetails(1, 2, testComment, { from: owner });
      await expectRevert(tx, "this payment is not yours to edit");
    });

    it("should allow the admin to update details on anyone's payments", async () => {
      await instance.updateDetails(1, 2, testComment, { from: admin });
      const payment = await instance.payments(user1, 0);

      expect(payment.paymentType.toString()).to.equal("2");
      expect(payment.comment).to.equal(
        `${testComment} (updated by ${admin.toLowerCase()})`
      );
    });
  });
});
