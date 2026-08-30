import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";

export type DashboardPeriod =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "this_year";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRanges(period: DashboardPeriod): {
  current: DateRange;
  previous: DateRange;
} {
  const now = new Date();

  switch (period) {
    case "this_month":
      return {
        current: {
          start: startOfMonth(now),
          end: endOfMonth(now),
        },
        previous: {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        },
      };
    case "last_month":
      return {
        current: {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        },
        previous: {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(subMonths(now, 2)),
        },
      };
    case "last_3_months":
      return {
        current: {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
        },
        previous: {
          start: startOfMonth(subMonths(now, 5)),
          end: endOfMonth(subMonths(now, 3)),
        },
      };
    case "this_year":
      return {
        current: {
          start: startOfYear(now),
          end: endOfYear(now),
        },
        previous: {
          start: startOfYear(subYears(now, 1)),
          end: endOfYear(subYears(now, 1)),
        },
      };
    default:
      // Default to this_month
      return {
        current: {
          start: startOfMonth(now),
          end: endOfMonth(now),
        },
        previous: {
          start: startOfMonth(subMonths(now, 1)),
          end: endOfMonth(subMonths(now, 1)),
        },
      };
  }
}
