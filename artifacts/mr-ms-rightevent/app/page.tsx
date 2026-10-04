"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brand } from "@/components/brand";
import { DEMO_PREFS } from "@/lib/prefs";

type Message = { id: number; author: "bot" | "user"; text: string; summary?: boolean };
const summary = "📍 City: Taipei\n📏 Distance: 50 miles\n😄 Vibe: cheerful\n🏷️ Type: tech (options: tech, entrepreneurship, hobby, coffee)\n💸 Price: free\n📧 Luma email: hello-allo@gmail.com";

export default function HomePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const initial = [
      "Hi, I'm Co-Parrot 🦜 Here's what I'll use to find your events:",
      summary,
      "Chat with me to tweak anything, or type “confirm” to start.",
    ];
    let timers: ReturnType<typeof setTimeout>[] = [];
    initial.forEach((text, index) => {
      timers.push(setTimeout(() => {
        setMessages((current) => [...current, { id: nextId.current++, author: "bot", text, summary: index === 1 }]);
        if (index === initial.length - 1) setTyping(false);
      }, 600 * (index + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, typing]);

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((current) => [...current, { id: nextId.current++, author: "user", text }]);
    if (text.toLowerCase() === "confirm") {
      setTyping(true);
      setTimeout(() => {
        setMessages((current) => [...current, { id: nextId.current++, author: "bot", text: "Got it, will discover some new events. 🦜✨" }]);
        setTyping(false);
        window.sessionStorage.setItem("prefs", JSON.stringify(DEMO_PREFS));
        setTimeout(() => router.push("/swipe"), 1500);
      }, 350);
    } else {
      setTimeout(() => setMessages((current) => [...current, { id: nextId.current++, author: "bot", text: "Noted! (Demo presets are locked.) Type “confirm” when ready." }]), 350);
    }
  };

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <Brand />
        <motion.section className="chat-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
          <header className="chat-top">
            <span className="parrot-avatar">🦜</span>
            <div><div className="chat-name">Co-Parrot</div><span className="online">Your cheerful night-out guide</span></div>
          </header>
          <div className="chat-stream" aria-live="polite">
            {messages.map((message) => (
              <div className={`message-row ${message.author}`} key={message.id}>
                <div className={`bubble ${message.summary ? "summary" : ""}`}>{message.text}</div>
              </div>
            ))}
            {typing && <div className="typing">Co-Parrot is typing…</div>}
            <div ref={endRef} />
          </div>
          <form className="chat-compose" onSubmit={sendMessage}>
            <input aria-label="Message Co-Parrot" className="chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell me what sounds good…" />
            <button className="send-button" aria-label="Send message" type="submit" disabled={!input.trim()}>↑</button>
          </form>
        </motion.section>
        <div className="footer-note">A little serendipity, one Taipei night at a time.</div>
      </div>
    </main>
  );
}