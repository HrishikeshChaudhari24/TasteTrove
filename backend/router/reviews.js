/* eslint-disable no-undef */
const express = require('express')
const router = express.Router({ mergeParams: true });
const { createNewReview, DeleteReview } = require('../controllers/reviews.js')
const Listing = require("../models/listing.js");
const Review = require("../models/reviews.js");

// Async error handler to avoid repetitive try-catch
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// GET all reviews for a listing - optimized with lean() and error handling
router.get('/', asyncHandler(async (req, res) => {
  // console.log('get(/listing/:id/reviews)')
  const listing = await Listing.findById(req.params.id).populate({
    path: 'reviews',
    populate: {
      path: 'Author',
      model: 'User'
    }
  }).lean();
  
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  // console.log(listing.reviews)
  res.status(200).json(listing.reviews || []);
}));

// POST new review - optimized with validation and efficient saves
router.post('/', asyncHandler(async (req, res) => {
  // console.log('post(/listing/:id/reviews)')
  const { id } = req.params;
  
  const listing = await Listing.findById(id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  
  const newreview = new Review(req.body);
  
  console.log(req.user);
  if (req.user) {
    newreview.Author = req.user._id;
    // newreview.Author=req.user;
  }
  
  console.log("review add!");
  console.log(req.user);
  
  // Save review first, then update listing
  await newreview.save();
  
  listing.reviews.push(newreview._id); // Store ObjectId reference instead of full document
  await listing.save();
  
  res.status(200).json(newreview);
}));

// DELETE review - optimized with validation and atomic operations
router.delete('/:reviewId', asyncHandler(async (req, res) => {
  // console.log("delete review");
  const { id, reviewId } = req.params;
  
  // Check if review exists before attempting deletion
  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  // Remove review from listing's reviews array
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  
  // Delete the review document
  await Review.findByIdAndDelete(reviewId);
  
  console.log(review);
  console.log(req.user);
  
  res.status(200).json(review);
}));

module.exports = router;
