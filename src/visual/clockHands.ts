const TAU = Math.PI * 2;

export function clockHandAngles(now: Date): {
  hour: number;
  minute: number;
  second: number;
} {
  // Chaque tour inclut la fraction du tour de l'aiguille plus rapide.
  const secondTurn = (now.getSeconds() + now.getMilliseconds() / 1000) / 60;
  const minuteTurn = (now.getMinutes() + secondTurn) / 60;
  const hourTurn = ((now.getHours() % 12) + minuteTurn) / 12;

  return {
    hour: -TAU * hourTurn,
    minute: -TAU * minuteTurn,
    second: -TAU * secondTurn,
  };
}
