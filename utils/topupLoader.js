const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

let topupData = [];

function loadTopupCSV() {
  return new Promise((resolve) => {
    const results = [];

    const filePath = path.join(__dirname, "../data/topup_costs.csv");
    console.log("Reading CSV File From:", filePath);

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => {
        topupData = results;
        console.log("Topup CSV loaded:", results.length);
        resolve();
      });
  });
}

function getOperators() {
  const ops = [...new Set(topupData.map((r) => r.operator))];

  return ops.map((o) => ({
    code: o,
    name: o,
  }));
}

function getPlans(operatorName) {
  return topupData
    .filter((r) => r.operator === operatorName)
    .map((r) => ({
      id: r.id_product,
      amount: r.product,
      cost: r.cost_amount,
      desc: `${r.product} ${r.local_currency}`,
      cost_amount: r.cost_amount,
      cost_currency: r.cost_currency,
    }));
}

module.exports = { loadTopupCSV, getOperators, getPlans };
