/*
 * Market Tycoon — игровая логика и интерфейс.
 * Это небольшая управленческая игра: все правила живут отдельно от мини-движка.
 */
(() => {
  const SELLER_CATALOG = [
    { id: "home", name: "Дом на полке", category: "Дом и уют", products: 24, baseOrders: 7, icon: "⌂", tint: "mint" },
    { id: "wear", name: "Вторая кожа", category: "Одежда", products: 18, baseOrders: 6, icon: "◒", tint: "peach" },
    { id: "pixel", name: "Пиксельная лавка", category: "Электроника", products: 15, baseOrders: 8, icon: "▦", tint: "lavender" },
    { id: "book", name: "Книжный маяк", category: "Книги", products: 31, baseOrders: 5, icon: "▤", tint: "sky" },
    { id: "sport", name: "СпортЛиния", category: "Спорт и отдых", products: 19, baseOrders: 7, icon: "↗", tint: "lime" },
    { id: "garden", name: "Зелёный угол", category: "Сад и дача", products: 27, baseOrders: 6, icon: "✳", tint: "mint" },
    { id: "coffee", name: "Кофе рядом", category: "Продукты", products: 22, baseOrders: 8, icon: "◉", tint: "peach" },
    { id: "craft", name: "Мастерская 12", category: "Ручная работа", products: 13, baseOrders: 5, icon: "✦", tint: "lavender" },
    { id: "pet", name: "Хвост и лапы", category: "Для питомцев", products: 21, baseOrders: 7, icon: "♡", tint: "sky" }
  ];

  const START_SELLERS = SELLER_CATALOG.slice(0, 3).map(item => ({ ...item }));
  const VIEWS = [
    { id: "store", label: "Витрина", icon: "◈" },
    { id: "overview", label: "Обзор", icon: "⌂" },
    { id: "sellers", label: "Продавцы", icon: "▧" },
    { id: "logistics", label: "Логистика", icon: "▣" },
    { id: "marketing", label: "Маркетинг", icon: "↗" }
  ];

  const GOALS = [
    { id: "partners", title: "Расширить витрину", description: "Подключить четвёртого продавца", type: "sellers", target: 4, reward: 1800, icon: "▧" },
    { id: "orders", title: "Первые покупатели", description: "Доставить 50 заказов", type: "orders", target: 50, reward: 2200, icon: "↗" },
    { id: "profit", title: "День в плюсе", description: "Заработать 3 000 ₽ за один день", type: "profit", target: 3000, reward: 2000, icon: "₽" }
  ];

  const STORE_PRODUCTS = [
    { id: "headphones", name: "Наушники Cloud Lite", category: "Электроника", categoryId: "electronics", seller: "Пиксельная лавка", price: 3990, oldPrice: 5990, rating: "4,9", reviews: 284, delivery: "Завтра", badge: "ХИТ НЕДЕЛИ", image: "headphones.jpg", features: "Шумоподавление · до 30 ч", keywords: "звук беспроводные музыка подарок" },
    { id: "sneakers", name: "Кроссовки City Walk", category: "Одежда и обувь", categoryId: "clothes", seller: "Вторая кожа", price: 5290, oldPrice: 6990, rating: "4,8", reviews: 146, delivery: "Завтра", badge: "ПОПУЛЯРНОЕ", image: "sneakers.jpg", features: "Лёгкие · на каждый день", keywords: "обувь кеды спорт прогулка" },
    { id: "lamp", name: "Настольная лампа Forma", category: "Дом и уют", categoryId: "home", seller: "Дом на полке", price: 1890, oldPrice: 2990, rating: "4,9", reviews: 91, delivery: "Сегодня", badge: "ВЫБОР ПОКУПАТЕЛЕЙ", image: "lamp.jpg", features: "Тёплый свет · 3 режима", keywords: "свет рабочий стол интерьер подарок" }
  ];

  const money = value => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value))} ₽`;
  const number = value => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const esc = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function initialState() {
    return {
      day: 1,
      cash: 12500,
      reputation: 70,
      sellerLoyalty: 88,
      commission: 12,
      sellers: START_SELLERS.map(item => ({ ...item })),
      warehouseLevel: 1,
      couriers: 2,
      adDays: 0,
      totalOrders: 0,
      pendingOrders: 0,
      bestProfit: 0,
      completedGoals: [],
      history: [],
      lastReport: null,
      activeView: "store",
      storeQuery: "",
      storeCategory: "all",
      storeSort: "popular",
      cartItems: [],
      favorites: [],
      cartOpen: false,
      notice: ""
    };
  }

  function warehouseCapacity(state) {
    return 52 + (state.warehouseLevel - 1) * 30;
  }

  function courierCapacity(state) {
    return state.couriers * 18;
  }

  function dailyCapacity(state) {
    return Math.min(warehouseCapacity(state), courierCapacity(state));
  }

  function baseOrders(state) {
    return state.sellers.reduce((sum, seller) => sum + seller.baseOrders, 0);
  }

  function forecastOrders(state) {
    const reputationFactor = 0.82 + state.reputation / 300;
    const loyaltyFactor = 0.72 + state.sellerLoyalty / 320;
    let forecast = Math.round(baseOrders(state) * reputationFactor * loyaltyFactor);
    if (state.adDays > 0) forecast = Math.ceil(forecast * 1.32);
    return Math.max(1, forecast + (state.pendingOrders || 0));
  }

  function sellerCost(state) {
    return 1800 + Math.max(0, state.sellers.length - 3) * 350;
  }

  function warehouseCost(state) {
    return 3800 + (state.warehouseLevel - 1) * 2200;
  }

  function courierCost(state) {
    return 1600 + Math.max(0, state.couriers - 2) * 400;
  }

  function storeProduct(id) {
    return STORE_PRODUCTS.find(product => product.id === id);
  }

  function cartCount(state) {
    return (state.cartItems || []).reduce((sum, item) => sum + item.qty, 0);
  }

  function cartTotal(state) {
    return (state.cartItems || []).reduce((sum, item) => {
      const product = storeProduct(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function productImageSource(filename) {
    const embedded = typeof window !== "undefined" && window.MarketAssets && window.MarketAssets[filename];
    return embedded || `assets/${filename}`;
  }

  function commissionMessage(value) {
    if (value <= 10) return "Низкая комиссия: продавцам выгодно расти вместе с вами.";
    if (value <= 15) return "Сбалансированная ставка для платформы и продавцов.";
    return "Высокая комиссия: прибыль больше, но лояльность продавцов будет снижаться.";
  }

  function goalProgress(state, goal) {
    if (goal.type === "sellers") return state.sellers.length;
    if (goal.type === "orders") return state.totalOrders;
    if (goal.type === "profit") return state.bestProfit;
    return 0;
  }

  function goalProgressLabel(state, goal) {
    const value = Math.min(goalProgress(state, goal), goal.target);
    if (goal.type === "sellers") return `${value} / ${goal.target} продавца`;
    if (goal.type === "orders") return `${number(value)} / ${number(goal.target)} заказов`;
    return `${money(value)} / ${money(goal.target)}`;
  }

  function awardGoals(state) {
    const completed = Array.isArray(state.completedGoals) ? [...state.completedGoals] : [];
    const newlyCompleted = GOALS.filter(goal => !completed.includes(goal.id) && goalProgress(state, goal) >= goal.target);
    if (!newlyCompleted.length) return state;
    const reward = newlyCompleted.reduce((sum, goal) => sum + goal.reward, 0);
    const names = newlyCompleted.map(goal => `«${goal.title}»`).join(", ");
    return {
      ...state,
      cash: state.cash + reward,
      completedGoals: [...completed, ...newlyCompleted.map(goal => goal.id)],
      notice: `${state.notice ? `${state.notice} ` : ""}Цель выполнена: ${names}. Награда — ${money(reward)}!`
    };
  }

  function reducer(state, action, payload = {}) {
    if (action === "CLEAR_NOTICE") return { ...state, notice: "" };
    if (action === "SHOW_NOTICE") return { ...state, notice: String(payload.text || "") };

    if (action === "NAV") {
      const view = VIEWS.some(item => item.id === payload.view) ? payload.view : "overview";
      return { ...state, activeView: view, notice: "" };
    }

    if (action === "STORE_CATEGORY") {
      const category = ["all", "electronics", "clothes", "home"].includes(payload.category) ? payload.category : "all";
      return { ...state, storeCategory: category, notice: "" };
    }

    if (action === "STORE_SORT") {
      const sort = ["popular", "priceAsc", "priceDesc"].includes(payload.value) ? payload.value : "popular";
      return { ...state, storeSort: sort, notice: "" };
    }

    if (action === "TOGGLE_FAVORITE") {
      const id = payload.product;
      if (!storeProduct(id)) return state;
      const favorites = Array.isArray(state.favorites) ? state.favorites : [];
      const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
      return { ...state, favorites: next, notice: favorites.includes(id) ? "Убрали из избранного." : "Сохранили в избранное." };
    }

    if (action === "CART_ADD") {
      const product = storeProduct(payload.product);
      if (!product) return state;
      const cartItems = Array.isArray(state.cartItems) ? state.cartItems : [];
      const existing = cartItems.find(item => item.id === product.id);
      const nextItems = existing
        ? cartItems.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        : [...cartItems, { id: product.id, qty: 1 }];
      return { ...state, cartItems: nextItems, notice: `«${product.name}» добавлен в корзину.` };
    }

    if (action === "CART_OPEN") return { ...state, cartOpen: true, notice: "" };
    if (action === "CART_CLOSE") return { ...state, cartOpen: false };

    if (action === "CART_REMOVE") {
      const id = payload.product;
      const cartItems = (state.cartItems || []).flatMap(item => item.id !== id ? [item] : item.qty > 1 ? [{ ...item, qty: item.qty - 1 }] : []);
      return { ...state, cartItems, notice: "Количество товара обновлено." };
    }

    if (action === "CART_CHECKOUT") {
      const count = cartCount(state);
      if (!count) return { ...state, cartOpen: false, notice: "Корзина пока пуста — выберите товар на витрине." };
      const orderWord = count % 100 >= 11 && count % 100 <= 14 ? "заказов" : count % 10 === 1 ? "заказ" : count % 10 >= 2 && count % 10 <= 4 ? "заказа" : "заказов";
      return {
        ...state,
        cartItems: [],
        cartOpen: false,
        pendingOrders: (state.pendingOrders || 0) + count,
        notice: `Демо-заказ оформлен! Спрос на завтра увеличен на ${count} ${orderWord}.`
      };
    }

    if (action === "RESET") return initialState();

    if (action === "SET_COMMISSION") {
      const value = clamp(Math.round(Number(payload.value) || state.commission), 8, 22);
      return { ...state, commission: value, notice: `Комиссия теперь ${value}%. ${commissionMessage(value)}` };
    }

    if (action === "HIRE_SELLER") {
      const cost = sellerCost(state);
      if (state.sellers.length >= SELLER_CATALOG.length) {
        return { ...state, notice: "Вы уже подключили всех доступных продавцов из пилотного города." };
      }
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: подключение продавца стоит ${money(cost)}.` };
      const available = SELLER_CATALOG.filter(item => !state.sellers.some(seller => seller.id === item.id));
      const chosen = available[Math.floor(Math.random() * available.length)];
      return awardGoals({
        ...state,
        cash: state.cash - cost,
        sellers: [...state.sellers, { ...chosen }],
        notice: `К платформе присоединился продавец «${chosen.name}». Ассортимент вырос на ${chosen.products} товаров.`
      });
    }

    if (action === "UPGRADE_WAREHOUSE") {
      const cost = warehouseCost(state);
      if (state.warehouseLevel >= 6) return { ...state, notice: "Склад уже достиг максимального уровня в пилотном городе." };
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: улучшение склада стоит ${money(cost)}.` };
      const newLevel = state.warehouseLevel + 1;
      return {
        ...state,
        cash: state.cash - cost,
        warehouseLevel: newLevel,
        notice: `Склад улучшен до уровня ${newLevel}. Теперь он обрабатывает больше заказов за день.`
      };
    }

    if (action === "HIRE_COURIER") {
      const cost = courierCost(state);
      if (state.couriers >= 10) return { ...state, notice: "Для пилотного города уже нанята максимальная команда курьеров." };
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: новый курьер стоит ${money(cost)}.` };
      return {
        ...state,
        cash: state.cash - cost,
        couriers: state.couriers + 1,
        notice: "Новый курьер вышел на маршрут. Дневная мощность доставки увеличена на 18 заказов."
      };
    }

    if (action === "RUN_ADS") {
      if (state.adDays > 0) return { ...state, notice: `Рекламная кампания уже работает — осталось ${state.adDays} дн.` };
      const cost = 950;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: рекламная кампания стоит ${money(cost)}.` };
      return {
        ...state,
        cash: state.cash - cost,
        adDays: 3,
        notice: "Кампания запущена на 3 дня. Прогноз заказов вырос — проверьте мощность доставки."
      };
    }

    if (action === "END_DAY") {
      const today = state.day;
      let eventName = "Обычный день";
      let eventMultiplier = 1;
      const roll = Math.random();
      if ((today + 1) % 5 === 0) {
        eventName = "Городской день скидок";
        eventMultiplier = 1.28;
      } else if (roll > 0.9) {
        eventName = "Популярный товар попал в рекомендации";
        eventMultiplier = 1.2;
      } else if (roll < 0.08) {
        eventName = "Тихий день на рынке";
        eventMultiplier = 0.82;
      }

      const demand = Math.max(1, Math.round(forecastOrders(state) * (0.9 + Math.random() * 0.2) * eventMultiplier));
      const fulfilled = Math.min(demand, dailyCapacity(state));
      const lost = Math.max(0, demand - fulfilled);
      const commissionRevenue = Math.round(fulfilled * 2200 * (state.commission / 100));
      const variableCosts = fulfilled * 70;
      const fixedCosts = 420 + state.warehouseLevel * 80 + state.couriers * 65;
      const operatingCosts = variableCosts + fixedCosts;
      const profit = commissionRevenue - operatingCosts;
      const fillRate = demand > 0 ? fulfilled / demand : 1;
      const reputation = clamp(state.reputation + (fillRate >= 0.98 ? 1 : fillRate >= 0.86 ? 0 : -2), 35, 100);
      let sellerLoyalty = state.sellerLoyalty;
      if (state.commission >= 17) sellerLoyalty -= 2;
      else if (state.commission >= 15) sellerLoyalty -= 1;
      else if (state.commission <= 10) sellerLoyalty += 1;
      if (fillRate < 0.75) sellerLoyalty -= 1;
      sellerLoyalty = clamp(sellerLoyalty, 30, 100);

      const report = {
        day: today,
        demand,
        fulfilled,
        lost,
        revenue: commissionRevenue,
        costs: operatingCosts,
        profit,
        fillRate: Math.round(fillRate * 100),
        reputation,
        reputationChange: reputation - state.reputation,
        sellerLoyalty,
        event: eventName
      };
      const history = [...state.history, commissionRevenue].slice(-7);
      const sign = profit >= 0 ? "+" : "−";
      const notice = `День ${today} завершён: доставлено ${number(fulfilled)} из ${number(demand)} заказов, ${sign}${money(Math.abs(profit))} в кассу. Событие: ${eventName}.`;

      return awardGoals({
        ...state,
        day: today + 1,
        cash: state.cash + profit,
        reputation,
        sellerLoyalty,
        adDays: Math.max(0, state.adDays - 1),
        totalOrders: state.totalOrders + fulfilled,
        pendingOrders: 0,
        bestProfit: Math.max(state.bestProfit || 0, profit),
        completedGoals: Array.isArray(state.completedGoals) ? state.completedGoals : [],
        history,
        lastReport: report,
        notice
      });
    }

    return state;
  }

  function navButton(item, activeView) {
    return `<button class="nav-link ${activeView === item.id ? "active" : ""}" data-action="NAV" data-view="${item.id}" aria-current="${activeView === item.id ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span><span class="nav-chevron">›</span>
    </button>`;
  }

  function renderShell(state, content) {
    const activeTitle = (VIEWS.find(item => item.id === state.activeView) || VIEWS[0]).label;
    const fullscreenLabel = typeof document !== "undefined" && document.fullscreenElement ? "Выйти из полного экрана" : "На весь экран";
    return `<div class="game-shell">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div><div class="brand-name">СВОЙ МАРКЕТ</div><div class="brand-subtitle">маленький бизнес, большие планы</div></div>
        </div>
        <div class="company-card">
          <div class="company-avatar">С</div>
          <div class="company-copy"><span>ВАША КОМПАНИЯ</span><strong>Лавка Плюс</strong></div>
          <span class="company-dots" aria-hidden="true">···</span>
        </div>
        <div class="nav-caption">УПРАВЛЕНИЕ</div>
        <nav class="side-nav" aria-label="Разделы игры">${VIEWS.map(item => navButton(item, state.activeView)).join("")}</nav>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-tip">
          <div class="tip-icon">✦</div>
          <div><strong>Совет дня</strong><p>Не забывайте следить за мощностью доставки: спрос может вырасти внезапно.</p></div>
        </div>
        <div class="sidebar-bottom">
          <div class="save-status"><span class="status-dot"></span><span>Сохранение включено</span></div>
          <button class="reset-button" data-action="RESET">↻ <span>Новая игра</span></button>
          <div class="engine-stamp">MINI TYCOON ENGINE <span>v0.3</span></div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div class="breadcrumbs"><span>Лавка Плюс</span><span class="crumb-divider">/</span><strong>${esc(activeTitle)}</strong></div>
          <div class="topbar-right"><button class="topbar-tool" data-action="OPEN_TAB" title="Открыть игру в отдельной вкладке" aria-label="Открыть игру в отдельной вкладке"><span class="tool-icon">↗</span><span class="tool-label">В отдельную вкладку</span></button><button class="topbar-tool fullscreen-tool" data-action="TOGGLE_FULLSCREEN" title="${fullscreenLabel}" aria-label="${fullscreenLabel}"><span class="tool-icon">⛶</span><span class="tool-label">${fullscreenLabel}</span></button><span class="city-pill"><span class="city-dot"></span>ПИЛОТНЫЙ ГОРОД</span><span class="day-pill">ДЕНЬ ${String(state.day).padStart(2, "0")}</span><div class="profile-avatar">Л</div></div>
        </header>
        <div class="page-content">
          ${state.notice ? `<div class="notice" role="status"><span class="notice-symbol">✦</span><p>${esc(state.notice)}</p><button data-action="CLEAR_NOTICE" aria-label="Закрыть уведомление">×</button></div>` : ""}
          ${content}
          <footer class="page-footer"><span>СВОЙ МАРКЕТ · ПИЛОТНАЯ ВЕРСИЯ</span><span>Игра сохраняется автоматически в этом браузере</span></footer>
        </div>
      </main>
    </div>`;
  }

  function pageHeading(kicker, title, description, action = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${action ? `<div class="heading-action">${action}</div>` : ""}</div>`;
  }

  function metricCard(icon, label, value, note, tone = "green") {
    return `<article class="metric-card"><div class="metric-top"><span class="metric-icon ${tone}">${icon}</span><span class="metric-note">${note}</span></div><div class="metric-label">${label}</div><div class="metric-value">${value}</div></article>`;
  }

  function renderChart(state) {
    const values = state.history.slice(-7);
    const hasData = values.some(value => value > 0);
    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const padded = Array(7 - values.length).fill(0).concat(values);
    const max = Math.max(...padded, 1);
    return `<div class="chart-wrap">
      ${!hasData ? `<div class="chart-empty"><span>↗</span><strong>Пока нет статистики</strong><p>Завершите первый день, и здесь появится выручка.</p></div>` : ""}
      <div class="chart-grid-lines"><i></i><i></i><i></i></div>
      <div class="chart-bars">${padded.map((value, index) => {
        const height = hasData ? Math.max(7, Math.round(value / max * 100)) : 5;
        const label = days[(state.day - 1 - (6 - index) + 70) % 7];
        return `<div class="chart-column"><div class="chart-track"><div class="chart-bar ${hasData ? "" : "empty"}" style="height:${height}%" title="${money(value)}"></div></div><span>${label}</span></div>`;
      }).join("")}</div>
    </div>`;
  }

  function renderObjectives(state) {
    const completed = new Set(Array.isArray(state.completedGoals) ? state.completedGoals : []);
    return `<section class="objectives-section">
      <div class="section-heading"><div><div class="eyebrow">СЦЕНАРИЙ · ПИЛОТНЫЙ ГОРОД</div><h2>Задачи основателя</h2></div><span>Выполните цель — получите денежную награду</span></div>
      <div class="objectives-grid">${GOALS.map(goal => {
        const done = completed.has(goal.id);
        const progress = Math.min(goalProgress(state, goal), goal.target);
        const fill = clamp(Math.round(progress / goal.target * 100), 0, 100);
        return `<article class="objective-card ${done ? "is-complete" : ""}">
          <div class="objective-top"><span class="objective-icon">${goal.icon}</span><span class="objective-reward">${done ? "✓ ВЫПОЛНЕНО" : `НАГРАДА ${money(goal.reward)}`}</span></div>
          <h3>${goal.title}</h3><p>${goal.description}</p>
          <div class="objective-progress"><div style="width:${fill}%"></div></div>
          <div class="objective-foot"><span>${goalProgressLabel(state, goal)}</span><strong>${done ? "ГОТОВО" : `${fill}%`}</strong></div>
        </article>`;
      }).join("")}</div>
    </section>`;
  }

  function renderDailyReport(state) {
    const report = state.lastReport;
    if (!report) {
      return `<section class="panel report-panel report-empty-panel"><div class="report-empty-icon">▤</div><div><div class="eyebrow">ОТЧЁТ УПРАВЛЯЮЩЕГО</div><h2>Первый день ещё впереди</h2><p>Завершите смену — разберём спрос, доставку, расходы и прибыль, чтобы решить, что улучшить дальше.</p></div><span class="report-next">ПОСЛЕ СМЕНЫ ↘</span></section>`;
    }
    const fillRate = Number.isFinite(report.fillRate) ? report.fillRate : (report.demand ? Math.round(report.fulfilled / report.demand * 100) : 0);
    const reportReputation = Number.isFinite(report.reputation) ? report.reputation : state.reputation;
    const reputationChange = Number.isFinite(report.reputationChange) ? report.reputationChange : 0;
    let insight;
    if (report.lost > 0) insight = `Не обработано ${number(report.lost)} заказов. Усильте самое слабое звено — склад или курьерскую команду.`;
    else if (report.profit < 0) insight = "День закрылся с убытком. Проверьте комиссию и постоянные расходы перед следующей сменой.";
    else if (fillRate >= 98) insight = "Все заказы доставлены. Можно осторожно привлекать больше покупателей или подключать новых продавцов.";
    else insight = "Большую часть спроса удалось обслужить. Следите за загрузкой, если планируете рекламную кампанию.";
    const profitSign = report.profit >= 0 ? "+" : "−";
    return `<section class="panel report-panel">
      <div class="panel-heading report-heading"><div><div class="eyebrow">ОТЧЁТ УПРАВЛЯЮЩЕГО · ДЕНЬ ${String(report.day).padStart(2, "0")}</div><h2>Как прошла смена?</h2></div><span class="report-event">${esc(report.event)}</span></div>
      <div class="report-stats">
        <div class="report-stat"><span>Спрос</span><strong>${number(report.demand)}</strong><small>заказов</small></div>
        <div class="report-stat"><span>Доставлено</span><strong>${number(report.fulfilled)}</strong><small>${fillRate}% от спроса</small></div>
        <div class="report-stat"><span>Комиссия</span><strong>${money(report.revenue)}</strong><small>до расходов</small></div>
        <div class="report-stat"><span>Расходы</span><strong>${money(report.costs)}</strong><small>логистика и содержание</small></div>
        <div class="report-stat report-profit ${report.profit >= 0 ? "positive" : "negative"}"><span>Чистый итог</span><strong>${profitSign}${money(Math.abs(report.profit))}</strong><small>прибыль за день</small></div>
      </div>
      <div class="report-insight"><span>✦</span><p><strong>На заметку:</strong> ${insight}</p><span class="report-reputation">Репутация ${reportReputation}<small>${reputationChange > 0 ? ` +${reputationChange}` : reputationChange < 0 ? ` ${reputationChange}` : " · без изменений"}</small></span></div>
    </section>`;
  }

  function actionCard({ icon, title, description, action, buttonLabel, disabled = false, tag = "" }) {
    return `<article class="action-card"><div class="action-card-top"><span class="action-icon">${icon}</span>${tag ? `<span class="tiny-tag">${tag}</span>` : ""}</div><h3>${title}</h3><p>${description}</p><button class="text-action" data-action="${action}" ${disabled ? "disabled" : ""}>${buttonLabel}<span>→</span></button></article>`;
  }

  function renderOverview(state) {
    const forecast = forecastOrders(state);
    const capacity = dailyCapacity(state);
    const capacityFill = clamp(Math.round(forecast / Math.max(1, capacity) * 100), 5, 100);
    const latest = state.lastReport;
    const warehouseCostValue = warehouseCost(state);
    const canUpgrade = state.cash >= warehouseCostValue && state.warehouseLevel < 6;
    const hireCost = sellerCost(state);
    const canHireSeller = state.cash >= hireCost && state.sellers.length < SELLER_CATALOG.length;

    return `${pageHeading(`ПИЛОТНЫЙ ГОРОД · ДЕНЬ ${String(state.day).padStart(2, "0")}`, "Добро пожаловать в свой маркетплейс", "Подключайте продавцов, доставляйте заказы и превратите небольшую платформу в любимое место покупок.", `<button class="primary-button" data-action="END_DAY">Завершить день <span>→</span></button>`)}
      <section class="hero-card">
        <div class="hero-copy">
          <div class="hero-pill"><span class="pulse"></span> ВАША КОМАНДА УЖЕ В ДЕЛЕ</div>
          <h2>От первой посылки<br>до большой платформы.</h2>
          <p>Сегодня на площадке ожидается <strong>${number(forecast)} заказов</strong>. Убедитесь, что склад и курьеры готовы к наплыву покупателей.</p>
          <div class="hero-bottom"><button class="hero-button" data-action="END_DAY">Закрыть день <span>→</span></button><span class="hero-caption">Отчёт появится сразу после смены</span></div>
        </div>
        <div class="hero-illustration" aria-hidden="true">
          <div class="illustration-sun"></div><div class="illustration-orbit orbit-one"></div><div class="illustration-orbit orbit-two"></div>
          <svg class="warehouse-art" viewBox="0 0 330 230" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M26 100L164 28L304 100V207H26V100Z" fill="#F5F8E8"/>
            <path d="M17 102L164 22L313 102" stroke="#D9EAA9" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M70 112H258V207H70V112Z" fill="#E3EFD0"/>
            <path d="M93 136H151V207H93V136Z" fill="#B4D48A"/>
            <path d="M173 136H232V170H173V136Z" fill="#BDD997"/>
            <path d="M173 181H232V207H173V181Z" fill="#BDD997"/>
            <path d="M110 136V207M134 136V207" stroke="#9DBA70" stroke-width="3"/>
            <path d="M49 106V202M276 106V202" stroke="#D2E4B5" stroke-width="5"/>
            <rect x="221" y="67" width="43" height="32" rx="6" fill="#D7EAAC"/>
            <path d="M232 81H253M242.5 70V92" stroke="#719B59" stroke-width="3" stroke-linecap="round"/>
            <path d="M36 207H294" stroke="#F5F8E8" stroke-width="8" stroke-linecap="round"/>
            <path d="M67 206L40 226M272 206L299 226" stroke="#B6D18C" stroke-width="6" stroke-linecap="round"/>
          </svg>
          <div class="floating-box box-one">✦ <span>НОВЫЕ ЗАКАЗЫ</span></div>
          <div class="floating-box box-two"><span class="float-dot"></span> СКЛАД ГОТОВ</div>
          <div class="hero-ground"></div>
        </div>
      </section>

      <section class="metrics-grid" aria-label="Показатели компании">
        ${metricCard("₽", "Деньги компании", money(state.cash), latest ? `${latest.profit >= 0 ? "+" : "−"}${money(Math.abs(latest.profit))} за прошлый день` : "Стартовый бюджет", "green")}
        ${metricCard("↗", "Прогноз заказов", `${number(forecast)} <small>заказов</small>`, state.adDays > 0 ? `Реклама · ${state.adDays} дн.` : "на сегодняшний день", "lime")}
        ${metricCard("▧", "Продавцы", `${state.sellers.length} <small>партнёра</small>`, `${number(state.sellers.reduce((sum, seller) => sum + seller.products, 0))} товаров в каталоге`, "peach")}
        ${metricCard("✦", "Репутация", `${state.reputation}<small> / 100</small>`, state.reputation >= 75 ? "Покупатели довольны" : "Растёт с каждой доставкой", "lavender")}
      </section>

      <section class="dashboard-grid">
        <article class="panel chart-panel">
          <div class="panel-heading"><div><div class="eyebrow">ФИНАНСЫ</div><h2>Комиссионная выручка</h2></div><span class="period-chip">ПОСЛЕДНИЕ 7 ДНЕЙ</span></div>
          ${renderChart(state)}
          <div class="panel-foot"><span><i class="legend-dot"></i> Комиссия с выполненных заказов</span><strong>${latest ? money(latest.revenue) : "—"}</strong></div>
        </article>
        <article class="panel demand-panel">
          <div class="panel-heading"><div><div class="eyebrow">ОПЕРАЦИИ</div><h2>План на сегодня</h2></div><span class="mini-status"><i></i> В работе</span></div>
          <div class="demand-number">${number(forecast)} <span>заказов</span></div>
          <p class="muted-copy">Текущая пропускная способность — ${number(capacity)} заказов в день.</p>
          <div class="capacity-progress"><div style="width:${capacityFill}%"></div></div>
          <div class="capacity-labels"><span>Нагрузка на логистику</span><strong>${capacityFill}%</strong></div>
          ${capacity < forecast ? `<div class="warning-inline">⚠ Не хватает мощности: часть заказов может потеряться.</div>` : `<div class="success-inline">✓ Склад и курьеры готовы к прогнозу.</div>`}
          <div class="demand-divider"></div>
          <div class="demand-details"><span>Склад <strong>${warehouseCapacity(state)} / день</strong></span><span>Курьеры <strong>${courierCapacity(state)} / день</strong></span></div>
        </article>
      </section>
      ${renderObjectives(state)}
      ${renderDailyReport(state)}

      <div class="section-heading"><div><div class="eyebrow">СЛЕДУЮЩИЙ ШАГ</div><h2>Куда вложить силы?</h2></div><span>Выберите улучшение для платформы</span></div>
      <section class="actions-grid">
        ${actionCard({ icon: "＋", title: "Новый продавец", description: "Больше товаров — больше причин зайти на площадку.", action: "HIRE_SELLER", buttonLabel: state.sellers.length >= SELLER_CATALOG.length ? "Все подключены" : `Подключить · ${money(hireCost)}`, disabled: !canHireSeller, tag: "+ спрос" })}
        ${actionCard({ icon: "▣", title: "Улучшить склад", description: "Увеличьте дневную мощность обработки заказов.", action: "UPGRADE_WAREHOUSE", buttonLabel: state.warehouseLevel >= 6 ? "Максимальный уровень" : `Улучшить · ${money(warehouseCostValue)}`, disabled: !canUpgrade, tag: `УРОВЕНЬ ${state.warehouseLevel}` })}
        ${actionCard({ icon: "↗", title: "Запустить рекламу", description: "Привлеките больше покупателей на три игровых дня.", action: "RUN_ADS", buttonLabel: state.adDays > 0 ? `Активна · ${state.adDays} дн.` : `Запустить · ${money(950)}`, disabled: state.adDays > 0 || state.cash < 950, tag: "+32% спроса" })}
        ${actionCard({ icon: "⌁", title: "Нанять курьера", description: "Расширьте географию и ускорьте доставку.", action: "HIRE_COURIER", buttonLabel: state.couriers >= 10 ? "Команда укомплектована" : `Нанять · ${money(courierCost(state))}`, disabled: state.couriers >= 10 || state.cash < courierCost(state), tag: `В КОМАНДЕ ${state.couriers}` })}
      </section>`;
  }

  function commissionCard(state) {
    const fee = Math.round(2200 * state.commission / 100);
    const loyaltyFill = clamp(state.sellerLoyalty, 0, 100);
    return `<article class="panel commission-panel">
      <div class="panel-heading"><div><div class="eyebrow">ПРАВИЛА ПЛОЩАДКИ</div><h2>Комиссия продавца</h2></div><span class="commission-badge">${state.commission}%</span></div>
      <p class="muted-copy">Доля платформы с заказа. Например, с покупки на 2 200 ₽ ваша комиссия — <strong>${money(fee)}</strong>.</p>
      <div class="range-wrap"><input type="range" min="8" max="22" step="1" value="${state.commission}" data-action="SET_COMMISSION" aria-label="Комиссия с продавцов"><div class="range-labels"><span>8% · мягко</span><span>22% · смело</span></div></div>
      <div class="commission-advice">${state.commission >= 15 ? "⚠" : "✦"} ${commissionMessage(state.commission)}</div>
      <div class="loyalty-row"><div><span>Лояльность продавцов</span><strong>${state.sellerLoyalty}%</strong></div><div class="loyalty-track"><div style="width:${loyaltyFill}%"></div></div></div>
    </article>`;
  }

  function sellerCard(seller, index) {
    return `<article class="seller-card">
      <div class="seller-avatar ${esc(seller.tint)}">${esc(seller.icon)}</div>
      <div class="seller-info"><div class="seller-name-row"><h3>${esc(seller.name)}</h3><span class="seller-status"><i></i> Активен</span></div><div class="seller-meta">${esc(seller.category)} <span>·</span> ${number(seller.products)} товаров</div></div>
      <div class="seller-orders"><strong>+${seller.baseOrders}</strong><span>заказов / день</span></div>
      <div class="seller-index">${String(index + 1).padStart(2, "0")}</div>
    </article>`;
  }

  function renderSellers(state) {
    const cost = sellerCost(state);
    const canHire = state.cash >= cost && state.sellers.length < SELLER_CATALOG.length;
    return `${pageHeading("ПАРТНЁРСКАЯ СЕТЬ", "Продавцы и товары", "Хороший ассортимент превращает случайный визит в заказ. Подключайте локальные магазины и развивайте их вместе с платформой.", `<button class="primary-button" data-action="HIRE_SELLER" ${canHire ? "" : "disabled"}>＋ Подключить продавца</button>`)}
      <section class="seller-summary-grid">
        <article class="summary-tile"><span class="summary-icon mint">▧</span><div><span>Партнёры</span><strong>${state.sellers.length} <small>/ ${SELLER_CATALOG.length}</small></strong></div></article>
        <article class="summary-tile"><span class="summary-icon peach">▤</span><div><span>Товаров в каталоге</span><strong>${number(state.sellers.reduce((sum, seller) => sum + seller.products, 0))}</strong></div></article>
        <article class="summary-tile"><span class="summary-icon lavender">♡</span><div><span>Лояльность продавцов</span><strong>${state.sellerLoyalty}<small>%</small></strong></div></article>
      </section>
      <section class="seller-layout">
        <article class="panel seller-list-panel">
          <div class="panel-heading"><div><div class="eyebrow">ВАШИ ПАРТНЁРЫ</div><h2>На площадке</h2></div><span class="count-chip">${state.sellers.length} активны</span></div>
          <div class="seller-list">${state.sellers.map(sellerCard).join("")}</div>
          ${state.sellers.length >= SELLER_CATALOG.length ? `<div class="all-connected-note">Все продавцы пилотного города уже подключены. Отличная работа!</div>` : `<div class="seller-list-foot"><span>Следующий партнёр подключится за</span><strong>${money(cost)}</strong></div>`}
        </article>
        ${commissionCard(state)}
      </section>
      <section class="seller-tip panel"><span class="tip-icon large">✦</span><div><div class="eyebrow">МАЛЕНЬКАЯ ХИТРОСТЬ</div><h3>Честная комиссия помогает расти вместе</h3><p>Высокая ставка увеличит доход с заказа, но продавцы будут терять лояльность. Если она упадёт, прогноз заказов тоже начнёт снижаться.</p></div><div class="tip-arrow">↗</div></section>`;
  }

  function renderLogistics(state) {
    const whCapacity = warehouseCapacity(state);
    const courCapacity = courierCapacity(state);
    const capacity = dailyCapacity(state);
    const forecast = forecastOrders(state);
    const fill = clamp(Math.round(forecast / Math.max(1, capacity) * 100), 4, 100);
    const whCost = warehouseCost(state);
    const cCost = courierCost(state);
    const whMax = state.warehouseLevel >= 6;
    const cMax = state.couriers >= 10;
    return `${pageHeading("СКОРОСТЬ И ТОЧНОСТЬ", "Логистика", "Заказ ещё не победа — его нужно собрать и вовремя доставить. Улучшайте склад и нанимайте курьеров, чтобы не терять покупателей.", `<button class="primary-button" data-action="END_DAY">Завершить день <span>→</span></button>`)}
      <section class="logistics-overview panel">
        <div class="logistics-copy"><div class="eyebrow">МОЩНОСТЬ СИСТЕМЫ</div><h2>Справимся с сегодняшним спросом?</h2><p>Прогноз — <strong>${forecast} заказов</strong>. Общая пропускная способность ограничена самым узким местом: складом или доставкой.</p>
          <div class="big-capacity"><strong>${capacity}</strong><span>заказов в день сейчас</span></div>
        </div>
        <div class="capacity-visual"><div class="capacity-ring" style="--fill:${fill}%"><div><strong>${fill}%</strong><span>ЗАГРУЗКА</span></div></div><div class="ring-caption">${capacity >= forecast ? "Есть запас мощности" : "Нужны улучшения"}</div></div>
      </section>
      <section class="logistics-cards">
        <article class="panel logistics-card">
          <div class="logi-card-head"><span class="action-icon">▣</span><span class="tiny-tag">УРОВЕНЬ ${state.warehouseLevel} / 6</span></div>
          <div class="eyebrow">ХРАНЕНИЕ И СБОРКА</div><h2>Склад</h2><p class="muted-copy">Команда собирает товары и готовит посылки к отправке.</p>
          <div class="capacity-stat"><span>Мощность склада</span><strong>${whCapacity} <small>заказов / день</small></strong></div>
          <div class="small-progress"><div style="width:${clamp(Math.round(forecast / whCapacity * 100), 3, 100)}%"></div></div>
          <button class="wide-button" data-action="UPGRADE_WAREHOUSE" ${whMax || state.cash < whCost ? "disabled" : ""}>${whMax ? "Максимальный уровень" : `Улучшить склад · ${money(whCost)}`} <span>→</span></button>
        </article>
        <article class="panel logistics-card">
          <div class="logi-card-head"><span class="action-icon peach">⌁</span><span class="tiny-tag">${state.couriers} В КОМАНДЕ</span></div>
          <div class="eyebrow">ПОСЛЕДНЯЯ МИЛЯ</div><h2>Курьеры</h2><p class="muted-copy">Курьеры развозят заказы и помогают быстрее расти репутации.</p>
          <div class="capacity-stat"><span>Мощность доставки</span><strong>${courCapacity} <small>заказов / день</small></strong></div>
          <div class="small-progress"><div class="peach-fill" style="width:${clamp(Math.round(forecast / courCapacity * 100), 3, 100)}%"></div></div>
          <button class="wide-button" data-action="HIRE_COURIER" ${cMax || state.cash < cCost ? "disabled" : ""}>${cMax ? "Команда укомплектована" : `Нанять курьера · ${money(cCost)}`} <span>→</span></button>
        </article>
      </section>
      <section class="panel ops-panel"><div class="panel-heading"><div><div class="eyebrow">ЦЕПОЧКА ЗАКАЗА</div><h2>Как работает доставка</h2></div><span class="mini-status"><i></i> ${capacity >= forecast ? "Всё готово" : "Есть узкое место"}</span></div><div class="flow-steps"><div class="flow-step"><span>01</span><div class="flow-icon">▧</div><strong>Заказ</strong><small>Покупатель оформляет товар</small></div><i class="flow-line"></i><div class="flow-step"><span>02</span><div class="flow-icon">▣</div><strong>Сборка</strong><small>Склад готовит посылку</small></div><i class="flow-line"></i><div class="flow-step"><span>03</span><div class="flow-icon peach">⌁</div><strong>Доставка</strong><small>Курьер везёт заказ</small></div><i class="flow-line"></i><div class="flow-step"><span>04</span><div class="flow-icon lime">✦</div><strong>Отзыв</strong><small>Репутация растёт</small></div></div></section>`;
  }

  function renderMarketing(state) {
    const campaignCost = 950;
    const forecast = forecastOrders(state);
    return `${pageHeading("РАСТИМ АУДИТОРИЮ", "Маркетинг", "Привлекайте покупателей и превращайте первый заказ в привычку. Кампания длится три игровых дня.", `<button class="primary-button" data-action="RUN_ADS" ${state.adDays > 0 || state.cash < campaignCost ? "disabled" : ""}>${state.adDays > 0 ? `Активна · ${state.adDays} дн.` : `Запустить · ${money(campaignCost)}`}</button>`)}
      <section class="marketing-hero panel">
        <div class="marketing-copy"><div class="hero-pill light-pill"><span class="pulse"></span> ${state.adDays > 0 ? `КАМПАНИЯ АКТИВНА · ${state.adDays} ДН.` : "КАМПАНИЯ ГОТОВА К ЗАПУСКУ"}</div><h2>Пусть о вас<br>узнает весь город.</h2><p>Реклама приводит покупателей на площадку. В течение трёх дней прогноз заказов вырастет примерно на треть.</p><div class="marketing-result"><span>Текущий прогноз</span><strong>${forecast} <small>заказов / день</small></strong></div></div>
        <div class="megaphone-art" aria-hidden="true"><div class="mega-spark spark-a">✦</div><div class="mega-spark spark-b">✧</div><div class="mega-cone"></div><div class="mega-handle"></div><div class="mega-mouth"></div><div class="mega-wave wave-one"></div><div class="mega-wave wave-two"></div><div class="mega-wave wave-three"></div><div class="mega-base"></div></div>
      </section>
      <section class="marketing-grid">
        <article class="panel campaign-panel"><div class="panel-heading"><div><div class="eyebrow">ПРОДВИЖЕНИЕ</div><h2>Городская кампания</h2></div><span class="campaign-price">${money(campaignCost)}</span></div><p class="muted-copy">Показывайте площадку новым покупателям. За кампанию списывается фиксированная сумма, а дополнительный спрос продержится три дня.</p><div class="campaign-benefits"><div><span class="benefit-check">✓</span><span>Примерно +32% к прогнозу заказов</span></div><div><span class="benefit-check">✓</span><span>Новые покупатели узнают о площадке</span></div><div><span class="benefit-check">✓</span><span>Репутация растёт за успешную доставку</span></div></div><button class="wide-button" data-action="RUN_ADS" ${state.adDays > 0 || state.cash < campaignCost ? "disabled" : ""}>${state.adDays > 0 ? `Кампания идёт · осталось ${state.adDays} дн.` : `Запустить кампанию · ${money(campaignCost)}`} <span>→</span></button></article>
        <article class="panel reputation-panel"><div class="panel-heading"><div><div class="eyebrow">ДОВЕРИЕ ПОКУПАТЕЛЕЙ</div><h2>Репутация</h2></div><span class="reputation-icon">✦</span></div><div class="rep-score">${state.reputation}<span>/ 100</span></div><div class="rep-progress"><div style="width:${state.reputation}%"></div></div><p>${state.reputation >= 80 ? "Отличная работа — покупатели рекомендуют площадку друзьям." : state.reputation >= 60 ? "Хороший старт. Своевременная доставка поможет поднять рейтинг." : "Рейтинг просел. Проверьте, хватает ли мощностей склада и курьеров."}</p><div class="rep-foot"><span>Всего доставлено</span><strong>${number(state.totalOrders)} заказов</strong></div></article>
      </section>
      <section class="marketing-note"><span>✦</span><p><strong>Совет:</strong> не запускайте рекламу, если логистика уже загружена почти на 100% — невыполненные заказы могут снизить репутацию.</p></section>`;
  }

  function sortedStoreProducts(state) {
    const products = [...STORE_PRODUCTS];
    if (state.storeSort === "priceAsc") return products.sort((a, b) => a.price - b.price);
    if (state.storeSort === "priceDesc") return products.sort((a, b) => b.price - a.price);
    return products.sort((a, b) => b.reviews - a.reviews);
  }

  function renderStoreProduct(product, state) {
    const isFavorite = (state.favorites || []).includes(product.id);
    const query = String(state.storeQuery || "").trim().toLowerCase();
    const searchText = `${product.name} ${product.category} ${product.seller} ${product.features} ${product.keywords}`.toLowerCase();
    const matches = (state.storeCategory === "all" || state.storeCategory === product.categoryId) && (!query || searchText.includes(query));
    const discount = Math.round((1 - product.price / product.oldPrice) * 100);
    return `<article class="store-product-card" data-category="${product.categoryId}" data-search="${esc(searchText)}" ${matches ? "" : "hidden"}>
      <div class="product-photo" style="--photo-bg:${product.id === "headphones" ? "#ece8ff" : product.id === "sneakers" ? "#f7f0e3" : "#edf4e9"}">
        <span class="product-badge">${esc(product.badge)}</span>
        <button class="favorite-button ${isFavorite ? "is-favorite" : ""}" data-action="TOGGLE_FAVORITE" data-product="${product.id}" aria-label="${isFavorite ? "Убрать из избранного" : "Добавить в избранное"}">${isFavorite ? "♥" : "♡"}</button>
        <img src="${esc(productImageSource(product.image))}" alt="${esc(product.name)}" loading="lazy">
        <span class="discount-sticker">−${discount}%</span>
      </div>
      <div class="product-info">
        <div class="product-seller"><span class="seller-check">✓</span>${esc(product.seller)}</div>
        <h3>${esc(product.name)}</h3>
        <p class="product-features">${esc(product.features)}</p>
        <div class="product-rating"><span class="rating-stars">★</span><strong>${product.rating}</strong><span>(${number(product.reviews)})</span><i></i><span class="delivery-label">${esc(product.delivery)}</span></div>
        <div class="product-price-row"><strong>${money(product.price)}</strong><del>${money(product.oldPrice)}</del></div>
        <button class="add-cart-button" data-action="CART_ADD" data-product="${product.id}"><span>В корзину</span><span class="add-cart-plus">＋</span></button>
      </div>
    </article>`;
  }

  function renderCartDrawer(state) {
    if (!state.cartOpen) return "";
    const items = (state.cartItems || []).map(item => ({ ...item, product: storeProduct(item.id) })).filter(item => item.product);
    const count = cartCount(state);
    return `<div class="cart-layer">
      <button class="cart-scrim" data-action="CART_CLOSE" aria-label="Закрыть корзину"></button>
      <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Корзина">
        <div class="cart-drawer-head"><div><span class="drawer-kicker">ВАША ПОКУПКА</span><h2>Корзина <span>${count}</span></h2></div><button class="drawer-close" data-action="CART_CLOSE" aria-label="Закрыть">×</button></div>
        ${items.length ? `<div class="cart-items">${items.map(item => `<article class="cart-item"><img src="${esc(productImageSource(item.product.image))}" alt=""><div class="cart-item-copy"><strong>${esc(item.product.name)}</strong><span>${money(item.product.price)} · ${esc(item.product.delivery)}</span><div class="cart-qty"><button data-action="CART_REMOVE" data-product="${item.id}" aria-label="Уменьшить количество">−</button><span>${item.qty}</span><button data-action="CART_ADD" data-product="${item.id}" aria-label="Добавить ещё">＋</button></div></div><b>${money(item.product.price * item.qty)}</b></article>`).join("")}</div>
          <div class="cart-summary"><div><span>Итого</span><strong>${money(cartTotal(state))}</strong></div><p>Демо-заказы попадут в симуляцию следующего игрового дня.</p><button class="checkout-button" data-action="CART_CHECKOUT">Оформить демо-заказ <span>→</span></button></div>`
          : `<div class="cart-empty"><div class="empty-cart-icon">🛍</div><h3>Корзина ждёт покупок</h3><p>Добавьте товар с витрины — и оформите тестовый заказ для своей платформы.</p><button data-action="CART_CLOSE">Продолжить покупки</button></div>`}
      </aside>
    </div>`;
  }

  function renderStorefront(state) {
    const categories = [
      { id: "all", name: "Всё самое нужное", short: "Все товары", icon: "✦", tone: "all" },
      { id: "electronics", name: "Техника и звук", short: "Электроника", icon: "♫", tone: "violet" },
      { id: "home", name: "Дом с настроением", short: "Дом и уют", icon: "⌂", tone: "mint" },
      { id: "clothes", name: "На каждый день", short: "Одежда и обувь", icon: "◒", tone: "peach" }
    ];
    const query = String(state.storeQuery || "").trim().toLowerCase();
    const matches = STORE_PRODUCTS.filter(product => {
      const text = `${product.name} ${product.category} ${product.seller} ${product.features} ${product.keywords}`.toLowerCase();
      return (state.storeCategory === "all" || state.storeCategory === product.categoryId) && (!query || text.includes(query));
    }).length;
    const cartItems = cartCount(state);
    const pendingOrders = state.pendingOrders || 0;
    return `<div class="marketplace-app">
      <div class="market-topline"><div class="market-wrap topline-inner"><div class="topline-location"><span class="location-pin">⌖</span><span>Доставим в</span><button>Челябинск <span>⌄</span></button><i></i><span class="delivery-promise">Бесплатная доставка от 2 500 ₽</span></div><div class="topline-tools"><span class="pilot-indicator"><i></i> ПИЛОТНЫЙ ЗАПУСК</span><button data-action="OPEN_TAB" title="Открыть в отдельной вкладке">↗ <span>Отдельная вкладка</span></button><button data-action="TOGGLE_FULLSCREEN" title="На весь экран">⛶ <span>На весь экран</span></button></div></div></div>
      <header class="market-header"><div class="market-wrap market-header-inner">
        <button class="market-brand" data-action="NAV" data-view="store" aria-label="На главную">
          <span class="market-brand-mark"><i></i><i></i><i></i></span><span class="market-brand-copy"><strong>своймаркет</strong><small>ПОКУПКИ РЯДОМ</small></span>
        </button>
        <button class="catalog-button" data-action="STORE_CATEGORY" data-category="all"><span>☰</span> Каталог</button>
        <label class="market-search"><span class="search-symbol">⌕</span><input type="search" data-action="STORE_SEARCH" value="${esc(state.storeQuery || "")}" placeholder="Найти на «Свой Маркет»" autocomplete="off"><span class="search-shortcut">НАЙТИ</span></label>
        <div class="market-header-actions">
          <button class="market-action" data-action="NAV" data-view="overview"><span class="market-action-icon">♙</span><span>Кабинет</span></button>
          <button class="market-action cart-action" data-action="CART_OPEN"><span class="cart-icon-wrap">🛍<b>${cartItems}</b></span><span>Корзина</span></button>
        </div>
      </div></header>
      <nav class="market-subnav"><div class="market-wrap subnav-inner"><div class="subnav-links"><button class="subnav-link ${state.storeCategory === "all" ? "active" : ""}" data-action="STORE_CATEGORY" data-category="all">Главная</button><button class="subnav-link ${state.storeCategory === "electronics" ? "active" : ""}" data-action="STORE_CATEGORY" data-category="electronics">Техника</button><button class="subnav-link ${state.storeCategory === "home" ? "active" : ""}" data-action="STORE_CATEGORY" data-category="home">Дом и уют</button><button class="subnav-link ${state.storeCategory === "clothes" ? "active" : ""}" data-action="STORE_CATEGORY" data-category="clothes">Одежда и обувь</button><span class="subnav-divider"></span><span class="subnav-hot">✦ Выбор города</span></div><button class="owner-link" data-action="NAV" data-view="overview"><span class="owner-link-icon">↗</span> Управлять маркетплейсом</button></div></nav>
      <main class="market-main market-wrap">
        ${state.notice ? `<div class="market-toast" role="status"><span>✦</span><p>${esc(state.notice)}</p><button data-action="CLEAR_NOTICE" aria-label="Закрыть">×</button></div>` : ""}
        <section class="market-hero">
          <div class="hero-copy-market"><div class="market-eyebrow"><span class="eyebrow-star">✦</span> ПЕРВАЯ НЕДЕЛЯ БОЛЬШИХ НАХОДОК</div><h1>Всё нужное.<br><em>По-своему.</em></h1><p>Открывайте локальные бренды, находите любимые вещи и получайте их уже завтра.</p><a class="market-hero-button" href="#store-products">Смотреть подборку <span>→</span></a><div class="hero-proof"><span><b>✓</b> Проверенные продавцы</span><i></i><span><b>✓</b> Доставка рядом</span></div></div>
          <div class="market-hero-art"><div class="hero-orb orb-a"></div><div class="hero-orb orb-b"></div><div class="hero-ring"></div><div class="hero-product-shadow"></div><img src="${esc(productImageSource("headphones.jpg"))}" alt="Наушники Cloud Lite" class="hero-product-image"><div class="hero-floating-card"><span class="floating-card-badge">ХИТ НЕДЕЛИ</span><strong>Наушники<br>Cloud Lite</strong><div><span>−33%</span><b>${money(3990)}</b></div></div><div class="hero-sale-bubble"><span>ДО</span><strong>−40%</strong><small>НА ХИТЫ</small></div><span class="hero-star star-one">✦</span><span class="hero-star star-two">✧</span></div>
          <div class="hero-slide-dots"><i class="active"></i><i></i><i></i></div>
        </section>

        <section class="trust-row"><div class="trust-item"><span class="trust-icon violet">⌖</span><span><strong>Рядом с вами</strong><small>продавцы своего города</small></span></div><div class="trust-item"><span class="trust-icon mint">↗</span><span><strong>Доставка без суеты</strong><small>понятные сроки и статусы</small></span></div><div class="trust-item"><span class="trust-icon peach">♡</span><span><strong>Выбор покупателей</strong><small>честные оценки и отзывы</small></span></div><div class="trust-status"><span class="live-dot"></span> Сегодня на площадке <strong>${number(forecastOrders(state) - pendingOrders)} заказов</strong>${pendingOrders ? `<small>+${pendingOrders} в очереди на завтра</small>` : ""}</div></section>

        <section class="market-section category-section"><div class="market-section-heading"><div><span class="market-kicker">БЫСТРО НАЙДЁМ</span><h2>Что ищем сегодня?</h2></div><button class="text-link" data-action="STORE_CATEGORY" data-category="all">Весь каталог <span>→</span></button></div><div class="category-card-grid">${categories.map(category => `<button class="category-tile ${category.tone} ${state.storeCategory === category.id ? "selected" : ""}" data-action="STORE_CATEGORY" data-category="${category.id}"><span class="category-tile-icon">${category.icon}</span><span class="category-tile-copy"><strong>${category.name}</strong><small>${category.short}</small></span><span class="category-tile-arrow">↗</span></button>`).join("")}</div></section>

        <section class="market-section products-section" id="store-products"><div class="market-section-heading products-heading"><div><span class="market-kicker">ВЫБРАЛИ ДЛЯ ВАС</span><h2>Находки дня <span class="heading-spark">✦</span></h2></div><div class="products-heading-right"><span class="results-count" data-store-results>${matches} товара</span><label class="sort-select-wrap"><select class="sort-select" data-action="STORE_SORT" aria-label="Сортировка товаров"><option value="popular" ${state.storeSort === "popular" ? "selected" : ""}>Сначала популярное</option><option value="priceAsc" ${state.storeSort === "priceAsc" ? "selected" : ""}>Сначала дешевле</option><option value="priceDesc" ${state.storeSort === "priceDesc" ? "selected" : ""}>Сначала дороже</option></select></label></div></div><div class="active-filter-row"><div class="filter-chips">${categories.map(category => `<button class="filter-chip ${state.storeCategory === category.id ? "active" : ""}" data-action="STORE_CATEGORY" data-category="${category.id}">${category.short}</button>`).join("")}</div><span class="catalog-note">ПИЛОТНЫЙ КАТАЛОГ · ${STORE_PRODUCTS.length} ТОВАРА</span></div><div class="store-product-grid">${sortedStoreProducts(state).map(product => renderStoreProduct(product, state)).join("")}</div><div class="store-empty" ${matches ? "hidden" : ""}><span>⌕</span><strong>Ничего не нашли</strong><p>Попробуйте изменить запрос или выбрать другую категорию.</p><button data-action="STORE_CATEGORY" data-category="all">Показать все товары</button></div></section>

        <section class="owner-banner"><div class="owner-banner-copy"><span class="owner-banner-kicker"><i></i> ТВОЯ ПЛАТФОРМА · ДЕНЬ ${String(state.day).padStart(2, "0")}</span><h2>Хочешь управлять<br>всем этим?</h2><p>Подключай продавцов, запускай акции и строй маркетплейс, который любят покупатели.</p><button data-action="NAV" data-view="overview">Открыть кабинет владельца <span>→</span></button></div><div class="owner-banner-stats"><div><span>Репутация</span><strong>4,${Math.floor(state.reputation / 10)} <small>★</small></strong></div><div><span>Продавцов</span><strong>${state.sellers.length}</strong></div><div><span>Баланс платформы</span><strong>${money(state.cash)}</strong></div></div><div class="owner-banner-art"><span class="banner-circle circle-a"></span><span class="banner-circle circle-b"></span><span class="banner-mark">✦</span><span class="banner-label">СВОЯ<br>ПЛАТФОРМА</span></div></section>
      </main>
      <footer class="market-footer"><div class="market-wrap footer-inner"><span class="footer-brand">своймаркет <small>ПОКУПКИ РЯДОМ</small></span><span>Демо-витрина tycoon-игры · все товары вымышлены</span><button data-action="NAV" data-view="overview">Кабинет владельца ↗</button></div></footer>
      ${renderCartDrawer(state)}
    </div>`;
  }

  function render(state) {
    if (state.activeView === "store") return renderStorefront(state);
    let content;
    switch (state.activeView) {
      case "sellers": content = renderSellers(state); break;
      case "logistics": content = renderLogistics(state); break;
      case "marketing": content = renderMarketing(state); break;
      default: content = renderOverview(state);
    }
    return renderShell(state, content);
  }

  window.MarketTycoon = { initialState, reducer, render };
})();
