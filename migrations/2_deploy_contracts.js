const VolcanoCoin = artifacts.require("VolcanoCoin");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(VolcanoCoin, accounts[1]);
};
