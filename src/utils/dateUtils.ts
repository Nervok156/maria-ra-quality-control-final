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

// ✅ ИСПРАВЛЕННАЯ: Получение текущей даты с учётом часового пояса
export const getTodayISOString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  console.log('📅 getTodayISOString возвращает:', `${year}-${month}-${day}`);
  return `${year}-${month}-${day}`;
};


// Получение текущего времени в формате ISO с часовым поясом
export const getNowISOString = (): string => {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';
  
  // Используем локальное время с учётом часового пояса
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000${offsetSign}${offsetHours}:${offsetMinutes}`;
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