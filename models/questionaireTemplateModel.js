const mongoose = require('mongoose');

const QuestionaireSchema = new mongoose.Schema(
  {
    hr:{
      type:mongoose.Schema.Types.ObjectId,ref:'User'
    },
    title: {
      type: String
    },
    status:{
      type:String,
      enum:['Inprogress','Active'],
      default:'Active',
    },
    timeAllowed:{
      type:String
    },
    otherDetails:{
      type:String
    },
    questions: {
      type: [{Q:String,question:String,options:[String],correctAnswer:String}],
      default:[]
    },
  },
  { timestamps: true }
);

const Questionaire = mongoose.model('QuestionaireTemplate',QuestionaireSchema);

module.exports = Questionaire;
