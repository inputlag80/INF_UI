/**
 * InfinityUI — Procedural Interface Engine
 * Version 1.1.1
 * 
 * Более 10²⁸ вариантов интерфейса в 5 КБ кода.
 * Бесконечная кастомизация через HSL + Alpha + динамические паттерны.
 * Умный контраст WCAG, реакция на события, шеринг пресетов.
 * 
 * Использование:
 *   const ui = new InfinityUI({ hue: 200 });
 *   ui.update({ lightness: 60 });
 *   ui.alert(); // пульсация
 *   const hash = ui.exportHash();
 *   ui.importHash(hash);
 *   const json = ui.exportJSON();
 *   ui.importJSON(json);
 */

(function(global) {
  'use strict';

  // = Конфигурация CSS-переменных (привязка к стилям) =
  const CSS_VARS = {
    primary: '--ui-primary',   // основной акцент
    bg:      '--ui-bg',        // фон панелей
    text:    '--ui-text',      // цвет текста - авто-контраст
    glow:    '--ui-glow',      // свечение
    border:  '--ui-border'     // рамки
  };

  // = Утилиты =
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const toFloat = (v, def) => isNaN(parseFloat(v)) ? def : parseFloat(v);

  // Относительная яркость по WCAG (для умного контраста)
  const getLuminance = (r, g, b) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // = Основной класс =
  class InfinityUI {
    /**
     * @param {Object} options - начальные настройки
     * @param {HTMLElement} options.root - корневой элемент для CSS-переменных - по умолчанию :root
     */
    constructor(options = {}) {
      // состояние — то, что попадёт в хэш / JSON
      this.config = {
        h:      clamp(toFloat(options.hue, 200), 0, 360),        // Hue 0-360
        s:      clamp(toFloat(options.saturation, 80), 0, 100),  // Saturation 0-100
        l:      clamp(toFloat(options.lightness, 50), 0, 100),   // Lightness 0-100
        a:      clamp(toFloat(options.alpha, 1), 0, 1),          // Alpha 0-1
        bgA:    clamp(toFloat(options.bgAlpha, 0.9), 0, 1),      // прозрачность фона
        gS:     clamp(toFloat(options.glowSize, 20), 0, 50),     // размер свечения
        speed:  clamp(toFloat(options.speed, 2), 0, 10),         // скорость анимации
        mode:   options.mode === 'static' ? 'static' : 'pulse'   // 'pulse' или 'static'
      };

      // = внутренние переменные =
      this._rafId = null;
      this._alertActive = false;
      this._alertEndTime = 0;
      this._isAnimating = false;
      this._root = options.root instanceof HTMLElement ? options.root : document.documentElement;

      // Привязываем CSS-переменные - можно переопределить
      this.cssVars = { ...CSS_VARS };

      // Привязываем _tick один раз
      this._tick = this._tick.bind(this);

      // Запуск или остановка анимации в зависимости от режима
      this._handleAnimation();
    }

    // = Простейший конвертер HSL → RGB - для расчёта яркости =
    _hslToRgb(h, s, l) {
      h /= 360; s /= 100; l /= 100;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // = Основной расчёт с переданным конфигом =
    _calculateWithConfig(now, cfg) {
      let currentL = cfg.l;

      // Динамический паттерн
      if (cfg.mode === 'pulse' && cfg.speed > 0) {
        currentL += Math.sin(now * cfg.speed) * 15;
        currentL = clamp(currentL, 5, 95);
      }

      // Умный контраст через относительную яркость - WCAG
      const rgb = this._hslToRgb(cfg.h, cfg.s, currentL);
      const lum = getLuminance(rgb[0], rgb[1], rgb[2]);
      const textColor = lum > 0.179 ? '#1a1a1a' : '#ffffff';

      // Сборка строк HSLA
      const primary = `hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a})`;
      const bg = `hsla(${cfg.h}, 20%, 10%, ${cfg.bgA})`;
      const glow = `0 0 ${cfg.gS}px hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a / 2})`;
      const border = `hsla(${cfg.h}, ${cfg.s}%, ${currentL + 20}%, ${cfg.a})`;

      return { primary, bg, text: textColor, glow, border };
    }

    // = Отрисовка кадра (вызывается requestAnimationFrame) =
    _tick(timestamp) {
      const now = timestamp / 1000; // секунды

      let finalConfig = { ...this.config };
      if (this._alertActive) {
        const timeLeft = this._alertEndTime - now;
        if (timeLeft <= 0) {
          this._alertActive = false;
          // Если alert завершился и режим static — нужно перепроверить анимацию
          if (this.config.mode === 'static') {
            this._handleAnimation();
          }
        } else {
          const factor = Math.min(1, timeLeft / 1.5);
          finalConfig.h = 0;   // красный
          finalConfig.s = 100;
          finalConfig.speed = 10 * factor + this.config.speed * (1 - factor);
        }
      }

      const data = this._calculateWithConfig(now, finalConfig);

      const root = this._root;
      root.style.setProperty(this.cssVars.primary, data.primary);
      root.style.setProperty(this.cssVars.bg, data.bg);
      root.style.setProperty(this.cssVars.text, data.text);
      root.style.setProperty(this.cssVars.glow, data.glow);
      root.style.setProperty(this.cssVars.border, data.border);

      this._rafId = requestAnimationFrame(this._tick);
    }

    // = Управление циклом анимации - вкл/выкл =
    _handleAnimation() {
      const shouldAnimate = this.config.mode === 'pulse' || this._alertActive;
      if (shouldAnimate && !this._isAnimating) {
        this._isAnimating = true;
        this._rafId = requestAnimationFrame(this._tick);
      } else if (!shouldAnimate && this._isAnimating) {
        this._isAnimating = false;
        if (this._rafId) {
          cancelAnimationFrame(this._rafId);
          this._rafId = null;
        }
        // Однократный расчёт для статического режима
        const data = this._calculateWithConfig(Date.now() / 1000, this.config);
        const root = this._root;
        root.style.setProperty(this.cssVars.primary, data.primary);
        root.style.setProperty(this.cssVars.bg, data.bg);
        root.style.setProperty(this.cssVars.text, data.text);
        root.style.setProperty(this.cssVars.glow, data.glow);
        root.style.setProperty(this.cssVars.border, data.border);
      }
    }

    // = Публичное обновление настроек =
    /**
     * @param {Object} newParams - { hue, saturation, lightness, alpha, bgAlpha, glowSize, speed, mode }
     */
    update(newParams = {}) {
      const map = {
        hue:        'h',
        saturation: 's',
        lightness:  'l',
        alpha:      'a',
        bgAlpha:    'bgA',
        glowSize:   'gS',
        speed:      'speed',
        mode:       'mode'
      };

      let modeChanged = false;
      for (let [key, val] of Object.entries(newParams)) {
        const cfgKey = map[key];
        if (cfgKey === undefined) continue;

        if (cfgKey === 'mode') {
          const newMode = (val === 'static' ? 'static' : 'pulse');
          if (this.config.mode !== newMode) modeChanged = true;
          this.config.mode = newMode;
        } else {
          let num = parseFloat(val);
          if (isNaN(num)) continue;
          if (cfgKey === 'h') num = clamp(num, 0, 360);
          else if (cfgKey === 's' || cfgKey === 'l') num = clamp(num, 0, 100);
          else if (cfgKey === 'a' || cfgKey === 'bgA') num = clamp(num, 0, 1);
          else if (cfgKey === 'gS') num = clamp(num, 0, 50);
          else if (cfgKey === 'speed') num = clamp(num, 0, 10);
          this.config[cfgKey] = num;
        }
      }

      if (modeChanged) {
        this._handleAnimation();
      } else if (!this._isAnimating) {
        const data = this._calculateWithConfig(Date.now() / 1000, this.config);
        const root = this._root;
        root.style.setProperty(this.cssVars.primary, data.primary);
        root.style.setProperty(this.cssVars.bg, data.bg);
        root.style.setProperty(this.cssVars.text, data.text);
        root.style.setProperty(this.cssVars.glow, data.glow);
        root.style.setProperty(this.cssVars.border, data.border);
      }
    }

    // = Экспорт пресета в сжатый Base64 =
    exportHash() {
      const cfg = this.config;
      const arr = [
        cfg.h,
        cfg.s,
        cfg.l,
        cfg.a,
        cfg.bgA,
        cfg.gS,
        cfg.speed,
        cfg.mode === 'pulse' ? 1 : 0
      ];
      return btoa(arr.join('|'));
    }

    // = Импорт пресета из Base64 =
    importHash(hash) {
      try {
        const decoded = atob(hash);
        const parts = decoded.split('|');
        if (parts.length !== 8) throw new Error('Invalid hash format');
        const [h, s, l, a, bgA, gS, speed, modeFlag] = parts.map(v => parseFloat(v));
        this.config.h = clamp(h, 0, 360);
        this.config.s = clamp(s, 0, 100);
        this.config.l = clamp(l, 0, 100);
        this.config.a = clamp(a, 0, 1);
        this.config.bgA = clamp(bgA, 0, 1);
        this.config.gS = clamp(gS, 0, 50);
        this.config.speed = clamp(speed, 0, 10);
        this.config.mode = modeFlag === 1 ? 'pulse' : 'static';
        this._handleAnimation();
        return true;
      } catch (e) {
        console.warn('InfinityUI importHash error:', e);
        return false;
      }
    }

    // = Экспорт в читаемый JSON =
    exportJSON() {
      return JSON.stringify(this.config);
    }

    // = Импорт из JSON =
    importJSON(jsonString) {
      try {
        const cfg = JSON.parse(jsonString);
        this.config.h = clamp(toFloat(cfg.h, 200), 0, 360);
        this.config.s = clamp(toFloat(cfg.s, 80), 0, 100);
        this.config.l = clamp(toFloat(cfg.l, 50), 0, 100);
        this.config.a = clamp(toFloat(cfg.a, 1), 0, 1);
        this.config.bgA = clamp(toFloat(cfg.bgA, 0.9), 0, 1);
        this.config.gS = clamp(toFloat(cfg.gS, 20), 0, 50);
        this.config.speed = clamp(toFloat(cfg.speed, 2), 0, 10);
        this.config.mode = (cfg.mode === 'static') ? 'static' : 'pulse';
        this._handleAnimation();
        return true;
      } catch (e) {
        console.warn('InfinityUI importJSON error:', e);
        return false;
      }
    }

    // = Реакция на событие - пульсация =
    alert(duration = 1.5) {
      this._alertActive = true;
      this._alertEndTime = (Date.now() / 1000) + duration;
      if (!this._isAnimating) {
        this._handleAnimation();
      }
    }

    // = Уничтожение экземпляра - остановка анимации =
    destroy() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      this._isAnimating = false;
    }

    // = Статический метод для быстрого авто-старта =
    static autoInit(options = {}) {
      if (!global.__INFINITY_UI_INSTANCE__) {
        global.__INFINITY_UI_INSTANCE__ = new InfinityUI(options);
      }
      return global.__INFINITY_UI_INSTANCE__;
    }
  }

  // Экспорт в глобальную область
  global.InfinityUI = InfinityUI;

  // Автозапуск, если в URL есть ?auto-infinity-ui
  if (typeof document !== 'undefined' && document.currentScript) {
    const script = document.currentScript;
    if (script.src.includes('auto') || location.search.includes('auto-infinity-ui')) {
      InfinityUI.autoInit();
    }
  }

})(typeof window !== 'undefined' ? window : global);
