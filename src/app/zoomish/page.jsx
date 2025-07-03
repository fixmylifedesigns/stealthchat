"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Copy, Check } from "lucide-react";
import Peer from "simple-peer";
import io from "socket.io-client";

let socket;

export default function Home() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [callerName, setCallerName] = useState("");

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    console.log("Starting camera initialization...");

    // Get user media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        console.log("Camera stream obtained:", stream);
        setStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing media devices:", error);
      });
  }, []);

  // Separate useEffect to handle setting the video source
  useEffect(() => {
    if (stream && myVideo.current) {
      console.log("Setting video source...");
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

useEffect(() => {
  const socketInitializer = async () => {
    // Initialize the Socket.IO server
    await fetch('/api/socket')
    
    // Connect to the Socket.IO server on port 5001
    socket = io('http://localhost:5001')

    socket.on('connect', () => {
      console.log('✅ Connected! ID:', socket.id)
    })

    socket.on('me', (id) => {
      console.log('✅ Received ID:', id)
      setMe(id)
    })

    socket.on('callUser', (data) => {
      setReceivingCall(true)
      setCaller(data.from)
      setCallerName(data.name)
      setCallerSignal(data.signal)
    })
  }

  socketInitializer()

  return () => {
    if (socket) socket.disconnect()
  }
}, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(me);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
    setReceivingCall(false);
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.destroy();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-red-600">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Stealthwork
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Section */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* My Video */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-800">
                  <h3 className="text-white font-semibold">
                    You ({name || "Anonymous"})
                  </h3>
                </div>
                <div className="aspect-video flex items-center justify-center">
                  {stream ? (
                    <video
                      playsInline
                      muted
                      ref={myVideo}
                      autoPlay
                      className="w-full h-full object-cover"
                      suppressHydrationWarning
                    />
                  ) : (
                    <div className="text-white">Loading camera...</div>
                  )}
                </div>
              </div>

              {/* User Video */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-800">
                  <h3 className="text-white font-semibold">
                    {callAccepted && !callEnded
                      ? callerName || "User"
                      : "Waiting..."}
                  </h3>
                </div>
                <div className="aspect-video flex items-center justify-center">
                  {callAccepted && !callEnded ? (
                    <video
                      playsInline
                      ref={userVideo}
                      autoPlay
                      className="w-full h-full object-cover"
                      suppressHydrationWarning
                    />
                  ) : (
                    <div className="text-gray-400">No active call</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="space-y-6">
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={me}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      title="Copy ID"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-sm text-green-600 mt-1">
                      ID copied to clipboard!
                    </p>
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
                    placeholder="Paste friend's ID here"
                  />
                </div>

                <div className="flex justify-center">
                  {callAccepted && !callEnded ? (
                    <button
                      onClick={leaveCall}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      <PhoneOff size={20} />
                      End Call
                    </button>
                  ) : (
                    <button
                      onClick={() => callUser(idToCall)}
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
          </div>
        </div>

        {/* Incoming Call Modal */}
        {receivingCall && !callAccepted && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center max-w-md mx-4">
              <h2 className="text-2xl font-bold mb-4">Incoming Call</h2>
              <p className="text-lg mb-6">
                {callerName || "Anonymous"} is calling you...
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={answerCall}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <Phone size={20} />
                  Answer
                </button>
                <button
                  onClick={() => setReceivingCall(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <PhoneOff size={20} />
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
