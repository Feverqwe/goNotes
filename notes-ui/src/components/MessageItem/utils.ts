export const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  }
  return date.toLocaleDateString([], {day: 'numeric', month: 'short'});
};

export const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};
