"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Brand } from "@/components/brand";
import { APP_BASE_PATH } from "@/lib/prefs";
import type { EventCard, EventsResponse } from "@/lib/types";

export default function SwipePage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventCard[]>([]);
  const [source, setSource] = useState<EventsResponse["source"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<EventCard[]>([]);
  const [reacting, setReacting] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const yesOpacity = useTransform(x, [30, 130], [0, 1]);
  const noOpacity = useTransform(x, [-130, -30], [1, 0]);
  const finished = useRef(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`${APP_BASE_PATH}/api/events`);
      if (!response.ok) throw new Error("Unable to load events");
      const payload = await response.json() as EventsResponse;
      setEvents(payload.events.slice(0, 10));
      setSource(payload.source);
      if (payload.events.length === 0) complete([]);
    } catch {
      setError(true);
    } finally { setLoading(false); }
  // complete is stable enough for this mount-only loader.
  }, []);

  const complete = (finalLikes: EventCard[]) => {
    if (finished.current) return;
    finished.current = true;
    window.sessionStorage.setItem("liked", JSON.stringify(finalLikes));
    router.push("/results");
  };

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const decide = (direction: "right" | "left") => {
    if (reacting || loading || finished.current) return;
    const current = events[index];
    if (!current) { complete(liked); return; }
    const nextLikes = direction === "right" ? [...liked, current] : liked;
    if (direction === "right") {
      setLiked(nextLikes);
      setReacting(true);
      void animate(x, 480, { duration: .22 });
      setTimeout(() => {
        setReacting(false);
        x.set(0);
        if (index + 1 >= events.length) complete(nextLikes);
        else setIndex((value) => value + 1);
      }, 1800);
    } else {
      void animate(x, -480, { duration: .22 });
      setTimeout(() => {
        x.set(0);
        if (index + 1 >= events.length) complete(nextLikes);
        else setIndex((value) => value + 1);
      }, 220);
    }
  };

  const current = events[index];
  const formatStart = (value: string) => new Intl.DateTimeFormat("en", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Taipei",
  }).format(new Date(value));

  if (loading) return <main className="app-shell"><div className="swipe-page"><Brand /><div className="searching"><span className="parrot-large">🦜</span><span>Co-Parrot is searching… 🦜</span></div></div></main>;
  if (error) return <main className="app-shell"><div className="swipe-page"><Brand /><div className="empty-search"><span className="parrot-large">🦜</span><span>Co-Parrot couldn't find the events just now.</span><button className="primary-button" onClick={() => void fetchEvents()}>Try again</button></div></div></main>;
  if (!current) return <main className="app-shell"><div className="swipe-page"><Brand /><div className="empty-search"><span className="parrot-large">🦜</span><span>Co-Parrot is getting your list ready…</span></div></div></main>;

  return (
    <main className="app-shell">
      <div className="swipe-page">
        <div className="swipe-head"><Brand /><span className="step-count">{index + 1} / 10</span></div>
        {process.env.NODE_ENV === "development" && source && <div className="footer-note">source: {source}</div>}
        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(((index + 1) / 10) * 100, 100)}%` }} /></div>
        <div className="swipe-card-stage">
          <motion.article className="event-card" style={{ x, rotate }} drag={!reacting ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.8}
            onDragEnd={(_, info) => { if (info.offset.x > 120) decide("right"); else if (info.offset.x < -120) decide("left"); else void animate(x, 0, { type: "spring", stiffness: 300, damping: 24 }); }}>
            <motion.div className="swipe-stamp going" style={{ opacity: yesOpacity }}>GOING</motion.div>
            <motion.div className="swipe-stamp nope" style={{ opacity: noOpacity }}>NOPE</motion.div>
            <div className="event-cover"><img src={current.image} alt="" /><div className="cover-fade" /></div>
            <div className="event-info">
              <div className="event-kicker"><span>{current.city}</span>{current.free && <span className="free-chip">Free</span>}</div>
              <h1 className="event-title">{current.title}</h1>
              <p className="event-detail">◷ &nbsp;{formatStart(current.start)}</p>
              <p className="event-detail">⌖ &nbsp;{current.venue}</p>
              <div className="event-organizer">Hosted by {current.organizer}</div>
            </div>
          </motion.article>
          {reacting && <motion.div className="reaction-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.span className="reaction-heart" animate={{ scale: [1, 1.22, 1], rotate: [-4, 4, -4] }} transition={{ duration: .8, repeat: Infinity }}>💚</motion.span><h2 className="reaction-title">Great! 🎉</h2><p className="reaction-copy">Connecting &amp; registering with the event organizer…</p><motion.div className="waiting" animate={{ opacity: [.45, 1] }} transition={{ duration: .65, repeat: Infinity, repeatType: "reverse" }}>waiting…</motion.div></motion.div>}
        </div>
        <div className="swipe-actions">
          <button className="swipe-action" aria-label="Nope" disabled={reacting} onClick={() => decide("left")}>❌</button>
          <button className="swipe-action like" aria-label="Going" disabled={reacting} onClick={() => decide("right")}>💚</button>
        </div>
      </div>
    </main>
  );
}