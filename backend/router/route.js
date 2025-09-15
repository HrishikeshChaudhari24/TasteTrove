/* eslint-disable no-undef */
const express = require('express')
const router = express.Router();
const Listing = require("../models/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const Admin = require('../models/admin.js');
const upload = multer({ storage });

// Async error handler to avoid repetitive try-catch
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET all listings - optimized with lean()
router.get('/', asyncHandler(async (req, res) => {
  console.log(req.user);
  // Use lean() for faster read-only queries
  const listings = await Listing.find().populate('reviews').lean();
  res.status(200).json(listings);
}));

// POST new listing - optimized to reduce saves
router.post('/', upload.single('image'), asyncHandler(async (req, res) => {
  let url = req.file?.path;
  let filename = req.file?.filename;
  
  const newlisting = new Listing(req.body);
  
  // Set image if file exists
  if (url && filename) {
    newlisting.image = { url, filename };
  }
  
  // Set owner if user is logged in
  if (req.user) {
    console.log("user is logged in!");
    newlisting.owner = req.user._id;
    console.log(req.user._id);
  }
  
  // Save listing once
  await newlisting.save();
  console.log(newlisting);
  
  // Handle admin relationship efficiently
  if (req.user) {
    const admin = await Admin.findById(req.user._id);
    console.log("here is admin");
    console.log(admin);
    
    if (admin) {
      admin.listings.push(newlisting._id); // Push ObjectId instead of full document
      await admin.save();
      console.log(admin);
    }
  }
  
  res.json(newlisting);
}));

// DELETE dish - optimized with better validation
router.delete('/:id/dish/:day/:type/:name', asyncHandler(async (req, res) => {
  const { id, day, type, name } = req.params;
  
  const listing = await Listing.findById(id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  // Validate structure exists
  if (!listing.days?.[day]?.[type] || !Array.isArray(listing.days[day][type])) {
    return res.status(400).json({ error: 'Invalid day or meal type' });
  }
  
  // Use indexOf for better performance than findIndex
  const dishIndex = listing.days[day][type].indexOf(name);
  if (dishIndex === -1) {
    return res.status(404).json({ error: 'Dish not found in the specified type of meal' });
  }
  
  // Remove dish and save once
  listing.days[day][type].splice(dishIndex, 1);
  listing.markModified('days'); // Ensure Mongoose tracks the change
  await listing.save();
  
  res.status(200).json({ message: 'Dish removed successfully' });
}));

// GET single listing - optimized with lean() and error handling
router.get('/:id', asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("owner").lean();
  
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  console.log(listing);
  res.status(200).json(listing);
}));

// PUT update listing - optimized with validation
router.put('/:id', asyncHandler(async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(
    req.params.id,
    req.body,
    { 
      new: true, 
      runValidators: true, // Ensure schema validation runs
      lean: true // Return plain object for better performance
    }
  );
  
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  res.status(200).json(listing);
}));

// DELETE listing - optimized with validation
router.delete('/:id', asyncHandler(async (req, res) => {
  const listing = await Listing.findByIdAndDelete(req.params.id);
  
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  res.status(200).json(listing);
}));

// POST weekly menu - optimized with better validation
router.post('/:id/weeklymenu', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { dayname, type, dishname } = req.body;
  
  // Validate required fields
  if (!dayname || !type || !dishname) {
    return res.status(400).json({ error: 'Missing required fields: dayname, type, or dishname' });
  }
  
  const listing = await Listing.findById(id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  // Initialize nested structure if needed
  if (!listing.days) listing.days = {};
  if (!listing.days[dayname]) {
    listing.days[dayname] = { breakfast: [], lunch: [], dinner: [] };
  }
  if (!listing.days[dayname][type]) {
    listing.days[dayname][type] = [];
  }
  
  // Add dish to the specified meal type
  listing.days[dayname][type].push(dishname);
  listing.markModified('days'); // Ensure Mongoose tracks nested changes
  
  console.log(listing.days);
  await listing.save();
  
  res.json(listing.days);
}));

module.exports = router;
