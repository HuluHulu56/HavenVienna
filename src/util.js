export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.floor((seconds * 100) % 100);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}.${pad(hundredths)}`;
}

export const textStyle = {
  fontFamily: '"Trebuchet MS", Verdana, sans-serif',
  fontSize: '20px',
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#1b263b',
  strokeThickness: 5,
};
