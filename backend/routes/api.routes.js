const express = require('express');
const router = express.Router();
const { Donation, Beneficiary } = require('../models/Data');
const { requireAuth } = require('../middleware/auth.middleware');

// GET /api/metrics
// Aggregates live dashboard statistics from the in-memory MongoDB collections.
router.get('/metrics', async (req, res) => {
  try {
    const totalDonations = await Donation.countDocuments();
    const totalBeneficiaries = await Beneficiary.countDocuments();

    const quantityAggregation = await Donation.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const totalFoodQuantity = quantityAggregation.length > 0
      ? quantityAggregation[0].totalQuantity
      : 0;

    const estimatedMealsServed = Math.round(totalFoodQuantity * 1.8);
    const estimatedWasteReducedKg = Math.round(totalFoodQuantity * 0.45 * 100) / 100;

    res.status(200).json({
      success: true,
      metrics: {
        totalDonations,
        totalBeneficiaries,
        totalFoodQuantity,
        estimatedMealsServed,
        estimatedWasteReducedKg
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics.',
      error: error.message
    });
  }
});

// POST /api/donations
// Saves a new donation document to MongoDB. Requires an authenticated user.
router.post('/donations', requireAuth, async (req, res) => {
  try {
    const { donorName, location, foodType, quantity } = req.body;

    if (!donorName || !location || !foodType || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'donorName, location, foodType, and quantity are all required.'
      });
    }

    const parsedQuantity = Number(quantity);

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be a valid non-negative number.'
      });
    }

    const donation = new Donation({
      donorName: String(donorName).trim(),
      location: String(location).trim(),
      foodType: String(foodType).trim(),
      quantity: parsedQuantity,
      createdBy: req.userId
    });

    await donation.save();

    res.status(201).json({
      success: true,
      message: 'Donation registered successfully.',
      data: donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save donation.',
      error: error.message
    });
  }
});

// POST /api/ai-plan
// Evaluates leftoverFood, peopleCount, weather, and budget using programmatic
// logic to return optimized portion metrics and menu alternatives.
router.post('/ai-plan', async (req, res) => {
  try {
    const { leftoverFood, peopleCount, weather, budget } = req.body;

    const leftover = Number(leftoverFood);
    const people = Number(peopleCount);
    const availableBudget = Number(budget);
    const weatherCondition = (weather || 'mild').toString().toLowerCase();

    if (Number.isNaN(leftover) || leftover < 0) {
      return res.status(400).json({
        success: false,
        message: 'leftoverFood must be a valid non-negative number.'
      });
    }

    if (Number.isNaN(people) || people <= 0) {
      return res.status(400).json({
        success: false,
        message: 'peopleCount must be a valid number greater than zero.'
      });
    }

    if (Number.isNaN(availableBudget) || availableBudget < 0) {
      return res.status(400).json({
        success: false,
        message: 'budget must be a valid non-negative number.'
      });
    }

    const basePortionPerPerson = leftover / people;

    let weatherFactor = 1;
    if (weatherCondition === 'hot') {
      weatherFactor = 0.85;
    } else if (weatherCondition === 'cold') {
      weatherFactor = 1.2;
    } else if (weatherCondition === 'rainy') {
      weatherFactor = 1.05;
    }

    const adjustedPortionPerPerson = Math.round(basePortionPerPerson * weatherFactor * 100) / 100;
    const totalAdjustedPortions = Math.round(adjustedPortionPerPerson * people * 100) / 100;
    const surplusOrDeficit = Math.round((leftover - totalAdjustedPortions) * 100) / 100;

    let menuAlternatives;
    if (weatherCondition === 'hot') {
      menuAlternatives = [
        'Chilled fruit salad bowls',
        'Cold rice and vegetable wraps',
        'Light vegetable soup served cool'
      ];
    } else if (weatherCondition === 'cold') {
      menuAlternatives = [
        'Hot vegetable stew',
        'Warm lentil and rice khichdi',
        'Spiced hot soup with bread'
      ];
    } else if (weatherCondition === 'rainy') {
      menuAlternatives = [
        'Hot tea with savory snacks',
        'Warm khichdi with pickle',
        'Steamed vegetable dumplings'
      ];
    } else {
      menuAlternatives = [
        'Balanced rice and curry combo',
        'Mixed vegetable pulao',
        'Roti with seasonal vegetable curry'
      ];
    }

    const budgetPerPerson = Math.round((availableBudget / people) * 100) / 100;

    let budgetTip;
    if (budgetPerPerson < 20) {
      budgetTip = 'Budget is tight per person. Prioritize grains and lentils over costlier perishables.';
    } else if (budgetPerPerson < 50) {
      budgetTip = 'Moderate budget per person. A balanced grain, lentil, and vegetable mix is achievable.';
    } else {
      budgetTip = 'Comfortable budget per person. Consider adding fruits or dairy for nutritional variety.';
    }

    res.status(200).json({
      success: true,
      plan: {
        adjustedPortionPerPerson,
        totalAdjustedPortions,
        surplusOrDeficit,
        weatherFactor,
        budgetPerPerson,
        budgetTip,
        menuAlternatives
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI plan.',
      error: error.message
    });
  }
});

// POST /api/beneficiaries
// Stores a new beneficiary registration document in MongoDB. Requires an authenticated user.
router.post('/beneficiaries', requireAuth, async (req, res) => {
  try {
    const { beneficiaryName, needType } = req.body;

    if (!beneficiaryName || !needType) {
      return res.status(400).json({
        success: false,
        message: 'beneficiaryName and needType are both required.'
      });
    }

    const beneficiary = new Beneficiary({
      beneficiaryName: String(beneficiaryName).trim(),
      needType: String(needType).trim(),
      createdBy: req.userId
    });

    await beneficiary.save();

    res.status(201).json({
      success: true,
      message: 'Beneficiary registered successfully.',
      data: beneficiary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save beneficiary.',
      error: error.message
    });
  }
});

module.exports = router;
