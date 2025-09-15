/* eslint-disable no-undef */
const Listing = require("../models/listing.js");
const mongoose = require('mongoose');
const asyncWrapper = require('../middlewares/async.js');

// Enhanced async handler for better error management
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const createNewData = asyncHandler(async (req, res) => {
    const { listing } = req.body;
    
    // Input validation (Security & Reliability)
    if (!listing) {
        return res.status(400).json({ 
            message: "Listing data is required" 
        });
    }
    
    const newlisting = new Listing(listing);
    await newlisting.save();
    
    // For API consistency, you might want to return JSON instead of redirect
    // res.status(201).json({ message: "Listing created successfully", listing: newlisting });
    res.redirect("/listings");
});

const editData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { listing } = req.body;
    
    // Input validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            message: "Valid listing ID is required" 
        });
    }
    
    if (!listing) {
        return res.status(400).json({ 
            message: "Listing data is required" 
        });
    }
    
    // Check if listing exists and update (HLD: Resource validation)
    const updatedListing = await Listing.findByIdAndUpdate(
        id, 
        { ...listing }, 
        { 
            new: true, 
            runValidators: true  // Ensure schema validation
        }
    );
    
    if (!updatedListing) {
        return res.status(404).json({ 
            message: "Listing not found" 
        });
    }
    
    res.redirect("/listings");
});

const editDataForm = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Input validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render('error.ejs', { 
            message: "Invalid listing ID" 
        });
    }
    
    // Use lean() for read-only operations (Performance optimization)
    const listing = await Listing.findById(id).lean();
    
    if (!listing) {
        return res.status(404).render('error.ejs', { 
            message: "Listing not found" 
        });
    }
    
    // console.log(listing);
    res.render("edit.ejs", { listing });
});

const getOneData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Input validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render('error.ejs', { 
            message: "Invalid listing ID" 
        });
    }
    
    // Use lean() for read-only operations (Performance optimization)
    const listing = await Listing.findById(id).lean();
    
    if (!listing) {
        return res.status(404).render('error.ejs', { 
            message: "Listing not found" 
        });
    }
    
    // console.log(listing);
    res.render("show.ejs", { listing });
});

const deleteOneData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Input validation
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            message: "Valid listing ID is required" 
        });
    }
    
    // Check if listing exists before deleting (HLD: Resource validation)
    const listing = await Listing.findByIdAndDelete(id);
    
    if (!listing) {
        return res.status(404).json({ 
            message: "Listing not found" 
        });
    }
    
    // console.log(listing);
    res.redirect("/listings");
});

module.exports = { createNewData, editData, editDataForm, getOneData, deleteOneData };
