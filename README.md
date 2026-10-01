# CityUHK Calendar

A local Chrome/Edge extension that turns a CityUHK AIMS **Student Detail Schedule** into an iCalendar (`.ics`) file. It reads the open page in your browser and does not upload a timetable or collect AIMS credentials.

## Use it

1. In Chrome or Edge, open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Choose **Load unpacked**, then select this folder.
4. Pin **CityUHK Calendar** in the extensions menu.
5. Sign in to AIMS and open either **Weekly Schedule** or **Student Detail Schedule**, then click the extension icon. From Weekly Schedule, the extension retrieves the detailed schedule in the background so the current page stays unchanged.
6. Review the detected courses, choose English or 繁體中文 and an optional reminder, then download the `.ics` file.
7. Open the downloaded file to add the classes to your calendar.

The extension expands every meeting into its actual weekly dates using AIMS's date range. It skips TBA meetings. Public holidays and one-off cancellation notices are not present in the AIMS schedule table, so remove those events in your calendar if necessary.

## Development

The extension has no build step or server. After editing a file, reload it from the extensions page before testing again.
