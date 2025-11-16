// app/interview/[id]/start/page.tsx
"use client";

import { api } from "@/convex/_generated/api";
import { useConvex } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, Phone, Timer, Camera } from "lucide-react";

import Vapi from "@vapi-ai/web";

type InterviewQuestion = { Question: string; Answer?: string };
type InterviewData = {
  interviewQuestions: InterviewQuestion[];
  _id: string;
  JobPosition?: string;
  userName?: string;
};

export default function StartInterview() {
  const convex = useConvex();
  const { id } = useParams();

  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const aiVideoRef = useRef<HTMLVideoElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);

  const callRef = useRef<any>(null);
  const vapi = useRef<any>(null);

  // instantiate vapi once
  if (!vapi.current) {
    if (!process.env.NEXT_PUBLIC_VAPI_KEY) {
      throw new Error("Missing NEXT_PUBLIC_VAPI_KEY");
    }
    vapi.current = new Vapi(process.env.NEXT_PUBLIC_VAPI_KEY);
  }

  // Load interview data
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await convex.query(api.Interview.GetInterviewQuestions, {
          // @ts-ignore
          interviewRecordId: id,
        });
        setInterviewData(res || null);
      } catch (e) {
        console.error("Failed to load interview data:", e);
      }
    })();
  }, [id, convex]);

  // auto start when questions available
  useEffect(() => {
    if (interviewData?.interviewQuestions?.length) startCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewData]);

  // start the assistant/call
  async function startCall() {
    if (!interviewData) return;

    setTranscript([]);
    setFeedback(null);

    const questionsText = interviewData.interviewQuestions
      .map((q, i) => `${i + 1}. ${q.Question}`)
      .join("\n");

    // assistant configuration - you can replace model/provider if needed
    const assistantConfig = {
      name: "AI Recruiter",
      firstMessage: `Hi ${interviewData.userName ?? "there"}, ready for your ${interviewData.JobPosition ?? "interview"}?`,
      transcriber: { provider: "deepgram" as const, model: "nova-2", language: "en" },
      voice: { provider: "playht" as const, voiceId: "jennifer" },
      model: {
        provider: "openai" as const,
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI recruiter. Ask questions one at a time and wait for answers.
Questions:
${questionsText}`,
          },
        ],
      },
    };

    try {
      setIsCalling(true);

      // start returns a call object on many SDK builds
      const call = await vapi.current.start(assistantConfig as any);
      callRef.current = call;

      // Attach both vapi (global) listeners and call instance listeners for max compatibility.

      // --- Global vapi listeners ---
      try {
        vapi.current.on?.("call-start", () => {
          console.log("vapi: call-start");
          setIsCalling(true);
        });

        // NOTE: we keep call-end listener but we DO NOT trigger feedback here.
        // feedback is generated only by endCall() to avoid race conditions.
        vapi.current.on?.("call-end", () => {
          console.log("vapi: call-end");
          setIsCalling(false);
          stopAllStreams();
          // DO NOT call safeGenerateFeedback() here — endCall() handles feedback generation.
        });

        // Robust message listener that accepts different shapes:
        vapi.current.on?.("message", (m: any) => {
          // transcript objects can have different shapes depending on vapi build.
          // Common shapes seen:
          // 1) { type: "transcript", transcript: "text", speaker: "user" }
          // 2) { type: "transcript", transcript: "text", role: "user" }
          // 3) { role: "user", content: "text" }
          try {
            if (m?.type === "transcript" && (m?.speaker === "user" || m?.role === "user") && m?.transcript) {
              setTranscript((t) => [...t, m.transcript]);
            } else if (m?.role === "user" && m?.content) {
              setTranscript((t) => [...t, m.content]);
            } else if (m?.type === "transcript" && m?.transcript && !m?.speaker && !m?.role) {
              // fallback: if it's a transcript but no speaker/role field
              setTranscript((t) => [...t, m.transcript]);
            }
          } catch (err) {
            console.warn("vapi message handling error:", err, m);
          }
        });

        vapi.current.on?.("mediaStream", ({ stream, label }: any) => {
          if (label === "assistant") {
            if (aiVideoRef.current) aiVideoRef.current.srcObject = stream;
          } else if (label === "user") {
            if (userVideoRef.current) userVideoRef.current.srcObject = stream;
          } else {
            // fallback: attach to AI if no label
            if (aiVideoRef.current) aiVideoRef.current.srcObject = stream;
          }
        });
      } catch (e) {
        console.warn("vapi.on attach failed:", e);
      }

      // --- Instance call listeners (some builds put events on call) ---
      if (callRef.current) {
        const c = callRef.current;
        try {
          // We still listen for end, but do NOT call feedback from here.
          c.on?.("end", () => {
            console.log("call instance ended");
            setIsCalling(false);
            stopAllStreams();
            // DO NOT call safeGenerateFeedback() here to avoid duplicate calls.
          });

          // instance message handler: same robust logic as global one
          c.on?.("message", (m: any) => {
            try {
              if (m?.type === "transcript" && (m?.speaker === "user" || m?.role === "user") && m?.transcript) {
                setTranscript((t) => [...t, m.transcript]);
              } else if (m?.role === "user" && m?.content) {
                setTranscript((t) => [...t, m.content]);
              } else if (m?.type === "transcript" && m?.transcript && !m?.speaker && !m?.role) {
                setTranscript((t) => [...t, m.transcript]);
              }
            } catch (err) {
              console.warn("call instance message handling error:", err, m);
            }
          });

          c.on?.("mediaStream", ({ stream, label }: any) => {
            if (label === "assistant") {
              if (aiVideoRef.current) aiVideoRef.current.srcObject = stream;
            } else if (label === "user") {
              if (userVideoRef.current) userVideoRef.current.srcObject = stream;
            } else {
              if (aiVideoRef.current) aiVideoRef.current.srcObject = stream;
            }
          });
        } catch (e) {
          console.warn("call listeners attach failed:", e);
        }
      }

      // Start local preview for user
      if (cameraEnabled) {
        try {
          const local = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          if (userVideoRef.current) userVideoRef.current.srcObject = local;
        } catch (err) {
          console.warn("local preview failed:", err);
        }
      }
    } catch (err) {
      console.error("startCall failed:", err);
      setIsCalling(false);
    }
  }

  // robust end call function used by button and by listeners
  async function endCall() {
    try {
      // Prefer global stop
      if (vapi.current?.stop) {
        await vapi.current.stop();
      }
      // try call instance fallbacks
      if (callRef.current) {
        if (callRef.current.end) await callRef.current.end();
        else if (callRef.current.hangUp) await callRef.current.hangUp();
        else if (callRef.current.stop) await callRef.current.stop();
        else if (callRef.current.close) await callRef.current.close();
      }
    } catch (e) {
      console.warn("endCall error:", e);
    } finally {
      setIsCalling(false);
      stopAllStreams();
      // single, deterministic place to generate feedback
      await safeGenerateFeedback();
      callRef.current = null;
    }
  }

  function stopAllStreams() {
    [aiVideoRef.current, userVideoRef.current].forEach((v) => {
      const s: any = v?.srcObject;
      if (s && typeof s.getTracks === "function") {
        s.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
      if (v) v.srcObject = null;
    });
  }

  function toggleCamera() {
    if (cameraEnabled) {
      // stop only local camera track
      const s: any = userVideoRef.current?.srcObject;
      if (s && s.getVideoTracks) s.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
      if (userVideoRef.current) userVideoRef.current.srcObject = null;
      setCameraEnabled(false);
    } else {
      enableCamera();
      setCameraEnabled(true);
    }
  }

  async function enableCamera() {
    try {
      const local = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (userVideoRef.current) userVideoRef.current.srcObject = local;
    } catch (e) {
      console.warn("enableCamera failed:", e);
    }
  }

  // safe wrapper to avoid duplicate feedback calls
  async function safeGenerateFeedback() {
    if (loadingFeedback) return;
    await generateFeedback();
  }

  // generate feedback by POSTing to server route
  async function generateFeedback() {
    if (!interviewData) return;
    setLoadingFeedback(true);
    try {
      const questions = interviewData.interviewQuestions.map((q) => q.Question);
      const answers = transcript.slice();

      const res = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, answers }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("generate-feedback failed:", res.status, txt);
        setFeedback("Failed to generate feedback. See server logs.");
      } else {
        const data = await res.json();
        setFeedback(data.feedback || "No feedback returned.");
      }
    } catch (e) {
      console.error("generateFeedback error:", e);
      setFeedback("Error generating feedback.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  // UI
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="flex items-center gap-2 mb-6 text-xl font-semibold">
        <Timer className="w-6" />
        <span>00:00</span>
      </div>

      {/* VIDEOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full px-10 max-w-5xl">
        {/* AI VIDEO */}
        <div className="relative bg-black rounded-2xl overflow-hidden h-[380px] shadow-xl">
          <video autoPlay ref={aiVideoRef} className="w-full h-full object-cover" />
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <Image src="/ai.jpg" width={40} height={40} alt="AI" className="rounded-full" />
            <span className="text-white">Virtual HR</span>
          </div>
        </div>

        {/* USER VIDEO */}
        <div className="relative bg-black rounded-2xl overflow-hidden h-[380px] shadow-xl">
          <video autoPlay muted ref={userVideoRef} className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">U</div>
            <span className="text-white">You</span>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex gap-6 mt-10">
        <button onClick={toggleCamera} className="bg-gray-700 text-white px-4 py-2 rounded-full flex items-center gap-2">
          <Camera className="w-5" />
          {cameraEnabled ? "Disable Camera" : "Enable Camera"}
        </button>

        <button onClick={endCall} className="bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2">
          <Phone className="w-5" />
          End Call
        </button>
      </div>

      {/* FEEDBACK */}
      <div className="w-full max-w-4xl mt-10 px-10">
        <h3 className="font-semibold text-lg mb-2">Interview Feedback</h3>
        {loadingFeedback ? (
          <p className="text-gray-600">Generating feedback…</p>
        ) : feedback ? (
          <div className="bg-white p-4 rounded-xl shadow whitespace-pre-wrap">{feedback}</div>
        ) : (
          <p className="text-gray-500">Feedback will appear after the interview ends.</p>
        )}
      </div>
    </div>
  );
}
