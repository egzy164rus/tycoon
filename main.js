(() => {
  const root = document.getElementById("app");
  const engine = new window.MiniTycoonEngine({
    root,
    storageKey: "market-tycoon-deep-v1",
    initialState: window.MarketTycoon.initialState,
    reducer: window.MarketTycoon.reducer,
    render: window.MarketTycoon.render
  });
  engine.start();

  // Service workers require HTTPS (localhost is also allowed).
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .then(registration => {
          // Проверяем обновления при каждом запуске и при возврате в приложение.
          registration.update();
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update();
          });
        })
        .catch(error => console.warn("Не удалось зарегистрировать PWA service worker:", error));
    }, { once: true });
  }
})();
