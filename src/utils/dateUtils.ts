// Часовой пояс Новосибирска/Барнаула (UTC+7)
const TIMEZONE = 'Asia/Novosibirsk';

// Форматирование даты в локальный формат
export const formatLocalDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIMEZONE
  });
};

// Форматирование только даты
export const formatLocalDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE
  });
};

// Форматирование только времени
export const formatLocalTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TIMEZONE
  });
};

// Получение текущей даты в формате ISO (для запросов к БД)
export const getTodayISOString = (): string => {
  const now = new Date();
  const date = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return date.toISOString().split('T')[0];
};

// Получение текущего времени в формате ISO (для запросов к БД)
export const getNowISOString = (): string => {
  const now = new Date();
  const date = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return date.toISOString();
};