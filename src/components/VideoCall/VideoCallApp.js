'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Peer from 'simple-peer'
import io from 'socket.io-client'
import VideoPlayer from './VideoPlayer'
import DeviceSettings from './DeviceSettings'
import RoomControls from './RoomControls'
import UserList from './UserList'

let socket

export default function VideoCallApp() {
  const searchParams = useSearchParams()
  const roomId = searchParams.get('call')

  // State
  const [me, setMe] = useState("")
  const [stream, setStream] = useState()
  const [roomUsers, setRoomUsers] = useState([])
  const [peers, setPeers] = useState({})
  const [name, setName] = useState("")
  const [currentRoom, setCurrentRoom] = useState(roomId || "")
  const [copied, setCopied] = useState(false)
  const [isInRoom, setIsInRoom] = useState(false)
  const [pinnedVideo, setPinnedVideo] = useState(null) // 'local' for own video, or userId for peer video
  
  // Media controls
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [devices, setDevices] = useState({ cameras: [], microphones: [] })
  const [selectedCamera, setSelectedCamera] = useState('')
  const [selectedMicrophone, setSelectedMicrophone] = useState('')

  const myVideo = useRef()
  const peersRef = useRef({})

  // Load name from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('stealthchat-username')
      if (savedName) {
        setName(savedName)
        console.log('📝 Loaded saved name from localStorage:', savedName)
      }
    }
  }, [])

  // Save name to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && name.trim()) {
      localStorage.setItem('stealthchat-username', name.trim())
      console.log('💾 Saved name to localStorage:', name.trim())
    }
  }, [name])

  // Initialize camera
  useEffect(() => {
    let mounted = true
    
    const initializeMedia = async () => {
      try {
        console.log("🎥 Starting camera initialization...")
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        })
        
        if (mounted) {
          console.log("✅ Camera stream obtained:", mediaStream)
          setStream(mediaStream)
          
          // Get the actual camera device ID that's being used
          const videoTrack = mediaStream.getVideoTracks()[0]
          const audioTrack = mediaStream.getAudioTracks()[0]
          
          if (videoTrack && videoTrack.getSettings) {
            const videoSettings = videoTrack.getSettings()
            if (videoSettings.deviceId) {
              console.log("📹 Setting selected camera to actual device:", videoSettings.deviceId)
              setSelectedCamera(videoSettings.deviceId)
            }
          }
          
          if (audioTrack && audioTrack.getSettings) {
            const audioSettings = audioTrack.getSettings()
            if (audioSettings.deviceId) {
              console.log("🎤 Setting selected microphone to actual device:", audioSettings.deviceId)
              setSelectedMicrophone(audioSettings.deviceId)
            }
          }
        }
      } catch (error) {
        console.error("❌ Error accessing media devices:", error)
      }
    }

    initializeMedia()
    
    return () => {
      mounted = false
    }
  }, [])

  // Set video source when stream changes
  useEffect(() => {
    if (stream && myVideo.current) {
      console.log("📺 Setting my video source...")
      myVideo.current.srcObject = stream
      
      const videoTrack = stream.getVideoTracks()[0]
      const audioTrack = stream.getAudioTracks()[0]
      if (videoTrack) setVideoEnabled(videoTrack.enabled)
      if (audioTrack) setAudioEnabled(audioTrack.enabled)
    }
  }, [stream])

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const cameras = deviceList.filter(device => device.kind === 'videoinput')
        const microphones = deviceList.filter(device => device.kind === 'audioinput')
        
        console.log("📱 Available cameras:", cameras.map(c => `${c.label} (${c.deviceId.slice(0, 8)})`))
        console.log("🎤 Available microphones:", microphones.map(m => `${m.label} (${m.deviceId.slice(0, 8)})`))
        
        setDevices({ cameras, microphones })
        
        // Only set defaults if we don't already have selected devices
        // (the camera initialization will set the actual devices being used)
        if (!selectedCamera && cameras.length > 0) {
          console.log("📹 Setting default camera to:", cameras[0].deviceId.slice(0, 8))
          setSelectedCamera(cameras[0].deviceId)
        }
        if (!selectedMicrophone && microphones.length > 0) {
          console.log("🎤 Setting default microphone to:", microphones[0].deviceId.slice(0, 8))
          setSelectedMicrophone(microphones[0].deviceId)
        }
      } catch (error) {
        console.error('❌ Error getting devices:', error)
      }
    }

    getDevices()
  }, [selectedCamera, selectedMicrophone])

  // Create peer connection (initiator)
  const createPeer = useCallback((userToCall, userName) => {
    if (!stream) {
      console.log('❌ No stream available for peer connection')
      return
    }

    // Check if we already have a connection to this user
    if (peersRef.current[userToCall]) {
      console.log('⚠️ Already have connection to:', userToCall, '- not creating duplicate')
      return peersRef.current[userToCall]
    }

    console.log('🔗 Creating peer connection to:', userToCall, userName)
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })

    peer.on('signal', (signal) => {
      console.log('📡 Sending signal to:', userToCall)
      socket.emit('calling-user', {
        userToCall,
        signalData: signal,
        from: me,
        name: name
      })
    })

    peer.on('stream', (remoteStream) => {
      console.log('🎥 RECEIVED STREAM from:', userToCall, remoteStream)
      console.log('📊 Stream has tracks:', remoteStream.getTracks().length)
      
      // Immediately update peers state
      setPeers(prevPeers => {
        const newPeers = {
          ...prevPeers,
          [userToCall]: {
            peer,
            stream: remoteStream,
            name: userName,
            id: userToCall
          }
        }
        console.log('✅ UPDATED PEERS STATE:', Object.keys(newPeers))
        return newPeers
      })
    })

    peer.on('connect', () => {
      console.log('🔗 Peer connected to:', userToCall)
    })

    peer.on('error', (err) => {
      console.error('❌ Peer error with', userToCall, ':', err)
      // Clean up on error
      delete peersRef.current[userToCall]
      setPeers(prev => {
        const newPeers = { ...prev }
        delete newPeers[userToCall]
        return newPeers
      })
    })

    peer.on('close', () => {
      console.log('❌ Peer connection closed with:', userToCall)
      delete peersRef.current[userToCall]
      setPeers(prev => {
        const newPeers = { ...prev }
        delete newPeers[userToCall]
        return newPeers
      })
    })

    peersRef.current[userToCall] = peer
    return peer
  }, [stream, me, name])

  // Answer incoming call (receiver)
  const answerCall = useCallback((callerId, signal, callerName) => {
    if (!stream) {
      console.log('❌ No stream available to answer call')
      return
    }

    // Check if we already have a connection to this user
    if (peersRef.current[callerId]) {
      console.log('⚠️ Already have connection to:', callerId, '- not answering duplicate call')
      return
    }

    console.log('📞 Answering call from:', callerId, callerName)
    
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })

    peer.on('signal', (answerSignal) => {
      console.log('📡 Sending answer signal to:', callerId)
      socket.emit('accepting-call', {
        signal: answerSignal,
        to: callerId
      })
    })

    peer.on('stream', (remoteStream) => {
      console.log('🎥 RECEIVED STREAM from caller:', callerId, remoteStream)
      console.log('📊 Stream has tracks:', remoteStream.getTracks().length)
      
      // Immediately update peers state
      setPeers(prevPeers => {
        const newPeers = {
          ...prevPeers,
          [callerId]: {
            peer,
            stream: remoteStream,
            name: callerName,
            id: callerId
          }
        }
        console.log('✅ UPDATED PEERS STATE:', Object.keys(newPeers))
        return newPeers
      })
    })

    peer.on('connect', () => {
      console.log('🔗 Answer peer connected to:', callerId)
    })

    peer.on('error', (err) => {
      console.error('❌ Answer peer error with', callerId, ':', err)
      // Clean up on error
      delete peersRef.current[callerId]
      setPeers(prev => {
        const newPeers = { ...prev }
        delete newPeers[callerId]
        return newPeers
      })
    })

    peer.on('close', () => {
      console.log('❌ Answer peer connection closed with:', callerId)
      delete peersRef.current[callerId]
      setPeers(prev => {
        const newPeers = { ...prev }
        delete newPeers[callerId]
        return newPeers
      })
    })

    try {
      peer.signal(signal)
      peersRef.current[callerId] = peer
    } catch (error) {
      console.error('❌ Error signaling peer:', error)
    }
  }, [stream])

  // Initialize socket (only once)
  useEffect(() => {
    if (socket) return

    const initSocket = async () => {
      try {
        await fetch('/api/socket')
        
        socket = io('http://localhost:5001')

        socket.on('connect', () => {
          console.log('🔌 Connected! ID:', socket.id)
        })

        socket.on('me', (id) => {
          console.log('🆔 Received ID:', id)
          setMe(id)
        })

        socket.on('room-users', (users) => {
          console.log('👥 Room users updated:', users)
          setRoomUsers(users)
        })

        socket.on('user-joined', (userData) => {
          console.log('👋 New user joined:', userData)
        })

        socket.on('user-left', (userId) => {
          console.log('🚪 User left:', userId)
          if (peersRef.current[userId]) {
            peersRef.current[userId].destroy()
            delete peersRef.current[userId]
            setPeers(prev => {
              const newPeers = { ...prev }
              delete newPeers[userId]
              return newPeers
            })
          }
        })

        socket.on('receiving-call', (data) => {
          console.log('📞 Receiving call from:', data.from, data.name)
          
          // Check if we already have a peer connection to avoid duplicates
          if (peersRef.current[data.from]) {
            console.log('⚠️ Already have connection to:', data.from, '- ignoring duplicate call')
            return
          }
          
          answerCall(data.from, data.signal, data.name)
        })

        socket.on('call-accepted', (data) => {
          console.log('✅ Call accepted by:', data.from)
          if (peersRef.current[data.from]) {
            peersRef.current[data.from].signal(data.signal)
          }
        })

      } catch (error) {
        console.error('❌ Socket initialization error:', error)
      }
    }

    initSocket()

    return () => {
      if (socket) {
        console.log('🔌 Disconnecting socket...')
        socket.disconnect()
        socket = null
      }
      
      // Clean up all peer connections
      Object.values(peersRef.current).forEach(peer => {
        peer.destroy()
      })
      peersRef.current = {}
    }
  }, [answerCall])

  // When we join a room, initiate calls to existing users (but avoid double calls)
  useEffect(() => {
    if (roomUsers.length > 0 && me && stream && isInRoom) {
      const otherUsers = roomUsers.filter(user => user.id !== me)
      console.log('🔄 Checking connections for other users:', otherUsers)
      
      otherUsers.forEach(user => {
        if (!peersRef.current[user.id]) {
          // Only the user with the "smaller" socket ID initiates the call
          // This prevents both users from calling each other simultaneously
          const shouldInitiate = me < user.id
          
          if (shouldInitiate) {
            console.log('📞 I will call:', user.id, user.name, '(my ID is smaller)')
            setTimeout(() => createPeer(user.id, user.name), 1000)
          } else {
            console.log('⏳ Waiting for call from:', user.id, user.name, '(their ID is smaller)')
          }
        }
      })
    }
  }, [roomUsers, me, stream, isInRoom, createPeer])

  // Join room
  const joinRoom = useCallback((roomId) => {
    if (!name.trim()) {
      alert('Please enter your name first')
      return
    }
    
    if (!socket) {
      alert('Not connected to server')
      return
    }
    
    const finalRoomId = roomId || me
    console.log('🚪 Joining room:', finalRoomId)
    
    // Update URL when creating/joining a room
    if (typeof window !== 'undefined') {
      const newUrl = `/stealthchat?call=${finalRoomId}`
      window.history.pushState({}, '', newUrl)
      console.log('🔗 Updated URL to:', newUrl)
    }
    
    setCurrentRoom(finalRoomId)
    setIsInRoom(true)
    socket.emit('join-room', {
      roomId: finalRoomId,
      name: name.trim()
    })
  }, [name, me])

  // Leave room
  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving room:', currentRoom)
    socket.emit('leave-room', currentRoom)
    
    // Destroy all peer connections
    Object.values(peersRef.current).forEach(peer => peer.destroy())
    peersRef.current = {}
    setPeers({})
    setRoomUsers([])
    setCurrentRoom("")
    setIsInRoom(false)
    
    // Update URL
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/stealthchat')
    }
  }, [currentRoom])

  // Media controls
  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }, [stream])

  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
      }
    }
  }, [stream])

  const switchCamera = useCallback(async (deviceId) => {
    try {
      console.log('🎥 Switching camera to:', deviceId)
      
      // Get new video track only
      const newVideoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 640, height: 480 },
        audio: false // Don't get audio, we'll keep the existing audio track
      })
      
      const newVideoTrack = newVideoStream.getVideoTracks()[0]
      console.log('✅ New video track obtained')
      
      if (!stream) {
        console.log('❌ No existing stream to update')
        return
      }
      
      // Get current audio track to preserve it
      const currentAudioTrack = stream.getAudioTracks()[0]
      const currentVideoTrack = stream.getVideoTracks()[0]
      
      // Replace tracks in all peer connections FIRST
      Object.values(peersRef.current).forEach(peer => {
        if (peer && peer._pc) {
          const senders = peer._pc.getSenders()
          
          // Replace video track in peer connection
          const videoSender = senders.find(sender => 
            sender.track && sender.track.kind === 'video'
          )
          if (videoSender && newVideoTrack) {
            console.log('🔄 Replacing video track in peer connection')
            videoSender.replaceTrack(newVideoTrack)
              .then(() => console.log('✅ Video track replaced successfully'))
              .catch(err => console.error('❌ Error replacing video track:', err))
          }
        }
      })
      
      // Create new stream with new video track and existing audio track
      const updatedStream = new MediaStream()
      updatedStream.addTrack(newVideoTrack)
      if (currentAudioTrack) {
        updatedStream.addTrack(currentAudioTrack)
      }
      
      // Update local video element
      if (myVideo.current) {
        myVideo.current.srcObject = updatedStream
      }
      
      // Stop old video track (but keep audio)
      if (currentVideoTrack) {
        console.log('🛑 Stopping old video track')
        currentVideoTrack.stop()
      }
      
      // Update state
      setStream(updatedStream)
      setSelectedCamera(deviceId)
      
      console.log('✅ Camera switch completed successfully')
      
    } catch (error) {
      console.error('❌ Error switching camera:', error)
      alert('Failed to switch camera. Please try again.')
    }
  }, [stream])

  const switchMicrophone = useCallback(async (deviceId) => {
    try {
      console.log('🎤 Switching microphone to:', deviceId)
      
      // Get new audio track only
      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        video: false, // Don't get video, we'll keep the existing video track
        audio: { deviceId: { exact: deviceId } }
      })
      
      const newAudioTrack = newAudioStream.getAudioTracks()[0]
      console.log('✅ New audio track obtained')
      
      if (!stream) {
        console.log('❌ No existing stream to update')
        return
      }
      
      // Get current video track to preserve it
      const currentVideoTrack = stream.getVideoTracks()[0]
      const currentAudioTrack = stream.getAudioTracks()[0]
      
      // Replace tracks in all peer connections FIRST
      Object.values(peersRef.current).forEach(peer => {
        if (peer && peer._pc) {
          const senders = peer._pc.getSenders()
          
          // Replace audio track in peer connection
          const audioSender = senders.find(sender => 
            sender.track && sender.track.kind === 'audio'
          )
          if (audioSender && newAudioTrack) {
            console.log('🔄 Replacing audio track in peer connection')
            audioSender.replaceTrack(newAudioTrack)
              .then(() => console.log('✅ Audio track replaced successfully'))
              .catch(err => console.error('❌ Error replacing audio track:', err))
          }
        }
      })
      
      // Create new stream with existing video track and new audio track
      const updatedStream = new MediaStream()
      if (currentVideoTrack) {
        updatedStream.addTrack(currentVideoTrack)
      }
      updatedStream.addTrack(newAudioTrack)
      
      // Update local video element
      if (myVideo.current) {
        myVideo.current.srcObject = updatedStream
      }
      
      // Stop old audio track (but keep video)
      if (currentAudioTrack) {
        console.log('🛑 Stopping old audio track')
        currentAudioTrack.stop()
      }
      
      // Update state
      setStream(updatedStream)
      setSelectedMicrophone(deviceId)
      
      console.log('✅ Microphone switch completed successfully')
      
    } catch (error) {
      console.error('❌ Error switching microphone:', error)
      alert('Failed to switch microphone. Please try again.')
    }
  }, [stream])

  // Copy room link
  const copyRoomLink = useCallback(async () => {
    try {
      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/stealthchat?call=${currentRoom || me}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('❌ Failed to copy text: ', err)
    }
  }, [currentRoom, me])

  // Pin/unpin video functions
  const pinVideo = useCallback((videoId) => {
    console.log('📌 Pinning video:', videoId)
    setPinnedVideo(videoId)
  }, [])

  const unpinVideo = useCallback(() => {
    console.log('📌 Unpinning video')
    setPinnedVideo(null)
  }, [])

  // Get all videos for rendering
  const getAllVideos = useCallback(() => {
    const allVideos = []
    
    // Add local video
    allVideos.push({
      id: 'local',
      type: 'local',
      stream: stream,
      name: name || 'Anonymous',
      title: 'You',
      videoEnabled,
      audioEnabled,
      onToggleVideo: toggleVideo,
      onToggleAudio: toggleAudio,
      isLocal: true,
      videoRef: myVideo // Use videoRef instead of ref
    })
    
    // Add peer videos
    Object.entries(peers).forEach(([userId, peerData]) => {
      allVideos.push({
        id: userId,
        type: 'peer',
        stream: peerData.stream,
        name: peerData.name,
        title: peerData.name,
        isLocal: false,
        videoRef: null // No ref needed for remote videos
      })
    })
    
    return allVideos
  }, [stream, name, videoEnabled, audioEnabled, toggleVideo, toggleAudio, peers])

  console.log('🎥 Current peers:', Object.keys(peers))
  console.log('👥 Room users:', roomUsers)
  console.log('📌 Pinned video:', pinnedVideo)
  console.log('🎬 My stream exists:', !!stream)
  console.log('📱 All videos:', getAllVideos().map(v => `${v.id}:${v.title}:hasStream=${!!v.stream}`))

  return (
    <div className="min-h-screen bg-gradient-to-br from-black-500 to-red-600">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-white mb-8">Stealth Chat</h1>
        
        {isInRoom && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            Room: {currentRoom} ({roomUsers.length} user{roomUsers.length !== 1 ? 's' : ''}) - 
            Video connections: {Object.keys(peers).length}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Video Section */}
          <div className="lg:col-span-3">
            {pinnedVideo ? (
              // Pinned video layout
              <div className="flex gap-4 h-[70vh]">
                {/* Main pinned video */}
                <div className="flex-1">
                  {(() => {
                    const allVideos = getAllVideos()
                    const pinnedVideoData = allVideos.find(video => video.id === pinnedVideo)
                    
                    if (!pinnedVideoData) {
                      console.log('❌ No pinned video data found for:', pinnedVideo)
                      return null
                    }
                    
                    console.log('📌 Rendering pinned video:', pinnedVideoData.id, pinnedVideoData.title)
                    
                    return (
                      <div className="relative h-full">
                        <VideoPlayer
                          ref={pinnedVideoData.videoRef}
                          stream={pinnedVideoData.stream}
                          name={pinnedVideoData.name}
                          title={pinnedVideoData.title}
                          videoEnabled={pinnedVideoData.videoEnabled}
                          audioEnabled={pinnedVideoData.audioEnabled}
                          onToggleVideo={pinnedVideoData.onToggleVideo}
                          onToggleAudio={pinnedVideoData.onToggleAudio}
                          isLocal={pinnedVideoData.isLocal}
                          isPinned={true}
                          onPin={() => pinVideo(pinnedVideoData.id)}
                          onUnpin={unpinVideo}
                        />
                      </div>
                    )
                  })()}
                </div>
                
                {/* Sidebar with other videos */}
                <div className="w-64 flex flex-col gap-3 overflow-y-auto">
                  {(() => {
                    const allVideos = getAllVideos()
                    const sidebarVideos = allVideos.filter(video => video.id !== pinnedVideo)
                    console.log('📋 Sidebar videos:', sidebarVideos.map(v => `${v.id}:${v.title}`))
                    
                    return sidebarVideos.map((video) => (
                      <div key={video.id} className="flex-shrink-0">
                        <VideoPlayer
                          ref={video.videoRef}
                          stream={video.stream}
                          name={video.name}
                          title={video.title}
                          videoEnabled={video.videoEnabled}
                          audioEnabled={video.audioEnabled}
                          onToggleVideo={video.onToggleVideo}
                          onToggleAudio={video.onToggleAudio}
                          isLocal={video.isLocal}
                          isPinned={false}
                          onPin={() => pinVideo(video.id)}
                          onUnpin={unpinVideo}
                          isSmall={true}
                        />
                      </div>
                    ))
                  })()}
                </div>
              </div>
            ) : (
              // Grid layout (no pinned video)
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAllVideos().map((video) => (
                  <VideoPlayer
                    key={video.id}
                    ref={video.videoRef}
                    stream={video.stream}
                    name={video.name}
                    title={video.title}
                    videoEnabled={video.videoEnabled}
                    audioEnabled={video.audioEnabled}
                    onToggleVideo={video.onToggleVideo}
                    onToggleAudio={video.onToggleAudio}
                    isLocal={video.isLocal}
                    isPinned={false}
                    onPin={() => pinVideo(video.id)}
                    onUnpin={unpinVideo}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="space-y-6">
            {!isInRoom && (
              <DeviceSettings
                devices={devices}
                selectedCamera={selectedCamera}
                selectedMicrophone={selectedMicrophone}
                onCameraChange={switchCamera}
                onMicrophoneChange={switchMicrophone}
              />
            )}

            <RoomControls
              name={name}
              setName={setName}
              currentRoom={currentRoom}
              setCurrentRoom={setCurrentRoom}
              copied={copied}
              onCopyLink={copyRoomLink}
              onJoinRoom={joinRoom}
              onLeaveRoom={leaveRoom}
              isInRoom={isInRoom}
              roomIdFromUrl={!!roomId} // Pass true if roomId came from URL
            />

            {isInRoom && <UserList users={roomUsers} currentUserId={me} />}
          </div>
        </div>
      </div>
    </div>
  )
}