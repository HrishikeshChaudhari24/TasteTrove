/* eslint-disable no-undef */
const mongoose=require("mongoose")

const connectDB=(url)=>{
    return mongoose.connect(url)
}
module.exports=connectDB

// const { Pool } = require('pg')
// require('dotenv').config()

// const connectDB = async () => {
//     const pool = new Pool({
//         connectionString: process.env.DATABASE_URL,
//         ssl: {
//             rejectUnauthorized: false
//         }
//     })
    
//     try {
//         await pool.connect()
//         console.log('Connected to Supabase PostgreSQL!')
//         return pool
//     } catch (error) {
//         console.error('Database connection failed:', error)
//         throw error
//     }
// }

// module.exports = connectDB
