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

// ✅ ИСПРАВЛЕННАЯ: Получение текущей даты в локальном часовом поясе
export const getTodayISOString = (): string => {
  const now = new Date();
  // Получаем локальную дату в формате YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ✅ ИСПРАВЛЕННАЯ: Получение текущего времени в локальном часовом поясе
export const getNowISOString = (): string => {
  const now = new Date();
  // Используем локальное время для создания ISO строки
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+07:00`;
};

// Получение текущей даты для отображения
export const getTodayDisplay = (): string => {
  const now = new Date();
  return now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TIMEZONE
  });
};