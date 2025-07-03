import { NextResponse } from 'next/server'
import { Server } from 'socket.io'

let io
let httpServer

export async function GET() {
  if (!io) {
    console.log('🚀 Starting Socket.IO server...')
    
    try {
      httpServer = require('http').createServer()
      
      io = new Server(httpServer, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      })

      // Room management
      const rooms = new Map()

      io.on('connection', (socket) => {
        console.log('🔌 User connected:', socket.id)
        
        socket.emit('me', socket.id)

        socket.on('join-room', (data) => {
          const { roomId, name } = data
          console.log(`👋 ${socket.id} (${name}) joining room: ${roomId}`)
          
          socket.join(roomId)
          socket.currentRoom = roomId
          socket.userName = name
          
          // Add user to room tracking
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map())
          }
          rooms.get(roomId).set(socket.id, { id: socket.id, name })
          
          // Send current room users to everyone in room
          const roomUsers = Array.from(rooms.get(roomId).values())
          io.to(roomId).emit('room-users', roomUsers)
          
          // Notify others that user joined
          socket.to(roomId).emit('user-joined', { id: socket.id, name })
        })

        socket.on('leave-room', (roomId) => {
          console.log(`🚪 ${socket.id} leaving room: ${roomId}`)
          socket.leave(roomId)
          
          if (rooms.has(roomId)) {
            rooms.get(roomId).delete(socket.id)
            if (rooms.get(roomId).size === 0) {
              rooms.delete(roomId)
            } else {
              const roomUsers = Array.from(rooms.get(roomId).values())
              io.to(roomId).emit('room-users', roomUsers)
            }
          }
          
          socket.to(roomId).emit('user-left', socket.id)
          socket.currentRoom = null
          socket.userName = null
        })

        socket.on('calling-user', (data) => {
          console.log(`📞 ${socket.id} calling ${data.userToCall}`)
          socket.to(data.userToCall).emit('receiving-call', {
            signal: data.signalData,
            from: socket.id,
            name: data.name
          })
        })

        socket.on('accepting-call', (data) => {
          console.log(`✅ ${socket.id} accepting call from ${data.to}`)
          socket.to(data.to).emit('call-accepted', {
            signal: data.signal,
            from: socket.id
          })
        })

        socket.on('disconnect', () => {
          console.log('❌ User disconnected:', socket.id)
          
          if (socket.currentRoom && rooms.has(socket.currentRoom)) {
            rooms.get(socket.currentRoom).delete(socket.id)
            if (rooms.get(socket.currentRoom).size === 0) {
              rooms.delete(socket.currentRoom)
            } else {
              const roomUsers = Array.from(rooms.get(socket.currentRoom).values())
              io.to(socket.currentRoom).emit('room-users', roomUsers)
            }
            socket.to(socket.currentRoom).emit('user-left', socket.id)
          }
        })
      })

      // Check if port is available before listening
      httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('⚠️ Port 5001 already in use, using existing server')
        } else {
          console.error('❌ Server error:', err)
        }
      })

      httpServer.listen(5001, () => {
        console.log('✅ Socket.IO server running on port 5001')
      })

    } catch (error) {
      console.error('❌ Error starting Socket.IO server:', error)
    }
  } else {
    console.log('♻️ Using existing Socket.IO server')
  }

  return NextResponse.json({ status: 'Socket.IO server running' })
}

export const POST = GET