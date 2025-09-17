/* eslint-disable no-undef */
const express = require('express')
const router = express.Router();
const redis = require('redis');
const Listing = require("../models/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const Admin = require('../models/admin.js');
const upload = multer({ storage });

// Redis Client Setup
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

// Connect to Redis
(async () => {
    try {
        await redisClient.connect();
        console.log('Connected to Redis successfully');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
})();

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;

// Async error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Cache middleware for GET / route
const cacheGetListings = async (req, res, next) => {
    const cacheKey = req.originalUrl || req.url;
    
    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log(`🎯 Cache HIT for: ${cacheKey}`);
            return res.status(200).json(JSON.parse(cachedData));
        }
        console.log(`💾 Cache MISS for: ${cacheKey}`);
    } catch (error) {
        console.error('Redis cache error:', error);
    }
    
    next();
};

// GET all listings - WITH REDIS CACHING
router.get('/', cacheGetListings, asyncHandler(async (req, res) => {
    console.log(req.user);
    
    // Use lean() for faster read-only queries
    const listings = await Listing.find().populate('reviews').lean();
    
    // Cache the response with TTL
    try {
        await redisClient.setEx(req.originalUrl || req.url, CACHE_TTL, JSON.stringify(listings));
        console.log(`✅ Cached response for: ${req.originalUrl || req.url}`);
    } catch (error) {
        console.error('Failed to cache response:', error);
    }
    
    res.status(200).json(listings);
}));

// POST new listing - WITH REDIS CACHE UPDATE
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
    console.log('New listing created:', newlisting._id);
    
    // Handle admin relationship efficiently
    if (req.user) {
        const admin = await Admin.findById(req.user._id);
        console.log("here is admin");
        console.log(admin);
        
        if (admin) {
            admin.listings.push(newlisting._id);
            await admin.save();
            console.log(admin);
        }
    }
    
    // UPDATE CACHE: Add new listing to cached data
    try {
        // Get current cached data for GET / route
        const mainCacheKey = '/';
        const cachedListings = await redisClient.get(mainCacheKey);
        
        if (cachedListings) {
            let listings = JSON.parse(cachedListings);
            
            // Add new listing at the beginning
            listings.unshift(newlisting);
            
            // Keep only first 20 listings to maintain performance
            if (listings.length > 20) {
                listings = listings.slice(0, 20);
            }
            
            // Update cache with new data and reset TTL
            await redisClient.setEx(mainCacheKey, CACHE_TTL, JSON.stringify(listings));
            console.log('✅ Updated cache with new listing');
        }
    } catch (error) {
        console.error('Failed to update cache after POST:', error);
    }
    
    res.json(newlisting);
}));

// All other routes remain UNCHANGED - NO CACHING APPLIED

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
    listing.markModified('days');
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
            runValidators: true,
            lean: true
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
    listing.markModified('days');
    console.log(listing.days);
    await listing.save();
    res.json(listing.days);
}));

// Helper function for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Nearby search route - NO CACHING (as requested)
router.post('/nearby', async (req, res) => {
    const { latitude, longitude, radius = 5000, limit = 20 } = req.body;
    
    // Input validation
    if (!latitude || !longitude) {
        return res.status(400).json({ 
            message: 'Latitude and longitude are required' 
        });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ 
            message: 'Invalid coordinates' 
        });
    }
    
    try {
        console.log(`Searching for messes near: ${latitude}, ${longitude} within ${radius}m`);
        
        // MongoDB geospatial query using $near operator
        const nearbyMesses = await Listing.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(radius)
                }
            }
        })
        .limit(parseInt(limit))
        .lean()
        .select('name location address pricePerMeal pricePerMonth rating image owner MorningStart MorningEnd NightStart NightEnd days');
        
        console.log(`Found ${nearbyMesses.length} nearby messes`);
        
        // Add distance calculation to each mess
        const messesWithDistance = nearbyMesses.map(mess => {
            if (!mess.location || !mess.location.coordinates) {
                return { ...mess, distance: null, distanceText: 'Distance unavailable' };
            }
            
            const distance = calculateDistance(
                parseFloat(latitude), 
                parseFloat(longitude),
                mess.location.coordinates[1],
                mess.location.coordinates[0]
            );
            
            return {
                ...mess,
                distance: Math.round(distance),
                distanceText: distance < 1000 
                    ? `${Math.round(distance)}m` 
                    : `${(distance / 1000).toFixed(1)}km`
            };
        });
        
        res.json({
            success: true,
            count: messesWithDistance.length,
            userLocation: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            searchRadius: parseInt(radius),
            messes: messesWithDistance
        });
        
    } catch (error) {
        console.error('Nearby search error:', error);
        res.status(500).json({ 
            message: 'Failed to find nearby messes',
            error: error.message 
        });
    }
});

module.exports = router;
