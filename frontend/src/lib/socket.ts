import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export const joinUserRoom = (userId: string) => {
  getSocket().emit('join:user', userId)
}

export const disconnectSocket = () => {
  socket?.disconnect()
  socket = null
}
