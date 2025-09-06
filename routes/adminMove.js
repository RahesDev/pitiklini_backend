var express = require("express");
var router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const depositDB = require("../schema/deposit");
const CryptUserAddressDB = require ("../schema/userCryptoAddress");
const adminvMoveDB = require ("../schema/adminmovingamount")
const RippleAPI = require("ripple-lib").RippleAPI;
const TronWeb = require('tronweb');

const eccrypto = require('eccrypto');
const Web3 = require("web3");
// const ECPairFactory = require('ecpair').ECPairFactory;
const ecc = require('tiny-secp256k1');

const web3 = new Web3(`https://${process.env.ETH_HOST}`);
const Bnbweb3 = new Web3(process.env.BNB_WALLET)
// const Bnbweb3 = new Web3(process.env.BSC_MAINNET_URL)  ---Mainnet

const ARBweb3 = new Web3(process.env.ARBITRUM_WALLET);

const fullNode = `https://${process.env.TRON_HOST}`; // Mainnet

const solidityNode = fullNode;
const eventServer = fullNode;
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);



const bitcoin = require('bitcoinjs-lib');
const { networks, ECPair, payments } = require('@bitgo/utxo-lib');
const ECPairFactory = require('ecpair').ECPairFactory;

const ECPair2 = ECPairFactory(ecc);
const testnet = bitcoin.networks.testnet;

const { db2 } = require('../config/database');
const userAddress_two = require('../schema/address');
const address_two = userAddress_two(db2);

const cron = require("node-cron");

const common_helper = require("../helper/common");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const xrpl = require("xrpl");

const { toWei } = require('ethjs-unit');


cron.schedule("*/5 * * * *",() => {
  processDeposits();
});

async function processDeposits() {
    try {
      const startOfDay = new Date().setHours(0, 0, 0, 0); // Start of today
      const endOfDay = new Date().setHours(23, 59, 59, 999);
      const deposits = await depositDB.find({ currencyMoveStatus: 0 }).populate("currency","contractAddress_erc20 contractAddress_bep20 contractAddress_trc20 coinDecimal_erc20 coinDecimal_bep20 coinDecimal_trc20").exec();
        //console.log("deposits===",deposits)
        var adminDeptoList = await CryptUserAddressDB.find({type:1});
        const adminAddresses = adminDeptoList.map(item => item.address); // Extract the addresses
         // Filter deposits whose depto is not in the admin addresses list
         const filteredDeposits = deposits.filter(deposit => !adminAddresses.includes(deposit.depto));
          console.log("deposits list:",filteredDeposits);

        for (let deposit of filteredDeposits) {
          const userAddressData = await CryptUserAddressDB.findOne({ user_id: deposit.userId, address: deposit.depto }).exec();

          if (!userAddressData) {
              console.log(`Address not found for user: ${deposit.userId}`);
              continue;
          }
          const { address: userAddress,userIdKey} = userAddressData;

          let currency = deposit.currencySymbol;
          
          if(deposit.network == "ERC20")
          {
            currency = "ETH";
          }
          else if(deposit.network == "BEP20")
          {
              currency = "BNB";
          }
          console.log("deposit currency",currency);
          let user_keys = await address_two.findOne({userIdKey:deposit.userId.toString(),currencySymbol:currency});
          console.log("user address user_keys====",user_keys)
          if(user_keys != null)
          {
            if(user_keys.privateKey != null)
            {
              console.log("call here")
              const iv = Buffer.from(user_keys.privateKey.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
              const ephemPublicKey = Buffer.from(user_keys.privateKey.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
              const ciphertext = Buffer.from(user_keys.privateKey.slice(162, user_keys.privateKey.length - 64), 'hex'); // Remaining part
              const mac = Buffer.from(user_keys.privateKey.slice(user_keys.privateKey.length - 64), 'hex'); // Last 64 characters (32 bytes)
  
  
              const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
  
              eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {

              const decrypted_private_key = plaintext.toString();
  
              console.log("decrypted_private_key",decrypted_private_key);
  
              const amount = deposit.depamt;
     
              if (deposit.currencySymbol === 'XRP'){
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'XRP'});
                let admin_key;
               console.log("get_admin_address",get_admin_address.name);
               const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
               const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
               const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
               const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                
               // Prepare the encrypted object
               const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
               eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {
                 admin_key = plaintext.toString();
                 console.log("admin xrp ",admin_key);
              });
                await transferXRP(userAddress, decrypted_private_key, get_admin_address.address, deposit.depamt,deposit._id);
              }
              if (deposit.currencySymbol === 'ETH' ) { // tested
                 var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'ETH'})
  
                   let gasresponse = await common_helper.bnbgasPrice();
                    let send_amount = 0;
                    if (gasresponse.status) {
                      let gasprice = gasresponse.gasprice;
                      let Gas_res = gasprice / 1000000000;
                      let Gas_txn = Gas_res / 1000000000;
                      let txn_fee = 400000 * Gas_txn;
                      
                      send_amount = +amount - +txn_fee;
                    }
                    console.log("send_amount",send_amount)
                    send_amount = parseFloat(send_amount).toFixed(8);
                    if(send_amount > 0)
                    {
                    await transferETH(userAddress, decrypted_private_key, get_admin_address.address, send_amount,deposit._id);
                    }
               }
  
               if (deposit.network === 'ERC20') {// tested
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'ETH'})
                let admin_key;
               const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
               const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
               const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
               const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                
   
               // Prepare the encrypted object
               const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
               eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {
                    console.log("Decrypted message:", plaintext.toString());
                 admin_key = plaintext.toString();
                await transferETHToken(userAddress, decrypted_private_key, get_admin_address.address,amount,deposit._id,admin_key,deposit.currency.contractAddress_erc20,deposit.currency.coinDecimal_erc20);
               })
              }
         
            if (deposit.currencySymbol === 'BNB') { // tested
              var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'BNB'})
              let gasresponse = await common_helper.bnbgasPrice();
              let send_amount = 0;
              if (gasresponse.status) {
                let gasprice = gasresponse.gasprice;
                let Gas_res = gasprice / 1000000000;
                let Gas_txn = Gas_res / 1000000000;
                let txn_fee = 200000 * Gas_txn;
                send_amount = amount - txn_fee;

              //   console.log("txn_fee",txn_fee)
              // console.log("send_amount",send_amount)
              }
              
              if(send_amount > 0)
              {
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'BNB'});
               let admin_key;
               console.log("get_admin_address",get_admin_address.name);
               const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
               const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
               const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
               const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                
               // Prepare the encrypted object
               const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
               eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {
                 admin_key = plaintext.toString();
                await transferBNB(userAddress, decrypted_private_key, get_admin_address.address, send_amount,deposit._id,admin_key);
               })
              }
              
            }

            if (deposit.network=="BEP20") { // tested
               var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'BNB'});
               let admin_key;
               console.log("get_admin_address",get_admin_address.name);
               const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
               const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
               const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
               const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                
   
               // Prepare the encrypted object
               const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
               eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {
                    console.log("Decrypted message:", plaintext.toString());
                 admin_key = plaintext.toString();
                 await transferBnbToken(userAddress, decrypted_private_key, get_admin_address.address, amount,deposit._id,admin_key,deposit.currency.contractAddress_bep20, deposit.currency.coinDecimal_bep20);
               })
              
            }

            // Transfer BTC
            
           if (deposit.currencySymbol === 'BTC') { // tested
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'BTC'});
                const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
                const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
                const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
                const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                // Prepare the encrypted object
                const adminencryptedObject = { iv, ephemPublicKey, ciphertext, mac };
                eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), adminencryptedObject).then(async function(plaintext){
                  console.log(plaintext.toString(),"plaintext.toString()")
                  await transferBTC(userAddress, get_admin_address.address,decrypted_private_key,  amount,plaintext.toString(),deposit._id);
                })
             }

             if (deposit.currencySymbol === 'TRX') { // tested
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'TRX'})
                let transfer_amount = +amount - 20;
                await transferTRX(userAddress, decrypted_private_key, get_admin_address.address, transfer_amount,deposit._id);
             }

            // Transfer TRC20 Tokens
            if (deposit.network=="TRC20") { // tested
                var get_admin_address = await CryptUserAddressDB.findOne({type:1,currencySymbol:'TRX'})
                let admin_key;
                const iv = Buffer.from(get_admin_address.name.slice(0, 32), 'hex');               // First 32 characters (16 bytes)
                const ephemPublicKey = Buffer.from(get_admin_address.name.slice(32, 162), 'hex'); // Next 130 characters (65 bytes)
                const ciphertext = Buffer.from(get_admin_address.name.slice(162, get_admin_address.name.length - 64), 'hex'); // Remaining part
                const mac = Buffer.from(get_admin_address.name.slice(get_admin_address.name.length - 64), 'hex'); // Last 64 characters (32 bytes)
                
    
                // Prepare the encrypted object
                const encryptedObject = { iv, ephemPublicKey, ciphertext, mac };
                eccrypto.decrypt(Buffer.from(process.env.Encryption_private_key, 'hex'), encryptedObject).then(async function(plaintext) {
                    // console.log("TRX Decrypted message:", plaintext.toString());
                    admin_key = plaintext.toString();
                await transferTRC20(userAddress, decrypted_private_key, get_admin_address.address, amount,deposit._id, admin_key, deposit.currency.contractAddress_trc20,deposit.currency.coinDecimal_trc20);
                })
            }
            })
           }
           
          }
        }
      }catch(error){
               console.log("Addrerssgettinnerr",error)
      }
    // })
  }


    const transferETH = async (userAddress, decrypted_private_key,address, amount,depositid)=>{
      try{
        console.log("Eth transfer function",amount)
        const account = web3.eth.accounts.privateKeyToAccount(decrypted_private_key);
         web3.eth.accounts.wallet.add(account);
         console.log(account,"=--=-=-=-=-")
        // Transaction details
        const tx = {
          from: userAddress,
          to: address,
          value: web3.utils.toWei(amount.toString(),'ether'),
          gas: 21000, // Standard gas limit for simple transactions
          gasPrice: await web3.eth.getGasPrice(), //
        };
      
        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
        console.log("Transaction sent:", signedTx);
        // Wait for the transaction to be confirmed
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction confirmed:", receipt);
        if(receipt){
          await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } });
          const obj={
            from_address:userAddress,
            to_address:address,
            amount:amount,
            transaction_has:receipt.transactionHash,
            depsoitid:depositid
          }
          await adminvMoveDB.create(obj);
          processDeposits();
        }
      }catch(err){
     console.log(err,"=-=-=-=-err ETHTHTTTHTHT==--=-=-=-=")
      }

     }
     const transferETHToken  = async (userAddress, decrypted_private_key,adminAddress, amount,depositid,adminPrivateKey,tokenAddress, decimals)=>{
      try{
// console.log("calll decrypted_private_key",decrypted_private_key);
           // Get the current gas price
          const gasPrice = await web3.eth.getGasPrice();
          const gasLimit = 100000; // Adjusted gas limit for token transfer
          
          // Calculate gas fees in ETH
          const gasFeeETH = web3.utils.fromWei((gasPrice * gasLimit).toString(), 'ether');
          
          // Get user's balance
          const userBalance = await web3.eth.getBalance(userAddress);
          
          // Check if user has enough ETH to cover gas fees
          if (parseFloat(web3.utils.fromWei(userBalance, 'ether')) < parseFloat(gasFeeETH)) {
          console.log('Insufficient gas fees, transferring from admin...');
          
          // Add admin's private key to the wallet
          const adminAccount = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
          web3.eth.accounts.wallet.add(adminAccount);
          
          // Transfer gas fees from admin to user
          const gasTransferTx = {
          from: adminAddress,
          to: userAddress,
          value: web3.utils.toWei(gasFeeETH, 'ether'),
          gas: gasLimit,
          gasPrice
          };
          
          const signedGasTransferTx = await web3.eth.accounts.signTransaction(gasTransferTx, adminAccount.privateKey);
          const gasTransferReceipt = await web3.eth.sendSignedTransaction(signedGasTransferTx.rawTransaction);
          console.log('Gas fee transfer successful:', gasTransferReceipt);
        }

        await sleep(5000);

        const account = web3.eth.accounts.privateKeyToAccount(decrypted_private_key);

        web3.eth.accounts.wallet.add(account);

        const ERC20_ABI = [
          {
          "constant": false,
          "inputs": [
          {
          "name": "_to",
          "type": "address"
          },
          {
          "name": "_value",
          "type": "uint256"
          }
          ],
          "name": "transfer",
          "outputs": [
          {
          "name": "",
          "type": "bool"
          }
          ],
          "type": "function"
          }
        ];
        
        const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);


        const tokenAmount = web3.utils.toBN(amount).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));
        
        // Transaction details
        const tx = {
        from: userAddress,
        to: tokenAddress,
        // data: tokenContract.methods.transfer(adminAddress, web3.utils.toWei(amount.toString(), 'ether')).encodeABI(),
        data: tokenContract.methods.transfer(adminAddress, tokenAmount).encodeABI(),
        gas: gasLimit, // Adjust gas limit as needed
        gasPrice: await web3.eth.getGasPrice(),
        };
        
        // Sign and send the transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey);
        console.log("Transaction sent:", signedTx);
        
        // Wait for the transaction to be confirmed
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction confirmed:", receipt);
        
        if (receipt) {
        await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } });
        const obj = {
        from_address: userAddress,
        to_address: tokenAddress,
        amount: amount,
        transaction_hash: receipt.transactionHash,
        depositid: depositid,
        };
        await adminvMoveDB.create(obj);
        processDeposits();
        }
      }catch(error){
          console.log("Addrerssgettinnerr",error)
      }
     }

const transferBnbToken  = async (userAddress, decrypted_private_key, adminAddress, amount, depositid, adminPrivateKey,tokenContractAddress, decimals)=>{
try{
//console.log("---==--=-=-=")
  const userAccount = Bnbweb3.eth.accounts.privateKeyToAccount(decrypted_private_key);
  Bnbweb3.eth.accounts.wallet.add(userAccount);
  
  // Get the current gas price
  const gasPrice = await Bnbweb3.eth.getGasPrice();
  const gasLimit = 60000; // Adjusted gas limit for token transfer
  
  // Calculate gas fees in BNB
  const gasFeeBNB = Bnbweb3.utils.fromWei((gasPrice * gasLimit).toString(), 'ether');
  
  // Get user's balance
  const userBalance = await Bnbweb3.eth.getBalance(userAddress);
  
  // Check if user has enough BNB to cover gas fees
  if (parseFloat(Bnbweb3.utils.fromWei(userBalance, 'ether')) < parseFloat(gasFeeBNB)) {
  console.log('Insufficient gas fees, transferring from admin...');
  
  // Add admin's private key to the wallet
  const adminAccount = Bnbweb3.eth.accounts.privateKeyToAccount(adminPrivateKey);
  Bnbweb3.eth.accounts.wallet.add(adminAccount);
  
  // Transfer gas fees from admin to user
  const gasTransferTx = {
  from: adminAddress,
  to: userAddress,
  value: Bnbweb3.utils.toWei(gasFeeBNB, 'ether'),
  gas: gasLimit,
  gasPrice
  };
  
  const signedGasTransferTx = await Bnbweb3.eth.accounts.signTransaction(gasTransferTx, adminAccount.privateKey);
  const gasTransferReceipt = await Bnbweb3.eth.sendSignedTransaction(signedGasTransferTx.rawTransaction);
  console.log('Gas fee transfer successful:', gasTransferReceipt);
  }

  await sleep(5000);
  
  // Token transfer details
  // const tokenAmount = Bnbweb3.utils.toWei(amount.toString(), 'ether');
  const tokenAmount = Bnbweb3.utils.toBN(amount).mul(Bnbweb3.utils.toBN(10).pow(Bnbweb3.utils.toBN(decimals)));
  
  // ABI for BEP-20 token transfer
  const tokenABI = [
  // Transfer function ABI
  {
  "constant": false,
  "inputs": [
  {
  "name": "_to",
  "type": "address"
  },
  {
  "name": "_value",
  "type": "uint256"
  }
  ],
  "name": "transfer",
  "outputs": [
  {
  "name": "",
  "type": "bool"
  }
  ],
  "type": "function"
  }
  ];
  
  const tokenContract = new Bnbweb3.eth.Contract(tokenABI, tokenContractAddress);
  
  // Create token transfer transaction
  const tokenTransferTx = tokenContract.methods.transfer(adminAddress, tokenAmount).encodeABI();
  
  const tx = {
  from: userAddress,
  to: tokenContractAddress,
  data: tokenTransferTx,
  // gas: gasLimit,
  gas: 60000,
  gasPrice
  };

  console.log("sending transaction===",tx);
  
  const signedTx = await Bnbweb3.eth.accounts.signTransaction(tx, userAccount.privateKey);
  const receipt = await Bnbweb3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log('Token transfer confirmed:', receipt);
  if(receipt){
    await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } });

     const obj = {
      from_address: userAddress,
      to_address: adminAddress,
      amount: amount,
      transaction_hash: receipt.transactionHash,
      depositid: depositid,
      };
    await adminvMoveDB.create(obj);
  }
}catch(err){
console.log("transfer bnb token error",err);
}
}
     const transferBNB = async (userAddress, decrypted_private_key, adminAddress, amount, depositid, adminPrivateKey) => {
      try {
          console.log('start BNB transfer', userAddress, decrypted_private_key, adminAddress, amount, depositid,adminPrivateKey);
  
          // Add user's private key to the wallet
          const userAccount = Bnbweb3.eth.accounts.privateKeyToAccount(decrypted_private_key);
          Bnbweb3.eth.accounts.wallet.add(userAccount);
  
          // Get the current gas price
          const gasPrice = await Bnbweb3.eth.getGasPrice();
          const gasLimit = 21000;
  
          // Calculate gas fees in BNB
          const gasFeeBNB = Bnbweb3.utils.fromWei((gasPrice * gasLimit).toString(), 'ether');
  
          // Get user's balance
          const userBalance = await Bnbweb3.eth.getBalance(userAddress);
  
          // Check if user has enough BNB to cover gas fees
          if (parseFloat(Bnbweb3.utils.fromWei(userBalance, 'ether')) < parseFloat(gasFeeBNB)) {
              console.log('Insufficient gas fees, transferring from admin...');
  
              // Add admin's private key to the wallet
              const adminAccount = Bnbweb3.eth.accounts.privateKeyToAccount(adminPrivateKey);
              Bnbweb3.eth.accounts.wallet.add(adminAccount);

              let transfer_amount = parseFloat(gasFeeBNB).toFixed(8);
              const amount_wei = toWei(transfer_amount, 'ether');
  
              // Transfer gas fees from admin to user
              const gasTransferTx = {
                  from: adminAddress,
                  to: userAddress,
                  // value: Bnbweb3.utils.toWei(gasFeeBNB, 'ether'),
                  value: amount_wei,
                  gas: gasLimit,
                  gasPrice
              };
  
              const signedGasTransferTx = await Bnbweb3.eth.accounts.signTransaction(gasTransferTx, adminAccount.privateKey);
              const gasTransferReceipt = await Bnbweb3.eth.sendSignedTransaction(signedGasTransferTx.rawTransaction);
              console.log('Gas fee transfer successful:', gasTransferReceipt);
          }
          let transfer_amount = parseFloat(amount).toFixed(8);
          const amount_wei = toWei(transfer_amount, 'ether');
          // Now proceed with the regular transaction
          const tx = {
              from: userAddress,
              to: adminAddress,
              // value: Bnbweb3.utils.toWei(amount.toString(), 'ether'),
              value: amount_wei.toString(),
              gas: gasLimit,
              gasPrice
          };

          console.log("transaction obj ====",tx);
  
          const signedTx = await Bnbweb3.eth.accounts.signTransaction(tx, userAccount.privateKey);
          const receipt = await Bnbweb3.eth.sendSignedTransaction(signedTx.rawTransaction);
          console.log('Transaction confirmed:', receipt);
  
          if (receipt) {
              // Update depositDB and adminvMoveDB after successful transaction
              var update= await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } })
              console.log(update,"update")
              const obj = {
                  from_address: userAddress,
                  to_address: adminAddress,
                  amount: amount,
                  transaction_hash: receipt.transactionHash,
                  depositid: depositid
              };
              await adminvMoveDB.create(obj);
              processDeposits();
          }
      } catch (err) {
          console.log(err, 'Error during BNB transfer');
      }
    };
     
    const transferTRX = async (userAddress, decrypted_private_key, address, amount, depositid) => {
        try {
          console.log("transfer trx===",userAddress)
          console.log("decrypted_private_key===",decrypted_private_key);
          console.log("amount===",amount)
          console.log("depositid===",depositid)
          // Initialize account with the private key
          tronWeb.setPrivateKey(decrypted_private_key);
      
          // Convert amount to SUN (smallest unit of TRX)
          const amountInSun = tronWeb.toSun(amount);
      
          // Check balance of the user address
          const balance = await tronWeb.trx.getBalance(userAddress);
          console.log(`Balanceof trx: ${balance} TRX`);

          // Create and sign the transaction
          const transaction = await tronWeb.transactionBuilder.sendTrx(address, amountInSun, userAddress);
          const signedTransaction = await tronWeb.trx.sign(transaction,decrypted_private_key);
      
          // Send the signed transaction
          const receipt = await tronWeb.trx.sendRawTransaction(signedTransaction);
          console.log("Transaction confirmed:", receipt);
      
          // If the transaction was successful, update your database
          if (receipt.result) {
            await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } })
              .then((res) => console.log(res))
              .catch((err) => console.log(err));
      
            // Call processDeposits or other business logic
            processDeposits();
          }
        } catch (err) {
          console.log("Transaction error: transferTRX::::::", err);
        }
     };
   


     const estimateTxSize = (numInputs, numOutputs) => {
      return numInputs * 148 + numOutputs * 34 + 10;
     };
    function estimateBTCFee(utxos, numOutputs, feeRate) {
      const numInputs = utxos.length;
      const txSize = estimateTxSize(numInputs, numOutputs);
      return txSize * feeRate;
    }


    function btcToSatoshis(amountBtc) {
      return Math.round(amountBtc * 100000000);
   }

   async function getUTXOs(address) {
    const url = `https://blockstream.info/api/address/${address}/utxo`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch UTXOs: " + error.message);
    }
  }

  async function getFeeRate() {
    const url = `https://mempool.space/api/v1/fees/recommended`;
    try {
        const response = await axios.get(url);
        return response.data.fastestFee;  // Fee in sat/byte
    } catch (error) {
        throw new Error("Failed to fetch fee rate: " + error.message);
    }
  }

    async function getTxOut(txid, index) {
      const response = await axios.get(`https://blockstream.info/api/tx/${txid}`);
      return {
          script: Buffer.from(response.data.vout[index].scriptpubkey, 'hex'),
          value: response.data.vout[index].value,
      };
  }

  async function getRawTransaction(txid) {
    const url = `https://blockstream.info/api/tx/${txid}/hex`;
    try {
        const response = await axios.get(url);
        return response.data;  // This will return raw hex of the transaction
    } catch (error) {
        throw new Error(`Failed to fetch raw transaction: ${error.message}`);
    }
}

const transferBTC = async (fromAddress, toAddress, privateKeyWIF, amount,admin_private_key,depositid) => {

  try {

     const amountSatoshis = Math.floor(amount * 1e8); // Convert and round to an integer
    console.log(amountSatoshis,"amountSatoshis")
   
    const btcFee = estimateBTCFee([amount], amount, 15);

    let transferAmount = amountSatoshis - btcFee;

    console.log("transferAmount",transferAmount);

    transferAmount = transferAmount / 1e8;

    let convert_amount = parseFloat(transferAmount).toFixed(8);

    console.log("convert_amount",convert_amount);

    let fee_convert = btcFee / 1e8;

    fee_convert  = parseFloat(fee_convert).toFixed(8);

    console.log("fee_convert",fee_convert);


    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': process.env.BTC_KEY
      },
      body: JSON.stringify({
        fromAddress: [
          {
            address: fromAddress,
            privateKey: privateKeyWIF
          }
        ],
        to: [{address: toAddress, value: Number(convert_amount)}],
        fee: fee_convert.toString(),
        changeAddress: toAddress
      })
    };
    
    fetch('https://api.tatum.io/v3/bitcoin/transaction', options)
      .then(res => res.json())
      .then(async res =>{
        if(res.txId)
        {
          await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } })
          .then((res) => console.log(res))
          .catch((err) => console.log(err));
  
        // Call processDeposits or other business logic
        processDeposits();
        }
      })
      .catch(err => console.error(err));
     
  } catch (error) {
    console.error('Error:', error.message);
  }
  };

      
    const transferFee = async (fromAddress, toAddress, admin_private_key, amount) => {
    try {
    console.log(fromAddress, toAddress, admin_private_key, amount,"fromAddress, toAddress, admin_private_key, amount")
    // const amount = Math.floor(amount * 1e8); // Convert and round to an integer
    
    // Define the transaction inputs and outputs
    const newTx = {
    inputs: [{ addresses: [fromAddress] }],
    outputs: [{ addresses: [toAddress], value: amount }],
    };
    
    // Create a new transaction skeleton
    const { data: tmpTx } = await axios.post(
    'https://api.blockcypher.com/v1/btc/test3/txs/new',
    newTx,
    { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Fee Transaction Skeleton Created:', tmpTx);
    
    // Extract the private key
    const keyPair = ECPair.fromWIF(privateKeyWIF, bitcoin.networks.testnet);
    
    // Sign each tosign hash
    tmpTx.pubkeys = [];
    tmpTx.signatures = tmpTx.tosign.map((toSignHex) => {
    const signature = keyPair.sign(Buffer.from(toSignHex, 'hex'));
    tmpTx.pubkeys.push(keyPair.publicKey.toString('hex'));
    return bitcoin.script.signature.encode(signature, bitcoin.Transaction.SIGHASH_ALL).toString('hex');
    });
    
    console.log('Signed Fee Transaction:', tmpTx);
    
    // Broadcast the signed transaction
    const { data: finalTx } = await axios.post(
    'https://api.blockcypher.com/v1/btc/test3/txs/send',
    tmpTx,
    { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Fee Transaction Broadcasted Successfully:', finalTx.tx.hash);
    
    return finalTx.tx.hash; // Return the transaction ID
    } catch (error) {
    console.error('Error processing fee transaction:', error.response ? error.response.data : error.message, error.message);
    throw error;
    }
    };
      
    const transferTRC20 = async (userAddress, decrypted_private_key, recipientAddress, amount, depositid, admin_key, contractAddress, decimals) => {
        try {

         // Convert amount to SUN (smallest unit of TRX)
         const amountInSun = tronWeb.toSun(20);
      
         tronWeb.setPrivateKey(decrypted_private_key);
         // Check balance of the user address
         const user_trx_balance = await tronWeb.trx.getBalance(userAddress);

         let trx_balance = user_trx_balance / 1000000;

         console.log("user_trx_balance",trx_balance)

         console.log("amountInSun",amountInSun);

         let balanceInsun = tronWeb.toSun(trx_balance);

         console.log("balanceInsun",balanceInsun);
     
         if (+balanceInsun < +amountInSun) {
          console.log("call send trx for fees")
         tronWeb.setPrivateKey(admin_key);
           var transferAmount = 30 * 1000000;
           const transaction = await tronWeb.transactionBuilder.sendTrx(userAddress, transferAmount, recipientAddress);
           console.log(transaction,"=====---transactiontransactiontransaction-====--=-----=====")
           const signedTransaction = await tronWeb.trx.sign(transaction,admin_key);
           // Send the signed transaction
           const receipt = await tronWeb.trx.sendRawTransaction(signedTransaction);
           console.log("Transaction confirmed:", receipt);
           sleep(5000);
        }
        else
        {
           // Initialize account with the private key
           tronWeb.setPrivateKey(decrypted_private_key);
        const amountInSmallestUnit = amount * Math.pow(10, decimals);
    
        // Check the balance of the user for the TRC20 token
        const contract = await tronWeb.contract().at(contractAddress);
        const balance = await contract.methods.balanceOf(userAddress).call();
        console.log(`TRC20 Token Balance: ${tronWeb.fromSun(balance)} Tokens`);
    
        if (balance < amountInSmallestUnit) {
            console.log("Insufficient TRC20 token balance for transaction.");
            return;
        }
    
        // Create the transaction for token transfer
        const transaction = await contract.methods.transfer(recipientAddress, amountInSmallestUnit).send({
            feeLimit: 30_000_000,  // Set fee limit (100 TRX in SUN)
            callValue: 0,           // Since this is a token transfer, no TRX is sent
            from: userAddress
        });
    
        console.log("Transaction:", transaction);
    
        // If the transaction was successful, update your database
        if (transaction) {
            await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } })
            .then((res) => console.log(res))
            .catch((err) => console.log(err));
            // Call processDeposits or other business logic
            processDeposits();
        }
        }
       
        } catch (err) {
        console.log("Transaction error:", err);
        }
    };


    async function verifyAccount(client, address) {
        const accountInfo = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'current'
        });
        return accountInfo;
    }
    
    const transferXRP = async (userAddress, decrypted_private_key, recipientAddress, amount, depositid) => {
      try {
        
        if(+amount > 0.5)
        {
          const client = new xrpl.Client('wss://s1.ripple.com');  // Mainnet

          await client.connect();
          
          const response = await client.request({
            command: "server_info"
          });
        
          const fee = response.result.info.validated_ledger.base_fee_xrp;

          console.log("fees in XRP====",fee);
          const amountXRP = +amount - +fee;
          console.log("amountXRP====",amountXRP);

          try {
      
              // Create wallet from the seed
              const wallet = xrpl.Wallet.fromSeed(decrypted_private_key);
          
              // Ensure wallet address
              const fromAddress = wallet.classicAddress;
          
              console.log(`Sending from: ${fromAddress} to: ${recipientAddress}`);
          
              // Prepare payment transaction
              const tx = await client.autofill({
                TransactionType: "Payment",
                Account: fromAddress,
                Destination: recipientAddress,
                Amount: xrpl.xrpToDrops(amountXRP), // Convert XRP to drops
              });
          
              // Sign the transaction
              const signed = wallet.sign(tx);
          
              // Submit the signed transaction
              const response = await client.submitAndWait(signed.tx_blob);
          
              // Check result
              if (response.result.meta.TransactionResult === "tesSUCCESS") {
                console.log("Transaction successful!");
                console.log("Transaction Hash:", response.result.hash);

                await depositDB.updateOne({ _id: depositid }, { $set: { currencyMoveStatus: 1 } });
                processDeposits();
      
              } else {
                console.error("Transaction failed:", response.result.meta.TransactionResult);
              }
          
            } catch (error) {
              console.error("Error sending XRP:", error);
            } finally {
              await client.disconnect();
            }
        }

      } catch (err) {
        console.error("Error processing transfer:", err.message || err);
      }
    };


module.exports ={processDeposits}