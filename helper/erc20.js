const Web3 = require('web3');
const Tx = require('ethereumjs-tx').Transaction;
const common = require('./common');

sendERC20Transaction = exports.sendERC20Transaction = async (sender, receiver, value, private, contractAddress, abi, callback) => {
    // console.log(sender, "sender");
    // console.log(receiver, "receiver");
    // console.log(value, "value");
    // console.log(private, "private");
    // console.log(contractAddress, "contractAddress");
    // console.log(abi, "abi");

    const eth_host = process.env.ETH_HOST;

    const web3 = new Web3("https://"+eth_host+"");

    // var web3 = new Web3(new Web3.providers.HttpProvider(
    //     'https://ropsten.infura.io/v3/e077fa8c3dda4bf19ab931855b93ed6b'
    // ));
    var private = private
    var myAddress = sender;
    var toAddress = receiver;

    var gasPrice = await web3.eth.getGasPrice();
    //console.log("gasPrice", gasPrice);

    // get transaction count, later will used as nonce
    var count = await web3.eth.getTransactionCount(myAddress, 'pending');
    console.log(count);

    // set your private key here, we'll sign the transaction below
    var privateKey = new Buffer(private, 'hex');
    //var privateKey = private;

    var contract = await new web3.eth.Contract(abi, contractAddress, {
        from: myAddress
    })

    var rawTransaction = {
        "from": myAddress,
        "gasPrice": web3.utils.toHex(gasPrice),
        "gasLimit": web3.utils.toHex(70000),
        "to": contractAddress,
        "value": "0x0",
        "data": contract.methods.transfer(toAddress, value).encodeABI(),
        "nonce": web3.utils.toHex(count)
    }
    var transaction = await new Tx(rawTransaction, {
       chain: process.env.ETH_NETWORK
    })
    await transaction.sign(privateKey)

    var txid = await web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'));

    console.log("txid", txid);

    callback(txid);

}