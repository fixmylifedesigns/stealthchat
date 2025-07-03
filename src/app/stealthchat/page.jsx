import { Suspense } from "react";
import VideoCallApp from "@/components/VideoCall/VideoCallApp";

export default function StealthChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="text-black">
        <VideoCallApp />
      </div>
    </Suspense>
  );
}
