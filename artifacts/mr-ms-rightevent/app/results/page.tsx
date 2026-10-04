"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Brand } from "@/components/brand";
import type { EventCard } from "@/lib/types";

export default function ResultsPage() {
  const router = useRouter();
  const [liked, setLiked] = useState<EventCard[]>([]);
  const [modal, setModal] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem("liked") ?? "[]") as EventCard[];
      setLiked(Array.isArray(parsed) ? parsed : []);
    } catch { setLiked([]); }
    const show = setTimeout(() => { setReady(true); setModal(true); }, 800);
    return () => clearTimeout(show);
  }, []);

  const startOver = () => {
    window.sessionStorage.clear();
    router.push("/");
  };
  const date = (value: string) => new Intl.DateTimeFormat("en", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Taipei",
  }).format(new Date(value));
  const firstTitle = liked[0]?.title ?? "";

  return (
    <main className="app-shell">
      <section className="results-page">
        <Brand />
        <header className="results-top"><div><h1 className="page-heading">Your events 💚</h1><p className="page-subtitle">Your next good night might be right here.</p></div><button className="outline-button" onClick={startOver}>Start over</button></header>
        {ready && liked.length === 0 ? (
          <div className="empty-results"><div className="empty-icon">🦜</div><h2>No matches this time, try again</h2><button className="primary-button" onClick={startOver}>Back to Co-Parrot</button></div>
        ) : (
          <div className="results-list">{liked.map((event) => (
            <article className="result-card" key={event.id}>
              <img className="result-thumb" src={event.image} alt="" />
              <div>
                <a className="result-title" href={event.url} target="_blank" rel="noreferrer">{event.title}</a>
                <div className="result-meta">{event.organizer}<br />{date(event.start)} · {event.venue}</div>
                <div className="result-link-hint">View event ↗</div>
              </div>
            </article>
          ))}</div>
        )}
      </section>
      <AnimatePresence>
        {modal && liked.length > 0 && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(false)}>
          <motion.section className="match-modal" role="dialog" aria-modal="true" initial={{ opacity: 0, y: 20, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }} onClick={(event) => event.stopPropagation()}>
            <div className="confetti">{Array.from({ length: 12 }, (_, index) => <motion.span className="confetti-piece" key={index} style={{ left: `${8 + (index * 19) % 84}%`, top: `${5 + (index * 23) % 75}%` }} animate={{ y: [0, -15, 0], rotate: [0, index % 2 ? 18 : -18, 0], opacity: [.35, 1, .35] }} transition={{ duration: 1.7 + (index % 3) * .3, repeat: Infinity, delay: index * .08 }}>{index % 2 ? "💚" : "♥"}</motion.span>)}</div>
            <motion.span className="modal-heart" animate={{ scale: [1, 1.16, 1] }} transition={{ duration: .9, repeat: Infinity }}>💚</motion.span>
            <h2>It's a Match!</h2>
            <p>Organizer approved: {firstTitle}</p>
            <button className="primary-button" onClick={() => setModal(false)}>See my list</button>
          </motion.section>
        </motion.div>}
      </AnimatePresence>
    </main>
  );
}