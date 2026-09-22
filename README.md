# CityU Calendar Exporter

A local Chrome/Edge extension that turns a CityU AIMS **Student Detail Schedule** into an iCalendar (`.ics`) file. It reads the open page in your browser and does not upload a timetable or collect AIMS credentials.

## Use it

1. In Chrome or Edge, open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Choose **Load unpacked**, then select this folder.
4. Pin **CityU Calendar Exporter** in the extensions menu.
5. Sign in to AIMS, open **Student Detail Schedule**, and click the extension icon.
6. Review the detected courses, choose English or 繁體中文 and an optional reminder, then download the `.ics` file.
7. Open the downloaded file to add the classes to your calendar.

The extension expands every meeting into its actual weekly dates using AIMS's date range. It skips TBA meetings. Public holidays and one-off cancellation notices are not present in the AIMS schedule table, so remove those events in your calendar if necessary.

## Development

The extension has no build step or server. After editing a file, reload it from the extensions page before testing again.

For Chrome Web Store submission, use the prepared [listing draft](STORE_LISTING.md) and [privacy policy](PRIVACY.md). Replace the contact placeholder in the privacy policy before publishing.
