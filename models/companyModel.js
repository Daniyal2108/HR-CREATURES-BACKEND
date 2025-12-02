const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique:true
    },
  },
  { timestamps: true }
);

const Company = mongoose.model('Company',CompanySchema);

module.exports = Company;
