/** Today's date in Sydney as YYYY-MM-DD. */
export function sydneyToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(now);
}

/** True once the article's publishDate (a Sydney calendar date) has arrived. */
export const isDue = (publishDate: Date, today = sydneyToday()) => publishDate.toISOString().slice(0, 10) <= today;
