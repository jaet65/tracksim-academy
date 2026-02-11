export const formatTime = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) {
    return 'N/A';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};