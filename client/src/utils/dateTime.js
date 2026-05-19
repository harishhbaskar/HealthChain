// Date and Time formatting utilities for IST (Asia/Kolkata)
// NOTE: MySQL now stores all timestamps in IST, so no timezone conversion needed

/**
 * Format a date string (YYYY-MM-DD) to readable format
 * Handles dates without timezone issues
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string to long format
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time string (HH:MM:SS) to 12-hour format with AM/PM
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Format a timestamp to readable format (already in IST from MySQL)
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  // MySQL returns timestamps in IST, just format them
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format a timestamp to short format
 */
export function formatTimestampShort(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current date in IST
 */
export function getCurrentDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
