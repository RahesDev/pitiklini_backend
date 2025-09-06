const mongoose = require('mongoose');
const key      = require('./key'); 

mongoose.connect(key.mongoURI, {useNewUrlParser: true,useUnifiedTopology: true }, (err) => {
    if (!err)
        console.log('MongoDB connection succeeded.');
    else
        console.log('Error in DB connection: ' + JSON.stringify(err, undefined, 2));
});

module.exports = mongoose;