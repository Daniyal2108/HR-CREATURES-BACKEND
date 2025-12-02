const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema(
  {
    hr:{
      type:mongoose.Schema.Types.ObjectId,ref:'User'
    },
    vacancyTemplate:{
      type:mongoose.Schema.Types.ObjectId,ref:'VacancyTemplate'
    },
    lastDateOfApply:{
      type:Date
    },
    joiningDate:{
      type:Date
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
    questionaireTemplate:{
      type:mongoose.Schema.Types.ObjectId,ref:'QuestionaireTemplate'
    },
    status:{
      type:String,
      enum:['Inprogress','Active','Inactive','Expired'],
      default:'Inprogress'
    },
    screeningStatus:{
      type:String,
      enum:['Screen Now','Screened','Repost'],
      default:'Screen Now'
    },
    appliedCandidates:{
      type:Number,
      default:0
    },
    selected:{
      type:[{type:mongoose.Schema.Types.ObjectId,ref:'Result'}],
      default:[]
    },
    rejected:{
      type:[{type:mongoose.Schema.Types.ObjectId,ref:'Result'}],
      default:[]
    },
    paScore: {
      type: Number
    },
    noOfParameters: {
      type: Number
    },
    paScoreValue: {
      type: Number
    },
    totalVacancyPaScore:{
      type: Number,
      default:5
    },
    qaScore: {
      type: Number
    },
    noOfQuestions:{
      type:Number
    },
    qaScoreValue: {
      type: Number
    },
    totalVacancyQaScore:{
      type: Number,
      default:5
    },
    totalScore: {
      type:Number
    },
    totalVacancyScore:{
      type: Number,
      default:10
    },
  },
  { timestamps: true }
);

const Vacancy = mongoose.model('Vacancy',VacancySchema);

module.exports = Vacancy;
