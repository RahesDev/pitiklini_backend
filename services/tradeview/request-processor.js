"use strict";

var version = "2.0.4";

var https = require("https");
// var https = require("http");

var quandlCache = {};

//const configFile = require('../Nodedetails/config');

var quandlCacheCleanupTime = 3 * 60 * 60 * 1000; // 3 hours
var quandlKeysValidateTime = 15 * 60 * 1000; // 15 minutes

var quandlMinimumDate = "2021-01-01";

// this cache is intended to reduce number of requests to Quandl
setInterval(function () {
  quandlCache = {};
}, quandlCacheCleanupTime);

function dateForLogs() {
  return new Date().toISOString() + ": ";
}

var defaultResponseHeader = {
  "Content-Type": "text/plain",
  "Access-Control-Allow-Origin": "*",
};

function sendJsonResponse(response, jsonData) {
  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(jsonData));
  response.end();
}

function dateToYMD(date) {
  var obj = new Date(date);
  var year = obj.getFullYear();
  var m = obj.getMonth() + 1;
  var month = m < 10 ? "0" + m : m;
  var d = obj.getDate();
  var day = d < 10 ? "0" + d : d;
  return year + "-" + month + "-" + day;
}

var quandlKeys = "vvPgrMvLdLtKtYB84izt";
var invalidQuandlKeys = [];

function getValidQuandlKey() {
  for (var i = 0; i < quandlKeys.length; i++) {
    var key = quandlKeys[i];
    if (invalidQuandlKeys.indexOf(key) === -1) {
      return key;
    }
  }
  return null;
}

function markQuandlKeyAsInvalid(key) {
  if (invalidQuandlKeys.indexOf(key) !== -1) {
    return;
  }

  invalidQuandlKeys.push(key);

  setTimeout(function () {}, quandlKeysValidateTime);
}

function sendError(error, response) {
  response.writeHead(200, defaultResponseHeader);
  response.write('{"s":"error","errmsg":"' + error + '"}');
  response.end();
}

function httpGet(datafeedHost, path, callback) {
  //console.log(datafeedHost,'datafeedHost')
  //console.log(path,'pathdata')
  var options = {
    host: datafeedHost,
    path: path,
    rejectUnauthorized: false,
    port: process.env.PORT,
    method: "GET",
    headers: {"Content-Type": "application/json"},
    // strictSSL: true
  };
  //console.log(options,"options");

  function onDataCallback(response) {
    var result = "";
    response.on("data", function (chunk) {
      result += chunk;
    });

    response.on("end", function () {
      if (response.statusCode !== 200) {
        callback({
          status: "ERR_STATUS_CODE",
          errmsg: response.statusMessage || "",
        });
        return;
      }

      callback({status: "ok", data: result});
    });
  }

  var req = https.request(options, onDataCallback);

  req.on("socket", function (socket) {
    socket.setTimeout(50000);
    socket.on("timeout", function () {
      req.abort();
    });
  });

  req.on("error", function (e) {
    callback({status: "ERR_SOCKET", errmsg: e.message || ""});
  });

  req.end();
}

function convertQuandlHistoryToUDFFormat(data) {
  function parseDate(input) {
    var parts = input.split("-");
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function columnIndices(columns) {
    var indices = {};
    for (var i = 0; i < columns.length; i++) {
      indices[columns[i].name] = i;
    }

    return indices;
  }

  var result = {
    t: [],
    c: [],
    o: [],
    h: [],
    l: [],
    v: [],
    s: "ok",
  };

  try {
    // console.log("convertQuandlHistoryToUDFFormat")
    var json = JSON.parse(data);
    // var datatable = json.datatable;
    // var idx = columnIndices(datatable.columns);
    json
      .sort(function (row1, row2) {
        return new Date(row1["Date"]) - new Date(row2["Date"]);
      })
      .forEach(function (row) {
        result.t.push(new Date(row["Date"]) / 1000);
        result.o.push(row["open"]);
        result.h.push(row["high"]);
        result.l.push(row["low"]);
        result.c.push(row["close"]);
        result.v.push(row["volume"]);
      });
  } catch (error) {
    //console.log(error)
    return null;
  }
  console.log("return result");
  return result;
}

function proxyRequest(controller, options, response) {
  controller
    .request(options, function (res) {
      var result = "";

      res.on("data", function (chunk) {
        result += chunk;
      });

      res.on("end", function () {
        if (res.statusCode !== 200) {
          response.writeHead(200, defaultResponseHeader);
          response.write(
            JSON.stringify({
              s: "error",
              errmsg: "Failed to get news",
            })
          );
          response.end();
          return;
        }
        response.writeHead(200, defaultResponseHeader);
        response.write(result);
        response.end();
      });
    })
    .end();
}

function RequestProcessor(symbolsDatabase) {
  this._symbolsDatabase = symbolsDatabase;
}

function filterDataPeriod(data, fromSeconds, toSeconds) {
  console.log(
    filterDataPeriod,
    "filterDataPeriodfilterDataPeriodfilterDataPeriod"
  );
  if (!data || !data.t) {
    return data;
  }

  if (data.t[data.t.length - 1] < fromSeconds) {
    return {
      s: "no_data",
      nextTime: data.t[data.t.length - 1],
    };
  }

  var fromIndex = null;
  var toIndex = null;
  var times = data.t;
  for (var i = 0; i < times.length; i++) {
    var time = times[i];
    if (fromIndex === null && time >= fromSeconds) {
      fromIndex = i;
    }
    if (toIndex === null && time >= toSeconds) {
      toIndex = time > toSeconds ? i - 1 : i;
    }
    if (fromIndex !== null && toIndex !== null) {
      break;
    }
  }

  fromIndex = fromIndex || 0;
  toIndex = toIndex ? toIndex + 1 : times.length;

  var s = data.s;

  if (toSeconds < times[0]) {
    s = "no_data";
  }

  toIndex = Math.min(fromIndex + 1000, toIndex); // do not send more than 1000 bars for server capacity reasons

  return {
    t: data.t.slice(fromIndex, toIndex),
    o: data.o.slice(fromIndex, toIndex),
    h: data.h.slice(fromIndex, toIndex),
    l: data.l.slice(fromIndex, toIndex),
    c: data.c.slice(fromIndex, toIndex),
    v: data.v.slice(fromIndex, toIndex),
    s: s,
  };
}

RequestProcessor.prototype._sendConfig = function (response) {
  var config = {
    supports_search: true,
    supports_group_request: false,
    supports_marks: true,
    supports_timescale_marks: true,
    supports_time: true,
    exchanges: [
      {
        value: "",
        name: "All Exchanges",
        desc: "",
      },
      {
        value: "Pitiklini",
        name: "Pitiklini",
        desc: "Pitiklini",
      },
    ],
    symbols_types: [
      {
        name: "All types",
        value: "",
      },
      {
        name: "Stock",
        value: "stock",
      },
    ],
    supported_resolutions: [
      "1",
      "5",
      "15",
      "30",
      "60",
      "120",
      "240",
      "360",
      "720",
      "1D",
    ],
    //supported_resolutions: ["1","5","30","120","240","360","720", "1D", "2D", "3D", "1W", "3W", "1M", "6M"]
  };

  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(config));
  response.end();
};

RequestProcessor.prototype._sendMarks = function (response) {
  var now = new Date();
  now =
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ) / 1000;
  var day = 60 * 60 * 24;

  var marks = {
    id: [0, 1, 2, 3, 4, 5],
    time: [
      now,
      now - day * 4,
      now - day * 7,
      now - day * 7,
      now - day * 15,
      now - day * 30,
    ],
    color: ["red", "blue", "green", "red", "blue", "green"],
    text: [
      "Today",
      "4 days back",
      "7 days back + Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "7 days back once again",
      "15 days back",
      "30 days back",
    ],
    label: ["A", "B", "CORE", "D", "EURO", "F"],
    labelFontColor: ["white", "white", "red", "#FFFFFF", "white", "#000"],
    minSize: [14, 28, 7, 40, 7, 14],
  };
  console.log(marks, "marksmarksmarks");
  console.log(defaultResponseHeader, "defaultResponseHeader");
  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(marks));
  response.end();
};

RequestProcessor.prototype._sendTime = function (response) {
  var now = new Date();
  response.writeHead(200, defaultResponseHeader);
  response.write(Math.floor(now / 1000) + "");
  response.end();
};

RequestProcessor.prototype._sendTimescaleMarks = function (response) {
  var now = new Date();
  now =
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    ) / 1000;
  var day = 60 * 60 * 24;

  var marks = [
    {
      id: "tsm1",
      time: now,
      color: "red",
      label: "A",
      tooltip: "",
    },
    {
      id: "tsm2",
      time: now - day * 4,
      color: "blue",
      label: "D",
      tooltip: [
        "Dividends: $0.56",
        "Date: " + new Date((now - day * 4) * 1000).toDateString(),
      ],
    },
    {
      id: "tsm3",
      time: now - day * 7,
      color: "green",
      label: "D",
      tooltip: [
        "Dividends: $3.46",
        "Date: " + new Date((now - day * 7) * 1000).toDateString(),
      ],
    },
    {
      id: "tsm4",
      time: now - day * 15,
      color: "#999999",
      label: "E",
      tooltip: ["Earnings: $3.44", "Estimate: $3.60"],
    },
    {
      id: "tsm7",
      time: now - day * 30,
      color: "red",
      label: "E",
      tooltip: ["Earnings: $5.40", "Estimate: $5.00"],
    },
  ];

  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(marks));
  response.end();
};

RequestProcessor.prototype._sendSymbolSearchResults = function (
  query,
  type,
  exchange,
  maxRecords,
  response
) {
  if (!maxRecords) {
    throw "wrong_query";
  }

  var result = this._symbolsDatabase.search(query, type, exchange, maxRecords);

  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(result));
  response.end();
};

RequestProcessor.prototype._prepareSymbolInfo = function (symbolName) {
  var symbolInfo = this._symbolsDatabase.symbolInfo(symbolName);
  var symbolsplit = symbolInfo.name.split("_");
  if (!symbolInfo) {
    throw "unknown_symbol " + symbolName;
  }
  return {
    name: symbolsplit[0] + "/" + symbolsplit[1],
    "exchange-traded": "Pitiklini",
    "exchange-listed": "Pitiklini",
    timezone: "Asia/kolkata",
    minmov: 1,
    minmov2: 0,
    pointvalue: 1,
    session: "24x7",
    has_intraday: true,
    has_no_volume: false,
    description:
      symbolInfo.description.length > 0
        ? symbolInfo.description
        : symbolInfo.name,
    type: "stock",
    // "supported_resolutions": [ "1","5","30"],
    supported_resolutions: [
      "1",
      "5",
      "15",
      "30",
      "60",
      "120",
      "240",
      "360",
      "720",
      "1D",
      "2D",
      "3D",
      "1W",
      "3W",
      "1M",
      "6M",
    ],
    //"pricescale": 100000000,
    pricescale:
      symbolsplit[1] == "BTC" ||
      symbolsplit[0] == "SHIB" ||
      symbolsplit[0] == "DOGE" ||
      symbolsplit[1] == "BNB"
        ? 100000000
        : 100,
    ticker: symbolInfo.name.toUpperCase(),
  };
};

RequestProcessor.prototype._sendSymbolInfo = function (symbolName, response) {
  var info = this._prepareSymbolInfo(symbolName);

  response.writeHead(200, defaultResponseHeader);
  response.write(JSON.stringify(info));
  response.end();
};

RequestProcessor.prototype._sendSymbolHistory = function (
  symbol,
  startDateTimestamp,
  endDateTimestamp,
  resolution,
  response
) {
  // console.log(resolution,'chart resolution');
  // if(startDateTimestamp.length<10)
  // {
  // 	return false;
  // }
  var aatimstamp = startDateTimestamp * 1000;
  //console.log(aatimstamp,'aatimstampaatimstamp')
  var adate = new Date(aatimstamp);
  //console.log(adate,'adateadateadateadateadate')
  adate.setDate(adate.getDate() - 7);
  var month = (adate.getMonth() + 1).toString().padStart(2, "0");

  // var quandlMinimumDate = (adate.getFullYear()<2020)?2021:adate.getFullYear()+'-'+ (month) +'-'+adate.getDate();
  var quandlMinimumDate = startDateTimestamp;

  var edate = new Date(endDateTimestamp * 1000);
  edate.setDate(edate.getDate() - 7);
  var month = (edate.getMonth() + 1).toString().padStart(2, "0");

  var enddates = edate.getFullYear() + "-" + month + "-" + edate.getDate();

  // var d = new Date(startDateTimestamp);
  // var statdzte=d.getDate() + '-' + (d.getMonth()+1) + '-' + d.getFullYear();

  function sendResult(content) {
    //console.log(content,'sendResultsendResult')
    var header = Object.assign({}, defaultResponseHeader);
    header["Content-Length"] = content.length;
    response.writeHead(200, header);
    response.write(content, null, function () {
      console.log("end");
      response.end();
    });
    setTimeout(function () {
      console.log("setTimeout");
      response.end();
    }, 2000);
  }

  function secondsToISO(sec) {
    if (sec === null || sec === undefined) {
      return "n/a";
    }
    return new Date(sec * 1000).toISOString();
  }

  function logForData(data, key, isCached) {
    var fromCacheTime = data && data.t ? data.t[0] : null;
    var toCacheTime = data && data.t ? data.t[data.t.length - 1] : null;
  }

  // always request all data to reduce number of requests to quandl
  var from = quandlMinimumDate;
  //var to =enddates;
  var to = dateToYMD(Date.now());
  //var to = Date.now();

  var key = symbol + "|" + from + "|" + to;

  if (quandlCache[key]) {
    var dataFromCache = filterDataPeriod(
      quandlCache[key],
      startDateTimestamp,
      endDateTimestamp
    );
    logForData(dataFromCache, key, true);
    sendResult(JSON.stringify(dataFromCache));
    return;
  }

  var quandlKey = getValidQuandlKey();

  if (quandlKey === null) {
    sendError("No valid API Keys available", response);
    return;
  }

  var MyDate = new Date(from);
  var MyDateString;

  MyDate.setDate(MyDate.getDate());

  MyDateString =
    (MyDate.getFullYear() < 2020 ? 2021 : MyDate.getFullYear()) +
    "-" +
    ("0" + (MyDate.getMonth() + 1)).slice(-2) +
    "-" +
    ("0" + MyDate.getDate()).slice(-2);

  var address =
    "/chartapi/chartData?market=" +
    symbol +
    "&start_date=" +
    from +
    "&end_date=" +
    to +
    "&resolution=" +
    resolution;
  httpGet("localhost", address, function (result) {
    if (response.finished) {
      return;
    }
    if (result.status !== "ok") {
      if (result.status === "ERR_SOCKET") {
        sendError("Socket problem with request " + result.errmsg, response);
        return;
      }
    }
    var data = convertQuandlHistoryToUDFFormat(result.data);
    var filteredData = filterDataPeriod(
      data,
      startDateTimestamp,
      endDateTimestamp
    );
    logForData(filteredData, key, false);
    //console.log(JSON.stringify(filteredData),'JSON.stringify(filteredData)')
    sendResult(JSON.stringify(filteredData));
  });
};

RequestProcessor.prototype.processRequest = function (action, query, response) {
  try {
    console.log("query['resolution']====", query["resolution"]);
    if (action === "/config") {
      this._sendConfig(response);
    } else if (action === "/symbols" && !!query["symbol"]) {
      this._sendSymbolInfo(query["symbol"], response);
    } else if (action === "/search") {
      this._sendSymbolSearchResults(
        query["query"],
        query["type"],
        query["exchange"],
        query["limit"],
        response
      );
    } else if (action === "/history") {
      this._sendSymbolHistory(
        query["symbol"],
        query["from"],
        query["to"],
        query["resolution"].toLowerCase(),
        response
      );
    } else if (action === "/quotes") {
      this._sendQuotes(query["symbols"], response);
    } else if (action === "/marks") {
      this._sendMarks(response);
    } else if (action === "/time") {
      this._sendTime(response);
    } else if (action === "/timescale_marks") {
      this._sendTimescaleMarks(response);
    } else if (action === "/news") {
      this._sendNews(query["symbol"], response);
    } else if (action === "/futuresmag") {
      this._sendFuturesmag(response);
    } else {
      response.writeHead(200, defaultResponseHeader);
      response.write(
        "Datafeed version is " +
          version +
          "\nValid keys count is " +
          String(quandlKeys.length - invalidQuandlKeys.length) +
          "\nCurrent key is " +
          (getValidQuandlKey() || "").slice(0, 3) +
          (invalidQuandlKeys.length !== 0
            ? "\nInvalid keys are " +
              invalidQuandlKeys.reduce(function (prev, cur) {
                return prev + cur.slice(0, 3) + ",";
              }, "")
            : "")
      );
      response.end();
    }
  } catch (error) {
    sendError(error, response);
    //console.log(response,'CAche 66666666666666666666666666666666666666666666666666666')
  }
};

exports.RequestProcessor = RequestProcessor;
