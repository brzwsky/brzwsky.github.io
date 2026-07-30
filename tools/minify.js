#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runNpx(pkg, args) {
	try {
		execFileSync(NPX, ['--yes', pkg, ...args], {
			cwd: ROOT,
			stdio: 'inherit',
		});
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to minify with ${pkg}: ${details}`);
	}
}

function minifyCss(input, output) {
	runNpx('clean-css-cli', [
		'-O2',
		'-o',
		path.join(ROOT, output),
		path.join(ROOT, input),
	]);
}

function minifyJs(input, output) {
	runNpx('terser', [
		path.join(ROOT, input),
		'--compress',
		'passes=2',
		'--mangle',
		'--comments',
		'false',
		'--output',
		path.join(ROOT, output),
	]);
}

function exists(file) {
	return fs.existsSync(path.join(ROOT, file));
}

function run() {
	if (exists('css/style.css')) {
		minifyCss('css/style.css', 'css/style.minified.css');
		console.log('✅ Main CSS minified -> css/style.minified.css');
	}

	if (exists('css/style.reviews.css')) {
		minifyCss('css/style.reviews.css', 'css/style.reviews.minified.css');
		console.log('✅ Review CSS minified -> css/style.reviews.minified.css');
	}

	if (exists('css/popups.css')) {
		minifyCss('css/popups.css', 'css/popups.minified.css');
		console.log('✅ Popups CSS minified -> css/popups.minified.css');
	}

	if (exists('app.js')) {
		minifyJs('app.js', 'app.minified.js');
		console.log('✅ JS minified -> app.minified.js');
	}

	if (exists('popups.js')) {
		minifyJs('popups.js', 'popups.minified.js');
		console.log('✅ Popups JS minified -> popups.minified.js');
	}
}

run();
