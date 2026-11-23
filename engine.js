/*
 * MiniTycoon Engine — маленькое событийное ядро для игры.
 * Перерисовываем интерфейс только после действий игрока,
 * а сохранение храним в localStorage.
 */
(() => {
  class MiniTycoonEngine {
    constructor({ root, storageKey, initialState, reducer, render }) {
      this.root = root;
      this.storageKey = storageKey;
      this.initialState = initialState;
      this.reducer = reducer;
      this.renderView = render;
      this.noticeTimer = null;
      this.state = this.load();
      this.onClick = this.onClick.bind(this);
      this.onChange = this.onChange.bind(this);
      this.onFullscreenChange = this.onFullscreenChange.bind(this);
    }

    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || "null");
        if (saved && saved.state && typeof saved.state === "object") {
          return { ...this.initialState(), ...saved.state };
        }
      } catch (error) {
        console.warn("Не удалось прочитать сохранение игры:", error);
      }
      return this.initialState();
    }

    save() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify({ version: 1, state: this.state }));
      } catch (error) {
        console.warn("Не удалось сохранить игру:", error);
      }
    }

    start() {
      this.root.addEventListener("click", this.onClick);
      this.root.addEventListener("change", this.onChange);
      document.addEventListener("fullscreenchange", this.onFullscreenChange);
      this.draw();
    }

    onFullscreenChange() {
      this.draw();
    }

    onClick(event) {
      const control = event.target.closest("[data-action]");
      if (!control || !this.root.contains(control)) return;
      if (control.matches("input, select, textarea")) return;

      const action = control.dataset.action;
      if (action === "OPEN_TAB") {
        let opened = null;
        try {
          opened = window.open(window.location.href, "_blank");
          if (opened) opened.opener = null;
        } catch (error) {
          console.warn("Не удалось открыть игру в новой вкладке:", error);
        }
        if (!opened) this.dispatch("SHOW_NOTICE", { text: "Браузер заблокировал новую вкладку. Разрешите всплывающие окна или откройте игру через кнопку ↗ в панели предпросмотра." });
        return;
      }

      if (action === "TOGGLE_FULLSCREEN") {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => this.dispatch("SHOW_NOTICE", { text: "Не получилось выйти из полноэкранного режима. Нажмите Esc." }));
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => this.dispatch("SHOW_NOTICE", { text: "Полноэкранный режим запрещён в окне предпросмотра. Откройте игру в отдельной вкладке и нажмите F11." }));
        } else {
          this.dispatch("SHOW_NOTICE", { text: "Браузер не поддерживает полноэкранный режим. Попробуйте нажать F11." });
        }
        return;
      }

      if (action === "RESET" && !window.confirm("Начать новую игру? Текущее сохранение будет удалено.")) return;

      const payload = { ...control.dataset };
      delete payload.action;
      this.dispatch(action, payload);
    }

    onChange(event) {
      const control = event.target.closest("[data-action]");
      if (!control || !this.root.contains(control)) return;
      const payload = { ...control.dataset, value: control.value };
      delete payload.action;
      this.dispatch(control.dataset.action, payload);
    }

    dispatch(action, payload = {}) {
      const next = this.reducer(this.state, action, payload);
      if (!next || next === this.state) return;
      this.state = next;
      this.save();
      this.draw();
    }

    draw() {
      this.root.innerHTML = this.renderView(this.state);
      if (this.state.notice) {
        window.clearTimeout(this.noticeTimer);
        this.noticeTimer = window.setTimeout(() => {
          if (this.state.notice) this.dispatch("CLEAR_NOTICE");
        }, 5200);
      }
    }
  }

  window.MiniTycoonEngine = MiniTycoonEngine;
})();
