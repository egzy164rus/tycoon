(() => {
  const root = document.getElementById("app");
  const engine = new window.MiniTycoonEngine({
    root,
    storageKey: "market-tycoon-lite-save-v1",
    initialState: window.MarketTycoon.initialState,
    reducer: window.MarketTycoon.reducer,
    render: window.MarketTycoon.render
  });
  engine.start();

  // Service workers require HTTPS (localhost is also allowed). The standalone
  // single-file build keeps working normally but is not itself installable.
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .catch(error => console.warn("Не удалось зарегистрировать PWA service worker:", error));
    }, { once: true });
  }
})();
