const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required.'],
    },
    user:{
      type:mongoose.Schema.Types.ObjectId,ref:"User"
    }
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', DepartmentSchema);

module.exports = Department;
