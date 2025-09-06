const mongoose = require('mongoose');

const db1 = mongoose.createConnection(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db2 = mongoose.createConnection(process.env.DB_URL1, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

module.exports = { db1, db2 };
