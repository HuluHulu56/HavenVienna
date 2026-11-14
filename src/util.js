export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds * 100) % 100);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${pad(hundredths)}`;
}

export const textStyle = {
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  fontSize: '16px',
  color: '#ffffff',
  stroke: '#1b263b',
  strokeThickness: 4,
};
