/* ============================================================
   РКО/ПАРТНЁР — логика без библиотек.
   Все цифры берутся из window.RKO (assets/config.js).
   ============================================================ */
(() => {
  'use strict';

  const CFG = window.RKO;
  if (!CFG) {
    console.warn('RKO config не найден: проверь assets/config.js');
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const params = new URLSearchParams(window.location.search);
  const isStatic = params.get('static') === '1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const motionOn = !isStatic && !reduceMotion;

  if (isStatic) {
    document.documentElement.classList.add('static');
  }

  const nfInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const fmtInt = (value) => nfInt.format(Math.round(Number(value) || 0));
  const fmtRub = (value) => `${fmtInt(value)} ₽`;
  const fmtRange = (min, max) => (
    Number(min) === Number(max)
      ? fmtRub(min)
      : `${fmtInt(min)}–${fmtInt(max)} ₽`
  );

  const telegram = String(CFG.telegram || '').replace(/^@/, '');
  const telegramUrl = telegram ? `https://t.me/${telegram}` : 'https://t.me/';

  /* ---------- Telegram links ---------- */
  $$('.js-telegram').forEach((link) => {
    link.href = telegramUrl;
    link.target = '_blank';
    link.rel = 'noopener';
  });

  $$('[data-telegram-handle]').forEach((node) => {
    node.textContent = telegram;
  });

  /* ---------- Shared scroll chrome ---------- */
  const header = $('[data-header]');
  const mobileCta = $('#mobile-cta');
  let chromeTick = false;

  function updateChrome() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    }

    if (mobileCta) {
      const shouldShow = window.innerWidth < 768 && window.scrollY > 600;
      mobileCta.hidden = !shouldShow;
    }
  }

  function requestChromeUpdate() {
    if (chromeTick) return;
    chromeTick = true;
    window.requestAnimationFrame(() => {
      chromeTick = false;
      updateChrome();
      updateTimeline();
    });
  }

  /* ---------- Number count-up ---------- */
  function setNumber(el, target, formatter, animate = true, duration = 520) {
    if (!el) return;
    const to = Number(target);
    if (!Number.isFinite(to)) return;

    const from = Number(el._rkoShown ?? 0);
    if (el._rkoRaf) {
      window.cancelAnimationFrame(el._rkoRaf);
      el._rkoRaf = 0;
    }

    const done = () => {
      el._rkoShown = to;
      el.textContent = formatter(to);
    };

    if (!animate || isStatic || reduceMotion || Math.abs(to - from) < 0.001) {
      done();
      return;
    }

    const started = performance.now();
    const frame = (now) => {
      const raw = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      const value = from + (to - from) * eased;
      el._rkoShown = value;
      el.textContent = formatter(value);
      if (raw < 1) {
        el._rkoRaf = window.requestAnimationFrame(frame);
      } else {
        el._rkoRaf = 0;
        done();
      }
    };

    el._rkoRaf = window.requestAnimationFrame(frame);
  }

  /* ---------- Hero package calculator ---------- */
  const packageCounts = Object.keys(CFG.packages || {})
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const packageAmountEl = $('#package-amount');
  const packageCountLabel = $('#package-count-label');
  const segmentButtons = $$('.segment-btn');
  let selectedCount = packageCounts.includes(5)
    ? 5
    : (packageCounts[packageCounts.length - 1] || 0);

  function pluralCount(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  }

  function setPackageCount(count, animate = true) {
    const amount = Number(CFG.packages?.[count]);
    if (!Number.isFinite(amount)) return;

    selectedCount = count;
    segmentButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.count) === count));
    });

    if (packageCountLabel) {
      packageCountLabel.textContent = `${count} ${pluralCount(count, 'счёт', 'счёта', 'счетов')}`;
    }

    if (packageAmountEl) {
      setNumber(packageAmountEl, amount, fmtInt, animate, 600);
    }
  }

  segmentButtons.forEach((button) => {
    const count = Number(button.dataset.count);
    if (!Number.isFinite(Number(CFG.packages?.[count]))) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      return;
    }
    button.addEventListener('click', () => setPackageCount(count, true));
  });

  if (packageAmountEl) {
    const initial = Number(CFG.packages?.[selectedCount]) || 0;
    packageAmountEl._rkoShown = 0;
    if (motionOn) {
      window.setTimeout(() => setPackageCount(selectedCount, true), 220);
    } else {
      setPackageCount(selectedCount, false);
    }
    if (!initial) {
      packageAmountEl.textContent = '—';
    }
  }

  /* ---------- Banks rendering ---------- */
  const banks = Array.isArray(CFG.banks) ? CFG.banks : [];

  const heroBanks = $('#hero-banks');
  if (heroBanks) {
    const fragment = document.createDocumentFragment();
    banks.forEach((bank) => {
      const row = document.createElement('li');
      row.className = 'package-bank';

      const name = document.createElement('span');
      name.className = 'package-bank-name';
      name.textContent = bank.name || 'Банк';

      const range = document.createElement('span');
      range.className = 'package-bank-range';
      range.textContent = fmtRange(bank.min, bank.max);

      row.append(name, range);
      fragment.append(row);
    });
    heroBanks.append(fragment);
  }

  const bankTableBody = $('#bank-table-body');
  if (bankTableBody) {
    const fragment = document.createDocumentFragment();
    banks.forEach((bank) => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const name = document.createElement('span');
      name.className = 'bank-name';
      name.textContent = bank.name || 'Банк';
      tdName.append(name);

      const tdAccount = document.createElement('td');
      const account = document.createElement('span');
      account.className = 'bank-account';
      account.textContent = bank.account || 'Расчётный счёт';
      tdAccount.append(account);

      const tdPayout = document.createElement('td');
      const payout = document.createElement('span');
      payout.className = 'bank-payout';
      payout.textContent = fmtRange(bank.min, bank.max);
      tdPayout.append(payout);

      tr.append(tdName, tdAccount, tdPayout);
      fragment.append(tr);
    });
    bankTableBody.append(fragment);
  }

  const packageTotalEl = $('#package-total');
  if (packageTotalEl && packageCounts.length) {
    const amounts = packageCounts.map((n) => Number(CFG.packages[n]));
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    packageTotalEl.textContent = `${fmtInt(min)}–${fmtInt(max)} ₽`;
  }

  /* ---------- Team calculator ---------- */
  const team = CFG.team || {};
  const calcDefaults = team.calc || {};
  const sliderInputs = {};
  const sliderOutputs = {
    leads: $('#calc-leads-value'),
    accounts: $('#calc-accounts-value')
  };

  const calcOutputs = {
    accountsMonth: $('#calc-accounts-month'),
    perAccount: $('#calc-per-account'),
    perLead: $('#calc-per-lead'),
    total: $('#calc-total'),
    year: $('#calc-year')
  };

  const chartEl = $('#calc-chart');
  const chartTotalEl = $('#calc-chart-total');
  const calcPanel = $('.calc-panel');

  const sliderSettings = {
    leads: {
      ...(calcDefaults.leads || {}),
      start: Number(calcDefaults.leads?.value ?? 12)
    },
    accounts: {
      ...(calcDefaults.accounts || {}),
      start: Number(calcDefaults.accounts?.value ?? 3)
    }
  };

  const sliderSuffix = {
    leads: '',
    accounts: ''
  };

  function setRangeFill(input) {
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', `${Math.max(0, Math.min(100, fill)).toFixed(2)}%`);
    input.setAttribute('aria-valuetext', `${value}${sliderSuffix[input.dataset.calc] || ''}`);
  }

  Object.entries(sliderSettings).forEach(([key, settings]) => {
    const input = $(`[data-calc="${key}"]`);
    if (!input) return;

    input.min = String(settings.min ?? 0);
    input.max = String(settings.max ?? 100);
    input.step = String(settings.step ?? 1);
    input.value = String(settings.start ?? settings.min ?? 0);
    sliderInputs[key] = input;
    setRangeFill(input);

    if (sliderOutputs[key]) {
      sliderOutputs[key].textContent = `${input.value}${sliderSuffix[key]}`;
    }

    input.addEventListener('input', () => {
      if (sliderOutputs[key]) {
        sliderOutputs[key].textContent = `${input.value}${sliderSuffix[key]}`;
      }
      setRangeFill(input);
      updateCalculator(true);
    });
  });

  function readCalcInputs() {
    return {
      leads: Number(sliderInputs.leads?.value || 0),
      accounts: Number(sliderInputs.accounts?.value || 0)
    };
  }

  function calculate(values) {
    const bankPerAccount = Number(team.bankPerAccount || 0);
    const split = team.split || {};
    const workerRate = Number(split.worker) || 0.5;

    // Работник получает фиксированную долю с каждого счёта.
    // Пример: банк платит 7 000 ₽ → 20% организатору, 30% лиду, 50% работнику (3 500 ₽).
    // С 5 счетов выходит ≈ 15–20 000 ₽.
    const perAccount = bankPerAccount * workerRate;
    const accountsPerMonth = values.leads * values.accounts;
    const perLead = values.accounts * perAccount;
    const total = accountsPerMonth * perAccount;

    return {
      leads: values.leads,
      accounts: values.accounts,
      accountsPerMonth,
      perAccount,
      perLead,
      total,
      year: total * 12
    };
  }

  function buildChart() {
    if (!chartEl) return [];
    const months = Math.max(1, Number(team.chartMonths || 6));
    const columns = [];
    chartEl.replaceChildren();
    const fragment = document.createDocumentFragment();

    for (let month = 1; month <= months; month += 1) {
      const col = document.createElement('div');
      col.className = 'chart-col';

      const plot = document.createElement('div');
      plot.className = 'chart-plot';

      const stack = document.createElement('div');
      stack.className = 'chart-stack';

      const bar = document.createElement('div');
      bar.className = 'chart-bar chart-bar--personal';
      bar.style.height = '0%';

      stack.append(bar);
      plot.append(stack);

      const label = document.createElement('span');
      label.className = 'chart-month';
      label.textContent = String(month);

      col.append(plot, label);
      fragment.append(col);
      columns.push({ bar });
    }

    chartEl.append(fragment);
    chartEl.setAttribute('role', 'img');
    return columns;
  }

  let chartColumns = buildChart();

  function updateChart(result) {
    if (!chartEl || chartColumns.length === 0) return;
    const months = chartColumns.length;
    const max = result.total;

    chartColumns.forEach((column) => {
      const height = max > 0 ? (result.total / max) * 100 : 0;
      column.bar.style.height = `${height}%`;
    });

    if (chartTotalEl) {
      setNumber(chartTotalEl, result.total, fmtRub, !isStatic && !reduceMotion, 450);
    }

    chartEl.setAttribute(
      'aria-label',
      `График дохода за ${months} месяцев. Твой доход около ${fmtRub(result.total)} в месяц.`
    );
  }

  function updateCalculator(animate = false) {
    const values = readCalcInputs();
    const result = calculate(values);

    setNumber(calcOutputs.accountsMonth, result.accountsPerMonth, fmtInt, animate, 420);
    setNumber(calcOutputs.perAccount, result.perAccount, fmtRub, animate, 420);
    setNumber(calcOutputs.perLead, result.perLead, fmtRub, animate, 420);
    setNumber(calcOutputs.total, result.total, fmtRub, animate, 520);
    setNumber(calcOutputs.year, result.year, fmtRub, animate, 520);
    updateChart(result);

    return result;
  }

  updateCalculator(false);

  /* First appearance: let the numbers count up once. */
  if (calcPanel && motionOn && 'IntersectionObserver' in window) {
    let calcCounted = false;
    const calcObserver = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (!visible || calcCounted) return;
      calcCounted = true;
      Object.values(calcOutputs).forEach((output) => {
        if (!output) return;
        output._rkoShown = 0;
        output.textContent = '0';
      });
      if (chartColumns.length) {
        chartColumns.forEach((column) => {
          column.bar.style.height = '0%';
        });
      }
      window.requestAnimationFrame(() => updateCalculator(true));
      calcObserver.disconnect();
    }, { threshold: 0.22 });
    calcObserver.observe(calcPanel);
  }

  /* ---------- Paths: show / switch / transition ---------- */
  const pathSections = $$('[data-path-section]');
  const pathCards = $$('.path-card');
  const transitionOverlay = $('#path-transition');
  const changePathButtons = $$('[data-change-path]');
  let activePath = null;
  let transitionBusy = false;

  function readStoredPath() {
    try {
      return window.localStorage.getItem('rkoPath');
    } catch (error) {
      return null;
    }
  }

  function storePath(path) {
    try {
      window.localStorage.setItem('rkoPath', path);
    } catch (error) {
      /* localStorage может быть недоступен — не мешаем странице. */
    }
  }

  function setHash(value) {
    if (!value) return;
    try {
      window.history.replaceState(null, '', value);
    } catch (error) {
      /* На file:// history может быть ограничена. */
    }
  }

  function activatePath(path, options = {}) {
    if (path !== 'earn' && path !== 'team') return;
    const { updateHash = true, persist = true } = options;
    activePath = path;

    pathSections.forEach((section) => {
      section.hidden = section.id !== path;
    });

    if (updateHash) setHash(`#${path}`);
    if (persist) storePath(path);

    window.requestAnimationFrame(() => {
      updateTimeline();
      updateCalculator(false);
    });
  }

  function scrollToElement(element, offset = 24, smooth = true) {
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth && motionOn ? 'smooth' : 'auto'
    });
  }

  function pathOffset() {
    return 24;
  }

  function scrollToPath(path, smooth = true) {
    const section = document.getElementById(path);
    if (!section || section.hidden) return;
    scrollToElement(section, pathOffset(), smooth);
  }

  function switchPath(path, origin) {
    if (transitionBusy) return;
    const target = document.getElementById(path);
    if (!target) return;

    const rect = origin?.element?.getBoundingClientRect();
    const point = {
      x: Number.isFinite(origin?.x) && origin.x > 0
        ? origin.x
        : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2),
      y: Number.isFinite(origin?.y) && origin.y > 0
        ? origin.y
        : (rect ? rect.top + rect.height / 2 : window.innerHeight / 2)
    };

    if (!motionOn || !transitionOverlay) {
      activatePath(path);
      scrollToPath(path, true);
      return;
    }

    transitionBusy = true;
    transitionOverlay.getAnimations().forEach((animation) => animation.cancel());
    transitionOverlay.hidden = false;
    transitionOverlay.className = `path-transition${path === 'team' ? ' path-transition--team' : ''}`;

    const radius = Math.hypot(
      Math.max(point.x, window.innerWidth - point.x),
      Math.max(point.y, window.innerHeight - point.y)
    ) + 24;
    const startClip = `circle(0px at ${point.x}px ${point.y}px)`;
    const endClip = `circle(${radius}px at ${point.x}px ${point.y}px)`;

    transitionOverlay.style.clipPath = startClip;
    const expand = transitionOverlay.animate(
      [{ clipPath: startClip }, { clipPath: endClip }],
      { duration: 230, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' }
    );

    const finish = () => {
      window.setTimeout(() => {
        const collapse = transitionOverlay.animate(
          [{ clipPath: endClip }, { clipPath: startClip }],
          { duration: 200, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'forwards' }
        );
        collapse.finished.then(() => {
          transitionOverlay.hidden = true;
          transitionOverlay.style.clipPath = '';
          transitionBusy = false;
        }).catch(() => {
          transitionOverlay.hidden = true;
          transitionOverlay.style.clipPath = '';
          transitionBusy = false;
        });
      }, 20);
    };

    expand.finished.then(() => {
      activatePath(path);
      scrollToPath(path, true);
      finish();
    }).catch(() => {
      activatePath(path);
      scrollToPath(path, true);
      transitionOverlay.hidden = true;
      transitionOverlay.style.clipPath = '';
      transitionBusy = false;
    });
  }

  pathCards.forEach((card) => {
    const path = card.dataset.path;

    card.addEventListener('click', (event) => {
      switchPath(path, {
        element: card,
        x: event.clientX,
        y: event.clientY
      });
    });

    if (motionOn && finePointer) {
      let tiltFrame = 0;
      let nextEvent = null;

      const applyTilt = () => {
        tiltFrame = 0;
        if (!nextEvent) return;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (nextEvent.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (nextEvent.clientY - rect.top) / rect.height));
        card.style.setProperty('--ry', `${((x - .5) * 6).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((.5 - y) * 5).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      };

      card.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        nextEvent = event;
        if (!tiltFrame) tiltFrame = window.requestAnimationFrame(applyTilt);
      });

      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    }
  });

  changePathButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const choose = document.getElementById('choose');
      scrollToElement(choose, (header?.offsetHeight || 0) + 18, true);
    });
  });

  /* Nav "Вопросы": FAQ живёт внутри пути 01, поэтому открываем его при необходимости. */
  const faqLink = $('[data-faq-link]');
  if (faqLink) {
    faqLink.addEventListener('click', (event) => {
      event.preventDefault();
      const earn = document.getElementById('earn');
      const faq = document.getElementById('faq');
      if (earn?.hidden) {
        activatePath('earn', { updateHash: false, persist: false });
      }
      setHash('#faq');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToElement(faq, (header?.offsetHeight || 0) + 18, true);
        });
      });
    });
  }

  const hashPath = window.location.hash.replace('#', '');
  if (hashPath === 'earn' || hashPath === 'team') {
    activatePath(hashPath, { updateHash: false, persist: false });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToPath(hashPath, false));
    });
  } else if (hashPath === 'faq') {
    activatePath('earn', { updateHash: false, persist: false });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollToElement(document.getElementById('faq'), (header?.offsetHeight || 0) + 18, false);
      });
    });
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'earn' || hash === 'team') {
      if (activePath !== hash) {
        activatePath(hash, { updateHash: false, persist: false });
      }
      window.requestAnimationFrame(() => scrollToPath(hash, true));
    } else if (hash === 'faq') {
      if (document.getElementById('earn')?.hidden) {
        activatePath('earn', { updateHash: false, persist: false });
      }
      window.requestAnimationFrame(() => {
        scrollToElement(document.getElementById('faq'), (header?.offsetHeight || 0) + 18, true);
      });
    }
  });

  /* Запоминаем выбор, но не выбираем путь автоматически при обычном открытии. */
  const storedPath = readStoredPath();
  if (storedPath === 'earn' || storedPath === 'team') {
    document.documentElement.dataset.lastPath = storedPath;
  }

  /* ---------- Timeline fill ---------- */
  function updateTimeline() {
    const timeline = $('[data-path-section]:not([hidden]) [data-timeline]');
    if (!timeline) return;

    const steps = $$('.timeline-step', timeline);
    if (isStatic) {
      timeline.style.setProperty('--tl-progress', '1');
      steps.forEach((step) => step.classList.add('is-active'));
      return;
    }

    const rect = timeline.getBoundingClientRect();
    const viewport = window.innerHeight;
    const start = viewport * 0.82;
    const end = viewport * 0.28;
    const span = Math.max(1, rect.height + (start - end));
    const progress = Math.max(0, Math.min(1, (start - rect.top) / span));

    timeline.style.setProperty('--tl-progress', progress.toFixed(4));
    steps.forEach((step, index) => {
      const threshold = steps.length > 1 ? (index / (steps.length - 1)) * 0.9 : 0;
      step.classList.toggle('is-active', progress >= threshold);
    });
  }

  /* ---------- FAQ accordion ---------- */
  const faqItems = $$('.faq-item');
  faqItems.forEach((item) => {
    const button = $('.faq-q', item);
    if (!button) return;

    button.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');

      faqItems.forEach((other) => {
        other.classList.remove('is-open');
        const otherButton = $('.faq-q', other);
        if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
      });

      if (willOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Copy Telegram handle ---------- */
  const toast = $('#toast');
  let toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1800);
  }

  function fallbackCopy(value) {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch (error) {
      return false;
    }
  }

  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = `@${telegram}`;
      let copied = false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          copied = true;
        } else {
          copied = fallbackCopy(value);
        }
      } catch (error) {
        copied = fallbackCopy(value);
      }

      if (copied) {
        showToast('Скопировано');
        const originalHTML = button.dataset.originalHtml || button.innerHTML;
        button.dataset.originalHtml = originalHTML;
        button.textContent = 'Скопировано';
        window.clearTimeout(button._copyTimer);
        button._copyTimer = window.setTimeout(() => {
          button.innerHTML = originalHTML;
        }, 1600);
      } else {
        showToast(`Не получилось — напиши @${telegram}`);
      }
    });
  });

  /* ---------- Magnetic buttons ---------- */
  if (motionOn && finePointer) {
    $$('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        const rect = button.getBoundingClientRect();
        const x = event.clientX - (rect.left + rect.width / 2);
        const y = event.clientY - (rect.top + rect.height / 2);
        const max = 6;
        const dx = Math.max(-max, Math.min(max, x * 0.12));
        const dy = Math.max(-max, Math.min(max, y * 0.12));
        button.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      });

      button.addEventListener('pointerleave', () => {
        button.style.transform = '';
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealElements = $$('[data-reveal]');
  if (motionOn && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-ready');

    revealElements.forEach((el) => {
      const group = el.closest('[data-reveal-group]');
      if (group) {
        const items = $$('[data-reveal]', group);
        const index = items.indexOf(el);
        el.style.setProperty('--reveal-delay', `${Math.min(index * 70, 350)}ms`);
      }
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -6% 0px'
    });

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Boot: first chrome state ---------- */
  updateChrome();
  updateTimeline();
  window.addEventListener('scroll', requestChromeUpdate, { passive: true });
  window.addEventListener('resize', requestChromeUpdate);

  /* Expose a tiny read-only helper for manually checking the formula in DevTools. */
  Object.defineProperty(window, 'RKO_CALC', {
    value: () => calculate(readCalcInputs()),
    writable: false,
    configurable: false
  });
})();
