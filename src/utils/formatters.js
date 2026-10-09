/**
 * Formatting and Helper Utilities for Dataverse AI
 */

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-US').format(val);
};

export const formatPercent = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${Number(val).toFixed(1)}%`;
};

export const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
