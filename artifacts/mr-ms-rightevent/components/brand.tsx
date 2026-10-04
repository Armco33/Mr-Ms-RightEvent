"use client";

import Link from "next/link";

export function Brand() {
  return (
    <div className="brand-row">
      <Link className="brand" href="/">
        <span className="brand-mark">🦜</span>
        <span><span className="brand-name">Mr-Ms-RightEvent</span><span className="brand-caption">GOOD NIGHTS, FOUND.</span></span>
      </Link>
      <span className="city-pill">📍 Taipei</span>
    </div>
  );
}