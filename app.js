/**
 * TopJeu - Main Application Script
 * Clean Vanilla JS Architecture (zero dependencies)
 */

'use strict';

/* ==========================================================================
   GLOBAL CONSTANTS & UTILITIES
   ========================================================================== */

const observerRegistry = {
	scrollObservers: new Map(),
	globalScrollObserver: null
};

const TIMINGS = {
	BANNER_INITIAL_DELAY: 2000,
	BANNER_COLLAPSE_DELAY: 400,
	BANNER_DISMISS_DELAY: 500,
	BANNER_EXPAND_COMPLETE: 400,
	MODAL_ANIMATION: 300,
	MODAL_OPENING_DELAY: 50,
	TOUCH_RESET_DELAY: 100
};

const KEYBOARD_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

const storage = {
	get(key) {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	set(key, value) {
		try {
			localStorage.setItem(key, value);
			return true;
		} catch {
			return false;
		}
	},
	remove(key) {
		try {
			localStorage.removeItem(key);
			return true;
		} catch {
			return false;
		}
	}
};

const ANALYTICS_BANNER_MARKUP = `
<div class="cookie-consent-banner">
	<p>
		Nous utilisons Google Analytics pour améliorer votre expérience.
		Acceptez-vous ?
	</p>
	<button id="accept-analytics-btn" tabindex="-1">Accepter</button>
</div>`;

const COOKIE_BANNER_MARKUP = `
<div
	id="cookie-banner"
	class="cookie-banner"
	role="dialog"
	aria-labelledby="cookie-title"
	aria-describedby="cookie-description"
	tabindex="-1"
>
	<div
		class="cookie-banner__minimized-icon"
		aria-label="Afficher les parametres des cookies"
		tabindex="0"
		role="button"
	>
		🍪
	</div>
	<div class="cookie-banner__container">
		<div class="cookie-banner__content">
			<h4 id="cookie-title">Nous sommes des cookies</h4>
			<p id="cookie-description" class="cookie-banner__text">
				Nous utilisons des cookies pour améliorer votre expérience sur
				TopJeu. En continuant à naviguer, vous acceptez notre utilisation
				des cookies.
			</p>
			<p class="cookie-banner__note">
				<a
					href="#privacy-popup"
					class="footer__link cookie-banner__link--emphasis"
					id="cookie-privacy-link"
					data-popup-target="privacy"
				>Lire la politique de confidentialité</a>
			</p>
		</div>
		<div class="cookie-banner__actions">
			<button
				id="cookie-accept"
				class="cookie-banner__btn cookie-banner__btn--accept"
				aria-label="Accepter tous les cookies"
			>
				OK pour moi
			</button>
			<button
				id="cookie-decline"
				class="cookie-banner__btn cookie-banner__btn--decline"
				aria-label="Refuser les cookies non essentiels"
			>
				Non merci
			</button>
		</div>
	</div>
</div>`;

let cachedIsMobile = null;
let viewportCheckTime = 0;

function isMobileViewport() {
	const now = Date.now();
	if (cachedIsMobile !== null && now - viewportCheckTime < 100) {
		return cachedIsMobile;
	}
	const docEl = document.documentElement;
	const widths = [
		typeof window.innerWidth === 'number' ? window.innerWidth : null,
		docEl && typeof docEl.clientWidth === 'number' ? docEl.clientWidth : null,
		window.screen && typeof window.screen.width === 'number' ? window.screen.width : null
	].filter(w => w && w > 0);

	const isMobile = widths.length ? Math.min(...widths) <= 768 : window.innerWidth <= 768;
	cachedIsMobile = isMobile;
	viewportCheckTime = now;
	return isMobile;
}

function isCanadianPage() {
	const lang = [document.documentElement?.getAttribute('lang'), document.body?.getAttribute('lang')]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	const path = window.location.pathname.toLowerCase();
	return lang.includes('ca') || path === '/ca' || path.startsWith('/ca/');
}

function ensureCookieMarkup() {
	if (!document.body) return;

	if (!document.querySelector('.cookie-consent-banner')) {
		const overlay = document.querySelector('.nav-menu__overlay');
		if (overlay) {
			overlay.insertAdjacentHTML('beforebegin', `${ANALYTICS_BANNER_MARKUP}\n`);
		} else {
			document.body.insertAdjacentHTML('afterbegin', ANALYTICS_BANNER_MARKUP);
		}
	}

	if (!document.getElementById('cookie-banner')) {
		const scrolltop = document.getElementById('scrolltop');
		if (scrolltop) {
			scrolltop.insertAdjacentHTML('beforebegin', `${COOKIE_BANNER_MARKUP}\n`);
		} else {
			document.body.insertAdjacentHTML('beforeend', COOKIE_BANNER_MARKUP);
		}
	}
}

function runWhenIdle(callback, timeout = 2500) {
	if (typeof window.requestIdleCallback !== 'function') {
		setTimeout(callback, Math.min(timeout, 1200));
	} else {
		window.requestIdleCallback(() => callback(), { timeout });
	}
}

function scheduleNonCriticalTask(task, { timeout = 2500, waitForLoad = false } = {}) {
	const run = () => runWhenIdle(task, timeout);
	if (waitForLoad && document.readyState !== 'complete') {
		window.addEventListener('load', run, { once: true });
	} else {
		run();
	}
}

window.addEventListener('resize', () => {
	cachedIsMobile = null;
}, { passive: true });

/* ==========================================================================
   COOKIE CONSENT MANAGER
   ========================================================================== */

class CookieConsentManager {
	constructor() {
		this.banner = document.getElementById('cookie-banner');
		this.acceptBtn = document.getElementById('cookie-accept');
		this.declineBtn = document.getElementById('cookie-decline');
		this.settingsLink = document.getElementById('cookie-settings-link');
		this.minimizedIcon = this.banner?.querySelector('.cookie-banner__minimized-icon');
		this.container = this.banner?.querySelector('.cookie-banner__container');
		this.analyticsBanner = document.querySelector('.cookie-consent-banner');
		this.analyticsAccept = document.getElementById('accept-analytics-btn');
		this.consentKey = 'cookieConsent';
		this.analyticsConsentKey = 'analyticsConsent';
		this.analyticsLoaded = false;
		this.init();
	}

	init() {
		this.loadConsentState();
		this.setupEventListeners();
		this.loadAnalyticsIfConsented();
		this.setupAnalyticsBanner();
	}

	loadConsentState() {
		if (!this.banner) return;
		const consent = storage.get(this.consentKey);
		if (consent === 'accepted') {
			this.banner.style.display = 'none';
		} else if (consent === 'declined') {
			this.minimizeBanner();
		} else {
			setTimeout(() => this.showBanner(), TIMINGS.BANNER_INITIAL_DELAY);
		}
	}

	showBanner() {
		if (!this.banner) return;
		requestAnimationFrame(() => {
			this.banner.classList.add('is-visible');
			if (this.acceptBtn) this.acceptBtn.focus();
		});
	}

	resetBannerAnimationClasses() {
		if (!this.banner) return;
		this.banner.classList.remove('cookie-banner--expanding');
		this.banner.classList.remove('cookie-banner--minimizing');
	}

	setContainerState({ maxHeight, opacity, transform } = {}) {
		if (!this.container) return;
		if (maxHeight !== undefined) this.container.style.maxHeight = maxHeight;
		if (opacity !== undefined) this.container.style.opacity = opacity;
		if (transform !== undefined) this.container.style.transform = transform;
	}

	getExpandedContainerHeight() {
		return this.container ? `${this.container.scrollHeight}px` : '0px';
	}

	finalizeExpandedBanner() {
		this.resetBannerAnimationClasses();
		this.setContainerState({ maxHeight: 'none', opacity: '1', transform: '' });
	}

	finalizeMinimizedBanner() {
		if (!this.banner) return;
		this.resetBannerAnimationClasses();
		this.banner.classList.add('cookie-banner--minimized');
		this.setContainerState({ maxHeight: '0', opacity: '0' });
	}

	minimizeBanner() {
		if (!this.banner || !this.container) return;
		this.setContainerState({ maxHeight: this.getExpandedContainerHeight() });
		requestAnimationFrame(() => {
			this.resetBannerAnimationClasses();
			this.banner.classList.remove('is-visible');
			this.banner.classList.add('cookie-banner--minimizing');
			this.setContainerState({ opacity: '0' });
		});
		setTimeout(() => {
			requestAnimationFrame(() => this.finalizeMinimizedBanner());
		}, TIMINGS.BANNER_COLLAPSE_DELAY);
	}

	expandBanner() {
		if (!this.banner || !this.container) return;
		requestAnimationFrame(() => {
			this.resetBannerAnimationClasses();
			this.banner.classList.remove('cookie-banner--minimized');
			this.banner.classList.add('cookie-banner--expanding');
			this.banner.classList.add('is-visible');
			this.setContainerState({
				maxHeight: this.getExpandedContainerHeight(),
				opacity: '1',
				transform: 'translate3d(0, 0, 0) scale(1)'
			});
		});
		setTimeout(() => {
			requestAnimationFrame(() => this.finalizeExpandedBanner());
		}, TIMINGS.BANNER_EXPAND_COMPLETE);
	}

	setupEventListeners() {
		if (!this.banner) return;
		document.addEventListener('click', (event) => {
			if (event.target === this.acceptBtn) {
				this.acceptCookies();
			} else if (event.target === this.declineBtn) {
				this.declineCookies();
			} else if (event.target === this.settingsLink) {
				event.preventDefault();
				this.resetAndShowBanner();
			} else if (
				event.target === this.minimizedIcon ||
				(event.target === this.banner && this.banner.classList.contains('cookie-banner--minimized'))
			) {
				this.expandBanner();
			}
		});

		document.addEventListener('keydown', (event) => {
			const isTriggerKey = event.key === 'Enter' || event.key === ' ';
			if (event.target === this.settingsLink && isTriggerKey) {
				event.preventDefault();
				this.resetAndShowBanner();
			} else if (event.target === this.minimizedIcon && isTriggerKey) {
				event.preventDefault();
				this.expandBanner();
			}
		});
	}

	setupAnalyticsBanner() {
		if (!this.analyticsBanner || !this.analyticsAccept) return;
		this.analyticsBanner.classList.remove('u-fade-in');
		this.analyticsBanner.classList.remove('u-hidden');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');
		this.analyticsAccept.setAttribute('tabindex', '-1');

		if (storage.get(this.analyticsConsentKey) === 'accepted') {
			this.hideAnalyticsBanner();
		} else {
			setTimeout(() => this.showAnalyticsBanner(), TIMINGS.BANNER_INITIAL_DELAY);
		}

		this.analyticsAccept.addEventListener('click', () => {
			storage.set(this.analyticsConsentKey, 'accepted');
			this.hideAnalyticsBanner();
			this.loadAnalytics();
			this.updateGtagConsent('granted');
		});
	}

	showAnalyticsBanner() {
		if (!this.analyticsBanner) return;
		this.analyticsBanner.style.display = '';
		this.analyticsBanner.classList.add('is-visible');
		this.analyticsBanner.setAttribute('aria-hidden', 'false');
		if (this.analyticsAccept) this.analyticsAccept.removeAttribute('tabindex');
	}

	hideAnalyticsBanner() {
		if (!this.analyticsBanner) return;
		this.analyticsBanner.classList.remove('is-visible');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');
		if (this.analyticsAccept) this.analyticsAccept.setAttribute('tabindex', '-1');
		this.analyticsBanner.style.display = 'none';
	}

	resetAndShowBanner() {
		if (!this.banner || !this.container) return;
		this.banner.style.display = '';
		this.resetBannerAnimationClasses();
		this.banner.classList.remove('cookie-banner--minimized');
		this.setContainerState({ maxHeight: '', opacity: '1', transform: '' });
		this.showBanner();
	}

	acceptCookies() {
		storage.set(this.consentKey, 'accepted');
		if (this.banner) {
			this.banner.classList.remove('is-visible');
			setTimeout(() => {
				this.banner.style.display = 'none';
			}, TIMINGS.BANNER_DISMISS_DELAY);
		}
		this.loadAnalytics();
		this.updateGtagConsent('granted');
	}

	declineCookies() {
		storage.set(this.consentKey, 'declined');
		this.minimizeBanner();
		this.disableAnalytics();
		this.updateGtagConsent('denied');
	}

	loadAnalytics() {
		if (this.analyticsLoaded) return;
		this.loadGoogleAnalytics();
		this.loadAhrefsAnalytics();
		this.analyticsLoaded = true;
	}

	loadGoogleAnalytics() {
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://www.googletagmanager.com/gtag/js?id=G-YYE4H0PHYY';
		document.head.appendChild(script);
		script.onload = () => {
			if (typeof gtag !== 'undefined') {
				gtag('js', new Date());
				gtag('config', 'G-YYE4H0PHYY');
			}
		};
	}

	loadAhrefsAnalytics() {
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://analytics.ahrefs.com/analytics.js';
		script.setAttribute('data-key', 'flKbnmCKyZQK+Qsr+U37qQ');
		document.head.appendChild(script);
	}

	disableAnalytics() {
		if (typeof gtag !== 'undefined') {
			gtag('consent', 'update', {
				analytics_storage: 'denied',
				ad_storage: 'denied'
			});
		}
		this.removeAnalyticsCookies();
	}

	removeAnalyticsCookies() {
		const pastDate = 'Thu, 01 Jan 1970 00:00:00 GMT';
		['_ga', '_gid', '_gat', '_gcl_au', '_fbp', '_uetsid', '_uetvid'].forEach(cookieName => {
			document.cookie = `${cookieName}=; expires=${pastDate}; path=/; domain=.${window.location.hostname}`;
			document.cookie = `${cookieName}=; expires=${pastDate}; path=/`;
		});
	}

	updateGtagConsent(status) {
		if (typeof gtag !== 'undefined') {
			gtag('consent', 'update', {
				analytics_storage: status,
				ad_storage: status
			});
		}
	}

	loadAnalyticsIfConsented() {
		if (storage.get(this.consentKey) === 'accepted') {
			this.loadAnalytics();
		}
	}

	clearConsent() {
		storage.remove(this.consentKey);
		this.disableAnalytics();
		this.removeAnalyticsCookies();
		if (this.banner && this.container) {
			this.banner.style.display = '';
			this.resetBannerAnimationClasses();
			this.banner.classList.remove('cookie-banner--minimized');
			this.setContainerState({ maxHeight: '', opacity: '1', transform: '' });
			setTimeout(() => this.showBanner(), 10);
		}
	}
}

/* ==========================================================================
   LANGUAGE TOGGLE MANAGER
   ========================================================================== */

class LanguageToggleManager {
	constructor() {
		this.root = document.querySelector('[data-language-toggle]');
		this.toggleButton = this.root?.querySelector('[data-language-toggle-button]') || null;
		this.options = this.root?.querySelector('[data-language-options]') || null;
		this.isOpen = false;
		this.heroBaseTop = null;
		this.handleDocumentClick = this.handleDocumentClick.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.init();
	}

	init() {
		if (!this.root || !this.toggleButton || !this.options) return;
		this.syncActiveOption();
		this.toggleButton.addEventListener('click', (event) => {
			event.preventDefault();
			this.toggle();
		});
		this.options.addEventListener('click', (event) => {
			const option = event.target?.closest?.('.language-toggle__option');
			if (option) {
				if (this.isSamePage(option)) event.preventDefault();
				this.close();
			}
		});
		document.addEventListener('click', this.handleDocumentClick);
		document.addEventListener('keydown', this.handleKeydown);
		window.addEventListener('resize', this.handleResize);
		this.updateMobileHeroOffset();
	}

	normalizePath(pathname) {
		let path = pathname || '/';
		while (path.length > 1 && path.endsWith('/')) {
			path = path.slice(0, -1);
		}
		return path;
	}

	syncActiveOption() {
		const optionsList = Array.from(this.options?.querySelectorAll('.language-toggle__option') || []);
		if (!optionsList.length) return;

		const currentUrl = new URL(window.location.href);
		const currentPath = this.normalizePath(currentUrl.pathname);
		let activeOption = null;

		optionsList.forEach(opt => {
			try {
				const optUrl = new URL(opt.href, window.location.href);
				const isCurrent = optUrl.origin === currentUrl.origin && this.normalizePath(optUrl.pathname) === currentPath;
				opt.classList.toggle('is-active', isCurrent);
				if (isCurrent) {
					opt.setAttribute('aria-current', 'page');
					activeOption = opt;
				} else {
					opt.removeAttribute('aria-current');
				}
			} catch {}
		});

		if (!activeOption) {
			const currentFlag = this.toggleButton?.querySelector('.language-toggle__flag')?.textContent?.trim();
			if (currentFlag) {
				activeOption = optionsList.find(opt => opt.querySelector('.language-toggle__flag')?.textContent?.trim() === currentFlag) || null;
				if (activeOption) {
					activeOption.classList.add('is-active');
					activeOption.setAttribute('aria-current', 'page');
				}
			}
		}
	}

	isSamePage(option) {
		try {
			const targetUrl = new URL(option.href, window.location.href);
			const currentUrl = new URL(window.location.href);
			return (
				targetUrl.origin === currentUrl.origin &&
				this.normalizePath(targetUrl.pathname) === this.normalizePath(currentUrl.pathname) &&
				targetUrl.search === currentUrl.search &&
				targetUrl.hash === currentUrl.hash
			);
		} catch {
			return option.classList.contains('is-active');
		}
	}

	toggle() {
		if (this.isOpen) this.close();
		else this.open();
	}

	open() {
		if (this.isOpen || !this.root || !this.toggleButton) return;
		this.isOpen = true;
		this.root.classList.add('is-open');
		this.toggleButton.setAttribute('aria-expanded', 'true');
		this.updateMobileHeroOffset();
	}

	close() {
		if (!this.isOpen || !this.root || !this.toggleButton) return;
		this.isOpen = false;
		this.root.classList.remove('is-open');
		this.toggleButton.setAttribute('aria-expanded', 'false');
		this.clearMobileHeroOffset();
	}

	handleDocumentClick(event) {
		if (this.isOpen && this.root && !this.root.contains(event.target)) {
			this.close();
		}
	}

	handleKeydown(event) {
		if (event.key === 'Escape' && this.isOpen) {
			this.close();
		}
	}

	handleResize() {
		if (this.isOpen) this.updateMobileHeroOffset();
		else this.clearMobileHeroOffset();
	}

	updateMobileHeroOffset() {
		if (!this.root || !this.toggleButton) return;
		const isMobile = isMobileViewport();
		const heroTitle = document.querySelector('main > .hero__title');
		if (!isMobile || !heroTitle || !this.isOpen) {
			return this.clearMobileHeroOffset();
		}

		if (this.heroBaseTop == null) {
			this.heroBaseTop = heroTitle.getBoundingClientRect().top;
		}

		const update = () => {
			const rootRect = this.root.getBoundingClientRect();
			const optionsRect = this.options ? this.options.getBoundingClientRect() : rootRect;
			const maxBottom = Math.max(rootRect.bottom, optionsRect.bottom);
			const baseTop = this.heroBaseTop ?? heroTitle.getBoundingClientRect().top;
			const offset = Math.max(0, Math.ceil(maxBottom - baseTop + 10));

			document.documentElement.style.setProperty('--language-toggle-hero-offset', `${offset}px`);
			document.body.classList.toggle('is-language-toggle-open', offset > 0 && this.isOpen);
		};

		requestAnimationFrame(update);
		setTimeout(update, 90);
		setTimeout(update, 240);
	}

	clearMobileHeroOffset() {
		this.heroBaseTop = null;
		document.documentElement.style.setProperty('--language-toggle-hero-offset', '0px');
		document.body.classList.remove('is-language-toggle-open');
	}

	cleanup() {
		document.removeEventListener('click', this.handleDocumentClick);
		document.removeEventListener('keydown', this.handleKeydown);
		window.removeEventListener('resize', this.handleResize);
		this.clearMobileHeroOffset();
	}
}

/* ==========================================================================
   MOBILE MENU MANAGER
   ========================================================================== */

class MobileMenuManager {
	constructor() {
		this.burger = document.querySelector('.header__burger');
		this.menu = document.querySelector('.nav-menu');
		this.closeBtn = document.querySelector('.nav-menu__close');
		this.overlay = document.querySelector('.nav-menu__overlay');
		this.hideTimeout = null;
		this.scrollLocked = false;
		this.savedBodyStyles = null;
		this.savedRootStyles = null;
		this.handleResize = this.handleResize.bind(this);
		this.updateVisibilityState = this.updateVisibilityState.bind(this);
		this.init();

		if (this.menu) {
			this.updateVisibilityState();
			requestAnimationFrame(() => {
				document.body.classList.add('is-menu-animations-ready');
				this.updateVisibilityState();
			});
		}
		window.addEventListener('resize', this.handleResize);
	}

	init() {
		this.setupEventListeners();
		this.bindMenuActions();
	}

	setupEventListeners() {
		document.addEventListener('click', (event) => {
			const burgerClick = event.target.closest?.('.header__burger');
			const closeClick = event.target.closest?.('.nav-menu__close');
			const overlayClick = this.overlay && event.target === this.overlay;

			if (burgerClick && this.burger && burgerClick === this.burger) {
				if (this.menu && this.menu.classList.contains('is-active')) {
					this.closeMenu();
				} else {
					this.openMenu();
				}
			} else if (
				(closeClick && this.closeBtn && closeClick === this.closeBtn) ||
				overlayClick ||
				(this.menu &&
					this.menu.classList.contains('is-active') &&
					!this.menu.contains(event.target) &&
					!this.burger.contains(event.target))
			) {
				this.closeMenu();
			}
		});

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && this.menu && this.menu.classList.contains('is-active')) {
				this.closeMenu();
			}
		});
	}

	bindMenuActions() {
		if (!this.menu) return;
		this.menu.querySelectorAll('[data-popup-target]').forEach(trigger => {
			const openPopup = () => {
				const target = trigger.dataset.popupTarget;
				if (target && window.popupManager) {
					this.closeMenu({ restoreFocus: false });
					requestAnimationFrame(() => {
						window.popupManager?.open?.(target);
					});
				}
			};
			trigger.addEventListener('click', openPopup);
			trigger.addEventListener('touchstart', (e) => {
				if (!e.touches || e.touches.length <= 1) openPopup();
			});
		});
	}

	openMenu() {
		if (!this.menu || !this.burger) return;
		if (isMobileViewport()) {
			if (!this.menu.classList.contains('is-active')) {
				if (this.hideTimeout) {
					clearTimeout(this.hideTimeout);
					this.hideTimeout = null;
				}
				if (this.menu.hasAttribute('hidden')) {
					this.menu.removeAttribute('hidden');
					return requestAnimationFrame(() => this.activateMenu());
				}
				this.activateMenu();
			}
		} else {
			this.updateVisibilityState();
		}
	}

	activateMenu() {
		if (!this.menu || !this.burger) return;
		if (!this.menu.classList.contains('is-active')) {
			this.menu.setAttribute('aria-hidden', 'false');
			this.menu.classList.add('is-active');
			this.menu.scrollTop = 0;
			this.burger.style.display = 'none';
			document.body.classList.add('is-menu-open');
			this.lockScroll();
			this.burger.setAttribute('aria-expanded', 'true');
		}
	}

	closeMenu({ restoreFocus = true } = {}) {
		if (!this.menu || !this.burger) return;
		const wasActive = this.menu.classList.contains('is-active');
		this.menu.classList.remove('is-active');

		if (isMobileViewport()) {
			this.burger.style.display = 'flex';
			document.body.classList.remove('is-menu-open');
			this.unlockScroll();
			this.menu.setAttribute('aria-hidden', 'true');
			if (this.hideTimeout) clearTimeout(this.hideTimeout);
			this.hideTimeout = setTimeout(() => {
				if (this.menu && !this.menu.classList.contains('is-active') && isMobileViewport()) {
					this.menu.setAttribute('hidden', '');
				}
			}, 400);
			if (restoreFocus && wasActive) this.burger.focus();
		} else {
			this.updateVisibilityState();
		}

		this.burger.setAttribute('aria-expanded', 'false');
		if (!isMobileViewport()) this.unlockScroll();
	}

	updateVisibilityState() {
		if (!this.menu) return;
		const isMobile = isMobileViewport();
		const isActive = this.menu.classList.contains('is-active');

		if (isMobile) {
			if (isActive) {
				this.menu.removeAttribute('hidden');
				this.menu.setAttribute('aria-hidden', 'false');
				document.body.classList.add('is-menu-open');
				this.lockScroll();
				if (this.burger) {
					this.burger.style.display = 'none';
					this.burger.setAttribute('aria-expanded', 'true');
				}
			} else {
				this.menu.setAttribute('aria-hidden', 'true');
				if (!this.menu.hasAttribute('hidden')) this.menu.setAttribute('hidden', '');
				if (this.burger) {
					this.burger.style.display = 'flex';
					this.burger.setAttribute('aria-expanded', 'false');
				}
				document.body.classList.remove('is-menu-open');
				this.unlockScroll();
			}
		} else {
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
			this.menu.removeAttribute('hidden');
			this.menu.setAttribute('aria-hidden', 'false');
			this.menu.classList.remove('is-active');
			document.body.classList.remove('is-menu-open');
			this.unlockScroll();
			if (this.burger) {
				this.burger.style.display = '';
				this.burger.setAttribute('aria-expanded', 'false');
			}
		}
	}

	lockScroll() {
		if (this.scrollLocked) return;
		this.scrollLocked = true;
		const bodyStyle = document.body.style;
		const rootStyle = document.documentElement.style;

		this.savedBodyStyles = {
			overflow: bodyStyle.overflow || '',
			overscrollBehavior: bodyStyle.overscrollBehavior || ''
		};
		this.savedRootStyles = {
			overflow: rootStyle.overflow || '',
			overscrollBehavior: rootStyle.overscrollBehavior || ''
		};

		bodyStyle.overflow = 'hidden';
		bodyStyle.overscrollBehavior = 'contain';
		rootStyle.overflow = 'hidden';
		rootStyle.overscrollBehavior = 'contain';
	}

	unlockScroll() {
		if (!this.scrollLocked) return;
		const bodyStyle = document.body.style;
		const rootStyle = document.documentElement.style;
		const bodySaved = this.savedBodyStyles || {};
		const rootSaved = this.savedRootStyles || {};

		bodyStyle.overflow = bodySaved.overflow || '';
		bodyStyle.overscrollBehavior = bodySaved.overscrollBehavior || '';
		rootStyle.overflow = rootSaved.overflow || '';
		rootStyle.overscrollBehavior = rootSaved.overscrollBehavior || '';

		this.scrollLocked = false;
		this.savedBodyStyles = null;
		this.savedRootStyles = null;
	}

	handleResize() {
		this.updateVisibilityState();
		if (!isMobileViewport()) {
			this.closeMenu({ restoreFocus: false });
		}
	}
}

/* ==========================================================================
   FAQ ACCORDION MANAGER
   ========================================================================== */

class FAQManager {
	constructor() {
		this.faqSection = document.querySelector('.faq-section');
		this.faqQuestions = this.faqSection?.querySelectorAll('.faq-question, .faq__question') || [];
		this.init();
	}

	init() {
		this.setupFAQ();
	}

	setupFAQ() {
		const container = this.faqSection || document;
		container.addEventListener('click', (event) => {
			const trigger = event.target?.closest?.('.faq-question, .faq__question');
			if (trigger) this.toggleFAQ(trigger);
		});

		container.addEventListener('keydown', (event) => {
			const isTrigger = event.key === 'Enter' || event.key === ' ';
			if (event.defaultPrevented || !isTrigger) return;
			const trigger = event.target?.closest?.('.faq-question, .faq__question');
			if (trigger) {
				event.preventDefault();
				this.toggleFAQ(trigger);
			}
		});
	}

	toggleFAQ(trigger) {
		const answer = trigger.nextElementSibling;
		if (!answer) return;

		const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

		if (isExpanded) {
			answer.style.maxHeight = `${answer.scrollHeight}px`;
			answer.offsetHeight; // Force reflow
			requestAnimationFrame(() => {
				answer.style.maxHeight = '0';
			});
			trigger.setAttribute('aria-expanded', 'false');
			answer.classList.remove('is-open');
		} else {
			// Close other open questions
			const activeQuestions = this.faqQuestions.length > 0
				? Array.from(this.faqQuestions).filter(q => q.getAttribute('aria-expanded') === 'true')
				: Array.from(document.querySelectorAll('.faq-question[aria-expanded="true"], .faq__question[aria-expanded="true"]'));

			activeQuestions.forEach(activeTrigger => {
				if (activeTrigger !== trigger) {
					const activeAnswer = activeTrigger.nextElementSibling;
					if (activeAnswer) {
						activeAnswer.style.maxHeight = `${activeAnswer.scrollHeight}px`;
						activeAnswer.offsetHeight;
						requestAnimationFrame(() => {
							activeAnswer.style.maxHeight = '0';
						});
						activeAnswer.classList.remove('is-open');
					}
					activeTrigger.setAttribute('aria-expanded', 'false');
				}
			});

			answer.style.maxHeight = '0';
			answer.classList.add('is-open');
			trigger.setAttribute('aria-expanded', 'true');
			answer.offsetHeight;
			requestAnimationFrame(() => {
				answer.style.maxHeight = `${answer.scrollHeight}px`;
			});
		}
	}

	cleanup() {}
}

/* ==========================================================================
   ANIMATION MANAGER (Logo & Bell Notifications)
   ========================================================================== */

class AnimationManager {
	constructor() {
		this.headerLogo = document.querySelector('.header__logo');
		this.disclaimer = document.querySelector('.disclaimer');
		this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		this.init();
	}

	init() {
		this.setupHeaderLogoAnimation();
		this.setupBellAnimation();
	}

	setupHeaderLogoAnimation() {
		if (!this.headerLogo || this.reduceMotion) return;
		this.headerLogo.classList.add('rotate-once');

		const triggerRotation = (event) => {
			if (this.reduceMotion) return;
			this.headerLogo.classList.add('rotate-once');
			if (event && event.type === 'keydown') event.preventDefault();
		};

		this.headerLogo.addEventListener('click', triggerRotation);
		this.headerLogo.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') triggerRotation(event);
		});
		this.headerLogo.addEventListener('animationend', () => {
			this.headerLogo.classList.remove('rotate-once');
		});
	}

	setupBellAnimation() {
		if (!this.disclaimer || this.reduceMotion) return;

		setTimeout(() => {
			if (!this.disclaimer.classList.contains('bell-muted')) {
				this.disclaimer.classList.add('bell-start');
				setTimeout(() => this.disclaimer.classList.remove('bell-start'), 2000);
			}
		}, 2000);

		this.disclaimer.addEventListener('mouseenter', () => {
			if (!this.disclaimer.classList.contains('bell-muted')) {
				this.disclaimer.classList.add('bell-start');
				setTimeout(() => this.disclaimer.classList.remove('bell-start'), 2000);
			}
		});

		this.disclaimer.addEventListener('click', () => {
			this.disclaimer.classList.toggle('bell-muted');
			this.disclaimer.classList.remove('bell-start');
		});
	}
}

/* ==========================================================================
   SCROLL REVEAL MANAGER (IntersectionObserver)
   ========================================================================== */

class ScrollRevealManager {
	constructor() {
		this.elements = document.querySelectorAll('.u-fade-in');
		this.faqSection = document.querySelector('.faq-section');
		this.casinoSection = document.querySelector('.casino-cards-container');
		this.heroSection = document.querySelector('.hero-section');
		this.sectionElements = { faq: [], casino: [], hero: [], other: [] };
		this.adaptiveConfig = this.getAdaptiveConfig();
		this.sectionOnceSettings = { faq: true, casino: true, hero: false, other: true };
		this.elementOnceSettings = new Map();
		this.enableScrollUpAnimations = true;
		this.init();
	}

	getAdaptiveConfig() {
		const isMobile = isMobileViewport();
		const isTablet = window.innerWidth <= 1024;
		const docHeight = document.documentElement.scrollHeight;
		const winHeight = window.innerHeight;
		const isLongPage = docHeight > 3 * winHeight;
		const isVeryLongPage = docHeight > 5 * winHeight;
		const totalCount = this.elements.length;
		const isHighCount = totalCount > 100;

		let margin = '0px 0px -5px 0px';
		if (isMobile) margin = '0px 0px -2px 0px';
		else if (isVeryLongPage || isHighCount) margin = '0px 0px -50px 0px';
		else if (isLongPage) margin = '0px 0px -20px 0px';

		let threshold = isMobile ? 0.01 : isTablet ? 0.08 : 0.05;
		if (isVeryLongPage || isHighCount) {
			threshold = Math.max(0.01, 0.5 * threshold);
		}

		return {
			threshold,
			rootMargin: margin,
			sectionThreshold: isMobile ? 10 : isTablet ? 15 : 20,
			isLongPage,
			isVeryLongPage,
			isHighElementCount: isHighCount,
			totalElements: totalCount
		};
	}

	init() {
		if (!this.elements.length) return;
		this.categorizeElements();
		this.setupSectionObservers();
		this.setupResizeListener();
	}

	showVisibleElementsImmediately() {
		const reveal = () => {
			const height = window.innerHeight;
			const width = window.innerWidth;
			this.elements.forEach(el => {
				const rect = el.getBoundingClientRect();
				if (rect.top < 0.9 * height && rect.bottom > 0 && rect.left < width && rect.right > 0) {
					el.classList.add('is-visible');
				}
			});
		};
		if (typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(reveal);
		} else {
			reveal();
		}
	}

	setupResizeListener() {
		let resizeTimer;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(() => {
				this.adaptiveConfig = this.getAdaptiveConfig();
				this.recreateObservers();
			}, 250);
		});
	}

	categorizeElements() {
		Array.from(this.elements).forEach(el => {
			if (this.faqSection && this.faqSection.contains(el)) {
				this.sectionElements.faq.push(el);
			} else if (this.casinoSection && this.casinoSection.contains(el)) {
				this.sectionElements.casino.push(el);
			} else if (this.heroSection && this.heroSection.contains(el)) {
				this.sectionElements.hero.push(el);
			} else {
				this.sectionElements.other.push(el);
			}
		});
	}

	setupSectionObservers() {
		Object.entries(this.sectionElements).forEach(([sectionKey, elList]) => {
			if (elList.length === 0) return;
			if (elList.length > this.adaptiveConfig.sectionThreshold) {
				this.createSectionObserver(sectionKey, elList);
			} else {
				this.useGlobalObserver(elList);
			}
		});
	}

	createSectionObserver(sectionKey, elList) {
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					if (this.getElementOnce(entry.target) && entry.intersectionRatio >= 0.5) {
						observer.unobserve(entry.target);
					}
				} else if (this.enableScrollUpAnimations && !isMobileViewport()) {
					entry.target.classList.remove('is-visible');
				}
			});
		}, {
			threshold: this.adaptiveConfig.threshold,
			rootMargin: this.adaptiveConfig.rootMargin
		});

		observerRegistry.scrollObservers.set(sectionKey, observer);
		elList.forEach(el => observer.observe(el));
	}

	useGlobalObserver(elList) {
		if (!observerRegistry.globalScrollObserver) {
			observerRegistry.globalScrollObserver = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						if (entry.intersectionRatio >= 0.5) {
							observerRegistry.globalScrollObserver.unobserve(entry.target);
						}
					} else if (this.enableScrollUpAnimations && !isMobileViewport()) {
						entry.target.classList.remove('is-visible');
					}
				});
			}, {
				threshold: this.adaptiveConfig.threshold,
				rootMargin: this.adaptiveConfig.rootMargin
			});
		}
		elList.forEach(el => observerRegistry.globalScrollObserver.observe(el));
	}

	recreateObservers() {
		this.cleanup();
		this.setupSectionObservers();
	}

	getElementOnce(el) {
		if (el && this.elementOnceSettings.has(el)) {
			return this.elementOnceSettings.get(el);
		}
		const sectionKey = this.getElementSection(el);
		return this.sectionOnceSettings[sectionKey] ?? true;
	}

	getElementSection(el) {
		if (this.faqSection && this.faqSection.contains(el)) return 'faq';
		if (this.casinoSection && this.casinoSection.contains(el)) return 'casino';
		if (this.heroSection && this.heroSection.contains(el)) return 'hero';
		return 'other';
	}

	cleanup() {
		observerRegistry.scrollObservers.forEach(obs => obs.disconnect());
		observerRegistry.scrollObservers.clear();
		if (observerRegistry.globalScrollObserver) {
			observerRegistry.globalScrollObserver.disconnect();
			observerRegistry.globalScrollObserver = null;
		}
	}
}

/* ==========================================================================
   DARK MODE MANAGER
   ========================================================================== */

class DarkModeManager {
	constructor() {
		this.toggleButton = document.getElementById('theme-toggle');
		this.themeIcon = this.toggleButton?.querySelector('.theme-icon') || null;
		this.body = document.body;
		this.mutationObserver = null;
		this.darkImageObserver = null;
		this.observedContainers = new Set();
		this.pendingUpdates = new Set();
		this.updateScheduled = false;
		this.init();
	}

	init() {
		if (!this.body) return;
		this.setupDarkImageObserver();
		this.loadSavedTheme();
		if (this.toggleButton) {
			this.setupEventListeners();
			this.setupMutationObserver();
		}
	}

	loadSavedTheme() {
		if (!this.body) return;
		const savedTheme = storage.get('theme');
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		let isDark = false;

		if (savedTheme) {
			isDark = savedTheme === 'dark';
			this.body.classList.toggle('is-dark', isDark);
			this.body.classList.toggle('is-light', !isDark);
		} else {
			isDark = mediaQuery.matches;
			this.body.classList.toggle('is-dark', isDark);
			this.body.classList.toggle('is-light', !isDark);
		}

		this.updateToggleButtonState(isDark);
		this.updateLogos({ deferOffscreen: true });

		const handleSystemChange = (event) => {
			if (!storage.get('theme')) {
				const systemDark = event.matches;
				if (!this.body) return;
				this.body.classList.toggle('is-dark', systemDark);
				this.body.classList.toggle('is-light', !systemDark);
				this.updateLogos({ deferOffscreen: true });
				this.updateToggleButtonState(systemDark);
			}
		};

		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', handleSystemChange);
		} else if (typeof mediaQuery.addListener === 'function') {
			mediaQuery.addListener(handleSystemChange);
		}
	}

	setupEventListeners() {
		this.toggleButton?.addEventListener('click', () => this.toggleTheme());
	}

	setupMutationObserver() {
		if (!this.mutationObserver) {
			this.mutationObserver = new MutationObserver(mutations => {
				mutations.forEach(mutation => {
					if (mutation.type === 'childList') {
						mutation.addedNodes.forEach(node => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								const images = node.matches?.('.casino-card__image')
									? [node]
									: node.querySelectorAll?.('.casino-card__image') || [];
								if (images.length > 0) {
									images.forEach(img => this.pendingUpdates.add(img));
								}
							}
						});
					}
				});
				this.scheduleBatchedUpdate();
			});
		}

		const containers = [
			document.querySelector('.casino-cards-container'),
			document.querySelector('.casino-section'),
			document.querySelector('.main-content')
		].filter(Boolean);

		containers.forEach(container => {
			if (!this.observedContainers.has(container)) {
				this.mutationObserver.observe(container, { childList: true, subtree: true });
				this.observedContainers.add(container);
			}
		});
	}

	scheduleBatchedUpdate() {
		if (this.updateScheduled) return;
		this.updateScheduled = true;
		requestAnimationFrame(() => {
			this.processBatchedUpdates();
			this.updateScheduled = false;
		});
	}

	processBatchedUpdates() {
		if (this.pendingUpdates.size === 0) return;
		const images = Array.from(this.pendingUpdates);
		this.pendingUpdates.clear();
		this.updateDynamicLogos(images);
	}

	setupDarkImageObserver() {
		if (typeof IntersectionObserver !== 'function') return;
		this.darkImageObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					this.applyThemeToImage(entry.target);
					this.darkImageObserver?.unobserve(entry.target);
				}
			});
		}, { rootMargin: '300px 0px' });
	}

	shouldDeferThemeSync(img) {
		if (!img || !this.darkImageObserver) return false;
		if (img.loading !== 'lazy' || img.complete) return false;
		const rect = img.getBoundingClientRect();
		const margin = Math.max(0.5 * window.innerHeight, 200);
		return rect.top > window.innerHeight + margin || rect.bottom < -margin;
	}

	observeDarkImages(images) {
		if (!this.darkImageObserver) return;
		images.forEach(img => {
			if (img?.dataset?.dark) {
				if (this.shouldDeferThemeSync(img)) {
					this.darkImageObserver.observe(img);
				} else {
					this.darkImageObserver.unobserve(img);
				}
			}
		});
	}

	applyThemeToImage(img) {
		if (!img || !this.body) return;
		const isDark = this.body.classList.contains('is-dark');
		const darkSrc = img.dataset.dark;

		if (darkSrc) {
			if (isDark) {
				if (!img.dataset.light) img.dataset.light = img.src;
				img.src = darkSrc;
			} else if (img.dataset.light) {
				img.src = img.dataset.light;
			}

			if (img.srcset) {
				if (isDark) {
					if (!img.dataset.originalSrcset) img.dataset.originalSrcset = img.srcset;
					img.srcset = '';
				} else if (img.dataset.originalSrcset) {
					img.srcset = img.dataset.originalSrcset;
				}
			}
		}
	}

	syncThemeForImages(images) {
		images.forEach(img => {
			if (img?.dataset?.dark) {
				if (this.shouldDeferThemeSync(img)) {
					this.darkImageObserver?.observe(img);
				} else {
					this.darkImageObserver?.unobserve(img);
					this.applyThemeToImage(img);
				}
			}
		});
	}

	updateDynamicLogos(images) {
		this.syncThemeForImages(images);
	}

	toggleTheme() {
		if (!this.body) return;
		const isDark = !this.body.classList.contains('is-dark');
		this.body.classList.toggle('is-dark', isDark);
		this.body.classList.toggle('is-light', !isDark);
		this.updateToggleUI(isDark);
		this.updateToggleButtonState(isDark);
		storage.set('theme', isDark ? 'dark' : 'light');
		this.updateLogos({ deferOffscreen: true });
	}

	updateToggleUI(isDark) {
		if (this.themeIcon) {
			const symbol = isDark ? '☀️' : '🌙';
			if (this.themeIcon.textContent !== symbol) {
				this.themeIcon.textContent = symbol;
			}
		}
	}

	updateToggleButtonState(isDark) {
		if (!this.toggleButton) return;
		if (isDark) {
			this.toggleButton.classList.add('is-active', 'is-dark-mode');
			this.toggleButton.classList.remove('is-light-mode');
		} else {
			this.toggleButton.classList.remove('is-active', 'is-dark-mode');
			this.toggleButton.classList.add('is-light-mode');
		}
	}

	updateLogos({ deferOffscreen = false } = {}) {
		if (!this.body) return;
		const images = Array.from(document.querySelectorAll('img[data-dark]'));
		if (!deferOffscreen) {
			return this.syncThemeForImages(images);
		}
		const visibleImages = images.filter(img => !this.shouldDeferThemeSync(img));
		this.syncThemeForImages(visibleImages);
		this.observeDarkImages(images);
	}

	cleanup() {
		this.mutationObserver?.disconnect();
		this.mutationObserver = null;
		this.darkImageObserver?.disconnect();
		this.darkImageObserver = null;
		this.observedContainers.clear();
	}
}

/* ==========================================================================
   DOM READY INITIALIZATION & DOM HANDLERS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
	document.documentElement.style.overflow = '';
	document.body.classList.remove('is-menu-open', 'is-modal-open');

	window.languageToggleManager = new LanguageToggleManager();
	window.mobileMenuManager = new MobileMenuManager();
	window.darkModeManager = new DarkModeManager();

	// Reviews Dropdown Submenu
	(function setupAvisDropdown() {
		const toggleBtn = document.querySelector('.nav-menu__avis-toggle');
		const navAvis = document.querySelector('.nav-menu__avis');
		const avisList = document.getElementById('avis-list');
		if (!toggleBtn || !navAvis || !avisList) return;

		const setOpen = (open) => {
			navAvis.classList.toggle('is-open', open);
			toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
			avisList.setAttribute('aria-hidden', open ? 'false' : 'true');
			if (open) avisList.removeAttribute('hidden');
		};

		avisList.removeAttribute('hidden');
		avisList.setAttribute('aria-hidden', 'true');

		toggleBtn.addEventListener('click', (event) => {
			event.preventDefault();
			setOpen(!navAvis.classList.contains('is-open'));
		});

		document.addEventListener('click', (event) => {
			if (!navAvis.contains(event.target) && navAvis.classList.contains('is-open')) {
				setOpen(false);
			}
		});
	})();

	// Header Scroll & ScrollTop Button
	(function setupScrollHandlers() {
		const header = document.querySelector('.header');
		const scrolltop = document.getElementById('scrolltop');
		if (!header && !scrolltop) return;

		let ticking = false;
		const updateScroll = (scrollY) => {
			if (header) {
				if (scrollY > 10) header.classList.add('is-scrolled');
				else header.classList.remove('is-scrolled');
			}
			if (scrolltop) {
				if (scrollY > 300) scrolltop.classList.add('is-visible');
				else scrolltop.classList.remove('is-visible');
			}
			ticking = false;
		};

		window.addEventListener('scroll', () => {
			if (!ticking) {
				ticking = true;
				window.requestAnimationFrame(() => updateScroll(window.scrollY));
			}
		}, { passive: true });

		updateScroll(window.scrollY);

		if (scrolltop) {
			scrolltop.addEventListener('click', (event) => {
				event.preventDefault();
				window.scrollTo({ top: 0, behavior: 'smooth' });
			});
		}
	})();

	// Keyboard Tabbing Accessibility Focus Outline
	(function setupAccessibilityFocus() {
		let isTabbing = false;
		const body = document.body;
		if (!body) return;

		window.addEventListener('keydown', (event) => {
			if (KEYBOARD_KEYS.has(event.key)) {
				isTabbing = true;
				body.classList.add('is-tabbing');
			}
		}, { passive: true });

		const resetFocusState = () => {
			if (isTabbing) {
				isTabbing = false;
				body.classList.remove('is-tabbing');
			}
		};

		window.addEventListener('mousedown', resetFocusState, { passive: true });
		window.addEventListener('touchstart', resetFocusState, { passive: true });
		window.addEventListener('pointerdown', resetFocusState, { passive: true });
	})();

	window.requestAnimationFrame(() => {
		window.scrollRevealManager = new ScrollRevealManager();
	});

	scheduleNonCriticalTask(() => {
		window.faqManager = new FAQManager();
	});

	scheduleNonCriticalTask(() => {
		ensureCookieMarkup();
		window.cookieConsentManager = new CookieConsentManager();
		window.animationManager = new AnimationManager();
	}, { timeout: 1000 });
});

window.clearCookies = function () {
	window.cookieConsentManager?.clearConsent();
};

window.addEventListener('beforeunload', () => {
	window.scrollRevealManager?.cleanup();
	window.darkModeManager?.cleanup();
	window.faqManager?.cleanup();
	window.languageToggleManager?.cleanup();
});