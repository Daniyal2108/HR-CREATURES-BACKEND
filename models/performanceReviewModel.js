const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema(
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
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewPeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    reviewDate: {
      type: Date,
      default: Date.now,
    },
    // Performance Ratings (1-5 scale)
    ratings: {
      jobKnowledge: {
        type: Number,
        min: 1,
        max: 5,
      },
      workQuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      productivity: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      teamwork: {
        type: Number,
        min: 1,
        max: 5,
      },
      attendance: {
        type: Number,
        min: 1,
        max: 5,
      },
      initiative: {
        type: Number,
        min: 1,
        max: 5,
      },
      leadership: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Comments
    strengths: {
      type: String,
    },
    areasForImprovement: {
      type: String,
    },
    goals: {
      type: String,
    },
    comments: {
      type: String,
    },
    // Status
    status: {
      type: String,
      enum: ['Draft', 'In Review', 'Completed', 'Archived'],
      default: 'Draft',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
performanceReviewSchema.index({ employee: 1, reviewDate: -1 });
performanceReviewSchema.index({ hr: 1, status: 1 });

const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema);

module.exports = PerformanceReview;

