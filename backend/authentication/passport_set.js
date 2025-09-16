/* eslint-disable no-undef */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const adminUser = require('../models/admin.js');
const gooUser = require('../models/user.js');
const { compareSync } = require('bcrypt');
require('dotenv').config();

// Serialize user for session storage (HLD: Session Management)
passport.serializeUser((user, done) => {
    // Store user ID and user type for efficient deserialization
    done(null, { 
        id: user.id, 
        type: user.userType || (user.googleId ? 'user' : 'admin') 
    });
});

// Deserialize user from session (Performance Optimization)
passport.deserializeUser(async (sessionData, done) => {
    try {
        const { id, type } = sessionData;
        let user;
        
        // Performance: Query specific model based on user type (HLD: Optimized Query Strategy)
        if (type === 'admin') {
            user = await adminUser.findById(id).lean();
        } else {
            user = await gooUser.findById(id).lean();
        }
        
        if (!user) {
            return done(null, false);
        }
        
        // Add type to user object for middleware use
        user.userType = type;
        return done(null, user);
    } catch (err) {
        console.error("Deserialization error:", err);
        done(err, false);
    }
});

// Local Admin Authentication Strategy (Security Enhanced)
passport.use('local-admin', new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
}, async (email, password, done) => {
    try {
        // Input validation (Security Layer)
        if (!email || !password) {
            return done(null, false, { 
                message: 'Email and password are required' 
            });
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return done(null, false, { 
                message: 'Invalid email format' 
            });
        }
        
        const user = await adminUser.findOne({ email }).lean();
        
        if (!user || !compareSync(password, user.password)) {
            return done(null, false, { 
                message: 'Invalid email or password' 
            });
        }
        
        // Add user type for session management
        user.userType = 'admin';
        return done(null, user);
    } catch (error) {
        console.error("Local admin auth error:", error);
        done(error, false);
    }
}));

// Google Admin Authentication Strategy (Enhanced Error Handling)
passport.use('google-admin', new GoogleStrategy({
    callbackURL: 'https://taste-trove-q3kw.vercel.app/admin/auth/google/redirect',
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Validate required profile data (Security)
        if (!profile.id || !profile.emails || !profile.emails[0]) {
            return done(new Error('Invalid Google profile data'), false);
        }
        
        const email = profile.emails[0].value;
        console.log('Admin is: ', email);
        
        // Check if user already exists
        let currentUser = await adminUser.findOne({ 
            $or: [
                { googleId: profile.id },
                { email: email }
            ]
        });
        
        if (currentUser) {
            // Update Google ID if user exists but doesn't have it
            if (!currentUser.googleId) {
                currentUser.googleId = profile.id;
                await currentUser.save();
            }
            
            console.log('Admin user is: ', currentUser);
            currentUser.userType = 'admin';
            return done(null, currentUser);
        } else {
            // Create new admin user (Improved async/await pattern)
            const newUser = await adminUser.create({
                name: profile.displayName,
                googleId: profile.id,
                email: email,
                userType: 'admin'
            });
            
            console.log('Created new admin user: ', newUser);
            newUser.userType = 'admin';
            return done(null, newUser);
        }
    } catch (err) {
        console.error("Google admin auth error:", err);
        done(err, false);
    }
}));

// Local User Authentication Strategy (Security Enhanced)
passport.use('local-user', new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
    passReqToCallback: true
}, async (req, email, password, done) => {
    try {
        const originalUrl = req.originalUrl;
        console.log(originalUrl);
        
        // Input validation (Security Layer)
        if (!email || !password) {
            return done(null, false, { 
                message: 'Email and password are required' 
            });
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return done(null, false, { 
                message: 'Invalid email format' 
            });
        }
        
        const user = await gooUser.findOne({ email }).lean();
        
        if (!user || !compareSync(password, user.password)) {
            return done(null, false, { 
                message: 'Invalid email or password' 
            });
        }
        
        // Add user type for session management
        user.userType = 'user';
        return done(null, user);
    } catch (error) {
        console.error("Local user auth error:", error);
        done(error, false);
    }
}));

// Google User Authentication Strategy (Enhanced Error Handling)
passport.use('google-user', new GoogleStrategy({
    callbackURL: 'https://taste-trove-q3kw.vercel.app/auth/google/redirect',
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Validate required profile data (Security)
        if (!profile.id || !profile.emails || !profile.emails[0]) {
            return done(new Error('Invalid Google profile data'), false);
        }
        
        const email = profile.emails[0].value;
        console.log('User is: ', email);
        
        // Check if user already exists
        let currentUser = await gooUser.findOne({ 
            $or: [
                { googleId: profile.id },
                { email: email }
            ]
        });
        
        if (currentUser) {
            // Update Google ID if user exists but doesn't have it
            if (!currentUser.googleId) {
                currentUser.googleId = profile.id;
                await currentUser.save();
            }
            
            console.log('User is: ', currentUser);
            currentUser.userType = 'user';
            return done(null, currentUser);
        } else {
            // Create new user (Improved async/await pattern)
            const newUser = await gooUser.create({
                name: profile.displayName,
                googleId: profile.id,
                email: email,
                userType: 'user'
            });
            
            console.log('Created new user: ', newUser);
            newUser.userType = 'user';
            return done(null, newUser);
        }
    } catch (err) {
        console.error("Google user auth error:", err);
        done(err, false);
    }
}));

module.exports = passport;
