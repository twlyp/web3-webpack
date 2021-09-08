import Web3 from "web3";
const { fromWei, toWei } = Web3.utils;
import volcanoCoinArtifact from "../../build/contracts/VolcanoCoin.json";

const App = {
  web3: null,
  account: null,
  volcano: null,

  start: async function () {
    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = volcanoCoinArtifact.networks[networkId];
      this.volcano = new web3.eth.Contract(
        volcanoCoinArtifact.abi,
        deployedNetwork.address
      );

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      this.refreshBalance();

      //listen to events
      this.volcano.events
        .Transfer({ address: [this.account] })
        .on("data", (ev) => {
          this.refreshBalance();

          const { returnValues } = ev;
          let { from, to, value } = returnValues;
          value = fromWei(value, "ether");
          if (from === this.account) {
            alert(`you just spent ${value} VLC`);
          } else if (to === this.account) {
            alert(`you just received ${value} VLC`);
          }
        })
        .on("error", (err) => {
          throw err;
        });
    } catch (err) {
      console.error(err);
    }
  },

  refreshBalance: async function () {
    const { balanceOf } = this.volcano.methods;
    const balance = await balanceOf(this.account).call();

    const balanceElement = document.getElementsByClassName("balance")[0];
    balanceElement.innerHTML = fromWei(String(balance), "ether");
  },

  sendCoin: async function () {
    const amount = document.getElementById("amount").value;
    const receiver = document.getElementById("receiver").value;

    this.setStatus("Initiating transaction... (please wait)");

    const { transfer } = this.volcano.methods;
    await transfer(receiver, toWei(amount, "ether")).send({
      from: this.account,
    });

    this.setStatus("Transaction complete!");
  },

  setStatus: function (message) {
    const status = document.getElementById("status");
    status.innerHTML = message;
  },
};

window.App = App;

window.addEventListener("load", function () {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live"
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:8545")
    );
  }

  App.start();
});
