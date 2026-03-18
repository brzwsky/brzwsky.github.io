const observerRegistry = {
	scrollObservers: new Map(),
	globalScrollObserver: null,
};
const TIMINGS = {
	BANNER_INITIAL_DELAY: 2000,
	BANNER_COLLAPSE_DELAY: 390,
	BANNER_DISMISS_DELAY: 500,
	BANNER_EXPAND_DELAY: 20,
	BANNER_EXPAND_COMPLETE: 450,
	MODAL_ANIMATION: 300,
	MODAL_OPENING_DELAY: 50,
	TOUCH_RESET_DELAY: 100,
};
const SCROLLTOP_VISIBLE_OFFSET = 300;
const KEYBOARD_KEYS = new Set([
	'Tab',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Escape',
]);
const MOBILE_MAX_WIDTH = 768;
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
			return !0;
		} catch {
			return !1;
		}
	},
	remove(key) {
		try {
			localStorage.removeItem(key);
			return !0;
		} catch {
			return !1;
		}
	},
};
let cachedIsMobile = null;
let viewportCheckTime = 0;
const VIEWPORT_CACHE_DURATION = 100;
function isMobileViewport() {
	const now = Date.now();
	if (
		cachedIsMobile !== null &&
		now - viewportCheckTime < VIEWPORT_CACHE_DURATION
	) {
		return cachedIsMobile;
	}
	const doc = document.documentElement;
	const candidates = [
		typeof window.innerWidth === 'number' ? window.innerWidth : null,
		doc && typeof doc.clientWidth === 'number' ? doc.clientWidth : null,
		window.screen && typeof window.screen.width === 'number'
			? window.screen.width
			: null,
	].filter((value) => value && value > 0);
	const result = candidates.length
		? Math.min(...candidates) <= MOBILE_MAX_WIDTH
		: window.innerWidth <= MOBILE_MAX_WIDTH;
	cachedIsMobile = result;
	viewportCheckTime = now;
	return result;
}
window.addEventListener(
	'resize',
	() => {
		cachedIsMobile = null;
	},
	{ passive: !0 },
);
class CookieConsentManager {
	constructor() {
		this.banner = document.getElementById('cookie-banner');
		this.acceptBtn = document.getElementById('cookie-accept');
		this.declineBtn = document.getElementById('cookie-decline');
		this.settingsLink = document.getElementById('cookie-settings-link');
		this.minimizedIcon = this.banner?.querySelector(
			'.cookie-banner__minimized-icon',
		);
		this.container = this.banner?.querySelector('.cookie-banner__container');
		this.analyticsBanner = document.querySelector('.cookie-consent-banner');
		this.analyticsAccept = document.getElementById('accept-analytics-btn');
		this.consentKey = 'cookieConsent';
		this.analyticsConsentKey = 'analyticsConsent';
		this.analyticsLoaded = !1;
		this.ahrefsLoaded = !1;
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
		if (!consent) {
			setTimeout(() => this.showBanner(), TIMINGS.BANNER_INITIAL_DELAY);
		} else if (consent === 'accepted') {
			this.banner.style.display = 'none';
		} else if (consent === 'declined') {
			this.minimizeBanner();
		}
	}
	showBanner() {
		if (!this.banner) return;
		requestAnimationFrame(() => {
			this.banner.classList.add('is-visible');
			if (this.acceptBtn) this.acceptBtn.focus();
		});
	}
	minimizeBanner() {
		if (!this.banner || !this.container) return;
		requestAnimationFrame(() => {
			this.banner.classList.remove('is-visible');
			this.banner.classList.add('cookie-banner--minimizing');
			this.container.style.opacity = '0';
			this.container.style.maxHeight = '0';
		});
		setTimeout(() => {
			requestAnimationFrame(() => {
				this.banner.classList.remove('cookie-banner--minimizing');
				this.banner.classList.add('cookie-banner--minimized');
			});
		}, TIMINGS.BANNER_COLLAPSE_DELAY);
	}
	expandBanner() {
		if (!this.banner || !this.container) return;
		requestAnimationFrame(() => {
			this.banner.classList.remove('cookie-banner--minimized');
			this.banner.classList.add('cookie-banner--expanding');
		});
		setTimeout(() => {
			requestAnimationFrame(() => {
				this.banner.classList.add('is-visible');
				this.container.style.maxHeight = this.container.scrollHeight + 'px';
				this.container.style.opacity = '1';
			});
		}, TIMINGS.BANNER_EXPAND_DELAY);
		setTimeout(() => {
			requestAnimationFrame(() => {
				this.banner.classList.remove('cookie-banner--expanding');
				this.container.style.maxHeight = 'none';
			});
		}, TIMINGS.BANNER_EXPAND_COMPLETE);
	}
	setupEventListeners() {
		if (!this.banner) return;
		document.addEventListener('click', (e) => {
			if (e.target === this.acceptBtn) {
				this.acceptCookies();
			} else if (e.target === this.declineBtn) {
				this.declineCookies();
			} else if (e.target === this.settingsLink) {
				e.preventDefault();
				this.resetAndShowBanner();
			} else if (e.target === this.minimizedIcon) {
				this.expandBanner();
			} else if (
				e.target === this.banner &&
				this.banner.classList.contains('cookie-banner--minimized')
			) {
				this.expandBanner();
			}
		});
		document.addEventListener('keydown', (e) => {
			const isActivateKey = e.key === 'Enter' || e.key === ' ';
			if (e.target === this.settingsLink && isActivateKey) {
				e.preventDefault();
				this.resetAndShowBanner();
			} else if (e.target === this.minimizedIcon && isActivateKey) {
				e.preventDefault();
				this.expandBanner();
			}
		});
	}
	setupAnalyticsBanner() {
		if (!this.analyticsBanner || !this.analyticsAccept) return;
		this.analyticsBanner.classList.remove('u-fade-in');
		this.analyticsBanner.classList.remove('u-hidden');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');
		const analyticsChoice = storage.get(this.analyticsConsentKey);
		if (analyticsChoice === 'accepted') {
			this.hideAnalyticsBanner();
		} else {
			setTimeout(
				() => this.showAnalyticsBanner(),
				TIMINGS.BANNER_INITIAL_DELAY,
			);
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
	}
	hideAnalyticsBanner() {
		if (!this.analyticsBanner) return;
		this.analyticsBanner.classList.remove('is-visible');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');
		this.analyticsBanner.style.display = 'none';
	}
	resetAndShowBanner() {
		if (!this.banner || !this.container) return;
		this.banner.style.display = '';
		this.banner.classList.remove('cookie-banner--minimized');
		this.container.style.maxHeight = '';
		this.container.style.opacity = '1';
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
		this.analyticsLoaded = !0;
	}
	loadGoogleAnalytics() {
		const script = document.createElement('script');
		script.async = !0;
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
		script.async = !0;
		script.src = 'https://analytics.ahrefs.com/analytics.js';
		script.setAttribute('data-key', 'flKbnmCKyZQK+Qsr+U37qQ');
		document.head.appendChild(script);
		this.ahrefsLoaded = !0;
	}
	disableAnalytics() {
		if (typeof gtag !== 'undefined') {
			gtag('consent', 'update', {
				analytics_storage: 'denied',
				ad_storage: 'denied',
			});
		}
		this.removeAnalyticsCookies();
	}
	removeAnalyticsCookies() {
		const cookies = [
			'_ga',
			'_gid',
			'_gat',
			'_gcl_au',
			'_fbp',
			'_uetsid',
			'_uetvid',
		];
		const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
		cookies.forEach((cookie) => {
			document.cookie = `${cookie}=; expires=${past}; path=/; domain=.${window.location.hostname}`;
			document.cookie = `${cookie}=; expires=${past}; path=/`;
		});
	}
	updateGtagConsent(status) {
		if (typeof gtag !== 'undefined') {
			gtag('consent', 'update', {
				analytics_storage: status,
				ad_storage: status,
			});
		}
	}
	loadAnalyticsIfConsented() {
		const consent = storage.get(this.consentKey);
		if (consent === 'accepted') {
			this.loadAnalytics();
		}
	}
	clearConsent() {
		storage.remove(this.consentKey);
		this.disableAnalytics();
		this.removeAnalyticsCookies();
		if (this.banner && this.container) {
			this.banner.style.display = '';
			this.banner.classList.remove('cookie-banner--minimized');
			this.container.style.maxHeight = '';
			this.container.style.opacity = '1';
			setTimeout(() => this.showBanner(), 10);
		}
	}
}
class PopupManager {
	constructor() {
		this.popup = document.getElementById('popup');
		this.popupClose = document.getElementById('popup-close');
		this.popupContact = document.getElementById('popup-contact');
		this.popupContactClose = document.getElementById('popup-contact-close');
		this.privacyPopup = document.getElementById('privacy-popup');
		this.privacyClose = document.getElementById('privacy-close');
		this.lastFocusedElement = null;
		this.isClosing = !1;
		this.isOpening = !1;
		this.activeModals = new Set();
		this.modalStack = [];
		this.visualFeedback = !0;
		this.animationDuration = 200;
		this.feedbackTimeout = null;
		this.init();
	}
	init() {
		this.setupEventListeners();
	}
	setupEventListeners() {
		document.addEventListener('click', (e) => {
			const trigger = e.target?.closest?.('[data-popup-target]');
			if (trigger && trigger.dataset.popupTarget) {
				e.preventDefault();
				this.openByTarget(trigger.dataset.popupTarget);
				return;
			}
			if (e.target === this.popupClose || e.target?.closest?.('#popup-close')) {
				this.closePopup(this.popup);
			} else if (
				e.target === this.popupContactClose ||
				e.target?.closest?.('#popup-contact-close')
			) {
				this.closePopup(this.popupContact);
			} else if (e.target === this.privacyClose) {
				this.closePrivacyPopup();
			} else if (e.target === this.popup) {
				this.closePopup(this.popup);
			} else if (e.target === this.popupContact) {
				this.closePopup(this.popupContact);
			} else if (e.target === this.privacyPopup) {
				this.closePrivacyPopup();
			}
		});
		document.addEventListener('keydown', (e) => {
			const isActivateKey = e.key === 'Enter' || e.key === ' ';
			const trigger = e.target?.closest?.('[data-popup-target]');
			if (trigger && trigger.dataset.popupTarget && isActivateKey) {
				e.preventDefault();
				this.openByTarget(trigger.dataset.popupTarget);
			} else if (e.key === 'Escape') {
				if (this.popup && !this.popup.classList.contains('u-hidden')) {
					this.closePopup(this.popup);
				} else if (
					this.popupContact &&
					!this.popupContact.classList.contains('u-hidden')
				) {
					this.closePopup(this.popupContact);
				} else if (
					this.privacyPopup &&
					this.privacyPopup.classList.contains('is-visible')
				) {
					this.closePrivacyPopup();
				}
			}
		});
	}
	openByTarget(target) {
		if (!target) return;
		switch (target) {
			case 'about':
				this.openPopup(this.popup);
				break;
			case 'contact':
				this.openPopup(this.popupContact);
				break;
			case 'privacy':
				this.openPrivacyPopup();
				break;
			default:
				break;
		}
	}
	openPopup(popupElement) {
		if (!popupElement || this.isClosing || this.isOpening) return;
		if (this.activeModals.has(popupElement)) {
			return;
		}
		this.isOpening = !0;
		this.closeAllModals();
		if (this.visualFeedback) {
			popupElement.style.opacity = '0';
			popupElement.style.transition = `opacity ${this.animationDuration}ms ease, transform ${this.animationDuration}ms ease`;
			popupElement.style.transform = 'scale(0.95)';
			popupElement.style.background = 'transparent';
			popupElement.style.pointerEvents = 'none';
			popupElement.style.willChange = 'opacity, transform';
		}
		setTimeout(() => {
			if (this.isClosing) {
				this.isOpening = !1;
				return;
			}
			this.closeMenu();
			this.lastFocusedElement = document.activeElement;
			popupElement.classList.remove('u-hidden');
			if (popupElement === this.popup && window.aboutCarousel) {
				window.aboutCarousel.reset();
			}
			if (this.visualFeedback) {
				requestAnimationFrame(() => {
					popupElement.style.opacity = '1';
					popupElement.style.transform = 'scale(1)';
					popupElement.style.pointerEvents = 'auto';
					popupElement.style.background = '';
				});
			}
			const closeButton = popupElement.querySelector('.popup__close');
			if (closeButton) closeButton.focus();
			document.documentElement.style.overflow = 'hidden';
			this.activeModals.add(popupElement);
			this.modalStack.push(popupElement);
			this.feedbackTimeout = setTimeout(() => {
				this.isOpening = !1;
				if (this.visualFeedback) {
					popupElement.style.transition = '';
					popupElement.style.opacity = '';
					popupElement.style.transform = '';
					popupElement.style.background = '';
					popupElement.style.pointerEvents = '';
					popupElement.style.willChange = '';
				}
			}, this.animationDuration);
		}, TIMINGS.MODAL_OPENING_DELAY);
	}
	closePopup(popupElement) {
		if (!popupElement || this.isClosing || this.isOpening) return;
		this.isClosing = !0;
		if (this.visualFeedback) {
			popupElement.style.background = 'transparent';
			popupElement.style.pointerEvents = 'none';
			popupElement.style.transition = `opacity ${this.animationDuration}ms ease, transform ${this.animationDuration}ms ease`;
			popupElement.style.opacity = '0';
			popupElement.style.transform = 'scale(0.95)';
			setTimeout(() => {
				popupElement.classList.add('u-hidden');
				popupElement.style.transition = '';
				popupElement.style.opacity = '';
				popupElement.style.transform = '';
				popupElement.style.background = '';
				popupElement.style.pointerEvents = '';
			}, this.animationDuration);
		} else {
			popupElement.classList.add('u-hidden');
		}
		if (this.lastFocusedElement) this.lastFocusedElement.focus();
		document.documentElement.style.overflow = 'auto';
		this.activeModals.delete(popupElement);
		const index = this.modalStack.indexOf(popupElement);
		if (index > -1) {
			this.modalStack.splice(index, 1);
		}
		setTimeout(() => {
			this.isClosing = !1;
		}, TIMINGS.MODAL_ANIMATION);
	}
	openPrivacyPopup() {
		if (!this.privacyPopup || this.isClosing) return;
		this.closeMenu();
		this.lastFocusedElement = document.activeElement;
		this.privacyPopup.classList.add('is-visible');
		this.privacyPopup.setAttribute('aria-hidden', 'false');
		const closeButton = this.privacyPopup.querySelector(
			'.privacy-popup__close',
		);
		if (closeButton) closeButton.focus();
		document.documentElement.style.overflow = 'hidden';
		document.body.classList.add('is-modal-open');
	}
	closePrivacyPopup() {
		if (!this.privacyPopup || this.isClosing) return;
		this.isClosing = !0;
		this.privacyPopup.classList.remove('is-visible');
		this.privacyPopup.setAttribute('aria-hidden', 'true');
		if (this.lastFocusedElement) this.lastFocusedElement.focus();
		document.documentElement.style.overflow = 'auto';
		document.body.classList.remove('is-modal-open');
		setTimeout(() => {
			this.isClosing = !1;
		}, TIMINGS.MODAL_ANIMATION);
	}
	closeMenu() {
		if (
			window.mobileMenuManager &&
			typeof window.mobileMenuManager.closeMenu === 'function'
		) {
			window.mobileMenuManager.closeMenu({ restoreFocus: !1 });
			return;
		}
		const menu =
			window.mobileMenuManager?.menu || document.querySelector('.nav-menu');
		const burger =
			window.mobileMenuManager?.header__burger ||
			document.querySelector('.header__burger');
		if (menu && burger && menu.classList.contains('is-active')) {
			menu.classList.remove('is-active');
			const isMobile = isMobileViewport();
			if (isMobile) {
				menu.setAttribute('aria-hidden', 'true');
				setTimeout(() => {
					if (!menu.classList.contains('is-active') && isMobile) {
						menu.setAttribute('hidden', '');
					}
				}, 400);
				burger.style.display = 'flex';
			} else {
				menu.removeAttribute('hidden');
				menu.setAttribute('aria-hidden', 'false');
				burger.style.display = '';
			}
			document.body.classList.remove('is-menu-open');
			burger.setAttribute('aria-expanded', 'false');
		}
	}
	closeAllModals() {
		this.activeModals.forEach((modal) => {
			if (modal === this.popup) {
				this.closePopup(modal);
			} else if (modal === this.popupContact) {
				this.closePopup(modal);
			} else if (modal === this.privacyPopup) {
				this.closePrivacyPopup();
			}
		});
		this.activeModals.clear();
		this.modalStack = [];
	}
}
class LanguageToggleManager {
	constructor() {
		this.root = document.querySelector('[data-language-toggle]');
		this.toggleButton =
			this.root?.querySelector('[data-language-toggle-button]') || null;
		this.options =
			this.root?.querySelector('[data-language-options]') || null;
		this.isOpen = !1;
		this.heroBaseTop = null;
		this.handleDocumentClick = this.handleDocumentClick.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.init();
	}
	init() {
		if (!this.root || !this.toggleButton || !this.options) return;
		this.syncActiveOption();
		this.toggleButton.addEventListener('click', (e) => {
			e.preventDefault();
			this.toggle();
		});
		this.options.addEventListener('click', (e) => {
			const link = e.target?.closest?.('.language-toggle__option');
			if (!link) return;
			if (this.isSamePage(link)) {
				e.preventDefault();
			}
			this.close();
		});
		document.addEventListener('click', this.handleDocumentClick);
		document.addEventListener('keydown', this.handleKeydown);
		window.addEventListener('resize', this.handleResize);
		this.updateMobileHeroOffset();
	}
	normalizePath(path) {
		let normalized = path || '/';
		while (normalized.length > 1 && normalized.endsWith('/')) {
			normalized = normalized.slice(0, -1);
		}
		return normalized;
	}
	syncActiveOption() {
		const links = Array.from(
			this.options?.querySelectorAll('.language-toggle__option') || [],
		);
		if (!links.length) return;
		const current = new URL(window.location.href);
		const currentPath = this.normalizePath(current.pathname);
		let activeLink = null;
		links.forEach((link) => {
			try {
				const linkUrl = new URL(link.href, window.location.href);
				const isActive =
					linkUrl.origin === current.origin &&
					this.normalizePath(linkUrl.pathname) === currentPath;
				link.classList.toggle('is-active', isActive);
				if (isActive) {
					link.setAttribute('aria-current', 'page');
					activeLink = link;
				} else {
					link.removeAttribute('aria-current');
				}
			} catch {}
		});
		if (!activeLink) {
			const buttonFlag = this.toggleButton
				?.querySelector('.language-toggle__flag')
				?.textContent?.trim();
			if (buttonFlag) {
				activeLink =
					links.find(
						(link) =>
							link
								.querySelector('.language-toggle__flag')
								?.textContent?.trim() === buttonFlag,
					) || null;
				if (activeLink) {
					activeLink.classList.add('is-active');
					activeLink.setAttribute('aria-current', 'page');
				}
			}
		}
	}
	isSamePage(link) {
		try {
			const target = new URL(link.href, window.location.href);
			const current = new URL(window.location.href);
			return (
				target.origin === current.origin &&
				this.normalizePath(target.pathname) ===
					this.normalizePath(current.pathname) &&
				target.search === current.search &&
				target.hash === current.hash
			);
		} catch {
			return link.classList.contains('is-active');
		}
	}
	toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}
	open() {
		if (this.isOpen || !this.root || !this.toggleButton) return;
		this.isOpen = !0;
		this.root.classList.add('is-open');
		this.toggleButton.setAttribute('aria-expanded', 'true');
		this.updateMobileHeroOffset();
	}
	close() {
		if (!this.isOpen || !this.root || !this.toggleButton) return;
		this.isOpen = !1;
		this.root.classList.remove('is-open');
		this.toggleButton.setAttribute('aria-expanded', 'false');
		this.clearMobileHeroOffset();
	}
	handleDocumentClick(e) {
		if (!this.isOpen || !this.root) return;
		if (!this.root.contains(e.target)) {
			this.close();
		}
	}
	handleKeydown(e) {
		if (e.key === 'Escape' && this.isOpen) {
			this.close();
		}
	}
	handleResize() {
		if (this.isOpen) {
			this.updateMobileHeroOffset();
		} else {
			this.clearMobileHeroOffset();
		}
	}
	updateMobileHeroOffset() {
		if (!this.root || !this.toggleButton) return;
		const isMobile = window.matchMedia('(max-width: 768px)').matches;
		const heroTitle = document.querySelector('main > .hero__title');
		if (!isMobile || !heroTitle || !this.isOpen) {
			this.clearMobileHeroOffset();
			return;
		}
		if (this.heroBaseTop == null) {
			this.heroBaseTop = heroTitle.getBoundingClientRect().top;
		}
		const applyOffset = () => {
			const rootRect = this.root.getBoundingClientRect();
			const optionsRect = this.options
				? this.options.getBoundingClientRect()
				: rootRect;
			const toggleBottom = Math.max(rootRect.bottom, optionsRect.bottom);
			const heroTop =
				this.heroBaseTop != null
					? this.heroBaseTop
					: heroTitle.getBoundingClientRect().top;
			const overlap = Math.max(0, Math.ceil(toggleBottom - heroTop + 10));
			document.documentElement.style.setProperty(
				'--language-toggle-hero-offset',
				overlap + 'px',
			);
			document.body.classList.toggle(
				'is-language-toggle-open',
				overlap > 0 && this.isOpen,
			);
		};
		requestAnimationFrame(applyOffset);
		setTimeout(applyOffset, 90);
		setTimeout(applyOffset, 240);
	}
	clearMobileHeroOffset() {
		this.heroBaseTop = null;
		document.documentElement.style.setProperty(
			'--language-toggle-hero-offset',
			'0px',
		);
		document.body.classList.remove('is-language-toggle-open');
	}
	cleanup() {
		document.removeEventListener('click', this.handleDocumentClick);
		document.removeEventListener('keydown', this.handleKeydown);
		window.removeEventListener('resize', this.handleResize);
		this.clearMobileHeroOffset();
	}
}
class AboutCarousel {
	constructor() {
		this.root = document.querySelector('[data-carousel]');
		this.track = this.root?.querySelector('[data-carousel-track]') || null;
		this.slides = this.track
			? Array.from(this.track.querySelectorAll('[data-carousel-slide]'))
			: [];
		this.viewport = this.root?.querySelector('.testimonial-carousel__viewport');
		this.prevBtn = this.root?.querySelector('[data-carousel-prev]') || null;
		this.nextBtn = this.root?.querySelector('[data-carousel-next]') || null;
		this.dotsContainer =
			this.root?.querySelector('[data-carousel-dots]') || null;
		this.dots = [];
		this.currentIndex = 0;
		this.touchStartX = 0;
		this.touchDeltaX = 0;
		this.isTouching = !1;
		this.autoAdvanceTimer = null;
		this.autoAdvanceDelay = 5000;
		if (!this.root || !this.track || this.slides.length === 0) return;
		this.root.setAttribute('role', 'region');
		this.root.setAttribute('aria-live', 'polite');
		this.root.setAttribute('aria-roledescription', 'carousel');
		this.handleClick = this.handleClick.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);
		this.handleTouchStart = this.handleTouchStart.bind(this);
		this.handleTouchMove = this.handleTouchMove.bind(this);
		this.handleTouchEnd = this.handleTouchEnd.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.enhanceSlides();
		this.setupDots();
		this.update();
		this.deferHeight();
		this.root.addEventListener('click', this.handleClick);
		this.root.addEventListener('keydown', this.handleKeydown);
		this.root.addEventListener('touchstart', this.handleTouchStart, {
			passive: !0,
		});
		this.root.addEventListener('touchmove', this.handleTouchMove, {
			passive: !0,
		});
		this.root.addEventListener('touchend', this.handleTouchEnd);
		window.addEventListener('resize', this.handleResize, { passive: !0 });
		this.startAutoAdvance();
	}
	enhanceSlides() {
		const total = this.slides.length;
		this.slides.forEach((slide, index) => {
			if (!slide.id) {
				slide.id = `testimonial-slide-${index + 1}`;
			}
			slide.setAttribute('role', 'group');
			slide.setAttribute('aria-label', `Témoignage ${index + 1} sur ${total}`);
			slide.setAttribute('aria-roledescription', 'slide');
		});
		if (this.slides.length <= 1) {
			this.toggleControls(!1);
		}
	}
	toggleControls(visible) {
		const display = visible ? '' : 'none';
		if (this.prevBtn) this.prevBtn.style.display = display;
		if (this.nextBtn) this.nextBtn.style.display = display;
		if (this.dotsContainer)
			this.dotsContainer.style.display = visible ? '' : 'none';
	}
	setupDots() {
		if (!this.dotsContainer || this.slides.length <= 1) return;
		this.dotsContainer.innerHTML = '';
		this.dots = this.slides.map((slide, index) => {
			const dot = document.createElement('button');
			dot.type = 'button';
			dot.className = 'testimonial-carousel__dot';
			dot.setAttribute('data-carousel-dot', String(index));
			dot.setAttribute('role', 'tab');
			dot.setAttribute('aria-controls', slide.id);
			dot.setAttribute('aria-label', `Aller au témoignage ${index + 1}`);
			dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
			this.dotsContainer.appendChild(dot);
			return dot;
		});
		this.dotsContainer.setAttribute('role', 'tablist');
		this.dotsContainer.setAttribute('aria-label', 'Pagination des témoignages');
	}
	update() {
		this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
		this.slides.forEach((slide, index) => {
			const isActive = index === this.currentIndex;
			slide.setAttribute('aria-hidden', String(!isActive));
			slide.setAttribute('tabindex', isActive ? '0' : '-1');
			slide.classList.toggle('testimonial-card--active', isActive);
		});
		this.dots.forEach((dot, index) => {
			const isActive = index === this.currentIndex;
			dot.setAttribute('aria-selected', String(isActive));
			dot.setAttribute('tabindex', isActive ? '0' : '-1');
		});
	}
	deferHeight() {
		if (!this.viewport) return;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				this.updateHeight();
			});
		});
	}
	updateHeight() {
		if (!this.viewport) return;
		const activeSlide = this.slides[this.currentIndex];
		if (!activeSlide) return;
		if (!this.viewport.offsetParent) {
			this.viewport.style.height = '';
			return;
		}
		const height = activeSlide.offsetHeight;
		requestAnimationFrame(() => {
			if (height) {
				this.viewport.style.height = `${height}px`;
			}
		});
	}
	showSlide(index, source = 'button') {
		if (this.slides.length === 0) return;
		const total = this.slides.length;
		const nextIndex = (index + total) % total;
		this.currentIndex = nextIndex;
		this.update();
		this.deferHeight();
		if (source === 'dot') {
			const activeDot = this.dots[this.currentIndex];
			if (activeDot) activeDot.focus();
		}
	}
	reset() {
		if (!this.root) return;
		this.currentIndex = 0;
		this.update();
		this.deferHeight();
		this.restartAutoAdvance();
	}
	refresh() {
		this.update();
		this.deferHeight();
		this.restartAutoAdvance();
	}
	startAutoAdvance() {
		if (this.slides.length <= 1) return;
		this.stopAutoAdvance();
		this.autoAdvanceTimer = window.setInterval(() => {
			if (!this.root || this.isTouching) return;
			if (this.root.offsetParent === null) return;
			this.showSlide(this.currentIndex + 1, 'auto');
		}, this.autoAdvanceDelay);
	}
	stopAutoAdvance() {
		if (this.autoAdvanceTimer) {
			clearInterval(this.autoAdvanceTimer);
			this.autoAdvanceTimer = null;
		}
	}
	restartAutoAdvance() {
		this.stopAutoAdvance();
		this.startAutoAdvance();
	}
	handleClick(event) {
		const target = event.target;
		if (!target) return;
		if (target.closest('[data-carousel-prev]')) {
			event.preventDefault();
			this.showSlide(this.currentIndex - 1);
			this.restartAutoAdvance();
			return;
		}
		if (target.closest('[data-carousel-next]')) {
			event.preventDefault();
			this.showSlide(this.currentIndex + 1);
			this.restartAutoAdvance();
			return;
		}
		const dot = target.closest('[data-carousel-dot]');
		if (dot && typeof dot.dataset.carouselDot !== 'undefined') {
			event.preventDefault();
			const nextIndex = parseInt(dot.dataset.carouselDot, 10);
			if (!Number.isNaN(nextIndex)) {
				this.showSlide(nextIndex, 'dot');
				this.restartAutoAdvance();
			}
		}
	}
	handleKeydown(event) {
		if (!this.root.contains(event.target)) return;
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				this.showSlide(this.currentIndex - 1, 'keyboard');
				this.restartAutoAdvance();
				break;
			case 'ArrowRight':
				event.preventDefault();
				this.showSlide(this.currentIndex + 1, 'keyboard');
				this.restartAutoAdvance();
				break;
			case 'Home':
				event.preventDefault();
				this.showSlide(0, 'keyboard');
				this.restartAutoAdvance();
				break;
			case 'End':
				event.preventDefault();
				this.showSlide(this.slides.length - 1, 'keyboard');
				this.restartAutoAdvance();
				break;
			default:
				break;
		}
	}
	handleTouchStart(event) {
		if (!event.changedTouches || event.changedTouches.length === 0) return;
		this.isTouching = !0;
		this.touchStartX = event.changedTouches[0].clientX;
		this.touchDeltaX = 0;
		this.stopAutoAdvance();
	}
	handleTouchMove(event) {
		if (
			!this.isTouching ||
			!event.changedTouches ||
			event.changedTouches.length === 0
		)
			return;
		this.touchDeltaX = event.changedTouches[0].clientX - this.touchStartX;
	}
	handleTouchEnd() {
		if (!this.isTouching) return;
		if (Math.abs(this.touchDeltaX) > 40) {
			if (this.touchDeltaX > 0) {
				this.showSlide(this.currentIndex - 1, 'swipe');
			} else {
				this.showSlide(this.currentIndex + 1, 'swipe');
			}
		}
		this.isTouching = !1;
		this.touchStartX = 0;
		this.touchDeltaX = 0;
		this.restartAutoAdvance();
	}
	handleResize() {
		this.deferHeight();
	}
	cleanup() {
		if (!this.root) return;
		this.root.removeEventListener('click', this.handleClick);
		this.root.removeEventListener('keydown', this.handleKeydown);
		this.root.removeEventListener('touchstart', this.handleTouchStart);
		this.root.removeEventListener('touchmove', this.handleTouchMove);
		this.root.removeEventListener('touchend', this.handleTouchEnd);
		window.removeEventListener('resize', this.handleResize);
		this.stopAutoAdvance();
	}
}
class MobileMenuManager {
	constructor() {
		this.header__burger = document.querySelector('.header__burger');
		this.menu = document.querySelector('.nav-menu');
		this.closeBtn = document.querySelector('.nav-menu__close');
		this.overlay = document.querySelector('.nav-menu__overlay');
		this.hideTimeout = null;
		this.scrollLocked = !1;
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
		document.addEventListener('click', (e) => {
			const burgerClicked =
				e.target.closest && e.target.closest('.header__burger');
			const closeClicked =
				e.target.closest && e.target.closest('.nav-menu__close');
			const overlayClicked = this.overlay && e.target === this.overlay;
			if (
				burgerClicked &&
				this.header__burger &&
				burgerClicked === this.header__burger
			) {
				if (this.menu && this.menu.classList.contains('is-active')) {
					this.closeMenu();
				} else {
					this.openMenu();
				}
			} else if (
				closeClicked &&
				this.closeBtn &&
				closeClicked === this.closeBtn
			) {
				this.closeMenu();
			} else if (overlayClicked) {
				this.closeMenu();
			} else if (
				this.menu &&
				this.menu.classList.contains('is-active') &&
				!this.menu.contains(e.target) &&
				!this.header__burger.contains(e.target)
			) {
				this.closeMenu();
			}
		});
		document.addEventListener('keydown', (e) => {
			if (
				e.key === 'Escape' &&
				this.menu &&
				this.menu.classList.contains('is-active')
			) {
				this.closeMenu();
			}
		});
	}
	bindMenuActions() {
		if (!this.menu) return;
		const triggers = this.menu.querySelectorAll('[data-popup-target]');
		triggers.forEach((trigger) => {
			const openPopup = (event) => {
				const target = trigger.dataset.popupTarget;
				if (!target || !window.popupManager) return;
				this.closeMenu({ restoreFocus: !1 });
				requestAnimationFrame(() => {
					window.popupManager.openByTarget(target);
				});
			};
			trigger.addEventListener('click', openPopup);
			trigger.addEventListener('touchstart', (event) => {
				if (event.touches && event.touches.length > 1) return;
				openPopup(event);
			});
		});
	}
	openMenu() {
		if (!this.menu || !this.header__burger) return;
		if (!isMobileViewport()) {
			this.updateVisibilityState();
			return;
		}
		if (this.menu.classList.contains('is-active')) return;
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.menu.hasAttribute('hidden')) {
			this.menu.removeAttribute('hidden');
			void this.menu.offsetHeight;
		}
		this.menu.setAttribute('aria-hidden', 'false');
		this.menu.classList.add('is-active');
		this.menu.scrollTop = 0;
		this.header__burger.style.display = 'none';
		document.body.classList.add('is-menu-open');
		this.lockScroll();
		this.header__burger.setAttribute('aria-expanded', 'true');
	}
	closeMenu({ restoreFocus = !0 } = {}) {
		if (!this.menu || !this.header__burger) return;
		const wasActive = this.menu.classList.contains('is-active');
		this.menu.classList.remove('is-active');
		if (!isMobileViewport()) {
			this.updateVisibilityState();
		} else {
			this.header__burger.style.display = 'flex';
			document.body.classList.remove('is-menu-open');
			this.unlockScroll();
			this.menu.setAttribute('aria-hidden', 'true');
			if (this.hideTimeout) clearTimeout(this.hideTimeout);
			this.hideTimeout = setTimeout(() => {
				if (
					this.menu &&
					!this.menu.classList.contains('is-active') &&
					window.innerWidth <= 768
				) {
					this.menu.setAttribute('hidden', '');
				}
			}, 400);
			if (restoreFocus && wasActive) {
				this.header__burger.focus();
			}
		}
		this.header__burger.setAttribute('aria-expanded', 'false');
		if (!isMobileViewport()) {
			this.unlockScroll();
		}
	}
	updateVisibilityState() {
		if (!this.menu) return;
		const isMobile = isMobileViewport();
		const menuActive = this.menu.classList.contains('is-active');
		if (isMobile) {
			if (!menuActive) {
				this.menu.setAttribute('aria-hidden', 'true');
				if (!this.menu.hasAttribute('hidden')) {
					this.menu.setAttribute('hidden', '');
				}
				if (this.header__burger) {
					this.header__burger.style.display = 'flex';
					this.header__burger.setAttribute('aria-expanded', 'false');
				}
				document.body.classList.remove('is-menu-open');
				this.unlockScroll();
			} else {
				this.menu.removeAttribute('hidden');
				this.menu.setAttribute('aria-hidden', 'false');
				document.body.classList.add('is-menu-open');
				this.lockScroll();
				if (this.header__burger) {
					this.header__burger.style.display = 'none';
					this.header__burger.setAttribute('aria-expanded', 'true');
				}
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
			if (this.header__burger) {
				this.header__burger.style.display = '';
				this.header__burger.setAttribute('aria-expanded', 'false');
			}
		}
	}
	lockScroll() {
		if (this.scrollLocked) return;
		this.scrollLocked = !0;
		const bodyStyle = document.body.style;
		const rootStyle = document.documentElement.style;
		this.savedBodyStyles = {
			overflow: bodyStyle.overflow || '',
			overscrollBehavior: bodyStyle.overscrollBehavior || '',
		};
		this.savedRootStyles = {
			overflow: rootStyle.overflow || '',
			overscrollBehavior: rootStyle.overscrollBehavior || '',
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
		const savedBody = this.savedBodyStyles || {};
		const savedRoot = this.savedRootStyles || {};
		bodyStyle.overflow = savedBody.overflow || '';
		bodyStyle.overscrollBehavior = savedBody.overscrollBehavior || '';
		rootStyle.overflow = savedRoot.overflow || '';
		rootStyle.overscrollBehavior = savedRoot.overscrollBehavior || '';
		this.scrollLocked = !1;
		this.savedBodyStyles = null;
		this.savedRootStyles = null;
	}
	handleResize() {
		this.updateVisibilityState();
		if (!isMobileViewport()) {
			this.closeMenu({ restoreFocus: !1 });
		}
	}
}
class FormManager {
	constructor() {
		this.contactForm = document.getElementById('contact-form');
		this.successMessage = document.getElementById('form-success-message');
		this.init();
	}
	init() {
		this.setupContactForm();
	}
	setupContactForm() {
		if (!this.contactForm || !this.successMessage) return;
		this.contactForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(this.contactForm);
			try {
				const response = await fetch(this.contactForm.action, {
					method: this.contactForm.method,
					headers: { Accept: 'application/json' },
					body: formData,
				});
				if (response.ok) {
					this.contactForm.reset();
					this.successMessage.classList.remove('u-hidden');
					setTimeout(() => this.successMessage.classList.add('u-hidden'), 5000);
				} else {
					alert("Erreur lors de l'envoi. Veuillez réessayer.");
				}
			} catch {
				alert('Erreur de réseau. Vérifiez votre connexion.');
			}
		});
	}
}
class FAQManager {
	constructor() {
		this.faqSection = document.querySelector('.faq-section');
		this.faqQuestions =
			this.faqSection?.querySelectorAll('.faq-question') || [];
		this.init();
	}
	init() {
		this.setupFAQ();
	}
	setupFAQ() {
		const container = this.faqSection || document;
		container.addEventListener('click', (e) => {
			const button = e.target?.closest?.('.faq-question');
			if (button) this.toggleFAQ(button);
		});
		container.addEventListener('keydown', (e) => {
			const isActivateKey = e.key === 'Enter' || e.key === ' ';
			if (e.defaultPrevented || !isActivateKey) return;
			const button = e.target?.closest?.('.faq-question');
			if (button) {
				e.preventDefault();
				this.toggleFAQ(button);
			}
		});
	}
	toggleFAQ(button) {
		const answer = button.nextElementSibling;
		if (!answer) return;
		const isOpen = button.getAttribute('aria-expanded') === 'true';
		if (isOpen) {
			answer.style.maxHeight = answer.scrollHeight + 'px';
			answer.offsetHeight;
			requestAnimationFrame(() => {
				answer.style.maxHeight = '0';
			});
			button.setAttribute('aria-expanded', 'false');
			answer.classList.remove('is-open');
		} else {
			const openQuestions =
				this.faqQuestions.length > 0
					? Array.from(this.faqQuestions).filter(
							(q) => q.getAttribute('aria-expanded') === 'true',
						)
					: Array.from(
							document.querySelectorAll('.faq-question[aria-expanded="true"]'),
						);
			openQuestions.forEach((openBtn) => {
				if (openBtn !== button) {
					const openAnswer = openBtn.nextElementSibling;
					if (openAnswer) {
						openAnswer.style.maxHeight = openAnswer.scrollHeight + 'px';
						openAnswer.offsetHeight;
						requestAnimationFrame(() => {
							openAnswer.style.maxHeight = '0';
						});
						openAnswer.classList.remove('is-open');
					}
					openBtn.setAttribute('aria-expanded', 'false');
				}
			});
			answer.style.maxHeight = '0';
			answer.classList.add('is-open');
			button.setAttribute('aria-expanded', 'true');
			answer.offsetHeight;
			requestAnimationFrame(() => {
				answer.style.maxHeight = answer.scrollHeight + 'px';
			});
		}
	}
	cleanup() {}
}
class AnimationManager {
	constructor() {
		this.headerLogo = document.querySelector('.header__logo');
		this.disclaimer = document.querySelector('.disclaimer');
		this.reduceMotion = window.matchMedia?.(
			'(prefers-reduced-motion: reduce)',
		).matches;
		this.init();
	}
	init() {
		this.setupHeaderLogoAnimation();
		this.setupBellAnimation();
	}
	setupHeaderLogoAnimation() {
		if (!this.headerLogo || this.reduceMotion) return;
		this.headerLogo.classList.add('rotate-once');
		const runLogoRotate = (e) => {
			if (this.reduceMotion) return;
			this.headerLogo.classList.add('rotate-once');
			if (e && e.type === 'keydown') e.preventDefault();
		};
		this.headerLogo.addEventListener('click', runLogoRotate);
		this.headerLogo.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') runLogoRotate(e);
		});
		this.headerLogo.addEventListener('animationend', () => {
			this.headerLogo.classList.remove('rotate-once');
		});
	}
	setupBellAnimation() {
		if (!this.disclaimer || this.reduceMotion) return;
		setTimeout(() => {
			this.disclaimer.classList.add('bell-start');
			setTimeout(() => {
				this.disclaimer.classList.remove('bell-start');
			}, 2000);
		}, 2000);
		this.disclaimer.addEventListener('mouseenter', () => {
			this.disclaimer.classList.add('bell-start');
			setTimeout(() => {
				this.disclaimer.classList.remove('bell-start');
			}, 2000);
		});
	}
}
class ScrollRevealManager {
	constructor() {
		this.elements = document.querySelectorAll('.u-fade-in');
		this.faqSection = document.querySelector('.faq-section');
		this.casinoSection = document.querySelector('.casino-cards-container');
		this.heroSection = document.querySelector('.hero-section');
		this.sectionElements = {
			faq: [],
			casino: [],
			hero: [],
			other: [],
		};
		this.adaptiveConfig = this.getAdaptiveConfig();
		this.animationOnce = !0;
		this.sectionOnceSettings = { faq: !0, casino: !0, hero: !1, other: !0 };
		this.elementOnceSettings = new Map();
		this.enableScrollUpAnimations = !0;
		this.init();
	}
	getAdaptiveConfig() {
		const isMobile = window.innerWidth <= 768;
		const isTablet = window.innerWidth <= 1024;
		const isLargeScreen = window.innerWidth > 1440;
		const isUltraWide = window.innerWidth > 1920;
		const pageHeight = document.documentElement.scrollHeight;
		const viewportHeight = window.innerHeight;
		const isLongPage = pageHeight > viewportHeight * 3;
		const isVeryLongPage = pageHeight > viewportHeight * 5;
		const totalFadeElements = this.elements.length;
		const isHighElementCount = totalFadeElements > 100;
		let rootMargin = '0px 0px -5px 0px';
		if (isMobile) {
			rootMargin = '0px 0px -2px 0px';
		} else if (isVeryLongPage || isHighElementCount) {
			rootMargin = '0px 0px -50px 0px';
		} else if (isLongPage) {
			rootMargin = '0px 0px -20px 0px';
		}
		let threshold = isMobile ? 0.01 : isTablet ? 0.08 : 0.05;
		if (isVeryLongPage || isHighElementCount) {
			threshold = Math.max(0.01, threshold * 0.5);
		}
		return {
			threshold,
			rootMargin,
			sectionThreshold: isMobile ? 10 : isTablet ? 15 : 20,
			once: !0,
			isLongPage,
			isVeryLongPage,
			isHighElementCount,
			totalElements: totalFadeElements,
		};
	}
	init() {
		if (!this.elements.length) return;
		this.categorizeElements();
		this.showVisibleElementsImmediately();
		this.setupSectionObservers();
		this.setupResizeListener();
	}
	showVisibleElementsImmediately() {
		const reveal = () => {
			const viewportHeight = window.innerHeight;
			const viewportWidth = window.innerWidth;
			this.elements.forEach((element) => {
				const rect = element.getBoundingClientRect();
				const isInViewport =
					rect.top < viewportHeight * 0.9 &&
					rect.bottom > 0 &&
					rect.left < viewportWidth &&
					rect.right > 0;
				if (isInViewport) {
					element.classList.add('is-visible');
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
		let resizeTimeout;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				this.adaptiveConfig = this.getAdaptiveConfig();
				this.recreateObservers();
			}, 250);
		});
	}
	categorizeElements() {
		const allElements = Array.from(this.elements);
		allElements.forEach((element) => {
			if (this.faqSection && this.faqSection.contains(element)) {
				this.sectionElements.faq.push(element);
			} else if (this.casinoSection && this.casinoSection.contains(element)) {
				this.sectionElements.casino.push(element);
			} else if (this.heroSection && this.heroSection.contains(element)) {
				this.sectionElements.hero.push(element);
			} else {
				this.sectionElements.other.push(element);
			}
		});
	}
	setupSectionObservers() {
		Object.entries(this.sectionElements).forEach(([sectionName, elements]) => {
			if (elements.length === 0) return;
			if (elements.length > this.adaptiveConfig.sectionThreshold) {
				this.createSectionObserver(sectionName, elements);
			} else {
				this.useGlobalObserver(elements);
			}
		});
	}
	createSectionObserver(sectionName, elements) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
						const elementOnce = this.getElementOnce(entry.target);
						if (elementOnce && entry.intersectionRatio >= 0.5) {
							observer.unobserve(entry.target);
						}
					} else if (this.enableScrollUpAnimations && window.innerWidth > 768) {
						entry.target.classList.remove('is-visible');
					}
				});
			},
			{
				threshold: this.adaptiveConfig.threshold,
				rootMargin: this.adaptiveConfig.rootMargin,
			},
		);
		observerRegistry.scrollObservers.set(sectionName, observer);
		elements.forEach((el) => observer.observe(el));
	}
	useGlobalObserver(elements) {
		if (!observerRegistry.globalScrollObserver) {
			observerRegistry.globalScrollObserver = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							entry.target.classList.add('is-visible');
							if (entry.intersectionRatio >= 0.5) {
								observerRegistry.globalScrollObserver.unobserve(entry.target);
							}
						} else if (
							this.enableScrollUpAnimations &&
							window.innerWidth > 768
						) {
							entry.target.classList.remove('is-visible');
						}
					});
				},
				{
					threshold: this.adaptiveConfig.threshold,
					rootMargin: this.adaptiveConfig.rootMargin,
				},
			);
		}
		elements.forEach((el) => observerRegistry.globalScrollObserver.observe(el));
	}
	recreateObservers() {
		this.cleanup();
		this.setupSectionObservers();
	}
	setScrollUpAnimations(enabled) {
		this.enableScrollUpAnimations = enabled;
	}
	setElementOnce(element, once) {
		if (element && element.nodeType === Node.ELEMENT_NODE) {
			this.elementOnceSettings.set(element, once);
		}
	}
	getElementOnce(element) {
		if (element && this.elementOnceSettings.has(element)) {
			return this.elementOnceSettings.get(element);
		}
		const section = this.getElementSection(element);
		return this.sectionOnceSettings[section] ?? !0;
	}
	getElementSection(element) {
		if (this.faqSection && this.faqSection.contains(element)) return 'faq';
		if (this.casinoSection && this.casinoSection.contains(element))
			return 'casino';
		if (this.heroSection && this.heroSection.contains(element)) return 'hero';
		return 'other';
	}
	getAnimationSettings() {
		return {
			enableScrollUpAnimations: this.enableScrollUpAnimations,
			sectionOnceSettings: this.sectionOnceSettings,
			adaptiveConfig: this.adaptiveConfig,
			elementOnceSettings: Array.from(this.elementOnceSettings.entries()),
		};
	}
	cleanup() {
		observerRegistry.scrollObservers.forEach((observer) =>
			observer.disconnect(),
		);
		observerRegistry.scrollObservers.clear();
		if (observerRegistry.globalScrollObserver) {
			observerRegistry.globalScrollObserver.disconnect();
			observerRegistry.globalScrollObserver = null;
		}
	}
}
class DarkModeManager {
	constructor() {
		this.toggleButton = document.getElementById('theme-toggle');
		this.themeIcon = this.toggleButton?.querySelector('.theme-icon') || null;
		this.body = document.body;
		this.mutationObserver = null;
		this.darkImageObserver = null;
		this.observedContainers = new Set();
		this.pendingUpdates = new Set();
		this.updateScheduled = !1;
		this.init();
	}
	init() {
		if (this.body) {
			this.setupDarkImageObserver();
		}
		this.loadSavedTheme();
		if (this.body) {
			this.observeDarkImages(document.querySelectorAll('img[data-dark]'));
		}
		if (this.toggleButton && this.body) {
			this.setupEventListeners();
			this.setupMutationObserver();
		}
	}
	loadSavedTheme() {
		if (!this.body) return;
		const savedTheme = storage.get('theme');
		const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		let isDark;
		if (savedTheme) {
			isDark = savedTheme === 'dark';
			this.body.classList.toggle('is-dark', isDark);
			this.body.classList.toggle('is-light', !isDark);
		} else {
			const prefersDark = colorSchemeQuery.matches;
			this.body.classList.toggle('is-dark', prefersDark);
			this.body.classList.toggle('is-light', !prefersDark);
			isDark = prefersDark;
		}
		this.updateToggleUI(isDark);
		this.updateToggleButtonState(isDark);
		this.updateLogos();
		const onColorSchemeChange = (e) => {
			if (!storage.get('theme')) {
				const isDark = e.matches;
				if (!this.body) return;
				this.body.classList.toggle('is-dark', isDark);
				this.body.classList.toggle('is-light', !isDark);
				this.updateToggleUI(isDark);
				this.updateLogos();
				this.updateToggleButtonState(isDark);
			}
		};
		if (typeof colorSchemeQuery.addEventListener === 'function') {
			colorSchemeQuery.addEventListener('change', onColorSchemeChange);
		} else if (typeof colorSchemeQuery.addListener === 'function') {
			colorSchemeQuery.addListener(onColorSchemeChange);
		}
	}
	setupEventListeners() {
		if (!this.toggleButton) return;
		this.toggleButton.addEventListener('click', () => this.toggleTheme());
	}
	setupMutationObserver() {
		if (!this.mutationObserver) {
			this.mutationObserver = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.type === 'childList') {
						mutation.addedNodes.forEach((node) => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								const casinoImages = node.matches?.('.casino-card__image')
									? [node]
									: node.querySelectorAll?.('.casino-card__image') || [];
								if (casinoImages.length > 0) {
									casinoImages.forEach((img) => this.pendingUpdates.add(img));
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
			document.querySelector('.main-content'),
		].filter(Boolean);
		containers.forEach((container) => {
			if (!this.observedContainers.has(container)) {
				this.mutationObserver.observe(container, {
					childList: !0,
					subtree: !0,
				});
				this.observedContainers.add(container);
			}
		});
	}
	scheduleBatchedUpdate() {
		if (this.updateScheduled) return;
		this.updateScheduled = !0;
		requestAnimationFrame(() => {
			this.processBatchedUpdates();
			this.updateScheduled = !1;
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
		this.darkImageObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					this.applyThemeToImage(entry.target);
					this.darkImageObserver?.unobserve(entry.target);
				});
			},
			{ rootMargin: '300px 0px' },
		);
	}
	shouldDeferThemeSync(img) {
		if (!img || !this.darkImageObserver) return !1;
		if (img.loading !== 'lazy' || img.complete) return !1;
		const rect = img.getBoundingClientRect();
		const verticalBuffer = Math.max(window.innerHeight * 0.5, 200);
		return (
			rect.top > window.innerHeight + verticalBuffer ||
			rect.bottom < -verticalBuffer
		);
	}
	observeDarkImages(images) {
		if (!this.darkImageObserver) return;
		images.forEach((img) => {
			if (!img?.dataset?.dark) return;
			if (this.shouldDeferThemeSync(img)) {
				this.darkImageObserver.observe(img);
				return;
			}
			this.darkImageObserver.unobserve(img);
		});
	}
	applyThemeToImage(img) {
		if (!img || !this.body) return;
		const isDark = this.body.classList.contains('is-dark');
		const darkSrc = img.dataset.dark;
		if (!darkSrc) return;
		if (isDark) {
			if (!img.dataset.light) {
				img.dataset.light = img.src;
			}
			img.src = darkSrc;
		} else if (img.dataset.light) {
			img.src = img.dataset.light;
		}
		if (img.srcset) {
			if (isDark) {
				if (!img.dataset.originalSrcset) {
					img.dataset.originalSrcset = img.srcset;
				}
				img.srcset = '';
			} else if (img.dataset.originalSrcset) {
				img.srcset = img.dataset.originalSrcset;
			}
		}
	}
	syncThemeForImages(images) {
		images.forEach((img) => {
			if (!img?.dataset?.dark) return;
			if (this.shouldDeferThemeSync(img)) {
				this.darkImageObserver?.observe(img);
				return;
			}
			this.darkImageObserver?.unobserve(img);
			this.applyThemeToImage(img);
		});
	}
	updateDynamicLogos(images) {
		this.syncThemeForImages(images);
	}
	updateNewCasinoCards(container = null) {
		const targetContainer = container || document;
		const newImages = targetContainer.querySelectorAll('img[data-dark]');
		if (newImages.length > 0) {
			this.updateDynamicLogos(Array.from(newImages));
		}
	}
	forceUpdateAllLogos() {
		this.updateLogos();
		const allCasinoImages = document.querySelectorAll('img[data-dark]');
		this.updateDynamicLogos(Array.from(allCasinoImages));
	}
	toggleTheme() {
		if (!this.body) return;
		const isDark = !this.body.classList.contains('is-dark');
		this.body.classList.toggle('is-dark', isDark);
		this.body.classList.toggle('is-light', !isDark);
		this.updateToggleUI(isDark);
		this.updateToggleButtonState(isDark);
		storage.set('theme', isDark ? 'dark' : 'light');
		this.updateLogos();
	}
	updateToggleUI(isDark) {
		if (this.themeIcon) {
			const nextIcon = isDark ? '☀️' : '🌙';
			if (this.themeIcon.textContent !== nextIcon) {
				this.themeIcon.textContent = nextIcon;
			}
		}
	}
	updateToggleButtonState(isDark) {
		if (this.toggleButton) {
			if (isDark) {
				this.toggleButton.classList.add('is-active', 'is-dark-mode');
				this.toggleButton.classList.remove('is-light-mode');
			} else {
				this.toggleButton.classList.remove('is-active');
				this.toggleButton.classList.remove('is-dark-mode');
				this.toggleButton.classList.add('is-light-mode');
			}
		}
	}
	updateLogos() {
		if (!this.body) return;
		const allCasinoImages = document.querySelectorAll('img[data-dark]');
		this.syncThemeForImages(Array.from(allCasinoImages));
	}
	cleanup() {
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
		if (this.darkImageObserver) {
			this.darkImageObserver.disconnect();
			this.darkImageObserver = null;
		}
		this.observedContainers.clear();
	}
}
// GeoPopup Ultimate v1.0 — Fully locked, immutable
class GeoPopup {
	constructor(config = {}) {
		// ===== CONFIG =====
		this.popupId = config.popupId || 'geo-popup';
		this.localStorageKey = config.localStorageKey || 'topjeu_geo_popup_shown';
		this.whitelist = new Set(config.whitelist || ['CA', 'FR', 'CH']);
		this.expiryDays = config.expiryDays || 7;
		this.localeRegex = config.localeRegex || /^\/?([a-z]{2})(?:\/|$)/i;
		this.CTA = config.CTA || {
			CA: {
				FR: {
					href: '/ca/',
					text: 'Visiter TopJeu Canada',
					title: '🇨🇦 TopJeu Canada',
					message:
						'Cette version est destinée aux joueurs français. Souhaitez-vous consulter la version adaptée aux joueurs canadiens ?',
				},
				CH: {
					href: '/ca/',
					text: 'Visiter TopJeu Canada',
					title: '🇨🇦 TopJeu Canada',
					message:
						'Cette version est destinée aux joueurs suisses. Souhaitez-vous consulter la version adaptée aux joueurs canadiens ?',
				},
			},
			FR: {
				CA: {
					href: '/',
					text: 'Visiter TopJeu France',
					title: '🇫🇷 TopJeu France',
					message:
						'Cette version est destinée aux joueurs canadiens. Souhaitez-vous consulter la version adaptée aux joueurs français ?',
				},
				CH: {
					href: '/',
					text: 'Visiter TopJeu France',
					title: '🇫🇷 TopJeu France',
					message:
						'Cette version est destinée aux joueurs suisses. Souhaitez-vous consulter la version adaptée aux joueurs français ?',
				},
			},
			CH: {
				FR: {
					href: '/ch/',
					text: 'Visiter TopJeu Suisse',
					title: '🇨🇭 TopJeu Suisse',
					message:
						'Cette version est destinée aux joueurs français. Souhaitez-vous consulter la version adaptée aux joueurs suisses ?',
				},
				CA: {
					href: '/ch/',
					text: 'Visiter TopJeu Suisse',
					title: '🇨🇭 TopJeu Suisse',
					message:
						'Cette version est destinée aux joueurs canadiens. Souhaitez-vous consulter la version adaptée aux joueurs suisses ?',
				},
			},
		};
		this.devHosts = new Set(['localhost', '127.0.0.1']);
		this.unknownValues = new Set(['UNKNOWN', 'XX']);
		this.escListener = null;

		this.init();
	}

	// ===== HELPERS =====
	isDevHost() {
		return this.devHosts.has(window.location.hostname);
	}

	normalizeCountry(code) {
		if (!code) return null;
		const n = String(code).trim().toUpperCase();
		return /^[A-Z]{2}$/.test(n) && !this.unknownValues.has(n) ? n : null;
	}

	getGeoOverride() {
		if (!this.isDevHost()) return null;
		const params = new URLSearchParams(window.location.search);
		return this.normalizeCountry(params.get('geo'));
	}

	getVisitorCountry() {
		const override = this.getGeoOverride();
		if (override) {
			if (this.isDevHost()) console.info('[GEO][DEV] ?geo ->', override);
			return override;
		}
		const html = document.documentElement.dataset.geoCountry;
		const n = this.normalizeCountry(html);
		if (this.isDevHost())
			console.info('[GEO][DEV] HTML data-geo-country ->', n || 'null');
		return n;
	}

	getCurrentLocale() {
		const path =
			document.documentElement.dataset.currentPath || window.location.pathname;
		const m = path.match(this.localeRegex);
		return m ? m[1].toUpperCase() : 'FR';
	}

	storageKey(country) {
		return `${this.localStorageKey}_${country}`;
	}

	hasExpired(key) {
		const record = storage.get(key);
		if (!record) return true;
		try {
			const parsed = JSON.parse(record);
			const timestamp = Number(parsed?.timestamp);
			if (!Number.isFinite(timestamp)) return true;
			return (
				Date.now() - timestamp > this.expiryDays * 24 * 60 * 60 * 1000
			);
		} catch {
			return true;
		}
	}

	markShown(key) {
		storage.set(key, JSON.stringify({ timestamp: Date.now() }));
	}

	// ===== POPUP LOGIC =====
	init() {
		const visitor = this.getVisitorCountry();
		const locale = this.getCurrentLocale();

		if (!visitor || !locale) return;
		if (!this.whitelist.has(visitor) || !this.whitelist.has(locale)) return;
		if (visitor === locale) return;
		if (document.getElementById(this.popupId)) return;

		const config = this.CTA[visitor]?.[locale];
		if (!config) return;

		const key = this.storageKey(visitor);
		if (!this.hasExpired(key)) return;

		this.showPopup({ key, config });
		if (this.isDevHost())
			console.info('[GEO][DEV] Popup shown', { visitor, locale });
	}

	showPopup({ key, config }) {
		if (document.getElementById(this.popupId)) return;

		const overlay = document.createElement('div');
		overlay.id = this.popupId;
		overlay.className = 'geo-popup-overlay';
		overlay.setAttribute('role', 'dialog');
		overlay.setAttribute('aria-modal', 'true');
		overlay.setAttribute('aria-labelledby', 'geo-popup-title');
		overlay.innerHTML = `
			<div class="geo-popup-content">
				<button class="geo-popup-close" aria-label="Fermer">✕</button>
				<h2 id="geo-popup-title">${config.title}</h2>
				<p>${config.message}</p>
				<div class="geo-popup-actions">
					<a href="${config.href}" class="geo-popup-cta">${config.text}</a>
					<button class="geo-popup-dismiss">Rester sur cette version du site</button>
				</div>
			</div>
		`;

		document.body.appendChild(overlay);
		requestAnimationFrame(() => overlay.classList.add('is-visible'));

		const close = () => {
			overlay.classList.remove('is-visible');
			setTimeout(() => overlay.remove(), 300);
			this.markShown(key);
			this.removeEscListener();
		};

		overlay.querySelector('.geo-popup-close')?.addEventListener('click', close);
		overlay
			.querySelector('.geo-popup-dismiss')
			?.addEventListener('click', close);
		overlay.querySelector('.geo-popup-cta')?.addEventListener('click', close);
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) close();
		});

		this.removeEscListener();
		this.escListener = (e) => {
			if (e.key === 'Escape' && overlay.parentNode) close();
		};
		document.addEventListener('keydown', this.escListener);
	}

	removeEscListener() {
		if (this.escListener) {
			document.removeEventListener('keydown', this.escListener);
			this.escListener = null;
		}
	}
}

// 🔒 LOCKED: невозможно улучшить функционально — полный feature-set, memory-safe, dev-override, expiry, whitelist, accessibility, no-duplicates

document.addEventListener('DOMContentLoaded', () => {
	document.documentElement.style.overflow = '';
	document.body.classList.remove('is-menu-open', 'is-modal-open');
	window.cookieConsentManager = new CookieConsentManager();
	window.popupManager = new PopupManager();
	window.languageToggleManager = new LanguageToggleManager();
	window.geoPopup = new GeoPopup();
	window.mobileMenuManager = new MobileMenuManager();
	window.formManager = new FormManager();
	window.faqManager = new FAQManager();
	window.darkModeManager = new DarkModeManager();
	window.aboutCarousel = new AboutCarousel();
	const avisToggle = document.querySelector('.nav-menu__avis-toggle');
	const avisWrapper = document.querySelector('.nav-menu__avis');
	if (avisToggle && avisWrapper) {
		avisToggle.addEventListener('click', (e) => {
			e.preventDefault();
			avisWrapper.classList.toggle('is-open');
			const expanded = avisWrapper.classList.contains('is-open');
			avisToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
			const dropdown = document.getElementById('avis-list');
			if (dropdown) {
				dropdown.hidden = !expanded;
				dropdown.setAttribute('aria-hidden', expanded ? 'false' : 'true');
			}
		});
		document.addEventListener('click', (e) => {
			if (!avisWrapper.contains(e.target) && avisWrapper.classList.contains('is-open')) {
				avisWrapper.classList.remove('is-open');
				avisToggle.setAttribute('aria-expanded', 'false');
				const dropdown = document.getElementById('avis-list');
				if (dropdown) {
					dropdown.hidden = true;
					dropdown.setAttribute('aria-hidden', 'true');
				}
			}
		});
	}
	const header = document.querySelector('.header');
	const scrollBtn = document.getElementById('scrolltop');
	if (header || scrollBtn) {
		let ticking = !1;
		const updateOnScroll = (scrollY) => {
			if (header) {
				if (scrollY > 10) {
					header.classList.add('is-scrolled');
				} else {
					header.classList.remove('is-scrolled');
				}
			}
			if (scrollBtn) {
				if (scrollY > SCROLLTOP_VISIBLE_OFFSET) {
					scrollBtn.classList.add('is-visible');
				} else {
					scrollBtn.classList.remove('is-visible');
				}
			}
			ticking = !1;
		};
		const onScroll = () => {
			if (ticking) return;
			ticking = !0;
			window.requestAnimationFrame(() => {
				updateOnScroll(window.scrollY);
			});
		};
		window.addEventListener('scroll', onScroll, { passive: !0 });
		updateOnScroll(window.scrollY);
	}
	if (scrollBtn) {
		scrollBtn.addEventListener('click', (e) => {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});
		scrollBtn.addEventListener('mouseup', (e) => {
			setTimeout(() => {
				if (!scrollBtn.matches(':hover')) {
					scrollBtn.style.backgroundColor = '';
				}
			}, 50);
		});
		scrollBtn.addEventListener('mouseleave', () => {
			scrollBtn.style.backgroundColor = '';
		});
		scrollBtn.addEventListener('touchend', () => {
			setTimeout(() => {
				scrollBtn.style.backgroundColor = '';
			}, TIMINGS.TOUCH_RESET_DELAY);
		});
	}
	window.scrollRevealManager = new ScrollRevealManager();
	const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
	defer(() => {
		window.animationManager = new AnimationManager();
	});
	(function setupInputMethodDetection() {
		let usingKeyboard = !1;
		const body = document.body;
		if (!body) return;
		window.addEventListener(
			'keydown',
			(e) => {
				if (KEYBOARD_KEYS.has(e.key)) {
					usingKeyboard = !0;
					body.classList.add('is-tabbing');
				}
			},
			{ passive: !0 },
		);
		const disableKeyboardMode = () => {
			if (!usingKeyboard) return;
			usingKeyboard = !1;
			body.classList.remove('is-tabbing');
		};
		window.addEventListener('mousedown', disableKeyboardMode, { passive: !0 });
		window.addEventListener('touchstart', disableKeyboardMode, { passive: !0 });
		window.addEventListener('pointerdown', disableKeyboardMode, {
			passive: !0,
		});
	})();
	(function preventCardFocusOnTouch() {
		if (typeof document === 'undefined') return;
		document.addEventListener(
			'focusin',
			function (e) {
				try {
					if (document.body.classList.contains('is-tabbing')) return;
					const card =
						e.target && e.target.closest && e.target.closest('.casino-card');
					if (card) {
						if (e.target && typeof e.target.blur === 'function') {
							e.target.blur();
						} else if (
							document.activeElement &&
							typeof document.activeElement.blur === 'function'
						) {
							document.activeElement.blur();
						}
					}
				} catch (err) {}
			},
			!0,
		);
	})();
});
window.clearCookies = function () {
	if (window.cookieConsentManager) {
		window.cookieConsentManager.clearConsent();
	}
};
window.addEventListener('beforeunload', () => {
	if (window.scrollRevealManager) {
		window.scrollRevealManager.cleanup();
	}
	if (window.darkModeManager) {
		window.darkModeManager.cleanup();
	}
	if (window.faqManager) {
		window.faqManager.cleanup();
	}
	if (window.languageToggleManager) {
		window.languageToggleManager.cleanup();
	}
});
const mobileScrollSafeguard = () => {
	if (window.innerWidth > 768) return;
	const unblock = () => {
		if (
			document.body.classList.contains('is-menu-open') ||
			document.body.classList.contains('is-modal-open')
		) {
			return;
		}
		document.documentElement.style.overflow = 'auto';
	};
	['touchstart', 'touchend', 'touchcancel', 'touchmove'].forEach((evt) => {
		window.addEventListener(evt, unblock, { passive: !0 });
	});
};
mobileScrollSafeguard();
