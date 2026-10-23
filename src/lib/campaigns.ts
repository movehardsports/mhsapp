// Deadlines are plain dates (YYYY-MM-DD); format them in UTC so the day never shifts.
export const formatDeadline = (deadline: string) =>
  new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
