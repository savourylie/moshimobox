export const formatNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);

export const formatSignedNumber = (value: number): string => {
  const formatted = formatNumber(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

export const formatObservationDate = (value: string): string => {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(value);
  if (quarter) {
    return `Q${quarter[2]} ${quarter[1]}`;
  }

  const month = /^(\d{4})-(\d{2})$/.exec(value);
  if (month) {
    return `${MONTHS[Number(month[2]) - 1]} ${month[1]}`;
  }

  return value;
};

export const formatMonthYear = (date: Date): string =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);

export const formatFetchedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const datePart = date.toISOString().slice(0, 10);
  const timePart = date.toISOString().slice(11, 16);
  return `${datePart} ${timePart} UTC`;
};

export const displayUnitLabel = (unit: string): string => {
  const trimmed = unit.trim();
  return trimmed.length > 0 ? trimmed : "unit unavailable";
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
