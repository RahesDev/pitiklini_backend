const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // User ID from the token
  time: { type: String, required: true },     // Time taken to answer
  status: { type: String, default: "Active"},     // Time taken to answer
  createdAt: { type: Date, default: Date.now }, // Date when quiz was created
  updatedAt: { type: Date, default: Date.now }, // Date when quiz was last updated
});

// Model for the quiz data collection
module.exports = mongoose.model("QuizData", quizSchema, "QuizData");