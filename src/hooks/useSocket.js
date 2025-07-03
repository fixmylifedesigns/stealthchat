// hooks/useSocket.js
import { useRef, useEffect } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
  const socketRef = useRef();

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io({
        path: "/api/socket",
      });
    }
  }, []);

  return socketRef.current;
}
