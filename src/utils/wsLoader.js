// Shared WebSocket script loader — prevents double-loading across components

const loaded = { sockjs: false, stomp: false };

function loadScript(src, key) {
  return new Promise((resolve, reject) => {
    if (loaded[key]) { resolve(); return; }
    if (document.querySelector(`script[src="${src}"]`)) {
      loaded[key] = true; resolve(); return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload  = () => { loaded[key] = true; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export async function loadWSDeps() {
  await loadScript(
    "https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js",
    "sockjs"
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js",
    "stomp"
  );
}
