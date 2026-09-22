chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "DOWNLOAD_CALENDAR") return;

  (async () => {
    const url = `data:text/calendar;charset=utf-8,${encodeURIComponent(message.ics)}`;
    await chrome.downloads.download({
      url,
      filename: message.filename,
      saveAs: true,
      conflictAction: "uniquify"
    });
    await chrome.tabs.sendMessage(message.tabId, {
      type: "EXPORT_STATUS",
      text: `已生成 ${message.eventCount} 个日历事件，正在下载 .ics 文件。`
    });
    sendResponse({ ok: true });
  })().catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
