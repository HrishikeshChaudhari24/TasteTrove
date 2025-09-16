const listing = require('../models/listing');
const mongoose = require('mongoose');
const user = require('../models/user');
const admin = require('../models/admin');
const order = require('../models/order');
const { sendMessage } = require('./whatsapp/sendMessage');

// Async error handler to eliminate try-catch blocks
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const createOrder = asyncHandler(async (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("Login kar bhai");
        return res.status(401).json({ message: "Unauthorized" });
    }

    const { phone: userPhno, totalAmount: amount } = req.body;
    const { listingid: listingId } = req.params;
    const userId = req.user.id;

    // Validate required fields
    if (!userPhno || !amount || !listingId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch all required data with single queries
    const [listingData, userData] = await Promise.all([
        listing.findById(listingId),
        user.findById(userId)
    ]);

    if (!listingData) {
        return res.status(404).json({ message: "Listing not found" });
    }
    if (!userData) {
        return res.status(404).json({ message: "User not found" });
    }

    const adid = listingData.owner;
    const aduser = await admin.findById(adid);
    if (!aduser) {
        return res.status(404).json({ message: "Admin user not found" });
    }

    const adphone = String(aduser.Contact);

    const orderData = {
        amount: amount,
        listings: listingId,
        user: userId,
        messContact: adphone,
        userContact: userPhno
    };

    const createdOrder = await order.create(orderData);

    // Update both documents efficiently
    listingData.orders.push({ orderId: createdOrder._id, userid: userId });
    userData.orders.push({ orderId: createdOrder._id, listingid: listingId });

    await Promise.all([
        listingData.save(),
        userData.save()
    ]);

    // Send WhatsApp messages (non-blocking)
    try {
        await Promise.all([
            sendMessage(adphone, createdOrder._id),
            sendMessage(userPhno, createdOrder._id)
        ]);
    } catch (messageError) {
        console.log("WhatsApp message sending failed:", messageError);
        // Don't fail order creation if messaging fails
    }

    res.json({ message: "Order filed successfully" });
    console.log("Order filed successfully");
});

const deleteOrder = asyncHandler(async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { userID: userId, orderID } = req.params;

    if (!userId || !orderID) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    const USER = await user.findById(userId);
    if (!USER) {
        return res.status(404).json({ message: 'User not found' });
    }

    const totalOrders = USER.orders;
    let LISTING_ID;

    // Find and remove order from user's orders array
    const orderIndex = totalOrders.findIndex(obj => obj.orderId.toString() === orderID.toString());
    if (orderIndex !== -1) {
        LISTING_ID = totalOrders[orderIndex].listingid;
        totalOrders.splice(orderIndex, 1);
    }

    // Delete order and update user in parallel
    const [deletedOrder] = await Promise.all([
        order.findByIdAndDelete(orderID),
        USER.save()
    ]);

    if (!deletedOrder) {
        return res.status(404).json({ message: 'Order not found' });
    }

    // Remove order from listing if listing ID was found
    if (LISTING_ID) {
        const LISTING = await listing.findById(LISTING_ID);
        if (LISTING) {
            const listingOrderIndex = LISTING.orders.findIndex(obj => obj.orderId.toString() === orderID.toString());
            if (listingOrderIndex !== -1) {
                LISTING.orders.splice(listingOrderIndex, 1);
                await LISTING.save();
            }
        }
    }

    res.status(200).json({ message: 'Order deleted successfully' });
});

const updateOrder = asyncHandler(async (req, res) => {
    console.log("hello" + req.isAuthenticated());
    
    if (!req.isAuthenticated()) {
        console.log("login in kar bhai");
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { phone: userPhno } = req.body;
    const { userid } = req.params;

    if (!userid) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const User = await user.findById(userid);
    if (!User) {
        return res.status(404).json({ message: 'User not found' });
    }

    const listingOrders = User.orders;
    if (listingOrders.length === 0) {
        return res.status(404).json({ message: 'No orders found to update' });
    }

    // Get the most recent listing ID
    const lastOrder = listingOrders[listingOrders.length - 1];
    const Messname1 = await listing.findById(lastOrder.listingid);
    
    if (!Messname1) {
        return res.status(404).json({ message: 'Listing not found' });
    }

    console.log(User);
    
    const adid = Messname1.owner;
    const aduser = await admin.findById(adid);
    console.log(aduser);

    // Remove last order from both collections
    Messname1.orders.pop();
    User.orders.pop();
    
    await Promise.all([
        Messname1.save(),
        User.save()
    ]);

    // const adphone = aduser.Contact
    // sendMessage(adphone, userPhno)
    
    res.json({ message: "order filed successfull" });
    console.log("order filed successfull");
});

const getOrder = asyncHandler(async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('https://tastetrove-26.netlify.app/login');
    }

    const { userid: userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const userData = await user.findById(userId).lean();
    if (!userData) {
        return res.status(404).json({ message: "User not found" });
    }

    const ordersData = userData.orders;

    if (!ordersData || ordersData.length === 0) {
        return res.json([]);
    }

    // Optimize with Promise.all to fetch all data in parallel
    const orderPromises = ordersData.map(async (order1) => {
        const [listingData, orderDataValue] = await Promise.all([
            listing.findById(order1.listingid).lean(),
            order.findById(order1.orderId).lean()
        ]);
        return { order: orderDataValue, listing: listingData };
    });

    const orderList = await Promise.all(orderPromises);

    console.log(orderList);
    res.json(orderList);
});

const getOrdersForAdmin = asyncHandler(async (req, res) => {
    const { adminid: adminId } = req.params;

    if (!adminId) {
        return res.status(400).json({ message: 'Admin ID is required' });
    }

    const adminData = await admin.findById(adminId).lean();
    if (!adminData) {
        return res.status(404).json({ message: "Admin not found" });
    }

    const listingIds = adminData.listings;
    if (!listingIds || listingIds.length === 0) {
        return res.json([]);
    }

    const orderList = [];

    // Process listings in parallel for better performance
    const listingPromises = listingIds.map(async (listingId) => {
        const listingData = await listing.findById(listingId).lean();
        if (!listingData || !listingData.orders) return [];

        const orderPromises = listingData.orders.map(async (order1) => {
            const [userData, orderDataValue] = await Promise.all([
                user.findById(order1.userid).lean(),
                order.findById(order1.orderId).lean()
            ]);
            return { order: orderDataValue, user: userData };
        });

        return Promise.all(orderPromises);
    });

    const allOrderArrays = await Promise.all(listingPromises);
    
    // Flatten the array of arrays
    allOrderArrays.forEach(orders => {
        orderList.push(...orders);
    });

    console.log(orderList);
    res.json(orderList);
});

module.exports = { createOrder, updateOrder, getOrder, getOrdersForAdmin, deleteOrder };
