const asyncWrapper = require("../middlewares/async");
const { sendMail } = require('../nodeMailer/nodeMailer.js');

const logout = asyncWrapper(async (req, res, next) => {
    req.logout(function(err) {
        if (err) { 
            console.error("Logout error:", err);
            return next(err); 
        }
        console.log("Successfully logged out");
        // Send JSON response instead of redirect for better API design
        res.status(200).json({ 
            message: "Successfully logged out",
            success: true 
        });
        // res.redirect('http://localhost:5173/login');
    });
});

const redirect = asyncWrapper(async (req, res) => {
    console.log("hello" + req.isAuthenticated());
    
    if (req.isAuthenticated()) {
        console.log(req.user);
        
        // Non-blocking email with proper error handling (HLD: Fault Tolerance)
        try {
            await sendMail({
                email: req.user.email,
                subject: 'Success',
                text: `Welcome to Taste Trove! 🎉 Thank you for joining our vibrant community of food enthusiasts. Get ready to discover exciting flavors, connect with fellow foodies, and embark on delicious culinary adventures. Happy exploring!`
            });
            console.log("email sent successfully");
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Continue with redirect even if email fails (Graceful Degradation)
        }
        
        res.locals.user = req.user;
        res.redirect('https://taste-trove-three.vercel.app/');
    } else {
        // Handle unauthenticated users properly
        res.redirect('https://taste-trove-three.vercel.app/login');
    }
    // res.send("hello redirect")
});

const protected = asyncWrapper(async (req, res) => {
    if (req.isAuthenticated()) {
        res.status(200).json({ 
            message: "protected",
            authenticated: true,
            user: req.user?.id || null 
        });
    } else {
        // Better error response for API consistency
        res.status(401).json({ 
            message: "Unauthorized access", 
            authenticated: false 
        });
    }
});

const sendUser = asyncWrapper(async (req, res) => {
    if (req.user) {
        // Security: Only send safe user data (Data Sanitization)
        const safeUserData = {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            userType: req.user.userType
            // Exclude password, tokens, and other sensitive data
        };
        
        res.status(200).json(safeUserData);
        console.log(req.user);
    } else {
        // Proper HTTP status code for unauthorized
        res.status(401).json({ message: "Unauthorized" });
    }
});

const timepass = asyncWrapper(async (req, res) => {
    res.send("<h1>Hello from Taste Trove!</h1>");
});

module.exports = { logout, protected, redirect, sendUser, timepass };
