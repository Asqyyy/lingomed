"use client";

import { useEffect, useRef } from "react";
import { StreamingMp3Player } from "@/lib/audio";

interface Props {
  onReady?: (player: StreamingMp3Player) => void;
}

export default function AudioPlayer({ onReady }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<StreamingMp3Player | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    let isActive = true;
    
    if (isActive) {
      const player = new StreamingMp3Player(audioRef.current);
      player.start();
      playerRef.current = player;
      if (onReady) onReady(player);
    }
    
    return () => {
      isActive = false;
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <audio
      ref={audioRef}
      controls
      autoPlay
      style={{ width: "100%", marginTop: "1rem" }}
    />
  );
}
