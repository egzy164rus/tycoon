/*
 * MiniTycoon Engine — маленькое событийное ядро для нашей игры.
 * Никаких библиотек и тяжёлого игрового цикла: перерисовываем интерфейс
 * только после действий игрока, а сохранение храним в localStorage.
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
      this.onInput = this.onInput.bind(this);
      this.onKeydown = this.onKeydown.bind(this);
      this.onFullscreenChange = this.onFullscreenChange.bind(this);
    }

    load() {
      try {
        const saved = JSON.parse(localStorage.getItem(this.storageKey) || "null");
        if (saved && saved.version === 1 && saved.state && typeof saved.state === "object") {
          const next = { ...this.initialState(), ...saved.state };
          // Open the new customer-facing storefront once for saves from the older UI,
          // while keeping all business progress intact.
          if ((saved.state.storefrontVersion || 0) < 1) {
            next.activeView = "store";
            next.storefrontVersion = 1;
          }
          next.storeQuery = typeof next.storeQuery === "string" ? next.storeQuery : "";
          next.storeCategory = ["all", "electronics", "clothes", "home"].includes(next.storeCategory) ? next.storeCategory : "all";
          next.storeSort = ["popular", "priceAsc", "priceDesc"].includes(next.storeSort) ? next.storeSort : "popular";
          next.cartItems = Array.isArray(next.cartItems)
            ? next.cartItems.filter(item => item && typeof item.id === "string" && Number.isFinite(Number(item.qty)) && Number(item.qty) > 0).map(item => ({ id: item.id, qty: Math.floor(Number(item.qty)) }))
            : [];
          next.favorites = Array.isArray(next.favorites) ? next.favorites.filter(item => typeof item === "string") : [];
          next.pendingOrders = Number.isFinite(next.pendingOrders) ? Math.max(0, Math.floor(next.pendingOrders)) : 0;
          next.cartOpen = Boolean(next.cartOpen);
          return next;
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
      this.root.addEventListener("input", this.onInput);
      document.addEventListener("keydown", this.onKeydown);
      document.addEventListener("fullscreenchange", this.onFullscreenChange);
      this.draw();
    }

    onFullscreenChange() {
      this.draw();
    }

    onKeydown(event) {
      if (event.key === "Escape" && this.state.cartOpen) this.dispatch("CART_CLOSE");
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
        if (!opened) this.dispatch("SHOW_NOTICE", { text: "Браузер заблокировал новую вкладку. Разрешите всплывающие окна для предпросмотра или откройте игру через кнопку ↗ в панели предпросмотра." });
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

    onInput(event) {
      const control = event.target.closest('[data-action="STORE_SEARCH"]');
      if (!control || !this.root.contains(control)) return;
      this.state = { ...this.state, storeQuery: control.value };
      this.save();
      this.applyStoreFilters();
    }

    applyStoreFilters() {
      const category = this.state.storeCategory || "all";
      const query = String(this.state.storeQuery || "").trim().toLowerCase();
      let visible = 0;
      for (const card of this.root.querySelectorAll(".store-product-card")) {
        const matchesCategory = category === "all" || card.dataset.category === category;
        const matchesQuery = !query || (card.dataset.search || "").includes(query);
        card.hidden = !(matchesCategory && matchesQuery);
        if (!card.hidden) visible += 1;
      }
      const count = this.root.querySelector("[data-store-results]");
      if (count) {
        const ending = visible % 10 === 1 && visible % 100 !== 11 ? "товар" : visible % 10 >= 2 && visible % 10 <= 4 && !(visible % 100 >= 12 && visible % 100 <= 14) ? "товара" : "товаров";
        count.textContent = `${visible} ${ending}`;
      }
      const empty = this.root.querySelector(".store-empty");
      if (empty) empty.hidden = visible > 0;
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
      this.applyStoreFilters();
      if (this.state.notice) {
        window.clearTimeout(this.noticeTimer);
        this.noticeTimer = window.setTimeout(() => {
          if (this.state.notice) this.dispatch("CLEAR_NOTICE");
        }, 4200);
      }
    }
  }

  window.MiniTycoonEngine = MiniTycoonEngine;
})();
