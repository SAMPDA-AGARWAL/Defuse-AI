const mongoose = require('mongoose')
const { createClient } = require('redis')

let redisClient = null

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message)
    process.exit(1)
  }
}

const connectRedis = async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL })
    redisClient.on('error', (err) => console.error('Redis error:', err))
    await redisClient.connect()
    console.log('✅ Redis connected')
  } catch (err) {
    console.error('❌ Redis failed:', err.message)
  }
}

const getRedis = () => redisClient

module.exports = { connectMongoDB, connectRedis, getRedis }
