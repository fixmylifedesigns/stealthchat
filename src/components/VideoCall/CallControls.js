import { Phone, PhoneOff, Copy, Check } from "lucide-react";

export default function CallControls({
  name,
  setName,
  me,
  idToCall,
  setIdToCall,
  callAccepted,
  callEnded,
  copied,
  onCopy,
  onCall,
  onLeave,
}) {
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
              onChange={(e) => {
                e.preventDefault;
                setName(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Call Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={
                  me
                    ? `${
                        typeof window !== "undefined"
                          ? window.location.origin
                          : ""
                      }/stealthchat?call=${me}`
                    : ""
                }
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={onCopy}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                title="Copy call link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 mt-1">Call link copied!</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Make a Call</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID to Call
            </label>
            <input
              type="text"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="Paste friend's ID or call link"
            />
          </div>

          <div className="flex justify-center">
            {callAccepted && !callEnded ? (
              <button
                onClick={onLeave}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <PhoneOff size={20} />
                End Call
              </button>
            ) : (
              <button
                onClick={() => onCall(idToCall)}
                disabled={!idToCall.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Phone size={20} />
                Call
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
