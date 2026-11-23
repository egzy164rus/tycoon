(() => {
  const root = document.getElementById("app");

  // ---------- Звуковые эффекты (WebAudio, без файлов) ----------
  const Sfx = {
    ctx: null,
    muted: false,
    ensure() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
          return null;
        }
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return this.ctx;
    },
    tone(freq, dur, type = "sine", gain = 0.045, when = 0) {
      const ctx = this.ctx;
      if (!ctx) return;
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    },
    play(name) {
      if (this.muted || !this.ensure()) return;
      const notes = {
        click: [[660, 0.06, "triangle", 0.03]],
        deny: [[180, 0.12, "sawtooth", 0.022]],
        coin: [[880, 0.09, "sine", 0.05], [1174, 0.12, "sine", 0.05, 0.08]],
        week: [[220, 0.14, "sine", 0.04], [330, 0.18, "sine", 0.04, 0.1]],
        success: [[523, 0.1, "triangle", 0.05], [659, 0.1, "triangle", 0.05, 0.09], [784, 0.1, "triangle", 0.05, 0.18], [1046, 0.16, "triangle", 0.05, 0.27]],
        fail: [[392, 0.13, "sawtooth", 0.03], [311, 0.13, "sawtooth", 0.03, 0.11], [233, 0.2, "sawtooth", 0.03, 0.22]],
        event: [[440, 0.12, "triangle", 0.04], [554, 0.16, "triangle", 0.04, 0.1]],
        achievement: [[659, 0.11, "triangle", 0.05], [784, 0.11, "triangle", 0.05, 0.1], [988, 0.11, "triangle", 0.05, 0.2], [1318, 0.2, "triangle", 0.05, 0.3]],
        victory: [[523, 0.14, "triangle", 0.055], [659, 0.14, "triangle", 0.055, 0.13], [784, 0.14, "triangle", 0.055, 0.26], [1046, 0.14, "triangle", 0.055, 0.39], [1318, 0.3, "triangle", 0.055, 0.52]],
        defeat: [[392, 0.18, "sawtooth", 0.035], [349, 0.18, "sawtooth", 0.035, 0.16], [294, 0.18, "sawtooth", 0.035, 0.32], [233, 0.32, "sawtooth", 0.035, 0.48]]
      };
      for (const [freq, dur, type, gain, when] of notes[name] || notes.click) {
        this.tone(freq, dur, type, gain, when || 0);
      }
    }
  };

  const engine = new window.MiniTycoonEngine({
    root,
    storageKey: "market-tycoon-deep-v1",
    initialState: window.MarketTycoon.initialState,
    reducer: window.MarketTycoon.reducer,
    render: window.MarketTycoon.render
  });

  // Обёртка: звуки решений и реакций.
  const origDispatch = engine.dispatch.bind(engine);
  engine.dispatch = (action, payload = {}) => {
    const before = engine.state;
    origDispatch(action, payload);
    const after = engine.state;
    Sfx.muted = !!after.muted;
    if (after === before) {
      Sfx.play("deny");
      return;
    }
    const achievementsGrew = (after.achievements || []).length > (before.achievements || []).length;
    if (after.phase === "victory" && before.phase !== "victory") { Sfx.play("victory"); return; }
    if (after.phase === "gameover" && before.phase !== "gameover") { Sfx.play("defeat"); return; }
    switch (action) {
      case "END_WEEK":
        Sfx.play("week");
        if (after.lastReport && after.lastReport.profit > 0) setTimeout(() => Sfx.play("coin"), 380);
        break;
      case "TAKE_GAMBLE":
      case "EVENT_CHOICE":
        Sfx.play(String(after.notice || "").includes("Удача") || String(after.notice || "").includes("вознаграждён") ? "success"
          : String(after.notice || "").includes("Не повезло") || String(after.notice || "").includes("не оправдался") ? "fail" : "event");
        break;
      case "BUY_TECH": case "START_PROJECT": case "HIRE": case "UPGRADE_OFFICE":
      case "UPGRADE_WAREHOUSE": case "HIRE_COURIER": case "START_CAMPAIGN":
      case "PAY_BONUS": case "TEAMBUILDING": case "TRAIN": case "TAKE_LOAN":
        Sfx.play("coin");
        break;
      case "NEW_GAME": Sfx.play("success"); break;
      case "NAV": case "TOGGLE_MUTE": case "CONTINUE": case "SET_DIFFICULTY": case "SET_COMMISSION":
        Sfx.play("click");
        break;
      default: Sfx.play("click");
    }
    if (achievementsGrew) setTimeout(() => Sfx.play("achievement"), 250);
  };

  // При запуске приложения всегда показываем экран приветствия.
  if (engine.state.phase === "playing") {
    engine.state = { ...engine.state, phase: "menu" };
  }
  Sfx.muted = !!engine.state.muted;
  engine.start();

  // Service workers require HTTPS (localhost is also allowed).
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .then(registration => {
          registration.update();
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update();
          });
        })
        .catch(error => console.warn("Не удалось зарегистрировать PWA service worker:", error));
    }, { once: true });
  }
})();
