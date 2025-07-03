import { Copy, Check, LogIn, LogOut } from 'lucide-react'

export default function RoomControls({ 
  name, 
  setName, 
  currentRoom,
  setCurrentRoom,
  copied, 
  onCopyLink, 
  onJoinRoom,
  onLeaveRoom,
  isInRoom,
  roomIdFromUrl = false // New prop to indicate if room ID came from URL
}) {
  const handleJoinClick = () => {
    const roomToJoin = currentRoom.trim() || undefined
    onJoinRoom(roomToJoin)
  }

  return (
    <>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Your Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              disabled={isInRoom}
              autoComplete="off"
            />
          </div>

          {isInRoom && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share Room Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/stealthchat?call=${currentRoom}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  type="button"
                  onClick={onCopyLink}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  title="Copy room link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              {copied && (
                <p className="text-sm text-green-600 mt-1">Room link copied!</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Room Controls</h3>
        
        <div className="space-y-4">
          {!isInRoom ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {roomIdFromUrl ? 'Room ID (from shared link)' : 'Room ID (optional)'}
                </label>
                <input
                  type="text"
                  value={currentRoom}
                  onChange={(e) => setCurrentRoom(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                    roomIdFromUrl ? 'bg-gray-50' : ''
                  }`}
                  placeholder={roomIdFromUrl ? '' : 'Leave empty to create new room'}
                  readOnly={roomIdFromUrl}
                  autoComplete="off"
                />
                {roomIdFromUrl && (
                  <p className="text-sm text-blue-600 mt-1">
                    This room ID was shared with you via link
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleJoinClick}
                  disabled={!name.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <LogIn size={20} />
                  {currentRoom ? 'Join Room' : 'Create Room'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <LogOut size={20} />
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}