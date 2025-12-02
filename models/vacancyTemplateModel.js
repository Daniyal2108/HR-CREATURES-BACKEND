const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema(
  {
    hr:{
      type:mongoose.Schema.Types.ObjectId,ref:'User'
    },
    status:{
      type:String,
      enum:['Inprogress','Active'],
      default:'Inprogress'
    },
    name: {
      type: String
    },
    department:{
      type:mongoose.Schema.Types.ObjectId,ref:"Department"
    },
    noOfVacancies:{
      type:Number
    },
    jobTitle:{
      type:String
    },
    jobDescription:{
      type:String
    },
    salaryRangeFrom:{
      type:Number
    },
    salaryRangeTo:{
      type:Number
    },
    education:{
      type:String
    },
    experience:{
      type:String
    },
    expectedJoiningDate:{
      type:Date
    },
    age:{
      type:Number
    },
    expectedSalary:{
      type:Number
    },
    skills:{
      type:[String]
    },
    candidateForm:{
      type:Array
    }
  },
  { timestamps: true }
);

const VacancyTemplate = mongoose.model('VacancyTemplate',VacancySchema);

module.exports = VacancyTemplate;
