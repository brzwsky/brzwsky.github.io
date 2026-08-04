# Interlinking Module / Модуль перелинковки

Данный модуль вынесен отдельно, чтобы его можно было гибко подключать или отключать на любых страницах сайта.

## 1. Подключение стилей (CSS)

В `<head>` нужной страницы добавьте стили модуля:
```html
<link rel="stylesheet" href="/interlinking.minified.css" />
```

## 2. Подключение HTML-блока

Вставьте HTML-шаблон перед секцией `<section id="faq">` (или в любом другом месте):

- Для **FR GEO**: см. `modules/interlinking/interlinking-fr.html`
- Для **CA GEO**: см. `modules/interlinking/interlinking-ca.html`

> **Примечание**: На конкретной странице обзора из списка ссылок удаляется ссылка на текущую страницу.

## 3. Отключение модуля

Чтобы полностью отключить перелинковку на странице:
1. Удалите тег `<link rel="stylesheet" href="/interlinking.minified.css" />`.
2. Удалите секцию `<section class="interlinking-hub ...">`.
