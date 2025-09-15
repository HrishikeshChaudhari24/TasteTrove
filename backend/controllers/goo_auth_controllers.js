const asyncWrapper = require("../middlewares/async");
const { sendMail } = require('../nodeMailer/nodeMailer.js');

// Enhanced async error handler (system design principle)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const logout = asyncHandler(async (req, res, next) => {
  req.logout(function(err) {
    if (err) { 
      console.error("Logout error:", err);
      return next(err); 
    }
    console.log("Successfully logged out");
    res.redirect('https://taste-trove-three.vercel.app/login');
  });
});

const redirect = asyncHandler(async (req, res) => {
  console.log("hello" + req.isAuthenticated());
  
  if (req.isAuthenticated()) {
    console.log(req.user);
    
    // Non-blocking email sending (HLD principle: fault tolerance)
    try {
      await sendMail({
        email: req.user.email, // Fixed bug: was req.email
        subject: 'Success',
        text: `Welcome to Taste Trove! 🎉 Thank you for joining our vibrant community of food enthusiasts. Get ready to discover exciting flavors, connect with fellow foodies, and embark on delicious culinary adventures. Happy exploring!`
      });
      console.log("email sent successfully");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Continue with redirect even if email fails (graceful degradation)
    }
    
    res.locals.user = req.user;
    res.redirect('https://taste-trove-three.vercel.app/');
  } else {
    // Handle unauthenticated users
    res.redirect('https://taste-trove-three.vercel.app/login');
  }
});

const protected = asyncHandler(async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ 
      message: "protected",
      authenticated: true,
      user: req.user?.id || null 
    });
  } else {
    res.status(401).json({ 
      message: "Unauthorized access", 
      authenticated: false 
    });
  }
});

const sendUser = asyncHandler(async (req, res) => {
  if (req.user) {
    // Remove sensitive data before sending (security principle)
    const safeUserData = {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      userType: req.user.userType
      // Exclude password, tokens, etc.
    };
    
    res.status(200).json(safeUserData);
    console.log("User data sent:", safeUserData);
  } else {
    res.status(401).json({ 
      message: "Unauthorized - No user session found" 
    });
  }
});

const timepass = asyncHandler(async (req, res) => {
  res.status(200).send("<h1>Hello from Taste Trove!</h1>");
});

module.exports = { logout, protected, redirect, sendUser, timepass };
