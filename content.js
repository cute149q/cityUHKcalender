(() => {

const DAY_OFFSETS = { U: 0, M: 1, T: 2, W: 3, R: 4, F: 5, S: 6 };

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXPORT_STATUS") {
    showStatus(message.text);
    return;
  }
  if (message.type !== "PREVIEW_SCHEDULE" && message.type !== "EXPORT_SCHEDULE") return;

  try {
    const events = parseSchedule(document);
    if (!events.length) {
      throw new Error("No scheduled classes found. Open AIMS Student Detail Schedule, then try again.");
    }
    if (message.type === "PREVIEW_SCHEDULE") {
      sendResponse({ ok: true, events });
      return;
    }
    sendResponse({ ok: true, eventCount: events.length, filename: `cityu-schedule-${dateStamp(new Date())}.ics`, ics: makeCalendar(events, message.reminderMinutes) });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }
});

function showStatus(text) {
  const existing = document.getElementById("cityu-calendar-exporter-status");
  existing?.remove();
  const notice = document.createElement("div");
  notice.id = "cityu-calendar-exporter-status";
  notice.textContent = text;
  Object.assign(notice.style, {
    position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647",
    maxWidth: "360px", padding: "12px 16px", borderRadius: "10px",
    background: "#0f766e", color: "white", font: "14px system-ui, sans-serif",
    boxShadow: "0 8px 28px rgba(0,0,0,.25)"
  });
  document.documentElement.append(notice);
  setTimeout(() => notice.remove(), 6000);
}

function parseSchedule(doc) {
  const meetings = [];
  const meetingTables = [...doc.querySelectorAll('table[summary*="scheduled meeting times"]')];

  for (const table of meetingTables) {
    const course = findCourseName(table);
    const rows = [...table.querySelectorAll("tr")].slice(1);
    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")].map((cell) => clean(cell.textContent));
      if (cells.length < 7 || /TBA/i.test(cells.slice(1, 5).join(" "))) continue;

      const [type, time, days, location, range, _scheduleType, instructors] = cells;
      const [start, end] = parseTimeRange(time);
      const [rangeStart, rangeEnd] = parseDateRange(range);
      for (const day of days.toUpperCase()) {
        if (!(day in DAY_OFFSETS)) continue;
        for (let date = firstDateOnOrAfter(rangeStart, DAY_OFFSETS[day]); date <= rangeEnd; date = addDays(date, 7)) {
          meetings.push({ course, type, start, end, date, location, instructors });
        }
      }
    }
  }
  return meetings.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

function findCourseName(meetingTable) {
  let node = meetingTable.previousElementSibling;
  while (node) {
    if (node.tagName === "TABLE") {
      const caption = node.querySelector("caption");
      if (caption?.textContent.trim()) return clean(caption.textContent);
    }
    node = node.previousElementSibling;
  }
  return "CityU class";
}

function parseTimeRange(value) {
  const match = value.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
  if (!match) throw new Error(`Could not read class time: ${value}`);
  return [to24Hour(match[1]), to24Hour(match[2])];
}

function parseDateRange(value) {
  const match = value.match(/^(.+?)\s+-\s+(.+)$/);
  if (!match) throw new Error(`Could not read date range: ${value}`);
  return [parseUsDate(match[1]), parseUsDate(match[2])];
}

function parseUsDate(value) {
  const date = new Date(`${value} 12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`Could not read date: ${value}`);
  return dateStamp(date);
}

function to24Hour(value) {
  const match = value.trim().match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "pm") hour += 12;
  return `${String(hour).padStart(2, "0")}${match[2]}`;
}

function firstDateOnOrAfter(start, targetDay) {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + (targetDay - date.getDay() + 7) % 7);
  return dateStamp(date);
}

function addDays(isoDate, count) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + count);
  return dateStamp(date);
}

function makeCalendar(events, reminderMinutes = 0) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CityU Calendar Exporter//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const event of events) {
    const description = [event.type, event.instructors].filter(Boolean).join("\\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(`${event.course}-${event.date}-${event.start}-${event.location}@cityu-calendar`)}`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Asia/Hong_Kong:${event.date.replaceAll("-", "")}T${event.start}00`,
      `DTEND;TZID=Asia/Hong_Kong:${event.date.replaceAll("-", "")}T${event.end}00`,
      `SUMMARY:${escapeText(event.course)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(description)}`,
      ...(Number(reminderMinutes) > 0 ? ["BEGIN:VALARM", `TRIGGER:-PT${Number(reminderMinutes)}M`, "ACTION:DISPLAY", "DESCRIPTION:Class reminder", "END:VALARM"] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR", "");
  return lines.join("\r\n");
}

function clean(value) {
  return value.replace(/\s+/g, " ").trim();
}

function dateStamp(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function escapeText(value) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

})();
