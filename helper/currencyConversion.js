const axios = require("axios");

exports.currencyConversion = async (from, to) => {
  try {
    if ((from != "") & (to != "")) {
      const requestConfig = {
        method: "GET",
        url:
          "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" +
          from +
          "&tsyms=" +
          to +
          "&api_key=" +
          process.env.cryptocompare_api_1,
      };
      // "&api_key=400eb1d3ea6a6d1bad144dc7fd9568996b634fdfbb79f651218a3cf8010a9611",
      // console.log("requestConfig.url-->>",requestConfig.url);
      let response = await axios(requestConfig);
      var result = {};

      var result = response.data;
      console.log("result-->>",result);
      if(result.Response == "Error")
      {
        return false;
      }
      else
      {
        var decimal = 8;
        console.log(
          "parseFloat(result[from][to]).toFixed(decimal)===",
          parseFloat(result[from][to]).toFixed(decimal)
        );

        return parseFloat(result[from][to]).toFixed(decimal);
      }
      
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
