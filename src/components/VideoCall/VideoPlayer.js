import { forwardRef, useEffect, useRef } from 'react'
import { Pin, PinOff } from 'lucide-react'

const VideoPlayer = forwardRef(({ 
  stream, 
  name, 
  title, 
  videoEnabled = true, 
  audioEnabled = true, 
  onToggleVideo, 
  onToggleAudio, 
  isLocal = false,
  isPinned = false,
  onPin,
  onUnpin,
  isSmall = false
}, ref) => {
  
  const videoRef = useRef()

  // Use the passed ref for local video, internal ref for remote
  const currentRef = isLocal ? (ref || videoRef) : videoRef

  // Handle stream for ALL videos - both local and remote
  useEffect(() => {
    if (stream && currentRef.current) {
      console.log(`🔗 Setting ${isLocal ? 'LOCAL' : 'REMOTE'} stream for:`, title, 'stream tracks:', stream.getTracks().length, 'ref exists:', !!currentRef.current)
      currentRef.current.srcObject = stream
    } else {
      console.log(`❌ Cannot set stream for ${title}:`, {
        hasStream: !!stream,
        hasRef: !!currentRef.current,
        isLocal,
        tracks: stream ? stream.getTracks().length : 0
      })
    }
  }, [stream, isLocal, title, currentRef])

  const handlePinClick = (e) => {
    e.stopPropagation()
    if (isPinned) {
      onUnpin()
    } else {
      onPin()
    }
  }

  return (
    <div className={`bg-gray-900 rounded-lg overflow-hidden relative group ${
      isPinned ? 'h-full' : isSmall ? 'aspect-video h-32' : 'aspect-video'
    }`}>
      {/* Name overlay - shows on hover */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        {title}
      </div>
      
      {/* Pin button - shows on hover (or always if pinned) */}
      <button
        onClick={handlePinClick}
        className={`absolute top-2 right-2 p-1 rounded transition-all duration-200 z-10 ${
          isPinned 
            ? 'bg-blue-600 text-white' 
            : 'bg-black bg-opacity-60 hover:bg-opacity-80 text-white opacity-0 group-hover:opacity-100'
        }`}
        title={isPinned ? 'Unpin video' : 'Pin video'}
      >
        {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
      </button>
      
      {/* Pin indicator badge */}
      {isPinned && (
        <div className="absolute top-2 right-12 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium z-10">
          Pinned
        </div>
      )}
      
      <div className={`flex items-center justify-center relative w-full ${
        isPinned ? 'h-full' : isSmall ? 'h-32' : 'aspect-video'
      }`}>
        {stream ? (
          <>
            <video
              playsInline
              muted={isLocal}
              ref={currentRef}
              autoPlay
              className="w-full h-full object-cover"
              suppressHydrationWarning
              onLoadedMetadata={() => console.log('Video metadata loaded for:', title)}
              onError={(e) => console.error('Video error for', title, ':', e)}
            />
            {!videoEnabled && isLocal && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-lg font-bold">
                      {name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <p className="text-xs">Camera Off</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400 text-center">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-sm font-bold">
                {name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-xs">
              {isLocal ? "Loading camera..." : "Connecting..."}
            </p>
          </div>
        )}
      </div>
      
      {/* Controls for local video only */}
      {isLocal && onToggleVideo && onToggleAudio && !isSmall && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex gap-1">
            <button
              onClick={onToggleVideo}
              className={`p-2 rounded-full text-xs ${
                videoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } transition-colors`}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoEnabled ? '📹' : '📹❌'}
            </button>
            <button
              onClick={onToggleAudio}
              className={`p-2 rounded-full text-xs ${
                audioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } transition-colors`}
              title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {audioEnabled ? '🎤' : '🎤❌'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer