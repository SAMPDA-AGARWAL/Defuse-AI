const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`)
      console.log(`User ${userId} joined their room`)
    })
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
  })
}

module.exports = setupSocket
