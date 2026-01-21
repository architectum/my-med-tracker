export const getStartOfDay = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const formatTime = (dateObj) => {
  return dateObj.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const padTime = (value) => String(value).padStart(2, '0');

export const formatDateInput = (dateObj) => {
  return `${dateObj.getFullYear()}-${padTime(dateObj.getMonth() + 1)}-${padTime(dateObj.getDate())}`;
};

export const formatTimeInput = (dateObj) => {
  return `${padTime(dateObj.getHours())}:${padTime(dateObj.getMinutes())}`;
};

export const formatViewedDate = (date) => {
  const today = getStartOfDay(new Date());
  const yesterday = getStartOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return 'Сьогодні';
  if (date.getTime() === yesterday.getTime()) return 'Вчора';

  return date.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const DAY_HEIGHT = 960;
export const TIMELINE_TITLE_DEFAULT = 'Timeline';
