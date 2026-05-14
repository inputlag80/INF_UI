# InfinityUI — Procedural Interface Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Size](https://img.shields.io/badge/size-5%20KB-blue)](InfinityUI.js)

**Более 10²⁸ визуальных вариаций интерфейса.**  
Бесконечная кастомизация через HSL + Alpha + динамические паттерны.  
Умный контраст, шеринг пресетов и реакция на события.

## Содержание

- [Возможности](#возможности)
- [Быстрый старт](#быстрый-старт)
- [API Документация](#api-документация)
  - [Конструктор](#конструктор)
  - [Методы](#методы)
  - [CSS-переменные](#css-переменные)
- [Пример интеграции](#пример-интеграции)
  - [Подключение к HTML](#подключение-к-html)
  - [Использование в Gradio (на примере gen-image)](#использование-в-gradio-на-примере-gen-image)
- [Шеринг пресетов](#шеринг-пресетов)
- [Реакция на события](#реакция-на-события)
- [Кастомизация движка](#кастомизация-движка)
## Возможности
- `**Математическая генерация цвета**` — не требует текстур, только один JS-файл.
- `**HSL + Alpha**` — полный контроль над оттенком, насыщенностью, яркостью и прозрачностью.
- `**Динамические паттерны**` — встроенная анимация «дыхания» (`pulse`) или статичный режим.
- `**Умный контраст**` — цвет текста автоматически подбирается (чёрный/белый) в зависимости от яркости фона.
- `**Шеринг пресетов**` — компактный Base64‑хэш для экспорта и импорта стилей.
- `**Реакция на события**` — метод `.alert()` временно переводит интерфейс в «аварийную» красно‑пульсирующую тему.
- `**Никаких зависимостей**` — чистый `JavaScript` (ES6), работает в любом современном браузере.
## Быстрый старт
1. Скачайте [`InfinityUI.js`](InfinityUI.js) и положите в папку с вашим проектом.
2. Подключите скрипт в HTML:
```html
<script src="InfinityUI.js"></script>
```
Создайте экземпляр и управляйте стилями:
```javascript
// Инициализация
const ui = new InfinityUI({
    hue: 200,        // оттенок (0–360)
    saturation: 80,  // насыщенность (0–100)
    lightness: 50,   // яркость (0–100)
    alpha: 1,        // общая прозрачность (0–1)
    bgAlpha: 0.9,    // прозрачность фона
    glowSize: 20,    // размер свечения
    speed: 2,        // скорость пульсации
    mode: 'pulse'    // 'pulse' или 'static'
});

// Изменить оттенок на лету
ui.update({ hue: 340 });

// Получить хэш текущего стиля
const hash = ui.exportHash();

// Применить хэш - например, полученный от другого человека 
ui.importHash(hash);

// Временная пульсация 1.5 секунды
ui.alert();
В вашем CSS используйте CSS‑переменные, которые обновляет движок:
```
```css
.my-panel {
    background: var(--ui-bg);
    border: 1px solid var(--ui-border);
    color: var(--ui-text);
    box-shadow: var(--ui-glow);
}

.my-button {
    background: var(--ui-primary);
    color: var(--ui-text);
}
```

API Документация
Конструктор
```javascript
new InfinityUI(options)
```
Параметры options:
```
Параметр	Тип	По умолчанию	Диапазон	Описание
hue	number	200	0–360	Оттенок (H) в HSL
saturation	number	80	0–100	Насыщенность (S) в HSL
lightness	number	50	0–100	Яркость (L) в HSL
alpha	number	1	0–1	Прозрачность основного цвета
bgAlpha	number	0.9	0–1	Прозрачность фона
glowSize	number	20	0–50	Размер свечения в пикселях
speed	number	2	0–10	Скорость анимации только для pulse
mode	string	'pulse'	'pulse' / 'static'	Режим анимации
```
Методы
```javascript
ui.update(params)
```
Обновляет один или несколько параметров.

```javascript
ui.update({ hue: 180, lightness: 70, speed: 3 });
ui.exportHash()
```
Возвращает строку (Base64), содержащую все текущие настройки.
Пример: ```"MjAwfDgwfDUwfDF8MC45fDIwfDJ8MQ=="```

```javascript
const shareCode = ui.exportHash();
console.log(shareCode);
ui.importHash(hash)
```
Применяет настройки из ранее сгенерированного хэша.
Возвращает true при успехе, иначе false.

```javascript
const success = ui.importHash("MjAwfDgwfDUwfDF8MC45fDIwfDJ8MQ==");
if (success) console.log("Стиль применён!");
ui.alert(duration = 1.5)
```
Временно переключает интерфейс в «аварийный» режим: красный оттенок, максимальная насыщенность, ускоренная пульсация. Через duration секунд стиль плавно возвращается к исходному.

```javascript
ui.alert(2.0); // 2 секунды пульсации
ui.destroy()
```
Останавливает цикл анимации (requestAnimationFrame). Полезно, если экземпляр больше не нужен.

```javascript
ui.destroy();
```
CSS-переменные
InfinityUI автоматически записывает значения в следующие CSS‑переменные на элементе :root:
```
Переменная	Назначение
--ui-primary	Основной акцентный цвет (фон кнопок и т.п.)
--ui-bg	         Цвет фона панелей
--ui-text	Цвет текста (автоматический контраст)
--ui-glow	Свечение (box-shadow)
--ui-border	Цвет рамок
```
Вы можете переопределить имена переменных, изменив объект CSS_VARS в начале файла InfinityUI.js.

Пример интеграции
Подключение к HTML
Минимальный рабочий пример:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            background: var(--ui-bg);
            color: var(--ui-text);
        }
        button {
            background: var(--ui-primary);
            color: var(--ui-text);
            box-shadow: var(--ui-glow);
            border: 1px solid var(--ui-border);
            padding: 10px 20px;
        }
    </style>
</head>
<body>
    <button>Нажми меня</button>
    <script src="InfinityUI.js"></script>
    <script>
        const ui = new InfinityUI({ hue: 200 });
        // Меняем цвет каждые 2 секунды (для демонстрации)
        setInterval(() => {
            ui.update({ hue: Math.random() * 360 });
        }, 2000);
    </script>
</body>
</html>
```
Использование в Gradio (на примере gen-image)
В проекте gen-image InfinityUI интегрирован для кастомизации интерфейса. Ниже показаны ключевые шаги (без привязки к конкретной реализации генератора).

`Подключение скрипта в Gradio`
```python
import gradio as gr

custom_js = """
async () => {
    const script = document.createElement('script');
    script.src = '/file=InfinityUI.js';
    document.head.appendChild(script);
    script.onload = () => {
        window.ui = new InfinityUI({
            hue: 200,
            saturation: 80,
            lightness: 50,
            mode: 'pulse',
            speed: 2
        });
    };
}
"""

with gr.Blocks(js=custom_js) as demo:
    ...
```
`Применение CSS-переменных`
```python
with gr.Blocks(css="""
    .gradio-container { background: var(--ui-bg) !important; }
    .gr-button-primary { background: var(--ui-primary) !important; }
""") as demo:
    ...
```
```markdown
Добавление элементов управления
Слайдер для изменения оттенка:
```

```python
hue_slider = gr.Slider(0, 360, value=200, label="Оттенок интерфейса")
hue_slider.change(
    fn=None,
    inputs=hue_slider,
    outputs=None,
    js="(val) => { if(window.ui) window.ui.update({hue: val}); }"
)
```
Кнопка для вызова alert():

```python
alert_btn = gr.Button("Симуляция ошибки")
alert_btn.click(
    fn=None,
    inputs=None,
    outputs=None,
    js="() => { if(window.ui) window.ui.alert(2.0); }"
)
```
Полный код проекта gen-image можно посмотреть в его репозитории.
https://github.com/inputlag80/gen-image

`Шеринг пресетов`
InfinityUI позволяет обмениваться стилями с помощью компактного хэша.
Пример поля ввода для импорта:

```html
<input type="text" id="hash-input" placeholder="Вставьте хэш">
<button onclick="ui.importHash(document.getElementById('hash-input').value)">Применить</button>
```
В Gradio аналогичный функционал можно реализовать через gr.Textbox и gr.Button с JavaScript‑колбэком (см. пример выше).

`Реакция на события`
Метод alert() удобно вызывать при возникновении ошибок, долгих операциях или в игровых ситуациях (низкое здоровье, опасность).

```javascript
fetch('/api/data')
    .catch(err => {
        ui.alert(2.0);
        console.error('Ошибка загрузки данных');
    });
```
`Кастомизация движка`
`InfinityUI` легко адаптировать под свои нужды:
Сменить имена CSS‑переменных — отредактируйте объект CSS_VARS в начале файла.
Добавить новые паттерны анимации — расширьте метод _calculateWithConfig.
Увеличить количество параметров в хэше — измените массивы в `exportHash()` и `importHash()`.
