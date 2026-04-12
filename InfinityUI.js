/**
 * InfinityUI — Procedural Interface Engine
 * Version 1.0.0
 * 
 * Более 10²⁸ вариантов интерфейса в 5 КБ кода.
 * Бесконечная кастомизация через HSL + Alpha + динамические паттерны.
 * Умный контраст — текст всегда читаем.
 * Реакция на события — интерфейс может пульсировать при угрозе.
 * Шеринг пресетов через сжатый хэш.
 * 
 * Использование:
 *   const ui = new InfinityUI(options);
 *   ui.update({ hue: 200, lightness: 60, speed: 3 });
 *   ui.alert(); // пульсация
 *   const hash = ui.exportHash();
 *   ui.importHash(hash);
 */

(function(global) {
  'use strict';

  // = Конфигурация CSS-переменных привязка к стилям =
  const CSS_VARS = {
    primary: '--ui-primary',   // основной акцент
    bg:      '--ui-bg',        // фон панелей
    text:    '--ui-text',      // цвет текста (авто-контраст)
    glow:    '--ui-glow',      // свечение
    border:  '--ui-border'     // рамки
  };

  // = Утилиты =
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const toFloat = (v, def) => isNaN(parseFloat(v)) ? def : parseFloat(v);

  // = Основной класс =
  class InfinityUI {
    /**
     * @param {Object} options начальные настройки
     */
    constructor(options = {}) {
      // состояние то, что попадёт в хэш
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
      this._root = document.documentElement;

      // цикл анимации
      this._tick = this._tick.bind(this);
      this._rafId = requestAnimationFrame(this._tick);

      // Привязываем управляющие CSS-переменные - можно переопределить
      this.cssVars = { ...CSS_VARS };
    }

    // = Основной расчёт тек значений =
    _calculate(now) {
      const cfg = this.config;
      let currentL = cfg.l;

      // Динамический паттерн
      if (cfg.mode === 'pulse' && cfg.speed > 0) {
        currentL += Math.sin(now * cfg.speed) * 15;
        currentL = clamp(currentL, 5, 95); // не даём уйти в чёрное/белое
      }

      // Умный контраст текста
      const textColor = (currentL > 65) ? '#1a1a1a' : '#ffffff';

      // Сборка строк HSLA
      const primary = `hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a})`;
      const bg = `hsla(${cfg.h}, 20%, 10%, ${cfg.bgA})`;
      const glow = `0 0 ${cfg.gS}px hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a / 2})`;
      const border = `hsla(${cfg.h}, ${cfg.s}%, ${currentL + 20}%, ${cfg.a})`;

      return { primary, bg, text: textColor, glow, border };
    }

    // = Отрисовка кадра =
    _tick(timestamp) {
      const now = timestamp / 1000; // секунды

      // Обработка временного alert-режима
      let finalConfig = { ...this.config };
      if (this._alertActive) {
        const timeLeft = this._alertEndTime - now;
        if (timeLeft <= 0) {
          this._alertActive = false;
        } else {
          // плавное затухание эффекта
          const factor = Math.min(1, timeLeft / 1.5); // 1.5 сек длительность
          finalConfig.h = 0;   // красный
          finalConfig.s = 100;
          finalConfig.speed = 10 * factor + this.config.speed * (1 - factor);
        }
      }

      // Применяем текущие настройки с учётом alert
      const data = this._calculateWithConfig(now, finalConfig);

      // Пишем в CSS-переменные
      const root = this._root;
      root.style.setProperty(this.cssVars.primary, data.primary);
      root.style.setProperty(this.cssVars.bg, data.bg);
      root.style.setProperty(this.cssVars.text, data.text);
      root.style.setProperty(this.cssVars.glow, data.glow);
      root.style.setProperty(this.cssVars.border, data.border);

      this._rafId = requestAnimationFrame(this._tick);
    }

    // Расчёт с переданным конфигом для alert
    _calculateWithConfig(now, cfg) {
      let currentL = cfg.l;
      if (cfg.mode === 'pulse' && cfg.speed > 0) {
        currentL += Math.sin(now * cfg.speed) * 15;
        currentL = clamp(currentL, 5, 95);
      }
      const textColor = (currentL > 65) ? '#1a1a1a' : '#ffffff';
      const primary = `hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a})`;
      const bg = `hsla(${cfg.h}, 20%, 10%, ${cfg.bgA})`;
      const glow = `0 0 ${cfg.gS}px hsla(${cfg.h}, ${cfg.s}%, ${currentL}%, ${cfg.a / 2})`;
      const border = `hsla(${cfg.h}, ${cfg.s}%, ${currentL + 20}%, ${cfg.a})`;
      return { primary, bg, text: textColor, glow, border };
    }

    // = Публичное обновление настроек =
    /**
     * Обновить один или несколько параметров.
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

      for (let [key, val] of Object.entries(newParams)) {
        const cfgKey = map[key];
        if (cfgKey === undefined) continue;

        if (cfgKey === 'mode') {
          this.config.mode = (val === 'static' ? 'static' : 'pulse');
        } else {
          let num = parseFloat(val);
          if (isNaN(num)) continue;
          // clamp
          if (cfgKey === 'h') num = clamp(num, 0, 360);
          else if (cfgKey === 's' || cfgKey === 'l') num = clamp(num, 0, 100);
          else if (cfgKey === 'a' || cfgKey === 'bgA') num = clamp(num, 0, 1);
          else if (cfgKey === 'gS') num = clamp(num, 0, 50);
          else if (cfgKey === 'speed') num = clamp(num, 0, 10);

          this.config[cfgKey] = num;
        }
      }
      // Сразу применяется в следующем кадре
    }

    // Экспорт пресета - короткий хэш
    /**
     * Возвращает строку вида "200|80|50|1|0.9|20|2|pulse" закодированную в base64
     */
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
      // преобразуем в строку с разделителем |
      const str = arr.join('|');
      return btoa(str);
    }

    // = Импорт пресета из хэша =
    /**
     * @param {string} hash - ранее сгенерированный exportHash()
     * @returns {boolean} успех
     */
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

        return true;
      } catch (e) {
        console.warn('InfinityUI importHash error:', e);
        return false;
      }
    }

    // --=--- Реакция на событие =
    /**
     * @param {number} duration - длительность в секундах - по умолчанию 1.5
     */
    alert(duration = 1.5) {
      this._alertActive = true;
      this._alertEndTime = (Date.now() / 1000) + duration;
    }

    // = Уничтожение экземпляра (остановка анимации) =
    destroy() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    // = Статический метод для быстрого старта с авто-экземпляром =
    static autoInit(options = {}) {
      if (!global.__INFINITY_UI_INSTANCE__) {
        global.__INFINITY_UI_INSTANCE__ = new InfinityUI(options);
      }
      return global.__INFINITY_UI_INSTANCE__;
    }
  }

  // Экспорт в глобальную область
  global.InfinityUI = InfinityUI;

  // Автоматический запуск, если в URL есть ?auto-infinity-ui
  if (typeof document !== 'undefined' && document.currentScript) {
    const script = document.currentScript;
    if (script.src.includes('auto') || location.search.includes('auto-infinity-ui')) {
      InfinityUI.autoInit();
    }
  }

})(typeof window !== 'undefined' ? window : global);