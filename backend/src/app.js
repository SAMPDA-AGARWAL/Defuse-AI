require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const { connectMongoDB, connectRedis } = require('./config/db')
const setupSocket = require('./config/socket')
const { startScheduler } = require('./jobs/scheduler')
const errorHandler = require('./middleware/errorHandler')

const authRoutes = require('./routes/auth')
const taskRoutes = require('./routes/tasks')
const aiRoutes = require('./routes/ai')
const syncRoutes = require('./routes/sync')
const whatsappRoutes = require('./routes/whatsapp')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
})

app.use(helmet({ contentSecurityPolicy: false }))
app.use(morgan('dev'))
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.set('io', io)

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'DEFUSE Backend', time: new Date() }))

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/whatsapp', whatsappRoutes)

app.use(errorHandler)
setupSocket(io)

const PORT = process.env.PORT || 5000

const startServer = async () => {
  await connectMongoDB()
  await connectRedis()
  startScheduler()
  server.listen(PORT, () => {
    console.log(`🚀 DEFUSE Backend running on http://localhost:${PORT}`)
    console.log(`📋 Health: http://localhost:${PORT}/health`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
