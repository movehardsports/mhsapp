// Deadlines are plain dates (YYYY-MM-DD); format them in UTC so the day never shifts.
export const formatDeadline = (deadline: string) =>
  new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// The UTC day of a timestamp from the database (e.g. created_at), formatted like deadlines.
export const formatDate = (timestamp: string) => formatDeadline(timestamp.slice(0, 10));
