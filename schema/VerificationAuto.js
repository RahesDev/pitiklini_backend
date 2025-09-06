const mongoose = require("mongoose");

const VerificationSchema = new mongoose.Schema({
  applicant_id: { type: String, required: true },
  external_id: { type: String, required: true },
  document_type: { type: String },
  organization_id: { type: String },
  created_at: { type: Date },
  completed_at: { type: Date },
  verification_url: { type: String },
  verification_url_id: { type: String },
  expires_at: { type: Date },
  
  checks: {
    liveness: {
      status: { type: String },
      errorDetails: [{ code: Number, message: String }], 
    },
    document_mrz: {
      status: { type: String },
      errorDetails: [{ code: Number, message: String }], 
    },
    face_comparison: {
      status: { type: String },
      errorDetails: [{ code: Number, message: String }], 
    },
  },

  documents: [
    {
      document_id: { type: String },
      document_type: { type: String },
      content_type: { type: String },
      rotation_angle: { type: Number },
    },
  ],

  poi_data: mongoose.Schema.Types.Mixed, 
  details: mongoose.Schema.Types.Mixed, 
});

module.exports = mongoose.model("Verification", VerificationSchema);
