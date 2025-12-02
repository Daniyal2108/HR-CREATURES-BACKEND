const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
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
    month: {
      type: Number, // 1-12
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    // Earnings
    basicSalary: {
      type: Number,
      required: true,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    bonuses: {
      type: Number,
      default: 0,
    },
    overtime: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      required: true,
    },
    // Deductions
    tax: {
      type: Number,
      default: 0,
    },
    providentFund: {
      type: Number,
      default: 0,
    },
    insurance: {
      type: Number,
      default: 0,
    },
    leaveDeductions: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    // Net Salary
    netSalary: {
      type: Number,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['Draft', 'Generated', 'Paid', 'Cancelled'],
      default: 'Draft',
    },
    paidDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Cheque', 'Online'],
    },
    transactionId: {
      type: String,
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
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ hr: 1, month: 1, year: 1 });

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;

