export const TIME_CONTROL_MS: Record<string, number> = {
  blitz: 5 * 60 * 1000,
  rapid: 10 * 60 * 1000,
  classical: 30 * 60 * 1000,
};

export function calculateNewRatings(
  whiteRating: number,
  blackRating: number,
  result: "white" | "black" | "draw"
): { white: number; black: number; whiteChange: number; blackChange: number } {
  const K = 32;
  const expectedWhite = 1 / (1 + 10 ** ((blackRating - whiteRating) / 400));
  const scoreWhite = result === "white" ? 1 : result === "draw" ? 0.5 : 0;
  const scoreBlack = 1 - scoreWhite;

  const newWhite = Math.round(whiteRating + K * (scoreWhite - expectedWhite));
  const newBlack = Math.round(blackRating + K * (scoreBlack - (1 - expectedWhite)));

  return {
    white: Math.max(100, newWhite),
    black: Math.max(100, newBlack),
    whiteChange: newWhite - whiteRating,
    blackChange: newBlack - blackRating,
  };
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
