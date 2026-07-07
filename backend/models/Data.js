const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donorName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  foodType: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const BeneficiarySchema = new mongoose.Schema({
  beneficiaryName: {
    type: String,
    required: true,
    trim: true
  },
  needType: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
});

const Donation = mongoose.model('Donation', DonationSchema);
const Beneficiary = mongoose.model('Beneficiary', BeneficiarySchema);

module.exports = {
  Donation,
  Beneficiary
};
