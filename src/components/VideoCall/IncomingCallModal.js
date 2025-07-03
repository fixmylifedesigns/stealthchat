import { Phone, PhoneOff } from 'lucide-react'

export default function IncomingCallModal({ 
  receivingCall, 
  callAccepted, 
  callerName, 
  onAnswer, 
  onDecline 
}) {
  if (!receivingCall || callAccepted) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Incoming Call</h2>
        <p className="text-lg mb-6">
          {callerName || 'Anonymous'} is calling you...
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onAnswer}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            <Phone size={20} />
            Answer
          </button>
          <button
            onClick={onDecline}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={20} />
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}