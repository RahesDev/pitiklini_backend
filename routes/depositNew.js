var express = require("express");
var router = express.Router();
const axios = require('axios');
const depositDB = require("../schema/deposit");
const userWalletDB = require("../schema/userWallet");
const adminWalletDB = require("../schema/adminWallet");
const currencyDB = require("../schema/currency");
const antiPhishing = require("../schema/antiphising");
var mailtempDB = require("../schema/mailtemplate");
var mail = require("../helper/mailhelper");
const { seterc20Token, settrc20Token, setbep20Token } = require("../redis-helper/redisHelper");
const usersDB = require("../schema/users");
const common = require("../helper/common");
const userCryptoAddress = require("../schema/userCryptoAddress");

//BTC DEPOSIT FUNCION 
const btcdeposit =async function (address, userId, currencySymbol, currency) {
  try {
    console.log("btc logs----", address, userId, currencySymbol, currency);
  const apiUrl = `${process.env.BTC_URL_1}${address}${process.env.BTC_URL_2}`;
  
  const response = await axios.get(apiUrl);
  const transactions = response.data;
  if(transactions.length > 0)
  {
    console.log("btc logs 222222----", address, userId, currencySymbol, currency);
    await Promise.allSettled(transactions.map(async (tx) => {
      const existingDeposit = await depositDB.findOne({ txnid: tx.txid });
      let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
      if (!existingDeposit) {
      await Promise.allSettled(tx.vout.map(async (output) => {
      if (output.scriptpubkey_address === address) {
      const depamt = output.value / 100000000; // Convert satoshis to BTC
        const create_deposit_obj = {
                         userId: userId,
                         currency: currency,
                         currencySymbol: currencySymbol,
                         depamt: depamt,
                         depto: address,
                         txnid: tx.txid,
                         currencyMoveStatus:0,
                         createdDate :new Date(),
                         modifiedDate:new Date(),
          };
          const create_deposit = await depositDB.create(create_deposit_obj);
    
          if(address_detail.type == 1){
            //console.log(currencySymbol,"currencySymbol")
            const userWallet = await adminWalletDB.findOne({ type:1, 'wallets.currencySymbol': currencySymbol });
            if (userWallet) {
                 const walletIndex = userWallet.wallets.findIndex(w => w.currencySymbol.equals(currencySymbol));
            if (walletIndex !== -1) {
                 userWallet.wallets[walletIndex].amount += depamt;
                 await userWallet.save();
                // console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
  
            } else {
                 //console.log(`Currency not found in wallet for user ${userId}`);
                 }
           } else {
                 //console.log(`Wallet not found for user ${userId}`);
           }
          }
          else{
            const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                userWallet.wallets[walletIndex].amount += depamt;
                await userWallet.save();
                //console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate); // Similar to ETH transfers
  
            } else {
                //console.log(`Currency not found in wallet for user ${userId}`);
                }
          } else {
                //console.log(`Wallet not found for user ${userId}`);
          }
          }
          }
         }));
        }
      }));
     }
    } catch (error) {
    console.error("Error:", error);
    }
  };

//ETH DEPOSIT FUNCION 
const ethdeposit = async function (address, userId, currencySymbol, currency, admin_address) {
  try {
    var currency_find= await currencyDB.findOne({currencySymbol:currencySymbol});
    // const history = await provider.getHistory(address); 
    const url = `https://${process.env.ETH_API}?module=account&action=txlist&address=${address}&endblock=latest&apikey=${process.env.ETHKEY}`;
    
    // console.log("eth deposit url===",url);
    // console.log("call admin_address",admin_address);
      const response = await axios.get(url);

       const responseTxn = response.data.result;
      //  console.log("eth deposit response====",responseTxn);
      //  console.log("eth deposit response type ====",typeof responseTxn);
       if(responseTxn.length > 0 && typeof responseTxn == "object")
       {
        await Promise.allSettled(responseTxn.map(async (tx) => {

          if(tx.to.toLowerCase() == address.toLowerCase())
          {
          const fromAddress = tx.from.toLowerCase();
          admin_address = admin_address.toLowerCase();
          
          if(fromAddress != admin_address)
          {
            console.log("call 111")
            const existingDeposit = await depositDB.findOne({ txnid: tx.hash });
            let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
            if(!existingDeposit || existingDeposit == null) {
             // console.log("call 222")
              const depamt = tx.value/Math.pow(10, currency_find.coinDecimal?currency_find.coinDecimal:'18'); // Convert Wei to ETH
              const create_deposit_obj = {
                  userId: userId,
                  currency: currency,
                  currencySymbol: currencySymbol,
                  depamt: parseFloat(depamt),
                  depto: address,
                  txnid: tx.hash,
                  currencyMoveStatus:0,
                  createdDate :new Date(),
                  modifiedDate:new Date(),
              };
              const create_deposit = await depositDB.create(create_deposit_obj)
              //console.log(create_deposit,"create_deposit")
              if(address_detail.type == 1){
                const result = await adminWalletDB.findOneAndUpdate(
                  { type: 1 },
                  { wallets: { $elemMatch: { currencySymbol: currencySymbol } } },
                  {
                  $inc: { 'wallets.$.amount': depamt }
                  },
                  {
                  returnOriginal: false // Return the updated document
                  }
                  );
                  //console.log(result,"result")
                  
                  if (result.value) {
                  const updatedWallet = result.value.wallets.find(w => w.currencySymbol === currencySymbol);
                  //console.log(`Updated balance for user ${userId}: ${updatedWallet.amount}`);
                  } else {
                  //console.log(`User wallet not found for user ${userId}`);
                  }
              }else{
                const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                if (userWallet) {
                    const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                if (walletIndex !== -1) {
                    userWallet.wallets[walletIndex].amount += depamt;
                    await userWallet.save();
                    //console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                    await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate); // Similar to ETH transfers
                } else {
                    //console.log(`Currency not found in wallet for user ${userId}`);
                    }
                } else {
                    //  console.log(`Wallet not found for user ${userId}`);
                }
            }
            }
          }
          else
          {
            console.log("calll 222")
          }
          }
          
         }));
       }
      
      } catch (error) {
      console.error("Error:", error);
      }
};

//BNB DEPOSIT FUNCION 
const bnbdeposit =async function (address, userId, currencySymbol, currency, admin_address) {
  try {
    var currency_find= await currencyDB.findOne({_id:currency});
    const url = `https://${process.env.BSC_API}/api?module=account&action=txlist&address=${address}&endblock=latest&apikey=${process.env.BSCTOKEN}`;
    const response = await axios.get(url);
    const responseTxn = response.data.result;
    console.log("bnb chain transactions ===",responseTxn);
    if(responseTxn.length > 0 && typeof responseTxn == "object")
    {
     await Promise.allSettled(responseTxn.map(async (tx) => {
       if(tx.to.toLowerCase() == address.toLowerCase())
       {
       const fromAddress = tx.from.toLowerCase();
       admin_address = admin_address.toLowerCase();
       if(fromAddress != admin_address)
       {
        const existingDeposita = await depositDB.findOne({ txnid: tx.hash }).exec();

       let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });

       if (!existingDeposita) {
        const depamt = tx.value/Math.pow(10, currency_find.coinDecimal_bep20? currency_find.coinDecimal_bep20:"18"); // Convert Wei to ETH
           const create_deposit_obj = {
               userId: userId,
               currency: currency,
               currencySymbol: currencySymbol,
               depamt: parseFloat(depamt),
               depto: address,
               txnid: tx.hash,
               currencyMoveStatus:0,
               createdDate :new Date(),
               modifiedDate:new Date(),
           };
           const create_deposit = await depositDB.create(create_deposit_obj).then((res)=>console.log(res)).catch((err)=>console.log(err));

           if(address_detail.type == 1){
            const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                 const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                 userWallet.wallets[walletIndex].amount += depamt;
                 await userWallet.save();
                // console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);

            } else {
                // console.log(`Currency not found in wallet for user ${userId}`);
                 }
           } else {
                 //console.log(`Wallet not found for user ${userId}`);
           }
          }
          else
          {
          const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
          if (userWallet) {
                const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
          if (walletIndex !== -1) {
                userWallet.wallets[walletIndex].amount += depamt;
                await userWallet.save();
               // console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
              await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate); // Similar to ETH transfers

          } else {
               // console.log(`Currency not found in wallet for user ${userId}`);
                }
          } else {
               // console.log(`Wallet not found for user ${userId}`);
          }
         }
       } 
       }
       }
      }));
    }
    
   } catch (err) {
       console.log(err, "error");
   }
};

//BNB TOKEN DEPPOSIT FUNCTION
const processBep20Data = (response, address, userId) => {
  try {
    if (response && response.length > 0) {
      response.forEach((item, index) => {
        const { contractAddress_bep20: contractAddress, coinDecimal_bep20: decimal } = item;
        // console.log("contractAddress--->>",contractAddress,"decimal-->>",decimal);
        if (contractAddress) {
          bnbtokendeposit(address, userId, item.currencySymbol, item._id, contractAddress, item.coinDecimal_bep20);
        }
      });
    }
  } catch (err) {
    console.log(err, "error")
  }
};

const get_bnb_token = async function (userId, address) {
  try {
    client.get("BEP20", async (err, result) => {
      if (err) {
        console.error("Error fetching data from Redis:", err);
        return;
      }
      // if (result === null) {
        try {
          await setbep20Token(function (response) {
            processBep20Data(response, address, userId);
          });
        } catch (fetchErr) {
          console.error("Error fetching data from external service:", fetchErr);
        }
      // } else {
      //   try {
      //     const response = JSON.parse(result);
      //     processBep20Data(response, address, userId);
      //   } catch (parseErr) {
      //     console.error("Error parsing cached data:", parseErr);
      //   }
      // }
    });
  } catch (err) {
    console.log(err, "error form get_bnb_token");
  }
}

const bnbtokendeposit = async function (address, userId, currencySymbol, currency, tokenContractAddress,decimal) {
  try{
    const url = `https://${process.env.BSC_API}/api?module=account&action=tokentx&contractaddress=${tokenContractAddress}&address=${address}&endblock=latest&apikey=${process.env.BSCTOKEN}`;
    const response = await axios.get(url);
    const responseTxn = response.data.result;
    if(responseTxn.length > 0 && typeof responseTxn == "object")
    {
      await Promise.allSettled(responseTxn.map(async (tx) => {
        try{
          if(tx.to.toLowerCase() == address.toLowerCase())
          {
            const existingDeposit = await depositDB.findOne({ txnid: tx.hash }).exec();
            let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
            if (!existingDeposit || existingDeposit==null) {
              const depamt = tx.value/Math.pow(10, decimal); // Convert Wei to ETH
              const create_deposit_obj = {
                  userId: userId,
                  currency: currency,
                  currencySymbol: currencySymbol,
                  depamt: parseFloat(depamt),
                  network:"BEP20",
                  depto: address,
                  txnid: tx.hash,
                  currencyMoveStatus:0,
                  createdDate :new Date(),
                  modifiedDate:new Date(),
              };
              const create_deposit = await depositDB.create(create_deposit_obj);
              if(address_detail.type == 1){
                const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                if (userWallet) {
                      const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                if (walletIndex !== -1) {
                      userWallet.wallets[walletIndex].amount += depamt;
                      await userWallet.save();
                    // console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
      
                } else {
                    // console.log(`Currency not found in wallet for user ${userId}`);
                      }
                } else {
                    // console.log(`Wallet not found for user ${userId}`);
                }
              }else{
          const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                userWallet.wallets[walletIndex].amount += depamt;
                await userWallet.save();
                // console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate,"BEP20"); // Similar to ETH transfers
      
            } else {
                // console.log(`Currency not found in wallet for user ${userId}`);
                }
          } else {
                // console.log(`Wallet not found for user ${userId}`);
          }
        }
            }
         }
        }catch(Err){
         //console.log(Err);
        }
         }));
    }
  }
  catch(err){
    console.log(err,"=-=-=-=")
  }
};

//ETH TOKEN DEPPOSIT FUNCTION
const processErc20Data = (response, address, userId) => {
  try {
    if (response && response.length > 0) {
      response.forEach((item, index) => {
        const { contractAddress_erc20: contractAddress, coinDecimal_erc20: decimal } = item;
        if (contractAddress) {
          ethtokendeposit(address, userId, item.currencySymbol, item._id, contractAddress, item.coinDecimal_erc20);
        }
      });
    }
  } catch (err) {
    console.log(err, "error")
  }
};

const get_erc20_token = async function (userId, address) {
  try {
    client.get("ErcToken", async (err, result) => {
      if (err) {
        console.error("Error fetching data from Redis:", err);
        return;
      }
      //  if (result === null) {
      try {
        await seterc20Token(function (response) {
          processErc20Data(response, address, userId);
        });
      } catch (fetchErr) {
        console.error("Error fetching data from external service:", fetchErr);
      }
      //  } else {
      //    try {
      //      const response = JSON.parse(result);
      //      processErc20Data(response, address,userId);
      //    } catch (parseErr) {
      //      console.error("Error parsing cached data:", parseErr);
      //    }
      //  }
    });
  } catch (err) {
    console.log(err, "get_erc20_token_err")
  }
};

const ethtokendeposit = async function ( userId,address, currencySymbol, currency, tokenContractAddress,decimal) {
  try{
    const url = `https://${process.env.ETH_API}?module=account&action=tokentx&contractaddress=${tokenContractAddress}&address=${address}&endblock=latest&apikey=${process.env.ETHKEY}`;
    const response = await axios.get(url);
    const responseTxn = response.data.result;
    if(responseTxn.length > 0 && typeof responseTxn == "object")
    {
      await Promise.allSettled(responseTxn.map(async (tx) => {
        try{
          
        if(tx.to.toLowerCase() == address.toLowerCase())
        {
          const existingDeposit = await depositDB.findOne({ txnid: tx.hash }).exec();
          let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
          if (!existingDeposit || existingDeposit==null) {
             const depamt = tx.value/Math.pow(10, decimal? decimal:"18"); // Convert Wei to ETH
      
              const create_deposit_obj = {
                  userId: userId,
                  currency: currency,
                  currencySymbol: currencySymbol,
                  depamt: parseFloat(depamt),
                  network:"ERC20",
                  depto: address,
                  txnid: tx.hash,
                  currencyMoveStatus:0,
                  createdDate :new Date(),
                  modifiedDate:new Date(),
              };
              const create_deposit = await depositDB.create(create_deposit_obj);
              if(address_detail.type == 1){
                const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                if (userWallet) {
                     const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                if (walletIndex !== -1) {
                     userWallet.wallets[walletIndex].amount += depamt;
                     await userWallet.save();
                     console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
    
                } else {
                     console.log(`Currency not found in wallet for user ${userId}`);
                     }
               } else {
                     console.log(`Wallet not found for user ${userId}`);
               }
              }
              else
              {
               const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                 if (userWallet) {
                     const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                 if (walletIndex !== -1) {
                     userWallet.wallets[walletIndex].amount += depamt;
                     await userWallet.save();
                     console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                     await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate,"ERC20"); // Similar to ETH transfers
                 } else {
                     console.log(`Currency not found in wallet for user ${userId}`);
                     }
               } else {
                     console.log(`Wallet not found for user ${userId}`);
               }
             }
           }
        }
        
        }catch(Err){
         console.log(Err)
        }
       
         }));
    }
   
  }catch(err){
    console.log(err,"=-=-=-=")
  }
 }

//TRX DEPOSIT FUNCION 
const trxdeposit =async function (address, userId, currencySymbol, currency,admin_address) {
  try {
    
      const url = `https://${process.env.TRX_API}/v1/accounts/${address}/transactions?only_confirmed=true&only_to=true`;

      const response = await axios.get(url);
        const responseTxn = response.data.data;
        console.log("responseTxn trx --->>>",responseTxn);
        await Promise.allSettled(responseTxn.map(async (tx) => {
        if(tx.from != admin_address)
        {
          let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
          const existingDeposit = await depositDB.findOne({ txnid: tx.hash });
          if (!existingDeposit || existingDeposit ==null ) {
            const tx = response.data.data[0]; // Assuming you are interested in the first transaction in the list
            const txID = tx.txID; // Get transaction ID (hash)
            const amountInWei = tx.raw_data.contract[0].parameter.value.amount; // Amount is in Wei
            const ownerAddress = tx.raw_data.contract[0].parameter.value.owner_address; // Owner's address
            const depamt = amountInWei / Math.pow(10, 6); // 1 TRX = 1,000,000 Sun
            const create_deposit_obj = {
                userId: userId,
                currency: currency,
                currencySymbol: currencySymbol,
                depamt: parseFloat(depamt), // Parse the deposit amount to float
                depto: address, // Address of the depositor
                txnid: txID,
                currencyMoveStatus:0,
                createdDate :new Date(),
                modifiedDate:new Date(),
            };
            const create_deposit = await depositDB.create(create_deposit_obj);
            if(address_detail.type == 1){
              const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
              if (userWallet) {
                  const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
              if (walletIndex !== -1) {
                  userWallet.wallets[walletIndex].amount += depamt;
                  await userWallet.save();
                  console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
              } else {
                  console.log(`Currency not found in wallet for user ${userId}`);
                  }
            } else {
                  console.log(`Wallet not found for user ${userId}`);
            }
            }
            else{
            const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                  const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                  userWallet.wallets[walletIndex].amount += depamt;
                  await userWallet.save();
                  console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                  await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate); // Similar to ETH transfers
            } else {
                  console.log(`Currency not found in wallet for user ${userId}`);
                  }
            } else {
                  console.log(`Wallet not found for user ${userId}`);
            }
          }
        }
      }
      
    }));
      } catch (error) {
      console.error("Error:", error);
      }
};

const processTRC20Data = (response, address, userId) => {
  try {
    console.log("call processTRC20Data ===", response)
    if (response && response.length > 0) {
      response.forEach((item, index) => {
        const { contractAddress_trc20: contractAddress, coinDecimal_trc20: decimal } = item;
        if (contractAddress) {
          trxtokendeposit(address, userId, item.currencySymbol, item._id, contractAddress, item.coinDecimal_trc20);
        }
      });
    }
  } catch (err) {
    console.log(err, "error")
  }
};

const get_trc20_token = async function (userId, address) {
  try {
    console.log("call trc20 ===", address, userId)
    client.get("ErcToken", async (err, result) => {
      if (err) {
        console.error("Error fetching data from Redis:", err);
        return;
      }
      //  if (result === null) {
      try {
        await settrc20Token(function (response) {
          processTRC20Data(response, address, userId);
        });
      } catch (fetchErr) {
        console.error("Error fetching data from external service:", fetchErr);
      }
      //  } else {
      //    try {
      //      const response = JSON.parse(result);
      //      processTRC20Data(response, address,userId);
      //    } catch (parseErr) {
      //      console.error("Error parsing cached data:", parseErr);
      //    }
      //  }
    });
  } catch (err) {
    console.log(err, "get_erc20_token_err")
  }
};

const trxtokendeposit = async function ( userId,address, currencySymbol, currency, tokenContractAddress,decimal) {
  try{
    const url = `https://${process.env.TRON_HOST}/v1/accounts/${address}/transactions/trc20?only_confirmed=true&only_to=true&contract_address=${tokenContractAddress}&TRON-PRO-API-KEY=${process.env.TRX_APIKEY}`;
    const response = await axios.get(url);
    const responseTxn = response.data.data;
    await Promise.allSettled(responseTxn.map(async (tx) => {
     try{
      const existingDeposit = await depositDB.findOne({ txnid: tx.transaction_id }).exec();
      if (!existingDeposit || existingDeposit==null) {
      const depamt = tx.value/Math.pow(10, decimal);
  
          const create_deposit_obj = {
              userId: userId,
              currency: currency,
              currencySymbol: currencySymbol,
              depamt: parseFloat(depamt),
              depto: address,
              txnid: tx.transaction_id,
              currencyMoveStatus:0,
              network: "TRC20",
              createdDate :new Date(),
              modifiedDate:new Date(),
          };
          const create_deposit = await depositDB.create(create_deposit_obj);

          let address_detail = await userCryptoAddress.findOne({address:address}).collation({ locale: 'en', strength: 2 });
          
          if(address_detail.type == 1){
            const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                 const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                 userWallet.wallets[walletIndex].amount += depamt;
                 await userWallet.save();
                 console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
            } else {
                 console.log(`Currency not found in wallet for user ${userId}`);
                 }
           } else {
                 console.log(`Wallet not found for user ${userId}`);
           }
          }
          else
          {
           const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
            if (userWallet) {
                  const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
            if (walletIndex !== -1) {
                  userWallet.wallets[walletIndex].amount += depamt;
                  await userWallet.save();
                  await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit.createddate,"TRC20");
            } else {
                  console.log(`Currency not found in wallet for user ${userId}`);
              }
            } else {
                console.log(`Wallet not found for user ${userId}`);
            }
           }
        }
     }
     catch(Err)
     {
      console.log(Err)
     }
    
    }));

  }catch(err){

    console.log(err,"=-=-=-=")
  
  }
}

//XRP
const xrp_deposit =async function (address, userId, currencySymbol, currency,admin_address) {
  try{
    const rippleAPI = process.env.XRP_API;
    const requestBody = {
        method: "account_tx",
        params: [
            {
                account: address, // Replace with your testnet account
                binary: false,
                forward: false,
                ledger_index_max: -1,
                ledger_index_min: -1,
                limit: 2
            }
        ]
    };
    // Send the request
    axios.post(rippleAPI, requestBody).then(async response => {
        var responseTxn = response.data.result.transactions;
        if(responseTxn.length > 0)
        {
          await Promise.allSettled(responseTxn.map(async (txData) => {
            const tx = txData.tx; // Extract transaction data
            const txID = tx.hash; // Transaction ID (hash)
            const amountInDrops = tx.Amount; // Amount in drops
            const depamt = amountInDrops / 1000000; // Convert drops to XRP

            const fromAddress = tx.Destination;
            const toAddress = tx.Account;

            // console.log("fromAddress",fromAddress)
            // console.log("admin_address",admin_address)
            if(fromAddress != admin_address)
            {
              // Check for existing deposits in the database
            const existingDeposit = await depositDB.findOne({ txnid: txID });
            // Process transaction if not already recorded
            if (!existingDeposit) {
              // Create a new deposit object
              const create_deposit_obj = {
                userId: userId,
                currency: currency,
                currencySymbol: currencySymbol,
                depamt: parseFloat(depamt), // Ensure amount is a float
                depto: address, // Sender's address
                txnid: txID,
                currencyMoveStatus:0,
                createdDate :new Date(),
                modifiedDate:new Date(),
              };
          
              // Save deposit to the database
              await depositDB.create(create_deposit_obj);
              
              // Update user wallet balance
              if(toAddress == admin_address){
                const userWallet = await adminWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                if (userWallet) {
                    const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                if (walletIndex !== -1) {
                    userWallet.wallets[walletIndex].amount += depamt;
                    await userWallet.save();
                    console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);

                } else {
                    console.log(`Currency not found in wallet for user ${userId}`);
                    }
              } else {
                    console.log(`Wallet not found for user ${userId}`);
              }
              }else{
                const userWallet = await userWalletDB.findOne({ userId: userId, 'wallets.currencyId': currency });
                if (userWallet) {
                      const walletIndex = userWallet.wallets.findIndex(w => w.currencyId.equals(currency));
                if (walletIndex !== -1) {
                      userWallet.wallets[walletIndex].amount += depamt;
                      await userWallet.save();
                      //console.log(`Updated balance for user ${userId}: ${userWallet.wallets[walletIndex].amount}`);
                    await email_function(create_deposit_obj.userId,create_deposit_obj.currencySymbol,create_deposit_obj.txnid,create_deposit_obj.depamt,userWallet.wallets[walletIndex].amount,create_deposit_obj.createdDate); // Similar to ETH transfers

                } else {
                    // console.log(`Currency not found in wallet for user ${userId}`);
                      }
                } else {
                    //  console.log(`Wallet not found for user ${userId}`);
                }
              }
            }
            }
          }));
      }
    })
    .catch(error => {
      console.error("Error:", error.response ? error.response.data : error.message); // Log any errors
      });
    }
    catch(err)
    {
      console.error("Error:", err);
    }
}

const email_function = async (userid,currencySymbol,txhash,amount,balance,date,network)=>{
  try{
    console.log(userid,currencySymbol,txhash,amount,balance,date,network,"userid,currencySymbol,txhash,amount,balance,date,network")
    var getuser= await usersDB.findOne({_id:userid})

    var findDetails = await antiPhishing.findOne({ userid: userid });
    var APCODE = `Antiphising Code - ${findDetails ? findDetails.APcode : ""}`

    mailtempDB
    .findOne({ key: "DEPOSIT_FUNCTION" })
    .exec(function (err1, resData) {
      if (resData == null) {
        res.status(400).json({ message: "Email not sent" });
      } else {
        var etempdataDynamic = resData.body
          .replace(/###USERNAME###/g, getuser.displayname)
          .replace(/###CURRENCY_SYMBOL###/g,currencySymbol)
          .replace(/###TX_HASH###/g, txhash) 
          .replace(/###AMOUNT###/g, amount) 
          .replace(/###BALANCE###/g, balance) 
          .replace(/###DATE###/g, date) 
          .replace(/###APCODE###/g, findDetails && findDetails.Status == "true" ? APCODE : "")
          .replace(/###NETWORK###/g, network==""||network==null || network==undefined ? "" : `NetWork:${network}`);
          console.log(etempdataDynamic,"etempdataDynamic",common.decrypt( getuser.email))
        mail.sendMail(
          {
            from: {
              name: process.env.FROM_NAME,
              address: process.env.FROM_EMAIL,
            },
          
            to:common.decrypt( getuser.email),
            subject: resData.Subject,
            html: etempdataDynamic,
          },
          async function (mailRes) {
           console.log()
          })}})
  }catch(err){
    console.log(err,"-------==-")
  }
  }

    module.exports ={btcdeposit,xrp_deposit,get_trc20_token,trxdeposit,get_erc20_token,get_bnb_token,ethdeposit,bnbdeposit}