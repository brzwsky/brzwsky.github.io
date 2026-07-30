#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MINIFY_SCRIPT = path.join(ROOT, 'tools', 'minify.js');

const filesToWatch = [
	'app.js',
	'popups.js',
	'style.css',
	'style.reviews.css',
	'popups.css',
	'css'
];

console.log('👀 Начинаем следить за изменениями в файлах...');

let debounceTimer;
function runMinify(filename) {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		console.log(`\n🔄 Файл ${filename} изменен. Обновляем минифицированные версии...`);
		try {
			execFileSync('node', [MINIFY_SCRIPT], {
				cwd: ROOT,
				stdio: 'inherit'
			});
			console.log(`✅ Обновление завершено!`);
		} catch (err) {
			console.error(`❌ Ошибка при минификации:`, err.message);
		}
	}, 300);
}

filesToWatch.forEach(file => {
	const filePath = path.join(ROOT, file);
	if (fs.existsSync(filePath)) {
		console.log(`- Отслеживается: ${file}`);
		fs.watch(filePath, { recursive: true }, (eventType, filename) => {
			if (filename) runMinify(filename);
		});
	}
});

