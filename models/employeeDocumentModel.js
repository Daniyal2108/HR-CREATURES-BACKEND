const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    documentType: {
      type: String,
      enum: [
        'ID Proof',
        'Address Proof',
        'Educational Certificate',
        'Experience Certificate',
        'Contract',
        'NDA',
        'Offer Letter',
        'Appointment Letter',
        'Resignation Letter',
        'Other',
      ],
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number, // in bytes
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
employeeDocumentSchema.index({ employee: 1, documentType: 1 });
employeeDocumentSchema.index({ hr: 1 });

const EmployeeDocument = mongoose.model('EmployeeDocument', employeeDocumentSchema);

module.exports = EmployeeDocument;

