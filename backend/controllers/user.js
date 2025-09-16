/* eslint-disable no-undef */
const Listing = require("../models/listing.js");
const mongoose = require('mongoose');
const asyncWrapper = require('../middlewares/async.js');
const { hashSync } = require("bcrypt");
const User = require("../models/user.js");
const { sendMail } = require('../nodeMailer/nodeMailer.js');
const { createResetPasswordToken } = require('./crypto.js');
const crypto = require('crypto');
const { isEmailValid } = require("../nodeMailer/emailValidator.js");

// Enhanced async error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const login = asyncHandler(async (req, res) => {
    console.log("hello user");
    console.log(req.user);
    
    if (req.isAuthenticated()) {
        try {
            // Await the email sending operation
            const result = await sendMail(req.user.email);
            console.log("email sent successfully " + result);
        } catch (emailError) {
            console.log("Email sending failed:", emailError);
            // Continue with login even if email fails
        }
        
        res.locals.user = req.user;
        res.redirect("https://tastetrove-26.netlify.app/");
    } else {
        res.redirect("https://tastetrove-26.netlify.app/login");
    }
});

const signUpform = (req, res) => {
    res.render("users/signUp.ejs");
};

// const signUp = asyncHandler(async (req, res) => {
//     const { name, email, Contact, password, Cpassword } = req.body;
    
//     // Input validation
//     if (!name || !email || !password || !Cpassword) {
//         return res.status(400).send("All fields are required");
//     }
    
//     // Check if user already exists
//     const existingUser = await User.findOne({ email }).lean();
//     if (existingUser) {
//         return res.status(400).send("User already exists");
//     }
    
//     // Validate email
//     const { valid, reason, validators } = await isEmailValid(email);
//     if (!valid) {
//         console.log("fake hai re tu!!");
//         return res.status(400).send({
//             message: "Please provide a valid email address.",
//             reason: validators[reason].reason
//         });
//     }
    
//     // Password confirmation check
//     if (Cpassword !== password) {
//         return res.status(400).send("Passwords don't match");
//     }
    
//     // Create user data
//     const userData = {
//         name,
//         email,
//         Contact,
//         password: hashSync(password, 10)
//     };
    
//     const newUser = await User.create(userData);
    
//     // Send welcome email (non-blocking)
//     try {
//         await sendMail({
//             email: newUser.email,
//             subject: 'Success',
//             text: `Welcome to Taste Trove! 🎉 Thank you for joining our vibrant community of food enthusiasts. Get ready to discover exciting flavors, connect with fellow foodies, and embark on delicious culinary adventures. Happy exploring!`
//         });
//     } catch (emailError) {
//         console.log("Welcome email sending failed:", emailError);
//         // Don't fail signup if email fails
//     }
    
//     console.log("successfully created");
//     res.redirect("https://tastetrove-26.netlify.app/login");
// });

const signUp = asyncHandler(async (req, res) => {
    const { name, email, Contact, password, Cpassword } = req.body;
    
    // Input validation (fast)
    if (!name || !email || !password || !Cpassword) {
        return res.status(400).json({ 
            success: false,
            message: "All fields are required" 
        });
    }
    
    // Password confirmation check (fast)
    if (Cpassword !== password) {
        return res.status(400).json({ 
            success: false,
            message: "Passwords don't match" 
        });
    }
    
    // Basic email format validation (fast - no external API)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false,
            message: "Invalid email format" 
        });
    }
    
    try {
        // Check if user exists (optimized with lean)
        const existingUser = await User.findOne({ email }).lean();
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "User already exists" 
            });
        }
        
        // Create user data with hashed password
        const userData = {
            name,
            email,
            Contact,
            password: hashSync(password, 10) // Keep this but optimize other parts
        };
        
        // Create user
        const newUser = await User.create(userData);
        
        // Send welcome email asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                await sendMail({
                    email: newUser.email,
                    subject: 'Welcome to Taste Trove',
                    text: `Welcome to Taste Trove! 🎉 Thank you for joining our vibrant community of food enthusiasts.`
                });
                console.log("Welcome email sent to:", newUser.email);
            } catch (emailError) {
                console.log("Welcome email failed:", emailError);
            }
        });
        
        console.log("User created successfully:", newUser.email);
        
        // Return success immediately (don't wait for email)
        return res.status(201).json({
            success: true,
            message: "Account created successfully! Please login.",
            redirect: "https://tastetrove-26.netlify.app/login"
        });
        
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ 
            success: false,
            message: "Account creation failed. Please try again." 
        });
    }
});


const logout = asyncHandler(async (req, res) => {
    console.log("logging out");
    
    // Enhanced logout with proper callback handling
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Logout failed" });
        }
        res.redirect("https://tastetrove-26.netlify.app/login");
    });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
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
        // Cleanup on email failure
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
        console.log("Invalid or expired token");
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
    const message = 'Password changed successfully';
    try {
        await sendMail({
            email: user.email,
            subject: 'password change Status',
            text: message
        });
    } catch (emailError) {
        console.log("Password change confirmation email failed:", emailError);
    }
    
    console.log(user);
    res.status(200).json({
        status: 'success',
        message: 'password changed successfully'
    });
});

const passwordResetRedirect = asyncHandler(async (req, res) => {
    const { token } = req.params;
    
    if (!token) {
        return res.status(400).redirect('https://tastetrove-26.netlify.app/login');
    }
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const userR = await User.findOne({ passwordResetToken: hashedToken });
    
    if (!userR) {
        return res.status(400).redirect('https://tastetrove-26.netlify.app/login');
    }
    
    // Check if token is expired
    if (userR.passwordResetTokenExpires < Date.now()) {
        // Clean up expired tokens
        userR.passwordResetToken = undefined;
        userR.passwordResetTokenExpires = undefined;
        userR.passwordChangedAt = undefined;
        await userR.save();
        
        return res.status(400).redirect('https://tastetrove-26.netlify.app/login');
    }
    
    res.redirect(`http://localhost:5173/login/resetPassword/${token}`);
});

module.exports = {
    signUpform,
    login,
    signUp,
    logout,
    forgotPassword,
    resetPassword,
    passwordResetRedirect
};
