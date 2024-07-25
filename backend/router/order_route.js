const express=require('express')
const router=express.Router()
const {createOrder,updateOrder,getOrder,getOrdersForAdmin,deleteOrder}=require('../controllers/orders.js')

router.route('/:userID/:orderID').delete(deleteOrder)
router.route('/:listingid').post(createOrder)
router.route('/:userid').get(getOrder)
router.route("/admin/:adminid").get(getOrdersForAdmin)
module.exports=router
