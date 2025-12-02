const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    vacancy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vacancy',
    },
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Result',
    },
    // Personal Information
    employeeId: {
      type: String,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    // Employment Details
    designation: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    employmentType: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'],
      default: 'Full-Time',
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    confirmationDate: {
      type: Date,
    },
    employmentStatus: {
      type: String,
      enum: ['Active', 'On Leave', 'Suspended', 'Terminated', 'Resigned'],
      default: 'Active',
    },
    // Salary Information
    salary: {
      type: Number,
    },
    salaryRangeFrom: {
      type: Number,
    },
    salaryRangeTo: {
      type: Number,
    },
    // Education & Experience
    education: {
      type: String,
    },
    additionalEducation: {
      type: String,
    },
    experience: {
      type: String,
    },
    skills: {
      type: [String],
      default: [],
    },
    // Documents
    uploadCv: {
      type: String,
    },
    photo: {
      type: String,
    },
    // Performance Scores (from selection process)
    paScore: {
      type: Number,
    },
    qaScore: {
      type: Number,
    },
    totalScore: {
      type: Number,
    },
    // Additional Information
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    dynamicInputs: {
      type: Object,
    },
    // User Account (if created)
    userAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes
    notes: {
      type: String,
    },
    // Timestamps
    lastPromotionDate: {
      type: Date,
    },
    lastSalaryRevisionDate: {
      type: Date,
    },
    terminationDate: {
      type: Date,
    },
    resignationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Generate Employee ID before saving
employeeSchema.pre('save', async function (next) {
  if (!this.employeeId && this.isNew) {
    try {
      const EmployeeModel = mongoose.model('Employee');
      const count = await EmployeeModel.countDocuments();
      let companyCode = 'HRC';
      
      if (this.company) {
        const Company = mongoose.model('Company');
        const company = await Company.findById(this.company);
        if (company && company.name) {
          companyCode = company.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        }
      }
      
      this.employeeId = `${companyCode}-${String(count + 1).padStart(5, '0')}`;
    } catch (err) {
      // If model not found or other error, use default
      this.employeeId = `HRC-${Date.now().toString().slice(-5)}`;
    }
  }
  next();
});

// Virtual for full name
employeeSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

employeeSchema.set('toObject', { virtuals: true });
employeeSchema.set('toJSON', { virtuals: true });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;

