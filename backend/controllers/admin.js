/* eslint-disable no-undef */
const Listing = require("../models/listing.js");
const mongoose = require('mongoose');
const asyncWrapper = require('../middlewares/async.js');
const { hashSync } = require("bcrypt");
const User = require("../models/admin.js");
const { sendMail } = require('../nodeMailer/nodeMailer.js');
const { createResetPasswordToken } = require('./crypto.js');
const crypto = require('crypto');

// Enhanced async handler for better error management
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const loginform = (req, res) => {
    res.render("users/login.ejs");
};

const login = asyncHandler(async (req, res) => {
    console.log("hello user");
    console.log(req.user);
    
    if (req.isAuthenticated()) {
        // Non-blocking email sending (HLD: Fault Tolerance)
        try {
            const result = await sendMail(req.user.email);
            console.log("email sent successfully " + result);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Continue with login even if email fails (Graceful Degradation)
        }
        
        res.locals.user = req.user;
        res.redirect("https://taste-trove-three.vercel.app/");
    } else {
        res.redirect("https://taste-trove-three.vercel.app/login");
    }
});

const signUp = asyncHandler(async (req, res) => {
    const { name, email, Contact, password, Cpassword } = req.body;
    
    // Input validation (Security & Reliability)
    if (!name || !email || !Contact || !password || !Cpassword) {
        return res.status(400).json({ 
            message: "All fields are required" 
        });
    }
    
    // Check if user already exists (use lean for performance)
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
        return res.status(400).json({ 
            message: "User already exists" 
        });
    }
    
    // Password confirmation validation
    if (Cpassword !== password) {
        return res.status(400).json({ 
            message: "Passwords don't match" 
        });
    }
    
    const userData = {
        name,
        email,
        Contact,
        password: hashSync(password, 10)
    };
    
    const newUser = await User.create(userData);
    console.log("successfully created");
    
    // Non-blocking welcome email (HLD: Fault Tolerance)
    try {
        await sendMail({
            email: newUser.email,
            subject: 'Success',
            text: `Welcome to Taste Trove! 🎉 Thank you for joining our vibrant community of food enthusiasts. Get ready to discover exciting flavors, connect with fellow foodies, and embark on delicious culinary adventures. Happy exploring!`
        });
        console.log("Welcome email sent successfully");
    } catch (emailError) {
        console.error("Welcome email sending failed:", emailError);
        // Don't fail signup if email fails
    }
    
    res.redirect("https://taste-trove-three.vercel.app/login");
});

const logout = asyncHandler(async (req, res, next) => {
    req.logout(function(err) {
        if (err) { 
            console.error("Logout error:", err);
            return next(err); 
        }
        console.log("logging out");
        res.redirect("https://taste-trove-three.vercel.app/login");
    });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // Input validation
    if (!email) {
        return res.status(400).json({ 
            status: 'error', 
            message: 'Email is required' 
        });
    }
    
    const forgottedUser = await User.findOne({ email });
    if (!forgottedUser) {
        return res.status(404).json({ 
            status: 'error', 
            message: "User doesn't exist" 
        });
    }
    
    const tokenObject = createResetPasswordToken();
    
    forgottedUser.passwordResetToken = tokenObject.passwordResetToken;
    forgottedUser.passwordResetTokenExpires = tokenObject.passwordResetTokenExpires;
    await forgottedUser.save();
    
    const resetUrl = `${req.protocol}://${req.get('host')}/resetPassword/${tokenObject.resetToken}`;
    const message = `We have received a password reset request. Please use the below link to reset your password\n\n${resetUrl}\n\nAbove link will be expired in 10 minutes.`;
    
    try {
        await sendMail({
            email: forgottedUser.email,
            subject: 'password change request received',
            text: message
        });
        
        res.status(200).json({
            status: 'success',
            message: 'password reset link sent to user email'
        });
    } catch (error) {
        // Cleanup on email failure (Data Consistency)
        forgottedUser.passwordResetToken = undefined;
        forgottedUser.passwordResetTokenExpires = undefined;
        await forgottedUser.save();
        
        console.error("Password reset email failed:", error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send reset email'
        });
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password, Cpassword } = req.body;
    
    // Input validation
    if (!password || !Cpassword) {
        return res.status(400).json({ 
            message: "Password and confirmation are required" 
        });
    }
    
    if (Cpassword !== password) {
        return res.status(400).json({ 
            message: "Passwords don't match" 
        });
    }
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpires: { $gt: Date.now() }
    });
    
    if (!user) {
        return res.status(400).json({ 
            message: "Token is invalid or expired" 
        });
    }
    
    // Update password and clear reset tokens
    user.password = hashSync(password, 10);
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();
    
    // Send confirmation email (non-blocking)
    try {
        await sendMail({
            email: user.email,
            subject: 'Password Reset Successful',
            text: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.'
        });
    } catch (emailError) {
        console.error("Password reset confirmation email failed:", emailError);
    }
    
    res.status(200).json({
        status: 'success',
        message: 'password changed successfully'
    });
});

module.exports = { loginform, login, signUp, logout, forgotPassword, resetPassword };
