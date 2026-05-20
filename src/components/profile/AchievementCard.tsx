"use client";

import { useState } from "react";

interface Props {
  icon:        string;
  name:        string;
  description: string;
  rewardGold:  number;
  unlocked:    boolean;
}

export function AchievementCard({ icon, name, description, rewardGold, unlocked }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="rounded-lg p-3 text-center"
        style={{
          background: "#1C2333",
          border:  unlocked
            ? "1px solid rgba(201,168,76,0.25)"
            : "1px solid rgba(255,255,255,0.06)",
          opacity: unlocked ? 1 : 0.4,
          cursor:  unlocked ? "default" : "default",
        }}
      >
        <div className="mb-1 text-2xl">{unlocked ? icon : "🔒"}</div>
        <p
          className="font-cinzel"
          style={{
            fontSize:      "0.56rem",
            letterSpacing: "0.06em",
            color:         unlocked ? "#B8B8C8" : "#686880",
            lineHeight:    1.3,
          }}
        >
          {name}
        </p>
      </div>

      {/* Tooltip — only for unlocked */}
      {unlocked && hover && (
        <div
          className="absolute z-20 rounded-lg p-3 text-left"
          style={{
            bottom:    "calc(100% + 8px)",
            left:      "50%",
            transform: "translateX(-50%)",
            background: "#0B0F1A",
            border:     "1px solid rgba(201,168,76,0.2)",
            minWidth:   "160px",
            maxWidth:   "220px",
            boxShadow:  "0 8px 24px rgba(0,0,0,0.7)",
            pointerEvents: "none",
          }}
        >
          <p style={{ fontSize: "0.72rem", color: "#EDE8DA", fontWeight: 600 }}>{name}</p>
          <p style={{ fontSize: "0.65rem", color: "#686880", marginTop: "4px", lineHeight: 1.4 }}>{description}</p>
          {rewardGold > 0 && (
            <p style={{ fontSize: "0.65rem", color: "#C9A84C", marginTop: "6px" }}>
              Награда: +{rewardGold} ◈
            </p>
          )}
        </div>
      )}
    </div>
  );
}
