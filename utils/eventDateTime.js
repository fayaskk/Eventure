const TIME_ZONE = "Asia/Kolkata";

export const getEventDateTime = (event) => {
  if (!event?.eventDate || !event?.startTime) {
    return null;
  }

  const [hours, minutes] = event.startTime.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(event.eventDate));

  const parts = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );

  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hours - 5,
      minutes - 30,
    ),
  );
};