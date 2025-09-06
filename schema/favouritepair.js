var mongoose = require('mongoose');

// Define the schema for favorite currency pairs
var favouritePairSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: 'Users',  // Reference to 'Users' collection
        index: true    // Create an index for fast querying
    },
    pair: {
        type: [String] // An array to store multiple pairs as strings
    },
    from_symbol_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency', // Reference to 'currency' collection
        index: true      // Index for faster lookups
    },
    to_symbol_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'currency', // Reference to 'currency' collection
        index: true      // Index for faster lookups
    },
    decimals: {
        type: String,     // Stores decimal values as a string
        trim: true,       // Removes whitespace around the value
        default: '2'      // Default value is '2'
    },
    status: {
        type: Number,     // Status field (0 = stop, 1 = active)
        default: 1        // Default value is 1 (active)
    }
},
    {
        timestamps: true // Automatically adds createdAt and updatedAt fields
    });

// Create and export the model
var FavouritePair = mongoose.model('favouritepair', favouritePairSchema);
module.exports = FavouritePair;
