const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave'],
      default: 'Absent',
    },
    workingHours: {
      type: Number, // in hours
    },
    overtimeHours: {
      type: Number, // in hours
      default: 0,
    },
    notes: {
      type: String,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hr: 1, date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;

