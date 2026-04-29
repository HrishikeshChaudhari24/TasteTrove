 /* eslint-disable no-undef */
    2 const express = require("express");
    3 const app = express();
    4 const connectDB = require("./connect/connect.js");
    5 const cors = require("cors");
    6 require("dotenv").config();
    7 const mongoose = require("mongoose");
    8 const MongoStore = require("connect-mongo");
    9 const passport = require("passport");
   10 const expressSession = require("express-session");
   11 const Listing = require("./models/listing");
   12 const Admin = require("./models/admin");
   13 const User = require("./models/user");
   14 const axios = require('axios');
   15 const Review = require("./models/reviews");
   16 const listing_route = require("./router/route.js");
   17 const reviewRoute = require("./router/reviews.js");
   18 const goo_auth_route = require("./router/goo_auth_route.js");
   19 const ad_goo_auth_route = require("./router/ad_goo_auth_route.js");
   20 const order_route = require("./router/order_route.js");
   21 const loc_auth_route = require("./router/loc_auth_route.js");
   22 const ad_loc_auth_route = require("./router/ad_loc_auth_route.js");
   23 const profileroute = require("./router/profile_route.js");
   24 const errorHandler = require("./middlewares/error-handler.js");
   25 const notfound = require("./middlewares/notfound.js");
   26 const path = require("path");
   27 const methodOverride = require("method-override");
   28 const asyncWrapper = require("./middlewares/async.js");
   29 require("./authentication/passport_set.js");
   30
   31 app.set("view engine", "ejs");
   32 app.set("views", path.join(__dirname, "views"));
   33
   34 // CORS
   35 const corsOptions = {
   36   origin: 'https://tastetrove-26.netlify.app',
   37   methods: 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
   38   credentials: true,
   39   allowedHeaders: [
   40     "set-cookie",
   41     "Content-Type",
   42     "Access-Control-Allow-Origin",
   43     "Access-Control-Allow-Credentials",
   44   ],
   45 };
   46 app.use(cors(corsOptions));
   47 app.options('*', cors(corsOptions));
   48
   49 // Lazy DB connect
   50 let isConnected = false;
   51 app.use(async (req, res, next) => {
   52   if (!isConnected) {
   53     try {
   54       await connectDB(process.env.MONGO_URI);
   55       isConnected = true;
   56     } catch (err) {
   57       return res.status(500).json({ error: "DB connection failed" });
   58     }
   59   }
   60   next();
   61 });
   62
   63 // Parsing
   64 app.use(express.urlencoded({ extended: true }));
   65 app.use(express.json());
   66 app.use(methodOverride("_method"));
   67
   68 // Session
   69 app.set("trust proxy", 1);
   70 app.use(
   71   expressSession({
   72     secret: process.env.secret,
   73     saveUninitialized: true,
   74     resave: true,
   75     store: MongoStore.create({
   76       mongoUrl: process.env.MONGO_URI,
   77       collectionName: "sessions",
   78     }),
   79     cookie: {
   80       maxAge: 24 * 60 * 60 * 1000,
   81       httpOnly: false,
   82       secure: true,
   83       sameSite: "none",
   84     },
   85   })
   86 );
   87
   88 // Passport
   89 app.use(passport.initialize());
   90 app.use(passport.session());
   91
   92 // Routes
   93 app.put('/Owner/listings/:id', async (req, res) => {
   94   try {
   95     const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true });
   96     res.status(200).json(admin);
   97   } catch (error) {
   98     console.log(error);
   99   }
  100 });
  101
  102 app.put('/User/listings/:id', async (req, res) => {
  103   try {
  104     const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
  105     res.status(200).json(user);
  106   } catch (error) {
  107     console.log(error);
  108   }
  109 });
  110
  111 app.get("/Owner/listings/:id", async (req, res) => {
  112   let { id } = req.params;
  113   let listings = await Listing.find({ owner: id }).populate('reviews');
  114   res.send(listings);
  115 });
  116
  117 app.get("/Owner/:id", async (req, res) => {
  118   let { id } = req.params;
  119   let user = await Admin.findOne({ _id: id }).populate('listings');
  120   res.send(user);
  121 });
  122
  123 app.get("/User/:id", async (req, res) => {
  124   let { id } = req.params;
  125   let user = await User.findOne({ _id: id });
  126   res.send(user);
  127 });
  128
  129 app.get(
  130   "/users",
  131   asyncWrapper(async (req, res) => {
  132     if (req.user) {
  133       res.status(200).send(req.user);
  134     } else {
  135       res.status(400).json({ message: "unAuthorized" });
  136     }
  137   })
  138 );
  139
  140 app.use("/auth", goo_auth_route);
  141 app.use("/", loc_auth_route);
  140 app.use("/auth", goo_auth_route);
  141 app.use("/", loc_auth_route);
  142 app.use("/admin", ad_loc_auth_route);
  143 app.use("/admin/auth", ad_goo_auth_route);
  144 app.use("/profile", profileroute);
  145 app.use("/order", order_route);
  146 app.use("/listings", listing_route);
  147 app.use("/listing/:id/reviews", reviewRoute);
  148
  149 app.use((req, res, next) => {
  150   if (req.isAuthenticated()) {
  151     res.locals.user = req.user;
  152   }
  153   next();
  154 });
  155
  156 app.get('/getreq', (req, res) => {
  157   res.json({ user: res.locals.user });
  158 });
  159
  160 app.use(notfound);
  161 app.use(errorHandler);
  162
  163 module.exports = app;
