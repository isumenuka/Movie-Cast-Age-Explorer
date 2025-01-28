export const getYear = (date?: string): string => {
  if (!date) return 'N/A';
  return date.split('-')[0];
};

export const calculateAge = (birthYear: number | null, year: number | null): string => {
  if (!birthYear || !year) return 'Unknown';
  return String(year - birthYear);
};