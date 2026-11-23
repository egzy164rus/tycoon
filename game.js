/*
 * «Свой Маркет» — глубокий тайкун-симулятор маркетплейса.
 * Пошаговая игра: каждый ход — неделя. Команда, исследования,
 * проекты, конкуренты, кредиты, рискованные ставки и события с выбором.
 * Экраны: приветствие → игра → победа / банкротство.
 */
(() => {
  // ============================== ДАННЫЕ ==============================

  const VIEWS = [
    { id: "overview", label: "Кабинет", icon: "⌂" },
    { id: "team", label: "Команда", icon: "♙" },
    { id: "research", label: "Исследования", icon: "⌘" },
    { id: "projects", label: "Проекты", icon: "▤" },
    { id: "market", label: "Рынок", icon: "↗" }
  ];

  const STAGES = [
    { name: "Пилотный город", market: 900, expandCost: 35000 },
    { name: "Область", market: 3200, expandCost: 110000 },
    { name: "Вся страна", market: 11000, expandCost: 260000 },
    { name: "Международный рынок", market: 40000, expandCost: 0 }
  ];

  const DIFFICULTIES = [
    { id: 1, name: "Спокойный", desc: "Мягкий старт и щедрый капитал", icon: "☼", cash: 45000, eventChance: 0.42, vol: 0.7, aggression: 0.1 },
    { id: 2, name: "Стандарт", desc: "Честный вызов для стратега", icon: "◈", cash: 32000, eventChance: 0.55, vol: 1, aggression: 0.22 },
    { id: 3, name: "Титан", desc: "Жёсткая конкуренция и высокие ставки", icon: "⚡", cash: 22000, eventChance: 0.68, vol: 1.35, aggression: 0.35 }
  ];

  const ROLES = [
    { id: "dev", name: "Разработчик", icon: "⌘", salary: 2800, effect: "Исследовательские очки" },
    { id: "logi", name: "Логист", icon: "▣", salary: 2400, effect: "Мощность склада и доставки" },
    { id: "marketer", name: "Маркетолог", icon: "↗", salary: 2600, effect: "Спрос и реклама" },
    { id: "seller_mgr", name: "Менеджер продавцов", icon: "▧", salary: 2200, effect: "Лояльность продавцов" },
    { id: "analyst", name: "Аналитик", icon: "◔", salary: 3000, effect: "Очки исследований и доля рынка" }
  ];

  const TECHS = [
    { id: "sort_center", branch: "logistics", name: "Сортировочный центр", rp: 30, money: 15000, requires: [], desc: "Заказы обрабатываются быстрее и дешевле.", effectText: "−15% расходов на логистику" },
    { id: "express", branch: "logistics", name: "Экспресс-доставка", rp: 45, money: 28000, requires: ["sort_center"], desc: "Доставка за день повышает доверие покупателей.", effectText: "+12% спроса, репутация растёт быстрее" },
    { id: "own_fleet", branch: "logistics", name: "Свой автопарк", rp: 65, money: 48000, requires: ["express"], desc: "Курьеры под вашим контролем.", effectText: "+25% мощности доставки, −10% расходов" },
    { id: "robots", branch: "logistics", name: "Роботизация склада", rp: 95, money: 90000, requires: ["own_fleet"], desc: "Роботы собирают заказы круглосуточно.", effectText: "−25% расходов на логистику, +20% мощности склада" },
    { id: "mobile_app", branch: "product", name: "Мобильное приложение", rp: 35, money: 20000, requires: [], desc: "Покупателям удобнее заказывать со смартфона.", effectText: "+18% спроса" },
    { id: "reviews", branch: "product", name: "Система отзывов", rp: 30, money: 14000, requires: [], desc: "Честные отзывы повышают доверие.", effectText: "Репутация растёт быстрее" },
    { id: "ai_recs", branch: "product", name: "ИИ-рекомендации", rp: 60, money: 42000, requires: ["mobile_app"], desc: "Персональные подборки увеличивают чек.", effectText: "+10% к среднему чеку" },
    { id: "plus_sub", branch: "product", name: "Платформа подписки", rp: 80, money: 60000, requires: ["ai_recs"], desc: "Технология для регулярного дохода с подписчиков.", effectText: "Открывает проект «Подписка Плюс»" },
    { id: "brand", branch: "marketing", name: "Бренд-платформа", rp: 30, money: 18000, requires: [], desc: "Единый стиль и голос бренда.", effectText: "Реклама эффективнее на 30%" },
    { id: "partner_program", branch: "marketing", name: "Партнёрская программа", rp: 40, money: 24000, requires: [], desc: "Продавцам выгодно расти вместе с вами.", effectText: "Лояльность продавцов растёт" },
    { id: "mega_sales", branch: "marketing", name: "Большие распродажи", rp: 55, money: 36000, requires: ["brand"], desc: "Городские события скидок под вашим брендом.", effectText: "+10% спроса" },
    { id: "exclusives", branch: "marketing", name: "Эксклюзивные бренды", rp: 85, money: 75000, requires: ["partner_program", "mega_sales"], desc: "Товары, которых нет у конкурентов.", effectText: "Доля рынка растёт быстрее" }
  ];

  const BRANCHES = [
    { id: "logistics", name: "Логистика", icon: "▣", tone: "mint" },
    { id: "product", name: "Продукт", icon: "◈", tone: "lavender" },
    { id: "marketing", name: "Маркетинг", icon: "↗", tone: "peach" }
  ];

  const PROJECTS = [
    { id: "app_launch", name: "Запуск мобильного приложения", weeks: 4, cost: 45000, requires: [], desc: "Собственное приложение для покупателей.", effectText: "+25% спроса, +1% доли рынка", stage: 0 },
    { id: "new_warehouse", name: "Склад в новом городе", weeks: 3, cost: 38000, requires: [], desc: "Расширяем географию доставки.", effectText: "+40% мощности, +10% спроса", stage: 0 },
    { id: "ad_blitz", name: "Кампания «Весь город»", weeks: 2, cost: 20000, requires: [], desc: "Масштабная реклама с долгим эффектом.", effectText: "+20% спроса на 4 недели, +1% доли", stage: 0 },
    { id: "analytics_dept", name: "Отдел аналитики", weeks: 2, cost: 22000, requires: [], desc: "Данные превращаются в решения.", effectText: "+5 очков исследований в неделю", stage: 0 },
    { id: "logistics_contract", name: "Контракт с логистической сетью", weeks: 2, cost: 28000, requires: [], desc: "Скидки на доставку по всему рынку.", effectText: "−20% расходов на логистику", stage: 0 },
    { id: "loyalty_club", name: "Клуб лояльности", weeks: 3, cost: 26000, requires: ["reviews"], desc: "Покупатели возвращаются снова и снова.", effectText: "+16% спроса, репутация растёт", stage: 0 },
    { id: "subscription", name: "Подписка «Маркет Плюс»", weeks: 3, cost: 30000, requires: ["plus_sub"], desc: "Регулярный доход с подписчиков.", effectText: "Еженедельный доход с подписки", stage: 0 },
    { id: "expansion", name: "Экспансия: новый рынок", weeks: 4, cost: 0, requires: [], desc: "Выход из пилотного города в большой рынок.", effectText: "Открывает следующую стадию игры", stage: 0, isExpansion: true }
  ];

  const LOANS = [
    { id: "micro", name: "Микрозайм", icon: "⚡", amount: 20000, weekly: 5200, weeks: 5, minShare: 0, desc: "Быстрые деньги, но платим каждую неделю." },
    { id: "bank", name: "Банковский кредит", icon: "▤", amount: 60000, weekly: 8400, weeks: 9, minShare: 0, desc: "Классическое финансирование для роста." },
    { id: "invest", name: "Инвестиционный транш", icon: "✦", amount: 150000, weekly: 15000, weeks: 12, minShare: 10, desc: "Крупная сумма для уверенного рывка." }
  ];

  const GAMBLERS = [
    { id: "spec_buy", name: "Спекулятивная закупка", icon: "₽", stake: 15000, p: 0.45, okText: "+35 000 ₽", failText: "Ставка сгорает", ok: { cash: 35000 }, fail: {}, desc: "Покупаем партию товара на пике спроса и надеемся продать дороже." },
    { id: "hackathon", name: "Хакатон выходного дня", icon: "⌘", stake: 10000, p: 0.5, okText: "+22 RP · +5 морали", failText: "−10 морали", ok: { rp: 22, morale: 5 }, fail: { morale: -10 }, desc: "Команда работает в выходные над прорывной идеей." },
    { id: "exclusive_deal", name: "Рискованная эксклюзивная сделка", icon: "◈", stake: 25000, p: 0.4, okText: "+1,6% доли рынка", failText: "−6 репутации", ok: { share: 1.6 }, fail: { reputation: -6 }, desc: "Заключаем смелый контракт раньше конкурентов." }
  ];

  const EVENTS = [
    {
      id: "payment_failure", icon: "⚠", title: "Сбой платёжной системы",
      text: "Часть заказов прошла с ошибкой оплаты. Покупатели недовольны и ждут решения.",
      choices: [
        { label: "Возместить издержки покупателям", hint: "−8 000 ₽ · +4 репутации", effects: { cash: -8000, reputation: 4 } },
        { label: "Переждать и молчать", hint: "−6 репутации", effects: { reputation: -6 } }
      ]
    },
    {
      id: "blogger", icon: "✦", title: "Блогер-миллионник на связи",
      text: "Популярный блогер предлагает интеграцию с вашей площадкой. Его аудитория — ваш целевой сегмент.",
      choices: [
        { label: "Оплатить интеграцию", hint: "−12 000 ₽ · +25% спроса на 2 недели", effects: { cash: -12000, demandWeeks: 2, demandMult: 0.25 } },
        { label: "Вежливо отказать", hint: "Без изменений", effects: {} }
      ]
    },
    {
      id: "couriers_strike", icon: "⚠", title: "Курьеры грозят забастовкой",
      text: "Доставщики недовольны оплатой в пиковый сезон. Нужно решить быстро.",
      choices: [
        { label: "Поднять оплату курьерам", hint: "−11 000 ₽ · +2 морали команде", effects: { cash: -11000, morale: 2 } },
        { label: "Договориться на словах", hint: "−4 репутации · −3 лояльности", effects: { reputation: -4, loyalty: -3 } }
      ]
    },
    {
      id: "exclusive_brand", icon: "◈", title: "Крупный бренд просит эксклюзив",
      text: "Известный бренд готов продавать только у вас. Нужен депозит и гарантии.",
      choices: [
        { label: "Подписать эксклюзив", hint: "−16 000 ₽ · +1,5% доли рынка", effects: { cash: -16000, share: 1.5 } },
        { label: "Работать со всеми брендами", hint: "+2 лояльности продавцов", effects: { loyalty: 2 } }
      ]
    },
    {
      id: "price_war", icon: "⚔", title: "Конкуренты начинают войну скидок",
      text: "«МаркетПро» и «БыстроМаркет» одновременно запустили гигантские распродажи. Рынок нестабилен.",
      choices: [
        { label: "Участвовать в войне скидок", hint: "Шанс 50/50: +22 000 ₽ или −12 000 ₽", chance: { p: 0.5, ok: { cash: 22000 }, fail: { cash: -12000 }, okText: "Распродажа взорвала продажи: +22 000 ₽!", failText: "Скидки съели маржу: −12 000 ₽." } },
        { label: "Сохранить маржу", hint: "−0,8% доли рынка", effects: { share: -0.8 } }
      ]
    },
    {
      id: "viral_review", icon: "♡", title: "Вирусный отзыв о площадке",
      text: "Покупатель написал трогательную историю о вашей доставке. Пост собирает тысячи лайков.",
      choices: [
        { label: "Поддержать историю рекламой", hint: "−4 000 ₽ · +6 репутации", effects: { cash: -4000, reputation: 6 } },
        { label: "Просто поблагодарить", hint: "+2 репутации", effects: { reputation: 2 } }
      ]
    },
    {
      id: "supplier_delay", icon: "⚠", title: "Поставщик задерживает товары",
      text: "Ключевой поставщик срывает сроки. Витрины могут опустеть.",
      choices: [
        { label: "Срочная закупка у других", hint: "−9 000 ₽", effects: { cash: -9000 } },
        { label: "Пусть покупатели подождут", hint: "−5 репутации · −10% спроса на неделю", effects: { reputation: -5, demandWeeks: 1, demandMult: -0.1 } }
      ]
    },
    {
      id: "hack_attack", icon: "⚠", title: "Попытка хакерской атаки",
      text: "Служба безопасности обнаружила подозрительную активность в системе.",
      choices: [
        { label: "Усилить защиту немедленно", hint: "−11 000 ₽ · +2 репутации", effects: { cash: -11000, reputation: 2 } },
        { label: "Обойтись своими силами", hint: "Шанс 50/50: отбились (+2 реп.) или утечка (−8 реп.)", chance: { p: 0.5, ok: { reputation: 2 }, fail: { reputation: -8 }, okText: "Атака отбита без потерь!", failText: "Произошла утечка данных: −8 репутации." } }
      ]
    },
    {
      id: "city_festival", icon: "♫", title: "Городской фестиваль",
      text: "Мэрия приглашает площадку стать партнёром праздника. Много людей и камер.",
      choices: [
        { label: "Стать спонсором", hint: "−10 000 ₽ · +5 репутации · +15% спроса на неделю", effects: { cash: -10000, reputation: 5, demandWeeks: 1, demandMult: 0.15 } },
        { label: "Поставить бесплатный стенд", hint: "−3 000 ₽ · +2 репутации", effects: { cash: -3000, reputation: 2 } }
      ]
    },
    {
      id: "young_brands", icon: "✦", title: "Молодые бренды просят поддержки",
      text: "Локальные мастера хотят продавать на вашей площадке, но боятся условий.",
      choices: [
        { label: "Запустить акселератор брендов", hint: "−11 000 ₽ · +5 лояльности · +1% доли", effects: { cash: -11000, loyalty: 5, share: 1 } },
        { label: "Предложить стандартные условия", hint: "+2 лояльности", effects: { loyalty: 2 } }
      ]
    },
    {
      id: "delivery_complaints", icon: "⚠", title: "Волна жалоб на доставку",
      text: "Покупатели жалуются на опоздания. Соцсети полны скриншотов.",
      choices: [
        { label: "Нанять подработку на склад", hint: "−7 000 ₽", effects: { cash: -7000 } },
        { label: "Оптимизировать маршруты", hint: "−3 000 ₽ · −2 репутации", effects: { cash: -3000, reputation: -2 } }
      ]
    },
    {
      id: "competitor_closed", icon: "↗", title: "Конкурент закрылся",
      text: "Небольшая площадка «Торговец» прекращает работу. Её продавцы ищут новый дом.",
      choices: [
        { label: "Переманить продавцов", hint: "−9 000 ₽ · +5 лояльности · +1% доли", effects: { cash: -9000, loyalty: 5, share: 1 } },
        { label: "Не спешить", hint: "+0,4% доли рынка", effects: { share: 0.4 } }
      ]
    },
    {
      id: "investors", icon: "₽", title: "Инвесторы довольны отчётом",
      text: "Совет директоров выделил премию на развитие. Куда направить средства?",
      choices: [
        { label: "В продукт и технологии", hint: "+25 очков исследований", effects: { rp: 25 } },
        { label: "В маркетинг", hint: "+1% доли рынка", effects: { share: 1 } },
        { label: "В команду", hint: "+10 морали всем", effects: { morale: 10 } }
      ]
    },
    {
      id: "holiday_season", icon: "♫", title: "Праздничный сезон близко",
      text: "Аналитики прогнозируют рекордный спрос. Склады нужно готовить заранее.",
      choices: [
        { label: "Мобилизовать все силы", hint: "−6 000 ₽ · +30% спроса на неделю", effects: { cash: -6000, demandWeeks: 1, demandMult: 0.3 } },
        { label: "Работать как обычно", hint: "+10% спроса на неделю", effects: { demandWeeks: 1, demandMult: 0.1 } }
      ]
    },
    {
      id: "star_seller", icon: "★", title: "Звёздный продавец хочет к вам",
      text: "Популярный бренд с огромной аудиторией выбирает между вами и конкурентом.",
      choices: [
        { label: "Уговорить и помочь с запуском", hint: "−5 000 ₽ · +10% спроса", effects: { cash: -5000, demandWeeks: 2, demandMult: 0.1 } },
        { label: "Предложить стандартные условия", hint: "Без изменений", effects: {} }
      ]
    },
    {
      id: "press_article", icon: "▤", title: "Статья «Какой маркетплейс выбрать?»",
      text: "Крупное издание готовит обзор рынка. Можно подготовиться к упоминанию — или надеяться на удачу.",
      choices: [
        { label: "PR-подготовка к публикации", hint: "−6 000 ₽ · +5 репутации", effects: { cash: -6000, reputation: 5 } },
        { label: "Положиться на качество", hint: "Шанс 50/50: +4 реп. или −3 реп.", chance: { p: 0.5, ok: { reputation: 4 }, fail: { reputation: -3 }, okText: "Обзор вышел хвалебным!", failText: "Автор раскритиковал доставку." } }
      ]
    },
    {
      id: "mystery_investor", icon: "⚡", title: "Таинственный инвестор",
      text: "Незнакомец предлагает рискованную сделку: крупная сумма сейчас против обещания прибыли в будущем.",
      choices: [
        { label: "Верить и заключить сделку", hint: "Шанс 45/55: +45 000 ₽ или −16 000 ₽", chance: { p: 0.45, ok: { cash: 45000 }, fail: { cash: -16000 }, okText: "Сделка оказалась золотой: +45 000 ₽!", failText: "Инвестор исчез с предоплатой: −16 000 ₽." } },
        { label: "Отказаться от авантюры", hint: "+2 репутации (спокойствие)", effects: { reputation: 2 } }
      ]
    },
    {
      id: "spring_promo", season: "spring", icon: "✿", title: "Весеннее обновление",
      text: "Город просыпается после зимы: покупатели ищут новое. Удачный момент для обновления бренда — или для честной распродажи.",
      choices: [
        { label: "Ребрендинг платформы", hint: "Шанс 60/40: +2 реп. и +10% спроса или −6 000 ₽ и −1 реп.", chance: { p: 0.6, ok: { reputation: 2, demandWeeks: 2, demandMult: 0.1 }, fail: { cash: -6000, reputation: -1 }, okText: "Новый стиль полюбился клиентам!", failText: "Редизайн не зашёл публике." } },
        { label: "Весенняя распродажа", hint: "+3 500 ₽ · +10% спроса на неделю", effects: { cash: 3500, demandWeeks: 1, demandMult: 0.1 } }
      ]
    },
    {
      id: "summer_lull", season: "summer", icon: "☀", title: "Летний спад",
      text: "Город пустеет: все в отпусках. Заказы просели, а команда устала и мечтает о море.",
      choices: [
        { label: "Мощная летняя распродажа", hint: "+4 000 ₽ · +15% спроса на 2 недели · −1 реп.", effects: { cash: 4000, demandWeeks: 2, demandMult: 0.15, reputation: -1 } },
        { label: "Отправить команду в отпуск", hint: "+3 репутации · −3 000 ₽", effects: { reputation: 3, cash: -3000 } }
      ]
    },
    {
      id: "black_friday", season: "autumn", icon: "🍂", title: "Чёрная пятница",
      text: "Самая горячая распродажа года. Можно рискнуть и взорвать рынок скидками — или сыграть наверняка.",
      choices: [
        { label: "Скидки до 70% на всё", hint: "Шанс 55/45: +22 000 ₽ и +15% спроса или −8 000 ₽ и −1 реп.", chance: { p: 0.55, ok: { cash: 22000, demandWeeks: 2, demandMult: 0.15 }, fail: { cash: -8000, reputation: -1 }, okText: "Распродажа взорвала рынок: +22 000 ₽!", failText: "Скидки съели маржу: −8 000 ₽." } },
        { label: "Умеренная акция", hint: "+6 000 ₽ без риска", effects: { cash: 6000 } }
      ]
    },
    {
      id: "winter_holiday", season: "winter", icon: "❄", title: "Новогодний шопинг-бум",
      text: "Праздники близко: спрос на доставку растёт каждую неделю. Успеть закупить товар впрок — или не рисковать?",
      choices: [
        { label: "Закупить товар впрок", hint: "Шанс 65/35: +15 000 ₽ и +20% спроса или −5 000 ₽", chance: { p: 0.65, ok: { cash: 15000, demandWeeks: 3, demandMult: 0.2 }, fail: { cash: -5000 }, okText: "Склад забит ходовыми товарами: +15 000 ₽!", failText: "Спрос ушёл к конкурентам: −5 000 ₽." } },
        { label: "Работать как обычно", hint: "+10% спроса на неделю", effects: { demandWeeks: 1, demandMult: 0.1 } }
      ]
    }
  ];

  const GOALS = [
    { id: "first_profit", title: "Первая прибыль", description: "Закрыть неделю в плюсе", type: "profit", target: 1, reward: 5000, icon: "₽", deadline: 6 },
    { id: "rp50", title: "Наука", description: "Накопить 50 очков исследований", type: "rp", target: 50, reward: 6000, icon: "⌘" },
    { id: "team5", title: "Команда мечты", description: "Нанять 5 сотрудников", type: "team", target: 5, reward: 9000, icon: "♙" },
    { id: "first_project", title: "Первый запуск", description: "Завершить любой проект", type: "projects", target: 1, reward: 8000, icon: "▤", deadline: 10 },
    { id: "share10", title: "Серьёзный игрок", description: "Достичь 10% доли рынка", type: "share", target: 10, reward: 15000, icon: "↗", deadline: 18 },
    { id: "rep80", title: "Любимая площадка", description: "Поднять репутацию до 80", type: "reputation", target: 80, reward: 12000, icon: "♡" },
    { id: "tech3", title: "Технологии", description: "Изучить 3 технологии", type: "techs", target: 3, reward: 10000, icon: "◈" },
    { id: "cash100k", title: "Капитал", description: "Накопить 100 000 ₽", type: "cash", target: 100000, reward: 12000, icon: "₽" },
    { id: "stage2", title: "За пределами города", description: "Выйти на рынок области", type: "stage", target: 1, reward: 20000, icon: "✧", deadline: 25 },
    { id: "week20", title: "Двадцать недель", description: "Довести компанию до 20-й недели", type: "week", target: 20, reward: 15000, icon: "◷" }
  ];

  const FIRST_NAMES = ["Антон", "Марина", "Илья", "Ксения", "Дмитрий", "Ольга", "Роман", "Алина", "Павел", "Юлия", "Никита", "Ева", "Артём", "Полина", "Максим", "Дарья", "Сергей", "Вера"];
  const COMPETITOR_NAMES = ["МаркетПро", "БыстроМаркет", "Торговый Дом"];

  const ACHIEVEMENTS = [
    { id: "first_week", icon: "◷", name: "Первая смена", desc: "Закрыть первую неделю", check: s => s.stats.weeksPlayed >= 1 },
    { id: "cash100", icon: "₽", name: "Первая сотня", desc: "Касса 100 000 ₽", check: s => s.cash >= 100000 },
    { id: "cash500", icon: "💰", name: "Полмиллиона", desc: "Касса 500 000 ₽", check: s => s.cash >= 500000 },
    { id: "share10", icon: "↗", name: "Серьёзный игрок", desc: "Доля рынка 10%", check: s => s.share >= 10 },
    { id: "share25", icon: "🏆", name: "Четверть рынка", desc: "Доля рынка 25%", check: s => s.share >= 25 },
    { id: "team5", icon: "♙", name: "Большая команда", desc: "5 сотрудников", check: s => s.team.length >= 5 },
    { id: "tech_all", icon: "⌘", name: "Технологический лидер", desc: "Изучить все 12 технологий", check: s => s.completedTechs.length >= 12 },
    { id: "project_all", icon: "▤", name: "Мастер проектов", desc: "Завершить 6 проектов", check: s => s.completedProjects.length >= 6 },
    { id: "gambler3", icon: "🎲", name: "Азартный игрок", desc: "Выиграть 3 ставки", check: s => s.stats.gamblesWon >= 3 },
    { id: "lucky", icon: "⚡", name: "Фаворит фортуны", desc: "Выиграть ставку с шансом 45% или ниже", check: s => s.stats.luckyWin },
    { id: "eventful", icon: "✦", name: "Холодная голова", desc: "Решить 10 событий", check: s => s.stats.eventsResolved >= 10 },
    { id: "debt_free", icon: "🕊", name: "Без долгов", desc: "Взять кредит и полностью его погасить", check: s => s.stats.loansTaken >= 1 && s.loans.length === 0 },
    { id: "marathon", icon: "◷", name: "Марафонец", desc: "Дожить до 30-й недели", check: s => s.week >= 30 },
    { id: "victory", icon: "👑", name: "Легенда рынка", desc: "Победить в игре", check: s => s.phase === "victory" }
  ];

  // ============================== СЕЗОНЫ И ПРЕССА ==============================

  const SEASONS = [
    { id: "spring", name: "Весна", icon: "✿", demand: 1.02 },
    { id: "summer", name: "Лето", icon: "☀", demand: 0.97 },
    { id: "autumn", name: "Осень", icon: "🍂", demand: 1.03 },
    { id: "winter", name: "Зима", icon: "❄", demand: 1.06 }
  ];

  function getSeason(week) {
    return SEASONS[Math.floor(Math.max(0, week - 1) / 13) % SEASONS.length];
  }

  const NEWS_POOL = [
    "Эксперты: доставка за 15 минут станет новой нормой.",
    "Крупные сети готовятся к сезону распродаж.",
    "Тренд на локальные маркеты набирает обороты.",
    "Слухи: крупный инвестор ищет проект на рынке доставки.",
    "Рост онлайн-заказов продолжает удивлять аналитиков.",
    "Новые правила для курьеров обсуждают на федеральном уровне.",
    "Гигант ритейла открыл новый логистический центр.",
    "Потребители выбирают сервис с лучшей доставкой.",
    "Рынок труда: спрос на менеджеров доставки вырос.",
    "Новинка рынка: подписка на бесплатную доставку становится хитом.",
    "Городские власти упростили правила для курьеров.",
    "Аналитики предсказывают рекордный онлайн-сезон.",
    "Геймификация покупок — главный тренд сезона.",
    "Малый бизнес переходит в онлайн быстрее, чем ждали."
  ];

  const TUTORIAL_TIPS = [
    { min: 1, text: "Добро пожаловать! Кнопка «Завершить неделю» двигает время. Настройте комиссию и цену — они влияют на спрос и лояльность продавцов." },
    { min: 3, text: "Нанимайте и обучайте команду: продажи растят выручку, маркетинг — долю рынка, логистика — прибыль, IT снижает сбои." },
    { min: 5, text: "Раздел «Исследования» — технологии и проекты открывают подписки, бонусы спроса и «Экспансию» на новые рынки." },
    { min: 8, text: "Кредиты и рискованные ставки дают быстрые деньги, но читайте шансы и помните про платежи. Все правила — кнопка ❓ в шапке." },
    { min: 11, text: "Следите за дедлайнами целей и конкурентами на «Рынке». Для победы нужны: доля 22%, касса 250 000 ₽ и международный статус." }
  ];

  function makeNews(state, sharePrev, shareNext, pulse, seasonNow, seasonNext) {
    const items = [];
    if (seasonNow.id !== seasonNext.id) {
      items.push({ week: state.week, tone: "neutral", text: `Смена сезона: наступает «${seasonNext.name}» ${seasonNext.icon} — спрос ${seasonNext.demand > 1 ? "растёт" : "слегка ослабевает"}.` });
    } else if (pulse > 1.06) {
      items.push({ week: state.week, tone: "good", text: "Рынок оживился: покупатели активно заказывают доставку." });
    } else if (pulse < 0.94) {
      items.push({ week: state.week, tone: "bad", text: "Спрос просел: покупатели туже затягивают пояса." });
    } else if (shareNext > sharePrev + 0.05) {
      items.push({ week: state.week, tone: "good", text: `Ваша доля рынка подросла до ${shareNext.toFixed(1)}% — клиенты голосуют рублём.` });
    } else if (shareNext < sharePrev - 0.05) {
      items.push({ week: state.week, tone: "bad", text: `Доля рынка снизилась до ${shareNext.toFixed(1)}% — конкуренты не дремлют.` });
    } else {
      items.push({ week: state.week, tone: "neutral", text: pick(NEWS_POOL) });
    }
    items.push({ week: state.week, tone: "neutral", text: pick(NEWS_POOL) });
    return items;
  }

  // ============================== УТИЛИТЫ ==============================

  const money = value => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value))} ₽`;
  const number = value => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const esc = value => String(value).replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const pick = array => array[Math.floor(Math.random() * array.length)];

  const roleById = id => ROLES.find(role => role.id === id) || ROLES[0];
  const techById = id => TECHS.find(tech => tech.id === id);
  const projectById = id => PROJECTS.find(project => project.id === id);
  const eventById = id => EVENTS.find(event => event.id === id);
  const loanById = id => LOANS.find(loan => loan.id === id);
  const gambleById = id => GAMBLERS.find(item => item.id === id);
  const diffById = id => DIFFICULTIES.find(item => item.id === Number(id)) || DIFFICULTIES[1];

  // ============================== СОСТОЯНИЕ ==============================

  function makeMember(name, roleId, skill) {
    const role = roleById(roleId);
    return { id: `m${Math.random().toString(36).slice(2, 9)}`, name, role: roleId, skill, morale: 72, salary: role.salary + skill * 350 };
  }

  function makeCandidate() {
    return makeMember(pick(FIRST_NAMES), pick(ROLES).id, 1 + Math.floor(Math.random() * 3));
  }

  function initialState() {
    return {
      phase: "menu",
      difficulty: 2,
      companyName: "Лавка Плюс",
      week: 1,
      stage: 0,
      cash: 30000,
      reputation: 65,
      sellerLoyalty: 80,
      commission: 12,
      share: 4,
      marketPulse: 1,
      competitors: COMPETITOR_NAMES.map((name, index) => ({ id: `comp${index}`, name, weight: [0.45, 0.33, 0.22][index] })),
      team: [
        makeMember("Ольга", "seller_mgr", 2),
        makeMember("Антон", "logi", 2),
        makeMember("Ксения", "marketer", 1)
      ],
      candidates: [makeCandidate(), makeCandidate(), makeCandidate()],
      officeLevel: 1,
      researchPoints: 0,
      completedTechs: [],
      activeProjects: [],
      completedProjects: [],
      marketingWeeksLeft: 0,
      warehouseLevel: 1,
      couriers: 2,
      tempDemand: { weeks: 0, mult: 0 },
      loans: [],
      gambleWeek: -9,
      goalsDone: [],
      goalsMissed: [],
      achievements: [],
      muted: false,
      theme: "light",
      news: [],
      tutorialDismissed: false,
      helpOpen: false,
      collapsed: { achievements: true, log: true },
      floatFx: null,
      stats: { weeksPlayed: 0, bestWeekProfit: 0, totalRevenue: 0, gamblesWon: 0, gamblesPlayed: 0, eventsResolved: 0, loansTaken: 0, luckyWin: false },
      bankruptcyWeeks: 0,
      bestCash: 30000,
      bestShare: 4,
      event: null,
      history: [],
      lastReport: null,
      log: [],
      notice: "",
      activeView: "overview"
    };
  }

  // ============================== РАСЧЁТЫ ==============================

  const hasTech = (state, id) => state.completedTechs.includes(id);
  const hasProject = (state, id) => state.completedProjects.includes(id);

  function teamCap(state) {
    return 3 + state.officeLevel * 2;
  }

  function projectSlots(state) {
    return 1 + Math.floor(state.officeLevel / 2);
  }

  function teamSkill(state, roleId) {
    return state.team.filter(member => member.role === roleId).reduce((sum, member) => sum + member.skill, 0);
  }

  function moraleFactor(state) {
    const avg = state.team.length ? state.team.reduce((sum, member) => sum + member.morale, 0) / state.team.length : 70;
    return 0.65 + avg / 285;
  }

  function warehouseCapacity(state) {
    let capacity = 70 + (state.warehouseLevel - 1) * 45;
    if (hasTech(state, "robots")) capacity *= 1.2;
    if (hasProject(state, "new_warehouse")) capacity *= 1.4;
    return Math.round(capacity);
  }

  function courierCapacity(state) {
    let capacity = state.couriers * 22;
    if (hasTech(state, "own_fleet")) capacity *= 1.25;
    return Math.round(capacity);
  }

  function dailyCapacity(state) {
    const base = Math.min(warehouseCapacity(state), courierCapacity(state));
    return Math.round((base + 10) * (1 + teamSkill(state, "logi") * 0.02));
  }

  function demandMultiplier(state) {
    let mult = 1;
    if (hasTech(state, "express")) mult += 0.12;
    if (hasTech(state, "mobile_app")) mult += 0.18;
    if (hasTech(state, "mega_sales")) mult += 0.1;
    if (hasProject(state, "app_launch")) mult += 0.25;
    if (hasProject(state, "new_warehouse")) mult += 0.1;
    if (hasProject(state, "loyalty_club")) mult += 0.16;
    if (state.marketingWeeksLeft > 0) mult += hasTech(state, "brand") ? 0.39 : 0.3;
    if (state.tempDemand.weeks > 0) mult += state.tempDemand.mult;
    return mult;
  }

  function opsMultiplier(state) {
    let mult = 1;
    if (hasTech(state, "sort_center")) mult *= 0.85;
    if (hasTech(state, "own_fleet")) mult *= 0.9;
    if (hasTech(state, "robots")) mult *= 0.75;
    if (hasProject(state, "logistics_contract")) mult *= 0.8;
    mult *= Math.max(0.7, 1 - teamSkill(state, "logi") * 0.015);
    return mult;
  }

  function avgOrder(state) {
    return Math.round(3000 * (hasTech(state, "ai_recs") ? 1.1 : 1));
  }

  function weeklySalaries(state) {
    return state.team.reduce((sum, member) => sum + member.salary, 0);
  }

  function weeklyLoanPayments(state) {
    return state.loans.reduce((sum, loan) => sum + loan.weekly, 0);
  }

  function totalDebt(state) {
    return state.loans.reduce((sum, loan) => sum + loan.weekly * loan.weeksLeft, 0);
  }

  function researchPerWeek(state) {
    const raw = teamSkill(state, "dev") * 2.5 + teamSkill(state, "analyst") * 2 + (hasProject(state, "analytics_dept") ? 5 : 0);
    return Math.max(1, Math.round(raw * moraleFactor(state)));
  }

  function forecastDemand(state) {
    const stage = STAGES[state.stage];
    return Math.max(1, Math.round(stage.market * state.share / 100 * demandMultiplier(state) * state.marketPulse));
  }

  function marketShares(state) {
    const yourShare = clamp(state.share, 0, 90);
    const rest = 100 - yourShare;
    const totalWeight = state.competitors.reduce((sum, competitor) => sum + competitor.weight, 0) || 1;
    return [
      { name: "Вы", share: yourShare, you: true },
      ...state.competitors.map(competitor => ({ name: competitor.name, share: rest * competitor.weight / totalWeight }))
    ];
  }

  function hasSave(state) {
    return state.week > 1 || (state.history || []).length > 0;
  }

  // ============================== ЦЕЛИ ==============================

  function goalProgress(state, goal) {
    switch (goal.type) {
      case "profit": return state.lastReport && state.lastReport.profit > 0 ? 1 : 0;
      case "rp": return Math.floor(state.researchPoints);
      case "team": return state.team.length;
      case "projects": return state.completedProjects.length;
      case "share": return Math.floor(state.share);
      case "reputation": return Math.floor(state.reputation);
      case "techs": return state.completedTechs.length;
      case "cash": return Math.floor(state.cash);
      case "stage": return state.stage;
      case "week": return state.week;
      default: return 0;
    }
  }

  function pushLog(state, text, tone = "info") {
    return { ...state, log: [{ week: state.week, text, tone }, ...(state.log || [])].slice(0, 12) };
  }

  function awardGoals(state) {
    let next = state;
    // Сроки: цели с дедлайном, не выполненные вовремя, сгорают.
    const missed = new Set(state.goalsMissed);
    const doneSet = new Set(state.goalsDone);
    const expired = GOALS.filter(goal => goal.deadline && next.week > goal.deadline && !doneSet.has(goal.id) && !missed.has(goal.id));
    for (const goal of expired) {
      missed.add(goal.id);
      next = pushLog(next, `Срок цели «${goal.title}» истёк — награда сгорела.`, "bad");
    }
    const fresh = GOALS.filter(goal => !doneSet.has(goal.id) && !missed.has(goal.id) && goalProgress(next, goal) >= goal.target);
    if (!fresh.length) {
      return expired.length ? { ...next, goalsMissed: [...missed] } : next;
    }
    const reward = fresh.reduce((sum, goal) => sum + goal.reward, 0);
    const names = fresh.map(goal => `«${goal.title}»`).join(", ");
    next = pushLog({
      ...next,
      cash: next.cash + reward,
      goalsDone: [...next.goalsDone, ...fresh.map(goal => goal.id)],
      goalsMissed: [...missed],
      notice: `Цель выполнена: ${names}. Награда — ${money(reward)}!`
    }, `Выполнены цели: ${names}. Награда ${money(reward)}.`, "good");
    return next;
  }

  // ============================== ДОСТИЖЕНИЯ ==============================

  function checkAchievements(state) {
    const unlocked = new Set(state.achievements || []);
    const fresh = ACHIEVEMENTS.filter(item => !unlocked.has(item.id) && item.check(state));
    if (!fresh.length) return state.achievements ? state : { ...state, achievements: [] };
    const names = fresh.map(item => `«${item.name}»`).join(", ");
    const next = {
      ...state,
      achievements: [...(state.achievements || []), ...fresh.map(item => item.id)],
      notice: `${state.notice ? `${state.notice} ` : ""}🏅 Достижение: ${names}!`
    };
    return pushLog(next, `🏅 Открыто достижение: ${names}.`, "good");
  }

  // ============================== СОБЫТИЯ И ЭФФЕКТЫ ==============================

  function applyEffects(state, effects) {
    const next = { ...state };
    if (effects.cash) next.cash = state.cash + effects.cash;
    if (effects.reputation) next.reputation = clamp(state.reputation + effects.reputation, 0, 100);
    if (effects.loyalty) next.sellerLoyalty = clamp(state.sellerLoyalty + effects.loyalty, 0, 100);
    if (effects.share) next.share = clamp(state.share + effects.share, 0.5, 90);
    if (effects.rp) next.researchPoints = Math.max(0, state.researchPoints + effects.rp);
    if (effects.morale) next.team = state.team.map(member => ({ ...member, morale: clamp(member.morale + effects.morale, 0, 100) }));
    if (effects.demandWeeks) {
      const weeks = Math.max(state.tempDemand.weeks, effects.demandWeeks);
      next.tempDemand = { weeks, mult: state.tempDemand.mult + effects.demandMult };
    }
    return next;
  }

  // ============================== REDUCER ==============================

  function gameReducer(state, action, payload = {}) {
    if (action === "CLEAR_NOTICE") return { ...state, notice: "" };
    if (action === "SHOW_NOTICE") return { ...state, notice: String(payload.text || "") };

    if (action === "TOGGLE_MUTE") return { ...state, muted: !state.muted };
    if (action === "TOGGLE_THEME") return { ...state, theme: state.theme === "dark" ? "light" : "dark" };
    if (action === "TOGGLE_HELP") return { ...state, helpOpen: !state.helpOpen };
    if (action === "DISMISS_TUTORIAL") return { ...state, tutorialDismissed: true };
    if (action === "TOGGLE_SECTION") {
      const key = String(payload.key || "");
      if (key !== "achievements" && key !== "log") return state;
      const collapsed = { ...(state.collapsed || {}) };
      collapsed[key] = collapsed[key] === false;
      return { ...state, collapsed };
    }

    if (action === "SET_DIFFICULTY") {
      return { ...state, difficulty: diffById(payload.id).id };
    }

    if (action === "SET_NAME") {
      const name = String(payload.value || "").trim().slice(0, 24);
      return { ...state, companyName: name || "Лавка Плюс" };
    }

    if (action === "NEW_GAME") {
      const fresh = initialState();
      const diff = diffById(state.difficulty);
      return pushLog({
        ...fresh,
        phase: "playing",
        difficulty: diff.id,
        companyName: state.companyName || "Лавка Плюс",
        cash: diff.cash,
        bestCash: diff.cash,
        log: []
      }, `Компания «${state.companyName || "Лавка Плюс"}» вышла на рынок. Сложность: ${diff.name}. Удачи!`, "good");
    }

    if (action === "CONTINUE") {
      return { ...state, phase: "playing", notice: `С возвращением! Продолжаем с недели ${state.week}.` };
    }

    if (action === "TO_MENU") return { ...initialState(), difficulty: state.difficulty, companyName: state.companyName };

    if (action === "NAV") {
      const view = VIEWS.some(item => item.id === payload.view) ? payload.view : "overview";
      return { ...state, activeView: view, notice: "" };
    }

    if (action === "RESET") return initialState();

    if (action === "SET_COMMISSION") {
      const value = clamp(Math.round(Number(payload.value) || state.commission), 8, 22);
      return { ...state, commission: value, notice: `Комиссия площадки — ${value}%.` };
    }

    if (action === "EVENT_CHOICE") {
      const event = state.event ? eventById(state.event.id) : null;
      if (!event) return state;
      const choice = event.choices[Number(payload.index) || 0];
      if (!choice) return state;
      let next = { ...state, event: null };
      next = { ...next, stats: { ...next.stats, eventsResolved: (next.stats.eventsResolved || 0) + 1 } };
      if (choice.chance) {
        const roll = Math.random();
        if (roll < choice.chance.p) {
          next = applyEffects(next, choice.chance.ok || {});
          next = pushLog(next, `«${event.title}»: ${choice.label} — удача! ${choice.chance.okText}`, "good");
          next.notice = `Удача на вашей стороне: ${choice.chance.okText}`;
          next.floatFx = { text: choice.chance.okText, tone: "good" };
        } else {
          next = applyEffects(next, choice.chance.fail || {});
          next = pushLog(next, `«${event.title}»: ${choice.label} — не вышло. ${choice.chance.failText}`, "bad");
          next.notice = `Риск не оправдался: ${choice.chance.failText}`;
          next.floatFx = { text: choice.chance.failText, tone: "bad" };
        }
      } else {
        next = applyEffects(next, choice.effects || {});
        const moneyHint = choice.effects && choice.effects.cash ? ` (${money(choice.effects.cash)})` : "";
        next = pushLog(next, `Событие «${event.title}»: ${choice.label}${moneyHint}.`, "event");
        next.notice = `Решение принято: ${choice.label}.`;
        if (choice.effects && choice.effects.cash) next.floatFx = { text: `${choice.effects.cash > 0 ? "+" : "−"}${money(Math.abs(choice.effects.cash))}`, tone: choice.effects.cash > 0 ? "good" : "bad" };
      }
      return awardGoals(next);
    }

    if (action === "TAKE_LOAN") {
      const loan = loanById(payload.id);
      if (!loan) return state;
      if (state.loans.some(item => item.id === loan.id)) return { ...state, notice: "Этот кредит уже активен." };
      if (state.loans.length >= 2) return { ...state, notice: "Одновременно можно иметь не более двух кредитов." };
      if (state.share < loan.minShare) return { ...state, notice: `Для этого финансирования нужно ${loan.minShare}% доли рынка.` };
      return pushLog({
        ...state,
        cash: state.cash + loan.amount,
        loans: [...state.loans, { id: loan.id, weekly: loan.weekly, weeksLeft: loan.weeks }],
        stats: { ...state.stats, loansTaken: (state.stats.loansTaken || 0) + 1 },
        notice: `${loan.name}: +${money(loan.amount)} на счёт. Платёж ${money(loan.weekly)} еженедельно, ${loan.weeks} нед.`
      }, `Взят ${loan.name.toLowerCase()} на ${money(loan.amount)}.`, "event");
    }

    if (action === "TAKE_GAMBLE") {
      const gamble = gambleById(payload.id);
      if (!gamble) return state;
      if (state.week - state.gambleWeek < 2) return { ...state, notice: `Ставки доступны раз в две недели. Подождите ещё ${2 - (state.week - state.gambleWeek)} нед.` };
      if (state.cash < gamble.stake) return { ...state, notice: `Не хватает средств: ставка ${money(gamble.stake)}.` };
      let next = { ...state, cash: state.cash - gamble.stake, gambleWeek: state.week };
      next = { ...next, stats: { ...next.stats, gamblesPlayed: (next.stats.gamblesPlayed || 0) + 1 } };
      const win = Math.random() < gamble.p;
      if (win) {
        next = applyEffects(next, gamble.ok || {});
        next = pushLog(next, `Ставка «${gamble.name}» сыграла! ${gamble.okText}.`, "good");
        next.notice = `Азарт вознаграждён: ${gamble.okText}!`;
        next.floatFx = { text: gamble.okText, tone: "good" };
        next.stats = { ...next.stats, gamblesWon: (next.stats.gamblesWon || 0) + 1, luckyWin: next.stats.luckyWin || gamble.p <= 0.45 };
      } else {
        next = applyEffects(next, gamble.fail || {});
        next = pushLog(next, `Ставка «${gamble.name}» не сыграла. ${gamble.failText}.`, "bad");
        next.notice = `Не повезло: ${gamble.failText}.`;
        next.floatFx = { text: gamble.failText, tone: "bad" };
      }
      return awardGoals(next);
    }

    if (action === "HIRE") {
      const candidate = state.candidates.find(item => item.id === payload.id);
      if (!candidate) return state;
      if (state.team.length >= teamCap(state)) return { ...state, notice: `Офис заполнен: расширьте офис, чтобы нанять больше людей (лимит ${teamCap(state)}).` };
      const signing = candidate.salary * 2;
      if (state.cash < signing) return { ...state, notice: `Не хватает средств: подписание стоит ${money(signing)}.` };
      const role = roleById(candidate.role);
      return pushLog({
        ...state,
        cash: state.cash - signing,
        team: [...state.team, candidate],
        candidates: state.candidates.map(item => item.id === payload.id ? makeCandidate() : item),
        notice: `${candidate.name} принят(а) на должность «${role.name}».`
      }, `Новый сотрудник: ${candidate.name} (${role.name}).`, "good");
    }

    if (action === "FIRE") {
      const member = state.team.find(item => item.id === payload.id);
      if (!member) return state;
      const severance = member.salary * 2;
      return pushLog({
        ...state,
        cash: state.cash - severance,
        team: state.team.filter(item => item.id !== payload.id).map(item => ({ ...item, morale: clamp(item.morale - 5, 0, 100) })),
        notice: `${member.name} уволен(а). Выходное пособие — ${money(severance)}, мораль команды снизилась.`
      }, `${member.name} покинул(а) команду.`, "bad");
    }

    if (action === "TRAIN") {
      const member = state.team.find(item => item.id === payload.id);
      if (!member) return state;
      if (member.skill >= 8) return { ...state, notice: `${member.name} уже достиг(ла) высшего уровня мастерства.` };
      const cost = 6000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: обучение стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        team: state.team.map(item => item.id === payload.id ? { ...item, skill: item.skill + 1, morale: clamp(item.morale + 2, 0, 100) } : item),
        notice: `${member.name} прошёл(ла) обучение: навык повышен.`
      }, `Обучение: ${member.name} теперь навык ${member.skill + 1}.`, "good");
    }

    if (action === "PAY_BONUS") {
      const cost = 4000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: премия стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        team: state.team.map(item => ({ ...item, morale: clamp(item.morale + 10, 0, 100) })),
        notice: "Премия выплачена: мораль команды выросла."
      }, "Выплачена премия всей команде.", "good");
    }

    if (action === "TEAMBUILDING") {
      const cost = 6000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: тимбилдинг стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        team: state.team.map(item => ({ ...item, morale: clamp(item.morale + 15, 0, 100) })),
        sellerLoyalty: clamp(state.sellerLoyalty + 2, 0, 100),
        notice: "Тимбилдинг прошёл отлично: мораль и лояльность выросли."
      }, "Командный отдых: мораль +15.", "good");
    }

    if (action === "UPGRADE_OFFICE") {
      if (state.officeLevel >= 5) return { ...state, notice: "Офис уже максимального уровня." };
      const cost = 18000 + state.officeLevel * 12000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: расширение офиса стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        officeLevel: state.officeLevel + 1,
        notice: `Офис расширен до уровня ${state.officeLevel + 1}. Лимит команды: ${3 + (state.officeLevel + 1) * 2}, слотов проектов: ${1 + Math.floor((state.officeLevel + 1) / 2)}.`
      }, `Офис расширен до уровня ${state.officeLevel + 1}.`, "good");
    }

    if (action === "UPGRADE_WAREHOUSE") {
      if (state.warehouseLevel >= 8) return { ...state, notice: "Склад уже максимального уровня." };
      const cost = 26000 + state.warehouseLevel * 16000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: улучшение склада стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        warehouseLevel: state.warehouseLevel + 1,
        notice: `Склад улучшен до уровня ${state.warehouseLevel + 1}.`
      }, `Склад уровня ${state.warehouseLevel + 1}.`, "good");
    }

    if (action === "HIRE_COURIER") {
      if (state.couriers >= 14) return { ...state, notice: "Курьерская команда уже максимального размера." };
      const cost = 9000 + Math.max(0, state.couriers - 2) * 3500;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: новый курьер стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        couriers: state.couriers + 1,
        notice: `Нанят курьер. В команде доставки: ${state.couriers + 1}.`
      }, `Курьеров в команде: ${state.couriers + 1}.`, "good");
    }

    if (action === "START_CAMPAIGN") {
      if (state.marketingWeeksLeft > 0) return { ...state, notice: `Кампания уже идёт: осталось ${state.marketingWeeksLeft} нед.` };
      const cost = 12000;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: кампания стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        marketingWeeksLeft: 3,
        notice: "Маркетинговая кампания запущена на 3 недели."
      }, "Запущена маркетинговая кампания (3 недели).", "good");
    }

    if (action === "BUY_TECH") {
      const tech = techById(payload.id);
      if (!tech || state.completedTechs.includes(tech.id)) return state;
      const missing = tech.requires.filter(id => !state.completedTechs.includes(id));
      if (missing.length) return { ...state, notice: "Сначала изучите предыдущие технологии." };
      if (state.researchPoints < tech.rp) return { ...state, notice: `Не хватает очков исследований: нужно ${tech.rp}, есть ${Math.floor(state.researchPoints)}.` };
      if (state.cash < tech.money) return { ...state, notice: `Не хватает средств: технология стоит ${money(tech.money)}.` };
      return pushLog({
        ...state,
        cash: state.cash - tech.money,
        researchPoints: state.researchPoints - tech.rp,
        completedTechs: [...state.completedTechs, tech.id],
        notice: `Технология «${tech.name}» изучена: ${tech.effectText}.`
      }, `Изучена технология «${tech.name}».`, "good");
    }

    if (action === "START_PROJECT") {
      const project = projectById(payload.id);
      if (!project || (!project.isExpansion && state.completedProjects.includes(project.id))) return state;
      if (state.activeProjects.some(item => item.id === project.id)) return { ...state, notice: "Этот проект уже идёт." };
      if (state.activeProjects.length >= projectSlots(state)) return { ...state, notice: `Все слоты проектов заняты (${projectSlots(state)}). Расширьте офис или дождитесь завершения.` };
      const missing = project.requires.filter(id => !state.completedTechs.includes(id));
      if (missing.length) return { ...state, notice: "Проект требует изучить технологии: " + missing.map(id => techById(id) ? techById(id).name : id).join(", ") + "." };
      if (project.isExpansion) {
        if (state.stage >= STAGES.length - 1) return { ...state, notice: "Вы уже на крупнейшем рынке." };
        if (state.share < 15) return { ...state, notice: `Для экспансии нужно не менее 15% доли рынка (сейчас ${state.share.toFixed(1)}%).` };
      }
      const cost = project.isExpansion ? STAGES[state.stage].expandCost : project.cost;
      if (state.cash < cost) return { ...state, notice: `Не хватает средств: проект стоит ${money(cost)}.` };
      return pushLog({
        ...state,
        cash: state.cash - cost,
        activeProjects: [...state.activeProjects, { id: project.id, weeksDone: 0, weeksTotal: project.weeks }],
        notice: `Проект «${project.name}» запущен: ${project.weeks} нед.`
      }, `Запущен проект «${project.name}».`, "good");
    }

    if (action === "END_WEEK") {
      if (state.event) return { ...state, notice: "Сначала примите решение по событию недели." };
      const diff = diffById(state.difficulty);

      // --- волатильность рынка ---
      const marketPulse = 1 + (Math.random() - 0.5) * 0.22 * diff.vol;
      const marketTotal = STAGES[state.stage].market;
      const dMult = demandMultiplier(state);
      const cap = dailyCapacity(state);

      // --- динамика доли рынка ---
      const marketerBoost = teamSkill(state, "marketer") * 0.02;
      const commissionAttract = (15 - state.commission) * 0.02;
      const repAttract = clamp((state.reputation - 65) * 0.018, -0.35, 0.35);
      let shareDrift = 0.08 + repAttract + commissionAttract + marketerBoost + (hasTech(state, "exclusives") ? 0.22 : 0) + (Math.random() * 0.5 - 0.2);
      if (state.marketingWeeksLeft > 0) shareDrift += 0.25;
      if (state.share < 2) shareDrift += 0.3;

      // --- агрессия конкурентов ---
      const aggressionLog = [];
      if (Math.random() < diff.aggression) {
        const attacker = pick(state.competitors);
        const hit = 0.2 + Math.random() * 0.4;
        shareDrift -= hit;
        aggressionLog.push(`${attacker.name} атакует: промо-кампания отбивает ${hit.toFixed(1)}% доли.`);
      } else if (Math.random() < 0.15) {
        const victim = pick(state.competitors);
        shareDrift += 0.45;
        aggressionLog.push(`${victim.name} споткнулся о скандал — покупатели уходят к вам.`);
      }

      const share = clamp(state.share + shareDrift, 0.5, 90);

      // --- спрос и выполнение ---
      const seasonMult = getSeason(state.week).demand;
      const demand = Math.max(1, Math.round(marketTotal * share / 100 * dMult * marketPulse * seasonMult * (0.92 + Math.random() * 0.16)));
      const fulfilled = Math.min(demand, cap);
      const lost = Math.max(0, demand - fulfilled);
      const fillRate = demand > 0 ? fulfilled / demand : 1;

      // --- финансы ---
      const commissionRevenue = Math.round(fulfilled * avgOrder(state) * state.commission / 100);
      const servicesRevenue = Math.round(state.sellerLoyalty * 55 * (1 + state.officeLevel * 0.05));
      const subscriptionRevenue = hasProject(state, "subscription") ? Math.round(2500 + share * 1200 + state.reputation * 30) : 0;
      const revenue = commissionRevenue + servicesRevenue + subscriptionRevenue;

      const salaries = weeklySalaries(state);
      const rent = 800 + state.officeLevel * 1200;
      const ops = Math.round(fulfilled * 42 * opsMultiplier(state));
      const marketingUpkeep = state.marketingWeeksLeft > 0 ? 2500 : 0;
      const projectUpkeep = state.activeProjects.length * 1000;
      const loanPayments = weeklyLoanPayments(state);
      const costs = salaries + rent + ops + marketingUpkeep + projectUpkeep + loanPayments;
      const profit = revenue - costs;

      // --- кредиты ---
      const loans = state.loans
        .map(loan => ({ ...loan, weeksLeft: loan.weeksLeft - 1 }))
        .filter(loan => loan.weeksLeft > 0);

      // --- очки исследований ---
      const rpGain = researchPerWeek(state);

      // --- дрейф показателей ---
      let reputation = state.reputation + (fillRate >= 0.98 ? 1 : fillRate >= 0.9 ? 0 : fillRate >= 0.75 ? -1 : -2);
      if (hasTech(state, "express")) reputation += 0.5;
      if (hasTech(state, "reviews")) reputation += 0.5;
      if (hasProject(state, "loyalty_club")) reputation += 0.5;
      reputation = clamp(reputation, 0, 100);

      let loyalty = state.sellerLoyalty;
      if (state.commission >= 17) loyalty -= 2;
      else if (state.commission >= 15) loyalty -= 1;
      else if (state.commission <= 10) loyalty += 1;
      if (hasTech(state, "partner_program")) loyalty += 1;
      loyalty += teamSkill(state, "seller_mgr") * 0.15;
      if (fillRate < 0.85) loyalty -= 1;
      loyalty = clamp(loyalty, 0, 100);

      const moraleDelta = profit > 1000 ? 1 : profit < -2000 ? -3 : 0;
      const team = state.team.map(member => ({ ...member, morale: clamp(member.morale + moraleDelta, 0, 100) }));

      // --- проекты ---
      let completedProjects = state.completedProjects;
      const activeProjects = [];
      const finishedNames = [];
      let stageAfter = state.stage;
      let bonusShare = 0;
      let bonusDemand = null;
      for (const item of state.activeProjects) {
        const project = projectById(item.id);
        const done = item.weeksDone + 1 >= item.weeksTotal;
        if (done) {
          if (item.id !== "expansion") completedProjects = [...completedProjects, item.id];
          finishedNames.push(project ? project.name : item.id);
          if (item.id === "expansion") {
            stageAfter = Math.min(state.stage + 1, STAGES.length - 1);
            bonusShare += 1;
          }
          if (item.id === "app_launch") bonusShare += 1;
          if (item.id === "ad_blitz") {
            bonusShare += 1;
            bonusDemand = { weeks: 4, mult: 0.2 };
          }
        } else {
          activeProjects.push({ ...item, weeksDone: item.weeksDone + 1 });
        }
      }

      // --- конкуренты: дрейф весов ---
      const competitors = state.competitors.map(competitor => {
        const weight = clamp(competitor.weight * (0.97 + Math.random() * 0.06), 0.1, 1);
        return { ...competitor, weight, mood: weight >= competitor.weight ? "up" : "down" };
      });

      // --- событие недели ---
      let event = null;
      if (state.week >= 2 && Math.random() < diff.eventChance) {
        event = { id: pick(EVENTS).id };
      }

      const cashAfter = state.cash + profit;
      const bankruptcyWeeks = cashAfter < 0 ? state.bankruptcyWeeks + 1 : 0;
      const shareAfter = clamp(share + bonusShare, 0.5, 90);
      const tempDemandAfter = bonusDemand
        ? { weeks: Math.max(state.tempDemand.weeks, bonusDemand.weeks), mult: state.tempDemand.mult + bonusDemand.mult }
        : (state.tempDemand.weeks > 0 ? { weeks: state.tempDemand.weeks - 1, mult: state.tempDemand.mult } : state.tempDemand);
      const statsAfter = {
        ...state.stats,
        weeksPlayed: (state.stats.weeksPlayed || 0) + 1,
        bestWeekProfit: Math.max(state.stats.bestWeekProfit || 0, profit),
        totalRevenue: (state.stats.totalRevenue || 0) + revenue
      };

      const report = {
        week: state.week,
        demand, fulfilled, lost,
        revenue, costs, profit,
        streams: { commission: commissionRevenue, services: servicesRevenue, subscription: subscriptionRevenue },
        breakdown: { salaries, rent, ops, marketing: marketingUpkeep, projects: projectUpkeep, loans: loanPayments },
        fillRate: Math.round(fillRate * 100),
        share, shareChange: share - state.share,
        marketPulse,
        rpGain
      };

      let next = {
        ...state,
        week: state.week + 1,
        cash: cashAfter,
        share: shareAfter,
        stage: stageAfter,
        marketPulse,
        reputation, sellerLoyalty: loyalty, team,
        competitors,
        loans,
        researchPoints: state.researchPoints + rpGain,
        activeProjects,
        completedProjects,
        marketingWeeksLeft: Math.max(0, state.marketingWeeksLeft - 1),
        tempDemand: tempDemandAfter,
        bankruptcyWeeks,
        stats: statsAfter,
        news: makeNews(state, state.share, shareAfter, marketPulse, getSeason(state.week), getSeason(state.week + 1)).concat(state.news || []).slice(0, 8),
        floatFx: { text: `${profit >= 0 ? "+" : "−"}${money(Math.abs(profit))}`, tone: profit >= 0 ? "good" : "bad" },
        bestCash: Math.max(state.bestCash || 0, cashAfter),
        bestShare: Math.max(state.bestShare || 0, shareAfter),
        lastReport: report,
        history: [...state.history, { week: state.week, revenue, profit, share: shareAfter, demand, fulfilled }].slice(-8),
        event
      };

      const sign = profit >= 0 ? "+" : "−";
      next = pushLog(next, `Неделя ${report.week}: выполнено ${number(fulfilled)} из ${number(demand)} заказов, итог ${sign}${money(Math.abs(profit))}${loanPayments ? ` (кредиты −${money(loanPayments)})` : ""}.`, profit >= 0 ? "good" : "bad");
      for (const name of finishedNames) {
        next = pushLog(next, `Проект «${name}» завершён!`, "good");
      }
      if (stageAfter > state.stage) {
        next = pushLog(next, `Экспансия завершена: вы вышли на рынок «${STAGES[stageAfter].name}»! Оборот рынка вырос в ${(STAGES[stageAfter].market / STAGES[state.stage].market).toFixed(1)} раз.`, "good");
      }
      for (const line of aggressionLog) {
        next = pushLog(next, line, "event");
      }
      next.notice = `Неделя ${report.week} закрыта: прибыль ${sign}${money(Math.abs(profit))}. Рынок ${(marketPulse - 1) * 100 >= 0 ? "+" : "−"}${Math.abs((marketPulse - 1) * 100).toFixed(0)}%.`;
      next = awardGoals(next);

      // --- банкротство и победа ---
      if (next.cash < -80000 || next.bankruptcyWeeks >= 3) {
        return pushLog({ ...next, phase: "gameover", event: null }, "Компания обанкротилась.", "bad");
      }
      if (next.stage >= STAGES.length - 1 && next.share >= 22 && next.cash >= 250000) {
        return pushLog({ ...next, phase: "victory", event: null }, "Империя построена!", "good");
      }
      return next;
    }

    return state;
  }

  function reducer(state, action, payload = {}) {
    const next = gameReducer(state, action, payload);
    if (!next || next === state) return next;
    return checkAchievements(next);
  }

  // ============================== UI: ОБЩЕЕ ==============================

  function navButton(item, activeView) {
    return `<button class="nav-link ${activeView === item.id ? "active" : ""}" data-action="NAV" data-view="${item.id}" aria-current="${activeView === item.id ? "page" : "false"}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span><span class="nav-chevron">›</span>
    </button>`;
  }

  function renderShell(state, content) {
    const activeTitle = (VIEWS.find(item => item.id === state.activeView) || VIEWS[0]).label;
    const fullscreenLabel = typeof document !== "undefined" && document.fullscreenElement ? "Выйти из полного экрана" : "На весь экран";
    const diff = diffById(state.difficulty);
    const debt = weeklyLoanPayments(state);
    const season = getSeason(state.week);
    return `<div class="game-shell">
      <aside class="sidebar">
        <div class="brand-row">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div><div class="brand-name">СВОЙ МАРКЕТ</div><div class="brand-subtitle">тайкун: симулятор платформы</div></div>
        </div>
        <div class="company-card">
          <div class="company-avatar">С</div>
          <div class="company-copy"><span>ВАША КОМПАНИЯ</span><strong>${esc(state.companyName)}</strong></div>
          <span class="company-dots" aria-hidden="true">···</span>
        </div>
        <div class="nav-caption">УПРАВЛЕНИЕ</div>
        <nav class="side-nav" aria-label="Разделы игры">${VIEWS.map(item => navButton(item, state.activeView)).join("")}</nav>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-tip">
          <div class="tip-icon">✦</div>
          <div><strong>Совет</strong><p>${state.cash < 10000 ? "Касса на нуле? Кредит или рискованная ставка могут спасти — но помните про риск." : "Следите за дедлайнами целей: сгоревшая награда — больно для бюджета."}</p></div>
        </div>
        <div class="sidebar-bottom">
          <div class="save-status"><span class="status-dot"></span><span>Сохранение включено</span></div>
          <button class="reset-button" data-action="RESET">↻ <span>Новая игра</span></button>
          <div class="engine-stamp">MINI TYCOON ENGINE <span>v0.5</span></div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div class="breadcrumbs"><span>${esc(state.companyName)}</span><span class="crumb-divider">/</span><strong>${esc(activeTitle)}</strong></div>
          <div class="topbar-right">
            <button class="topbar-tool" data-action="OPEN_TAB" title="Открыть игру в отдельной вкладке" aria-label="Открыть игру в отдельной вкладке"><span class="tool-icon">↗</span><span class="tool-label">В отдельную вкладку</span></button>
            <button class="topbar-tool fullscreen-tool" data-action="TOGGLE_FULLSCREEN" title="${fullscreenLabel}" aria-label="${fullscreenLabel}"><span class="tool-icon">⛶</span><span class="tool-label">${fullscreenLabel}</span></button>
            ${debt ? `<span class="city-pill debt-pill"><span class="city-dot debt"></span>ДОЛГ ${money(debt)}/НЕД</span>` : ""}
            <span class="city-pill stage-chip"><span class="city-dot"></span>${esc(STAGES[state.stage].name.toUpperCase())} · ${esc(diff.name.toUpperCase())}</span>
            <span class="city-pill season-chip" title="Сезон влияет на спрос">${season.icon} ${esc(season.name.toUpperCase())}</span>
            <span class="day-pill">НЕДЕЛЯ ${String(state.week).padStart(2, "0")}</span>
            <button class="topbar-tool" data-action="TOGGLE_HELP" title="Правила и подсказки" aria-label="Правила и подсказки"><span class="tool-icon">❓</span></button>
            <button class="topbar-tool" data-action="TOGGLE_THEME" title="${state.theme === "dark" ? "Светлая тема" : "Тёмная тема"}" aria-label="${state.theme === "dark" ? "Светлая тема" : "Тёмная тема"}"><span class="tool-icon">${state.theme === "dark" ? "☀" : "🌙"}</span></button>
            <button class="topbar-tool" data-action="TOGGLE_MUTE" title="${state.muted ? "Включить звук" : "Выключить звук"}" aria-label="${state.muted ? "Включить звук" : "Выключить звук"}"><span class="tool-icon">${state.muted ? "🔇" : "🔊"}</span></button>
            <div class="profile-avatar">Л</div>
          </div>
        </header>
        ${state.floatFx ? `<div class="float-fx ${esc(state.floatFx.tone)}" aria-hidden="true">${esc(state.floatFx.text)}</div>` : ""}
        <div class="page-content">
          ${state.bankruptcyWeeks > 0 ? `<div class="notice danger-notice" role="alert"><span class="notice-symbol">⚠</span><p><strong>Касса в минусе!</strong> Если баланс не восстановится за ${3 - state.bankruptcyWeeks} нед. — компания обанкротится.</p></div>` : ""}
          ${state.notice ? `<div class="notice" role="status"><span class="notice-symbol">✦</span><p>${esc(state.notice)}</p><button data-action="CLEAR_NOTICE" aria-label="Закрыть уведомление">×</button></div>` : ""}
          ${content}
          <footer class="page-footer"><span>СВОЙ МАРКЕТ · ТАЙКУН · ГЛУБОКАЯ СИМУЛЯЦИЯ</span><span>Игра сохраняется автоматически в этом браузере</span></footer>
        </div>
        <div class="action-dock" role="region" aria-label="Панель действий">
          <div class="dock-stats">
            <span class="dock-stat"><i>₽</i>${money(state.cash)}</span>
            <span class="dock-stat"><i>↗</i>${state.share.toFixed(1)}%</span>
            <span class="dock-stat"><i>✦</i>${Math.round(state.reputation)}</span>
            ${state.event ? `<span class="dock-alert">⚡ Событие!</span>` : ""}
          </div>
          <button class="dock-button" data-action="END_WEEK">Завершить неделю <span>→</span></button>
        </div>
      </main>
    </div>`;
  }

  function pageHeading(kicker, title, description, action = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${action ? `<div class="heading-action">${action}</div>` : ""}</div>`;
  }

  function metricCard(icon, label, value, note, tone = "green", sparkValues = null) {
    return `<article class="metric-card tone-${tone}"><div class="metric-top"><span class="metric-icon ${tone}">${icon}</span><span class="metric-note">${note}</span></div><div class="metric-label">${label}</div><div class="metric-value">${value}</div>${sparkValues && sparkValues.length > 1 ? `<div class="metric-spark">${sparkline(sparkValues)}</div>` : ""}</article>`;
  }

  function sparkline(values) {
    const w = 120, h = 30, pad = 3;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(1, max - min);
    const pts = values.map((value, index) => [
      values.length > 1 ? index * (w / (values.length - 1)) : w / 2,
      h - pad - ((value - min) / range) * (h - pad * 2)
    ]);
    const path = pts.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${path} L${w},${h} L0,${h} Z" fill="rgba(108,77,255,0.09)" stroke="none"/>
      <path d="${path}" fill="none" stroke="rgba(108,77,255,0.75)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function renderRing(percent, centerValue, centerLabel) {
    const radius = 62, circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - clamp(percent, 0, 100) / 100);
    return `<div class="ring-wrap"><div class="ring-holder">
      <svg class="ring-svg" viewBox="0 0 158 158" aria-hidden="true">
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2dd4a7"/><stop offset="1" stop-color="#6c4dff"/>
          </linearGradient>
        </defs>
        <circle class="ring-track" cx="79" cy="79" r="${radius}"/>
        <circle class="ring-value" cx="79" cy="79" r="${radius}"
          style="stroke-dasharray:${circumference.toFixed(1)};stroke-dashoffset:${offset.toFixed(1)};--ring-len:${circumference.toFixed(1)}"/>
      </svg>
      <div class="ring-center"><strong>${centerValue}</strong><span>${centerLabel}</span></div>
    </div></div>`;
  }

  function renderChart(state) {
    const values = state.history.slice(-7);
    const hasData = values.length > 0;
    const W = 560, H = 196, padX = 16, padTop = 14, padBottom = 30;
    const revenues = values.map(item => item.revenue);
    const max = Math.max(...revenues, 1);
    const step = values.length > 1 ? (W - padX * 2) / (values.length - 1) : 0;
    const points = values.map((item, index) => [
      values.length > 1 ? padX + index * step : W / 2,
      padTop + (1 - item.revenue / max) * (H - padTop - padBottom)
    ]);
    const linePath = points.map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
    const areaPath = points.length
      ? `${linePath} L${points[points.length - 1][0].toFixed(1)},${H - padBottom} L${points[0][0].toFixed(1)},${H - padBottom} Z`
      : "";
    const grid = [0, 1, 2].map(index => {
      const y = padTop + index * ((H - padTop - padBottom) / 2);
      return `<line class="grid-line" x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}"/>`;
    }).join("");
    return `<div class="chart-wrap">
      ${!hasData ? `<div class="chart-empty"><span>↗</span><strong>Пока нет статистики</strong><p>Завершите первую неделю — и здесь появится выручка.</p></div>` : ""}
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Выручка по неделям">
        <defs>
          <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#6c4dff"/><stop offset="1" stop-color="#8b5cf6"/>
          </linearGradient>
          <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(108,77,255,0.28)"/><stop offset="1" stop-color="rgba(108,77,255,0.01)"/>
          </linearGradient>
        </defs>
        ${grid}
        ${hasData ? `
          <path class="area-fill" d="${areaPath}" fill="url(#chartArea)" stroke="none"/>
          <path class="line-path" d="${linePath}"/>
          ${points.map((point, index) => `<circle class="point-dot ${index === points.length - 1 ? "last" : ""}" cx="${point[0].toFixed(1)}" cy="${point[1].toFixed(1)}" r="${index === points.length - 1 ? 5.5 : 4}"><title>Неделя ${values[index].week}: ${money(values[index].revenue)}</title></circle>`).join("")}
          ${values.map((item, index) => `<text class="bar-label" x="${points[index][0].toFixed(1)}" y="${H - 8}" text-anchor="middle">Н${item.week}</text>`).join("")}
        ` : ""}
      </svg>
    </div>`;
  }

  // ============================== ЭКРАН ПРИВЕТСТВИЯ ==============================

  function renderMenu(state) {
    const diff = diffById(state.difficulty);
    const showContinue = hasSave(state);
    return `<div class="menu-screen">
      <div class="menu-bg" aria-hidden="true">
        <div class="menu-orb orb-1"></div><div class="menu-orb orb-2"></div><div class="menu-orb orb-3"></div>
        <div class="menu-grid-lines"></div>
      </div>
      <div class="menu-card">
        <div class="menu-brand">
          <div class="brand-mark big" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="menu-eyebrow">MINI TYCOON · ГЛУБОКАЯ СИМУЛЯЦИЯ</div>
        </div>
        <h1 class="menu-title">СВОЙ МАРКЕТ</h1>
        <p class="menu-tagline">Тайкун: симулятор маркетплейса</p>
        <p class="menu-story">У вас есть небольшая площадка в пилотном городе, три сотрудника и скромный капитал. Впереди — конкуренционные войны, рискованные сделки, технологии и выход на международный рынок. Каждая неделя — новое решение. Сможете ли вы построить империю — или обанкротитесь?</p>

        <div class="menu-section">
          <div class="menu-label">СЛОЖНОСТЬ</div>
          <div class="diff-row">${DIFFICULTIES.map(item => `
            <button class="diff-pill ${item.id === diff.id ? "active" : ""}" data-action="SET_DIFFICULTY" data-id="${item.id}">
              <span class="diff-icon">${item.icon}</span>
              <strong>${item.name}</strong>
              <small>${item.desc}</small>
            </button>`).join("")}
          </div>
        </div>

        <div class="menu-section">
          <div class="menu-label">НАЗВАНИЕ КОМПАНИИ</div>
          <input class="menu-input" type="text" data-action="SET_NAME" value="${esc(state.companyName)}" maxlength="24" placeholder="Лавка Плюс" aria-label="Название компании">
        </div>

        <div class="menu-actions">
          <button class="primary-button big" data-action="NEW_GAME">Начать игру <span>→</span></button>
          ${showContinue ? `<button class="ghost-button" data-action="CONTINUE">Продолжить · неделя ${state.week}</button>` : ""}
        </div>

        <details class="menu-rules">
          <summary>Как играть?</summary>
          <ul>
            <li><strong>Каждый ход — неделя.</strong> Завершайте её, чтобы получать прибыль и отчёты.</li>
            <li><strong>Следите за мощностями:</strong> необработанные заказы бьют по репутации.</li>
            <li><strong>Инвестируйте:</strong> команда, технологии и проекты дают рост.</li>
            <li><strong>Осторожно с кредитами и ставками</strong> — они дают деньги, но добавляют риска.</li>
            <li><strong>Следите за целями с дедлайнами</strong> — просроченные награды сгорают.</li>
            <li><strong>Победа:</strong> международный рынок, 22% доли и 250 000 ₽. <strong>Поражение:</strong> три недели в минусе.</li>
          </ul>
        </details>
      </div>
    </div>`;
  }

  // ============================== ЭКРАНЫ ФИНАЛА ==============================

  function renderEndScreen(state, isVictory) {
    const diff = diffById(state.difficulty);
    return `<div class="end-screen ${isVictory ? "victory" : "gameover"}">
      <div class="menu-bg" aria-hidden="true"><div class="menu-orb orb-1"></div><div class="menu-orb orb-2"></div></div>
      <div class="end-card">
        <div class="end-icon">${isVictory ? "🏆" : "💸"}</div>
        <div class="menu-eyebrow">${isVictory ? "ИМПЕРИЯ ПОСТРОЕНА" : "ИГРА ОКОНЧЕНА"}</div>
        <h1>${isVictory ? "Вы — легенда рынка!" : "Компания обанкротилась"}</h1>
        <p class="end-text">${isVictory
          ? `«${esc(state.companyName)}» вышла на международный рынок и стала лидером. Инвесторы в восторге, конкуренты в шоке.`
          : `Касса опустела, и кредиторы не дождались чуда. Но опыт остаётся — попробуйте снова!`}</p>
        <div class="end-stats">
          <div><span>Недель прожито</span><strong>${state.week - 1}</strong></div>
          <div><span>Лучшая доля рынка</span><strong>${(state.bestShare || state.share).toFixed(1)}%</strong></div>
          <div><span>Пик кассы</span><strong>${money(state.bestCash || state.cash)}</strong></div>
          <div><span>Целей выполнено</span><strong>${state.goalsDone.length} / ${GOALS.length}</strong></div>
          <div><span>Технологий</span><strong>${state.completedTechs.length}</strong></div>
          <div><span>Сложность</span><strong>${esc(diff.name)}</strong></div>
        </div>
        <div class="menu-actions">
          <button class="primary-button big" data-action="NEW_GAME">Играть снова <span>→</span></button>
          <button class="ghost-button" data-action="TO_MENU">В главное меню</button>
        </div>
      </div>
    </div>`;
  }

  // ============================== UI: ЭКРАНЫ ИГРЫ ==============================

  function renderOverview(state) {
    const forecast = forecastDemand(state);
    const cap = dailyCapacity(state);
    const capacityFill = clamp(Math.round(forecast / Math.max(1, cap) * 100), 3, 100);
    const latest = state.lastReport;
    const shares = marketShares(state);
    const pulsePct = ((state.marketPulse - 1) * 100);
    return `${pageHeading(`${esc(STAGES[state.stage].name.toUpperCase())} · НЕДЕЛЯ ${String(state.week).padStart(2, "0")}`, "Кабинет основателя", "Управляйте стратегией платформы: команда, технологии, проекты и рынок — каждый ход решает.", `<button class="primary-button" data-action="END_WEEK">Завершить неделю <span>→</span></button>`)}
      ${renderTutorial(state)}
      <section class="hero-card">
        <div class="hero-copy">
          <div class="hero-pill"><span class="pulse"></span> ${state.event ? "СОБЫТИЕ ТРЕБУЕТ РЕШЕНИЯ" : state.cash < 0 ? "ФИНАНСОВЫЙ КРИЗИС" : "НЕДЕЛЯ В РАБОТЕ"}</div>
          <h2>От пилотного города<br>до международного рынка.</h2>
          <p>Ожидаемый спрос — <strong>${number(forecast)} заказов</strong>, мощности — <strong>${number(cap)}</strong>. Рынок этой неделей <strong>${pulsePct >= 0 ? "растёт" : "падает"} на ${Math.abs(pulsePct).toFixed(0)}%</strong>.</p>
          <div class="hero-bottom"><button class="hero-button" data-action="END_WEEK">Закрыть неделю <span>→</span></button><span class="hero-caption">Отчёт и события — сразу после смены</span></div>
        </div>
        <div class="hero-illustration" aria-hidden="true">
          <div class="illustration-sun"></div>
          <div class="share-orb"><strong>${state.share.toFixed(1)}%</strong><span>ДОЛЯ РЫНКА</span></div>
          <div class="floating-box box-one">✦ <span>НАУКА +${researchPerWeek(state)}/НЕД</span></div>
          <div class="floating-box box-two"><span class="float-dot"></span> КОМАНДА: ${state.team.length}/${teamCap(state)}</div>
          <div class="hero-ground"></div>
        </div>
      </section>

      <section class="metrics-grid" aria-label="Показатели компании">
        ${metricCard("₽", "Касса", money(state.cash), latest ? `${latest.profit >= 0 ? "+" : "−"}${money(Math.abs(latest.profit))} за неделю` : "Стартовый капитал", "green", state.history.map(item => item.profit))}
        ${metricCard("↗", "Доля рынка", `${state.share.toFixed(1)}<small>%</small>`, shares[1] ? `Лидер: ${shares.slice(1).sort((a, b) => b.share - a.share)[0].name}` : "", "lime", state.history.map(item => item.share))}
        ${metricCard("♙", "Команда", `${state.team.length} <small>чел.</small>`, `Мораль: ${Math.round(state.team.reduce((s, m) => s + m.morale, 0) / Math.max(1, state.team.length))}%`, "peach")}
        ${metricCard("⌘", "Очки науки", `${number(state.researchPoints)} <small>RP</small>`, `+${researchPerWeek(state)} в неделю`, "lavender")}
        ${metricCard("✦", "Репутация", `${Math.round(state.reputation)}<small> / 100</small>`, state.loans.length ? `Долг: ${money(totalDebt(state))}` : state.reputation >= 75 ? "Покупатели доверяют вам" : "Растёт с качеством доставки", "mint")}
      </section>

      <div class="overview-grid">
        <div class="overview-main">
          ${renderReport(state)}
          <article class="panel chart-panel">
            <div class="panel-heading"><div><div class="eyebrow">ФИНАНСЫ</div><h2>Выручка по неделям</h2></div><span class="period-chip">ПОСЛЕДНИЕ 7 НЕДЕЛЬ</span></div>
            ${renderChart(state)}
            <div class="panel-foot"><span><i class="legend-dot"></i> Выручка платформы</span><strong>${latest ? money(latest.revenue) : "—"}</strong></div>
          </article>
          ${state.activeProjects.length ? `<section class="panel projects-strip">
            <div class="panel-heading"><div><div class="eyebrow">В РАБОТЕ</div><h2>Активные проекты</h2></div><button class="text-action" data-action="NAV" data-view="projects">Все проекты <span>→</span></button></div>
            <div class="strip-items">${state.activeProjects.map(item => {
              const project = projectById(item.id);
              const fill = Math.round((item.weeksDone + 1) / item.weeksTotal * 100);
              return `<div class="strip-item"><strong>${esc(project ? project.name : item.id)}</strong><div class="small-progress"><div style="width:${fill}%"></div></div><span>${item.weeksDone} / ${item.weeksTotal} нед.</span></div>`;
            }).join("")}</div>
          </section>` : ""}
        </div>
        <div class="overview-side">
          <article class="panel demand-panel">
            <div class="panel-heading"><div><div class="eyebrow">ОПЕРАЦИИ</div><h2>План на неделю</h2></div><span class="mini-status"><i></i> В работе</span></div>
            <div class="demand-number">${number(forecast)} <span>заказов</span></div>
            <p class="muted-copy">Мощность системы — ${number(cap)} заказов в неделю.</p>
            ${renderRing(capacityFill, `${capacityFill}%`, "ЗАГРУЗКА")}
            ${cap < forecast ? `<div class="warning-inline">⚠ Не хватает мощности: часть заказов будет потеряна.</div>` : `<div class="success-inline">✓ Склад и курьеры справятся с прогнозом.</div>`}
            <div class="demand-divider"></div>
            <div class="demand-details"><span>Склад <strong>${warehouseCapacity(state)} / нед</strong></span><span>Курьеры <strong>${courierCapacity(state)} / нед</strong></span><span>Комиссия <strong>${state.commission}%</strong></span></div>
          </article>
          ${renderGoals(state)}
          ${renderAchievements(state)}
          ${renderLog(state)}
        </div>
      </div>`;
  }

  function renderAchievements(state) {
    const unlocked = new Set(state.achievements || []);
    const isOpen = (state.collapsed || {}).achievements === false;
    const last = [...ACHIEVEMENTS].reverse().find(item => unlocked.has(item.id));
    const summary = `🏅 ${unlocked.size} / ${ACHIEVEMENTS.length} открыто${last ? ` · последнее: «${last.name}»` : ""}`;
    return `<section class="objectives-section">
      <div class="section-heading"><div><div class="eyebrow">НАГРАДЫ</div><h2>Достижения</h2></div></div>
      ${isOpen ? `<div class="achievements-grid">${ACHIEVEMENTS.map(item => {
        const isDone = unlocked.has(item.id);
        return `<article class="achievement-card ${isDone ? "is-unlocked" : ""}">
          <span class="achievement-icon">${isDone ? item.icon : "?"}</span>
          <div><h3>${esc(item.name)}</h3><p>${esc(item.desc)}</p></div>
          ${isDone ? `<span class="achievement-check">✓</span>` : ""}
        </article>`;
      }).join("")}</div>
      <button class="collapse-bar" data-action="TOGGLE_SECTION" data-key="achievements"><span>${summary}</span><span class="collapse-toggle">Свернуть ▲</span></button>`
      : `<button class="collapse-bar" data-action="TOGGLE_SECTION" data-key="achievements"><span>${summary}</span><span class="collapse-toggle">Показать ▼</span></button>`}
    </section>`;
  }

  function renderGoals(state) {
    const done = new Set(state.goalsDone);
    const missed = new Set(state.goalsMissed);
    return `<section class="objectives-section goals-section">
      <div class="section-heading"><div><div class="eyebrow">ЦЕЛИ ОСНОВАТЕЛЯ</div><h2>Дорожная карта</h2></div><span>Дедлайны сгорают!</span></div>
      <div class="goals-list">${GOALS.map(goal => {
        const isDone = done.has(goal.id);
        const isMissed = missed.has(goal.id);
        const progress = Math.min(goalProgress(state, goal), goal.target);
        const fill = clamp(Math.round(progress / goal.target * 100), 0, 100);
        return `<div class="goal-row ${isDone ? "is-complete" : ""} ${isMissed ? "is-missed" : ""}">
          <span class="goal-icon">${goal.icon}</span>
          <div class="goal-info"><strong>${goal.title}</strong><span>${goal.description}</span></div>
          ${goal.deadline && !isDone && !isMissed ? `<span class="deadline-chip ${goal.deadline - state.week <= 3 ? "urgent" : ""}">⏱ нед. ${goal.deadline}</span>` : ""}
          <div class="goal-progress-wrap">
            <div class="small-progress"><div style="width:${fill}%"></div></div>
            <span class="goal-count">${number(progress)} / ${number(goal.target)}</span>
          </div>
          <span class="goal-reward ${isMissed ? "missed" : ""}">${isDone ? "✓ готово" : isMissed ? "✕ сгорела" : `+${money(goal.reward)}`}</span>
        </div>`;
      }).join("")}</div>
    </section>`;
  }

  function renderReport(state) {
    const report = state.lastReport;
    if (!report) {
      return `<section class="panel report-panel report-empty-panel" id="report"><div class="report-empty-icon">▤</div><div><div class="eyebrow">ОТЧЁТ НЕДЕЛИ</div><h2>Первая неделя ещё впереди</h2><p>Завершите неделю — разберём спрос, выручку, расходы и прибыль, чтобы решить, что делать дальше.</p></div><span class="report-next">ПОСЛЕ НЕДЕЛИ ↘</span></section>`;
    }
    const sign = report.profit >= 0 ? "+" : "−";
    const pulse = ((report.marketPulse - 1) * 100);
    return `<section class="panel report-panel" id="report">
      <div class="panel-heading report-heading"><div><div class="eyebrow">ОТЧЁТ · НЕДЕЛЯ ${String(report.week).padStart(2, "0")}</div><h2>Как прошла неделя?</h2></div><span class="report-event">Рынок ${pulse >= 0 ? "+" : "−"}${Math.abs(pulse).toFixed(0)}% · заполнение ${report.fillRate}%</span></div>
      <div class="report-stats">
        <div class="report-stat"><span>Спрос</span><strong>${number(report.demand)}</strong><small>заказов</small></div>
        <div class="report-stat"><span>Выручка</span><strong>${money(report.revenue)}</strong><small>комиссия ${money(report.streams.commission)} · сервисы ${money(report.streams.services)}${report.streams.subscription ? ` · подписки ${money(report.streams.subscription)}` : ""}</small></div>
        <div class="report-stat"><span>Расходы</span><strong>${money(report.costs)}</strong><small>зарплаты ${money(report.breakdown.salaries)} · логистика ${money(report.breakdown.ops)}${report.breakdown.loans ? ` · кредиты ${money(report.breakdown.loans)}` : ""}</small></div>
        <div class="report-stat"><span>Очки науки</span><strong>+${number(report.rpGain)}</strong><small>за неделю</small></div>
        <div class="report-stat report-profit ${report.profit >= 0 ? "positive" : "negative"}"><span>Чистый итог</span><strong>${sign}${money(Math.abs(report.profit))}</strong><small>прибыль за неделю</small></div>
      </div>
      <div class="report-insight"><span>✦</span><p><strong>Доля рынка:</strong> ${report.share.toFixed(1)}% (${report.shareChange >= 0 ? "+" : "−"}${Math.abs(report.shareChange).toFixed(2)} п.п.)${report.lost > 0 ? ` · <strong>Потеряно ${number(report.lost)} заказов</strong> — не хватило мощностей.` : ""}</p></div>
      ${renderNewsBlock(state, 4)}
    </section>`;
  }

  function renderNewsBlock(state, limit) {
    const items = (state.news || []).slice(0, limit);
    if (!items.length) return "";
    return `<div class="report-news"><h3>📰 Хроника рынка</h3>${items.map(item => `<div class="news-item ${esc(item.tone || "neutral")}"><span class="news-week">НЕД ${item.week}</span><p>${esc(item.text)}</p></div>`).join("")}</div>`;
  }

  function renderTutorial(state) {
    if (state.tutorialDismissed || state.week > 14) return "";
    const tip = [...TUTORIAL_TIPS].reverse().find(item => state.week >= item.min);
    if (!tip) return "";
    return `<section class="tutorial-card">
      <span class="tutorial-badge">📚 УЧЕБНИК</span>
      <p>${tip.text}</p>
      <button data-action="DISMISS_TUTORIAL" aria-label="Скрыть подсказку">Понятно ✓</button>
    </section>`;
  }

  function renderHelp() {
    return `<div class="help-overlay" role="dialog" aria-modal="true" aria-label="Правила игры">
      <div class="help-backdrop" data-action="TOGGLE_HELP"></div>
      <div class="help-modal">
        <div class="help-head"><div><div class="eyebrow">СПРАВКА</div><h2>Как стать магнатом</h2></div><button class="help-close" data-action="TOGGLE_HELP" aria-label="Закрыть">×</button></div>
        <div class="help-body">
          <div class="help-block"><h3>🎯 Цель игры</h3><p>Построить международную империю: провести 3 экспансии, достичь <strong>22% доли рынка</strong> и накопить <strong>250 000 ₽</strong>. Банкротство — 3 недели с отрицательным балансом или долг ниже −80 000 ₽.</p></div>
          <div class="help-block"><h3>💼 Управление</h3><p><strong>Кабинет</strong> — обзор, цели и достижения. <strong>Команда</strong> — найм, обучение, бонусы. <strong>Исследования</strong> — технологии и проекты (в т.ч. «Экспансия»). <strong>Рынок</strong> — цена, комиссия, конкуренты, кредиты и рискованные ставки.</p></div>
          <div class="help-block"><h3>💸 Деньги и риск</h3><p>Кредиты дают деньги сейчас против еженедельных платежей. Рискованные ставки честно показывают шансы: можно сорвать куш или потерять ставку. В событиях с выбором «шанс 50/50» решайте сами — полагаться на удачу или играть наверняка.</p></div>
          <div class="help-block"><h3>📈 Спрос и команда</h3><p>Спрос растёт от низкой цены, доставки, технологий, маркетинга и репутации. Следите за загрузкой мощностей: потерянные заказы бьют по репутации. Мораль команды зависит от прибыли.</p></div>
          <div class="help-block"><h3>⏱ Цели и сезоны</h3><p>У целей есть дедлайны — просроченные награды сгорают. Сезоны меняются каждые 13 недель: зимой спрос выше, летом ниже. Следите за хроникой рынка и настроением конкурентов.</p></div>
        </div>
        <button class="primary-button help-cta" data-action="TOGGLE_HELP">Понятно, играть! <span>→</span></button>
      </div>
    </div>`;
  }

  function renderLog(state) {
    const items = state.log || [];
    const isOpen = (state.collapsed || {}).log === false;
    const visible = isOpen ? items.slice(-30).reverse() : items.slice(-4).reverse();
    return `<section class="panel log-panel">
      <div class="panel-heading"><div><div class="eyebrow">ЛЕНТА СОБЫТИЙ</div><h2>Что происходит в компании</h2></div></div>
      <div class="log-list">${visible.map(item => `
        <div class="log-item ${esc(item.tone)}"><span class="log-week">Н${String(item.week).padStart(2, "0")}</span><p>${esc(item.text)}</p></div>`).join("")}
      </div>
      ${items.length > 4 ? `<button class="collapse-bar" data-action="TOGGLE_SECTION" data-key="log"><span>${isOpen ? "Свернуть ленту" : `Показать всю хронику (${items.length})`}</span><span class="collapse-toggle">${isOpen ? "▲" : "▼"}</span></button>` : ""}
    </section>`;
  }

  function teamMemberCard(member) {
    const role = roleById(member.role);
    const moraleTone = member.morale >= 65 ? "good" : member.morale >= 40 ? "mid" : "low";
    return `<article class="member-card">
      <div class="member-avatar ${esc(role.id)}">${esc(role.icon)}</div>
      <div class="member-info">
        <div class="member-name-row"><h3>${esc(member.name)}</h3><span class="member-role">${esc(role.name)}</span></div>
        <div class="member-meta">${esc(role.effect)}</div>
        <div class="member-stats">
          <span class="skill-pips" title="Навык ${member.skill}">${"◆".repeat(member.skill)}<span class="dim">${"◆".repeat(Math.max(0, 8 - member.skill))}</span></span>
          <span class="member-salary">${money(member.salary)} / нед</span>
        </div>
        <div class="morale-row"><span>Мораль</span><div class="morale-track"><div class="${moraleTone}" style="width:${member.morale}%"></div></div><strong>${Math.round(member.morale)}%</strong></div>
      </div>
      <div class="member-actions">
        <button class="tiny-button" data-action="TRAIN" data-id="${member.id}" title="Обучение: +1 навык за 6 000 ₽">Обучить · 6 000 ₽</button>
        <button class="tiny-button danger" data-action="FIRE" data-id="${member.id}" title="Уволить с выходным пособием">Уволить</button>
      </div>
    </article>`;
  }

  function renderTeam(state) {
    const officeCost = 18000 + state.officeLevel * 12000;
    return `${pageHeading("ЛЮДИ РЕШАЮТ ВСЁ", "Команда", "Нанимайте специалистов, развивайте их навыки и следите за моралью. Каждый сотрудник приносит компании конкретную пользу.", `<button class="primary-button" data-action="PAY_BONUS">Премия · 4 000 ₽</button>`)}
      <section class="metrics-grid team-metrics">
        ${metricCard("♙", "Сотрудники", `${state.team.length} <small>/ ${teamCap(state)}</small>`, `Офис уровня ${state.officeLevel}`, "peach")}
        ${metricCard("◇", "Средняя мораль", `${Math.round(state.team.reduce((s, m) => s + m.morale, 0) / Math.max(1, state.team.length))}<small>%</small>`, "Влияет на всю работу", "mint")}
        ${metricCard("₽", "Фонд оплаты", `${money(weeklySalaries(state))} <small>/ нед</small>`, "Списывается каждую неделю", "green")}
        ${metricCard("⌘", "Наука от команды", `+${researchPerWeek(state)} <small>RP</small>`, "Разработчики и аналитики", "lavender")}
      </section>

      <section class="panel roster-panel">
        <div class="panel-heading"><div><div class="eyebrow">ШТАТ</div><h2>Ваши сотрудники</h2></div><div class="roster-tools"><button class="text-action" data-action="TEAMBUILDING">Тимбилдинг · 6 000 ₽ <span>→</span></button></div></div>
        <div class="member-list">${state.team.map(teamMemberCard).join("")}</div>
      </section>

      <section class="panel candidates-panel">
        <div class="panel-heading"><div><div class="eyebrow">РЫНОК ТРУДА</div><h2>Кандидаты на работу</h2></div><span class="count-chip">Подписание = 2 оклада</span></div>
        <div class="candidate-grid">${state.candidates.map(candidate => {
          const role = roleById(candidate.role);
          const canHire = state.team.length < teamCap(state) && state.cash >= candidate.salary * 2;
          return `<article class="candidate-card">
            <div class="member-avatar ${esc(role.id)}">${esc(role.icon)}</div>
            <h3>${esc(candidate.name)}</h3>
            <div class="candidate-role">${esc(role.name)}</div>
            <p class="candidate-effect">${esc(role.effect)}</p>
            <div class="candidate-stats"><span>Навык ${"◆".repeat(candidate.skill)}<span class="dim">${"◆".repeat(Math.max(0, 8 - candidate.skill))}</span></span><strong>${money(candidate.salary)} / нед</strong></div>
            <button class="wide-button" data-action="HIRE" data-id="${candidate.id}" ${canHire ? "" : "disabled"}>Нанять · ${money(candidate.salary * 2)} <span>→</span></button>
          </article>`;
        }).join("")}</div>
      </section>

      <section class="panel office-panel">
        <div class="panel-heading"><div><div class="eyebrow">ОФИС</div><h2>Расширение пространства</h2></div><span class="tiny-tag">УРОВЕНЬ ${state.officeLevel} / 5</span></div>
        <p class="muted-copy">Больше офис — больше людей и слотов для проектов. Сейчас: команда до ${teamCap(state)} чел., проектов ${projectSlots(state)} одновременно.</p>
        <button class="wide-button" data-action="UPGRADE_OFFICE" ${state.officeLevel >= 5 || state.cash < officeCost ? "disabled" : ""}>${state.officeLevel >= 5 ? "Максимальный уровень" : `Расширить офис · ${money(officeCost)}`} <span>→</span></button>
      </section>`;
  }

  function techCard(state, tech) {
    const done = state.completedTechs.includes(tech.id);
    const missing = tech.requires.filter(id => !state.completedTechs.includes(id));
    const locked = missing.length > 0;
    const affordable = state.researchPoints >= tech.rp && state.cash >= tech.money;
    return `<article class="tech-card ${done ? "is-done" : ""} ${locked ? "is-locked" : ""}">
      <div class="tech-head"><span class="tech-icon">${done ? "✓" : locked ? "🔒" : "◈"}</span><span class="tech-cost">${tech.rp} RP · ${money(tech.money)}</span></div>
      <h3>${esc(tech.name)}</h3>
      <p class="tech-desc">${esc(tech.desc)}</p>
      <div class="tech-effect">${esc(tech.effectText)}</div>
      ${done ? `<div class="tech-status">ИЗУЧЕНО</div>`
        : locked ? `<div class="tech-status locked">Нужно: ${missing.map(id => techById(id) ? techById(id).name : id).map(esc).join(", ")}</div>`
        : `<button class="wide-button" data-action="BUY_TECH" data-id="${tech.id}" ${affordable ? "" : "disabled"}>Изучить <span>→</span></button>`}
    </article>`;
  }

  function renderResearch(state) {
    return `${pageHeading("ЗНАНИЯ — СИЛА", "Исследования", "Копите очки науки (RP) и вкладывайте их в технологии. Каждая технология даёт постоянное преимущество.", `<div class="rp-badge">⌘ ${number(state.researchPoints)} RP · +${researchPerWeek(state)}/нед</div>`)}
      <div class="tech-branches">${BRANCHES.map(branch => `
        <section class="branch-column">
          <div class="branch-head ${esc(branch.tone)}"><span class="branch-icon">${branch.icon}</span><h2>${esc(branch.name)}</h2></div>
          ${TECHS.filter(tech => tech.branch === branch.id).map(tech => techCard(state, tech)).join("")}
        </section>`).join("")}
      </div>`;
  }

  function projectCard(state, project) {
    const active = state.activeProjects.find(item => item.id === project.id);
    const done = !project.isExpansion && state.completedProjects.includes(project.id);
    const missing = project.requires.filter(id => !state.completedTechs.includes(id));
    const cost = project.isExpansion ? STAGES[state.stage].expandCost : project.cost;
    const isExpansion = project.isExpansion;
    const expansionBlocked = isExpansion && (state.stage >= STAGES.length - 1 || state.share < 15);
    const slotsFull = state.activeProjects.length >= projectSlots(state);
    if (active) {
      const fill = Math.round((active.weeksDone + 1) / active.weeksTotal * 100);
      return `<article class="project-card is-active">
        <div class="project-head"><span class="project-icon">▶</span><span class="tiny-tag">В РАБОТЕ</span></div>
        <h3>${esc(project.name)}</h3>
        <p class="project-desc">${esc(project.desc)}</p>
        <div class="small-progress"><div style="width:${fill}%"></div></div>
        <div class="project-foot"><span>${active.weeksDone} / ${active.weeksTotal} недель</span><strong>${esc(project.effectText)}</strong></div>
      </article>`;
    }
    return `<article class="project-card ${done ? "is-done" : ""}">
      <div class="project-head"><span class="project-icon">${done ? "✓" : isExpansion ? "✧" : "▤"}</span><span class="tiny-tag">${done ? "ЗАВЕРШЁН" : `${project.weeks} НЕД.`}</span></div>
      <h3>${esc(project.name)}</h3>
      <p class="project-desc">${esc(project.desc)}</p>
      <div class="project-effect">${esc(project.effectText)}</div>
      ${done ? `<div class="project-status">ЗАВЕРШЕНО</div>`
        : missing.length ? `<div class="project-status locked">Требует технологии: ${missing.map(id => techById(id) ? techById(id).name : id).map(esc).join(", ")}</div>`
        : expansionBlocked ? `<div class="project-status locked">${state.stage >= STAGES.length - 1 ? "Вы на крупнейшем рынке" : `Нужно 15% доли рынка (сейчас ${state.share.toFixed(1)}%)`}</div>`
        : `<button class="wide-button" data-action="START_PROJECT" data-id="${project.id}" ${slotsFull || state.cash < cost ? "disabled" : ""}>Запустить · ${money(cost)} <span>→</span></button>`}
    </article>`;
  }

  function renderProjects(state) {
    return `${pageHeading("СТРОИМ БУДУЩЕЕ", "Проекты", "Крупные инициативы занимают несколько недель, но дают постоянные преимущества. Слоты проектов растут вместе с офисом.", `<div class="rp-badge">Слоты: ${state.activeProjects.length} / ${projectSlots(state)}</div>`)}
      <section class="panel projects-board">
        <div class="panel-heading"><div><div class="eyebrow">ПОРТФЕЛЬ</div><h2>Доступные проекты</h2></div><span class="count-chip">${PROJECTS.filter(p => !state.completedProjects.includes(p.id)).length} доступно</span></div>
        <div class="project-grid">${PROJECTS.map(project => projectCard(state, project)).join("")}</div>
      </section>`;
  }

  function renderMarket(state) {
    const shares = marketShares(state);
    const nextStage = STAGES[state.stage + 1];
    const whCost = 26000 + state.warehouseLevel * 16000;
    const courierCost = 9000 + Math.max(0, state.couriers - 2) * 3500;
    const pulsePct = ((state.marketPulse - 1) * 100);
    const gambleReady = state.week - state.gambleWeek >= 2;
    return `${pageHeading("КОНКУРЕНТНАЯ БОРЬБА", "Рынок", "Конкуренты не дремлют: следите за долями, берите финансирование, рискованные ставки и готовьте экспансию.", `<button class="primary-button" data-action="START_CAMPAIGN" ${state.marketingWeeksLeft > 0 ? "disabled" : ""}>${state.marketingWeeksLeft > 0 ? `Кампания · ${state.marketingWeeksLeft} нед.` : "Реклама · 12 000 ₽"}</button>`)}
      <section class="panel market-share-panel">
        <div class="panel-heading"><div><div class="eyebrow">КАРТА РЫНКА</div><h2>${esc(STAGES[state.stage].name)} · ${money(STAGES[state.stage].market * avgOrder(state))} оборот в неделю</h2></div><span class="period-chip">РЫНОК ${pulsePct >= 0 ? "+" : "−"}${Math.abs(pulsePct).toFixed(0)}% · ДОЛЯ ${state.share.toFixed(1)}%</span></div>
        <div class="share-bar">${shares.map((item, index) => `<div class="share-segment ${item.you ? "you" : ["", "seg-a", "seg-b", "seg-c"][Math.min(index, 3)]}" style="width:${clamp(item.share, 2, 100)}%" title="${esc(item.name)}: ${item.share.toFixed(1)}%"><span>${item.share >= 7 ? esc(item.name) : ""}</span></div>`).join("")}</div>
        <div class="share-legend">${shares.map(item => `<span><i class="${item.you ? "you" : ""}"></i>${esc(item.name)} — ${item.share.toFixed(1)}%</span>`).join("")}</div>
      </section>

      <section class="panel rivals-panel">
        <div class="panel-heading"><div><div class="eyebrow">КОНКУРЕНТЫ</div><h2>Кто рядом с вами</h2></div><span class="period-chip">ОНИ НЕ ДРЁМЛЮТ</span></div>
        <div class="rival-grid">${state.competitors.map((competitor, index) => {
          const rest = Math.max(0, 100 - state.share);
          const totalWeight = state.competitors.reduce((sum, item) => sum + item.weight, 0) || 1;
          const shareValue = rest * competitor.weight / totalWeight;
          const mood = competitor.mood || "flat";
          return `<article class="rival-card">
            <div class="rival-top"><span class="rival-avatar">${esc(competitor.name.slice(0, 1))}</span>
              <div><h3>${esc(competitor.name)}</h3><span class="rival-mood ${esc(mood)}">${mood === "up" ? "↗ растёт" : mood === "down" ? "↘ слабеет" : "→ стабилен"}</span></div>
            </div>
            <div class="rival-share">${shareValue.toFixed(1)}<small>% рынка</small></div>
            <div class="small-progress"><div class="rival-fill" style="width:${clamp(shareValue, 0, 100)}%"></div></div>
          </article>`;
        }).join("")}</div>
      </section>

      <section class="panel stats-panel">
        <div class="panel-heading"><div><div class="eyebrow">ХРОНИКИ</div><h2>Статистика компании</h2></div><span class="period-chip">ЗА ВСЮ ИГРУ</span></div>
        <div class="stats-grid">
          <div class="stat-tile"><span>Недель прожито</span><strong>${state.stats.weeksPlayed || 0}</strong></div>
          <div class="stat-tile"><span>Лучшая неделя</span><strong>${money(state.stats.bestWeekProfit || 0)}</strong></div>
          <div class="stat-tile"><span>Вся выручка</span><strong>${money(state.stats.totalRevenue || 0)}</strong></div>
          <div class="stat-tile"><span>Ставки</span><strong>${state.stats.gamblesWon || 0} / ${state.stats.gamblesPlayed || 0} выиграно</strong></div>
          <div class="stat-tile"><span>Событий решено</span><strong>${state.stats.eventsResolved || 0}</strong></div>
          <div class="stat-tile"><span>Кредитов взято</span><strong>${state.stats.loansTaken || 0}</strong></div>
        </div>
      </section>

      ${state.news && state.news.length ? `<section class="panel news-panel">
        <div class="panel-heading"><div><div class="eyebrow">ПРЕССА</div><h2>Новости рынка</h2></div><span class="period-chip">ПОСЛЕДНИЕ ${Math.min(state.news.length, 8)}</span></div>
        <div class="news-feed">${state.news.slice(0, 8).map(item => `<div class="news-item ${esc(item.tone || "neutral")}"><span class="news-week">НЕД ${item.week}</span><p>${esc(item.text)}</p></div>`).join("")}</div>
      </section>` : ""}

      <section class="market-grid">
        <article class="panel commission-panel">
          <div class="panel-heading"><div><div class="eyebrow">ПРАВИЛА ПЛОЩАДКИ</div><h2>Комиссия продавца</h2></div><span class="commission-badge">${state.commission}%</span></div>
          <p class="muted-copy">Ваша доля с каждого заказа. Высокая комиссия даёт больше денег сейчас, но отпугивает продавцов и покупателей.</p>
          <div class="range-wrap"><input type="range" min="8" max="22" step="1" value="${state.commission}" data-action="SET_COMMISSION" aria-label="Комиссия с продавцов"><div class="range-labels"><span>8% · мягко</span><span>22% · смело</span></div></div>
          <div class="commission-advice">${state.commission >= 15 ? "⚠" : "✦"} ${state.commission >= 17 ? "Высокая ставка: продавцы теряют лояльность каждую неделю." : state.commission >= 15 ? "Смелая ставка: следите за лояльностью продавцов." : "Комфортная ставка для продавцов и покупателей."}</div>
          <div class="loyalty-row"><div><span>Лояльность продавцов</span><strong>${Math.round(state.sellerLoyalty)}%</strong></div><div class="loyalty-track"><div style="width:${state.sellerLoyalty}%"></div></div></div>
        </article>

        <article class="panel logistics-panel">
          <div class="panel-heading"><div><div class="eyebrow">ЛОГИСТИКА</div><h2>Мощности</h2></div><span class="mini-status"><i></i> ${dailyCapacity(state)} заказов/нед</span></div>
          <div class="logi-rows">
            <div class="logi-row"><div><strong>Склад</strong><span>уровень ${state.warehouseLevel} / 8 · ${warehouseCapacity(state)} заказов</span></div><button class="tiny-button" data-action="UPGRADE_WAREHOUSE" ${state.warehouseLevel >= 8 || state.cash < whCost ? "disabled" : ""}>${state.warehouseLevel >= 8 ? "Макс." : money(whCost)}</button></div>
            <div class="logi-row"><div><strong>Курьеры</strong><span>${state.couriers} чел. · ${courierCapacity(state)} заказов</span></div><button class="tiny-button" data-action="HIRE_COURIER" ${state.couriers >= 14 || state.cash < courierCost ? "disabled" : ""}>${state.couriers >= 14 ? "Макс." : money(courierCost)}</button></div>
          </div>
          <div class="marketing-status">${state.marketingWeeksLeft > 0 ? `<span class="live-dot"></span> Рекламная кампания активна ещё ${state.marketingWeeksLeft} нед.` : `Реклама не запущена. Кампания: +30% спроса на 3 недели за 12 000 ₽.`}</div>
        </article>
      </section>

      <section class="panel finance-panel">
        <div class="panel-heading"><div><div class="eyebrow">ФИНАНСИРОВАНИЕ</div><h2>Кредиты и займы</h2></div><span class="period-chip">ПЛАТЕЖИ ${money(weeklyLoanPayments(state))}/НЕД</span></div>
        <p class="muted-copy">Деньги сейчас — против регулярных платежей. Кредиты помогут пережить кризис или сделать рывок, но три недели с отрицательным балансом — банкротство.</p>
        <div class="loan-grid">${LOANS.map(loan => {
          const active = state.loans.some(item => item.id === loan.id);
          const blocked = state.loans.length >= 2 || state.share < loan.minShare;
          return `<article class="loan-card ${active ? "is-active" : ""}">
            <div class="loan-head"><span class="project-icon">${loan.icon}</span><strong>${loan.name}</strong>${active ? `<span class="tiny-tag">АКТИВЕН</span>` : ""}</div>
            <div class="loan-sum">${money(loan.amount)}</div>
            <p>${esc(loan.desc)}</p>
            <div class="loan-terms">Платёж <strong>${money(loan.weekly)}</strong> × ${loan.weeks} нед. · всего ${money(loan.weekly * loan.weeks)}</div>
            <button class="wide-button" data-action="TAKE_LOAN" data-id="${loan.id}" ${active || blocked ? "disabled" : ""}>${active ? "Уже взят" : loan.minShare > state.share ? `Нужно ${loan.minShare}% доли` : "Взять кредит"} <span>→</span></button>
          </article>`;
        }).join("")}</div>
      </section>

      <section class="panel gamble-panel">
        <div class="panel-heading"><div><div class="eyebrow">АЗАРТ</div><h2>Рискованные ставки</h2></div><span class="period-chip ${gambleReady ? "" : "dim"}">${gambleReady ? "ГОТОВЫ К ИГРЕ" : `ПАУЗА · ${2 - (state.week - state.gambleWeek)} НЕД.`}</span></div>
        <p class="muted-copy">Хотите испытать удачу? Ставка списывается сразу, исход зависит от шанса. Азарт хорош с холодной головой.</p>
        <div class="gamble-grid">${GAMBLERS.map(gamble => {
          const canPlay = gambleReady && state.cash >= gamble.stake;
          return `<article class="gamble-card">
            <div class="loan-head"><span class="project-icon gold">${gamble.icon}</span><strong>${gamble.name}</strong><span class="chance-badge">${Math.round(gamble.p * 100)}% удачи</span></div>
            <p>${esc(gamble.desc)}</p>
            <div class="gamble-terms"><span>Ставка <strong>${money(gamble.stake)}</strong></span><span class="win">Успех: ${esc(gamble.okText)}</span><span class="lose">Провал: ${esc(gamble.failText)}</span></div>
            <button class="wide-button risk" data-action="TAKE_GAMBLE" data-id="${gamble.id}" ${canPlay ? "" : "disabled"}>Сделать ставку <span>→</span></button>
          </article>`;
        }).join("")}</div>
      </section>

      ${nextStage ? `<section class="panel expansion-panel">
        <div class="panel-heading"><div><div class="eyebrow">ЭКСПАНСИЯ</div><h2>Следующий рынок: ${esc(nextStage.name)}</h2></div><span class="period-chip">ОБОРОТ ×${(nextStage.market / STAGES[state.stage].market).toFixed(1)}</span></div>
        <p class="muted-copy">Чтобы выйти на новый рынок, нужно 15% доли и проект «Экспансия» (4 недели, ${money(STAGES[state.stage].expandCost)}). Сейчас ваша доля: ${state.share.toFixed(1)}%. Победа ждёт на международном рынке: 22% доли и 250 000 ₽.</p>
        <div class="capacity-progress"><div style="width:${clamp(state.share / 15 * 100, 0, 100)}%"></div></div>
        <div class="capacity-labels"><span>Готовность к экспансии</span><strong>${Math.min(100, Math.round(state.share / 15 * 100))}%</strong></div>
      </section>` : `<section class="panel expansion-panel"><div class="panel-heading"><div><div class="eyebrow">ФИНАЛ</div><h2>Международный рынок</h2></div></div><p class="muted-copy">Вы возглавляете крупнейший рынок. Цель победы: доля 22% и касса 250 000 ₽. Удачи!</p></section>`}`;
  }

  function renderEventModal(state) {
    if (!state.event) return "";
    const event = eventById(state.event.id);
    if (!event) return "";
    return `<div class="event-layer" role="dialog" aria-modal="true" aria-label="${esc(event.title)}">
      <div class="event-scrim"></div>
      <div class="event-card">
        <div class="event-icon">${event.icon}</div>
        <div class="eyebrow">СОБЫТИЕ НЕДЕЛИ</div>
        <h2>${esc(event.title)}</h2>
        <p class="event-text">${esc(event.text)}</p>
        <div class="event-choices">${event.choices.map((choice, index) => `
          <button class="event-choice ${choice.chance ? "risky" : ""}" data-action="EVENT_CHOICE" data-index="${index}">
            <strong>${esc(choice.label)}</strong>
            <span>${esc(choice.hint)}</span>
          </button>`).join("")}
        </div>
      </div>
    </div>`;
  }

  function render(state) {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", state.theme === "dark" ? "dark" : "light");
    }
    let base;
    if (state.phase === "menu") {
      base = renderMenu(state);
    } else if (state.phase === "gameover") {
      base = renderEndScreen(state, false);
    } else if (state.phase === "victory") {
      base = renderEndScreen(state, true);
    } else {
      let content;
      switch (state.activeView) {
        case "team": content = renderTeam(state); break;
        case "research": content = renderResearch(state); break;
        case "projects": content = renderProjects(state); break;
        case "market": content = renderMarket(state); break;
        default: content = renderOverview(state);
      }
      base = renderShell(state, content) + renderEventModal(state);
    }
    return base + (state.helpOpen ? renderHelp() : "");
  }

  window.MarketTycoon = { initialState, reducer, render };
})();
