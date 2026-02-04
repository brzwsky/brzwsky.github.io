// ============================================================================
// OPTIMIZED JS WITH DOM CACHING & EVENT DELEGATION
// Enhanced with section-based observers, improved delegation, and unified analytics
// ============================================================================

// Global observers registry for better memory management
const observerRegistry = {
	scrollObservers: new Map(),
	globalScrollObserver: null,
};

// Timing constants for consistent animations
const TIMINGS = {
	BANNER_INITIAL_DELAY: 2000,
	BANNER_EXPAND_DELAY: 20,
	BANNER_EXPAND_COMPLETE: 450,
	MODAL_ANIMATION: 300,
	MODAL_OPENING_DELAY: 50,
	TOUCH_RESET_DELAY: 100,
	FEEDBACK_TIMEOUT: 5000,
	SCROLL_DEBOUNCE: 100,
	RESIZE_DEBOUNCE: 150,
};

// Keyboard navigation keys for accessibility
const KEYBOARD_KEYS = new Set([
	'Tab',
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Escape',
]);

const MOBILE_MAX_WIDTH = 768;

// LocalStorage helper with error handling
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
	},
};

// Cached viewport check with invalidation on resize
let cachedIsMobile = null;
let viewportCheckTime = 0;
const VIEWPORT_CACHE_DURATION = 100; // ms

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

// Invalidate viewport cache on resize
window.addEventListener(
	'resize',
	() => {
		cachedIsMobile = null;
	},
	{ passive: true },
);

// ============================================================================
// COOKIE CONSENT & ANALYTICS MANAGEMENT (Unified)
// ============================================================================

class CookieConsentManager {
	constructor() {
		// Cache DOM elements
		this.banner = document.getElementById('cookie-banner');
		this.acceptBtn = document.getElementById('cookie-accept');
		this.declineBtn = document.getElementById('cookie-decline');
		this.settingsLink = document.getElementById('cookie-settings-link');
		this.minimizedIcon = this.banner?.querySelector(
			'.cookie-banner__minimized-icon',
		);
		this.container = this.banner?.querySelector('.cookie-banner__container');

		// Analytics banner elements (unified management)
		this.analyticsBanner = document.querySelector('.cookie-consent-banner');
		this.analyticsAccept = document.getElementById('accept-analytics-btn');

		// State
		this.consentKey = 'cookieConsent';
		this.analyticsConsentKey = 'analyticsConsent';
		this.analyticsLoaded = false;
		this.ahrefsLoaded = false;

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

		const consent = localStorage.getItem(this.consentKey);

		if (!consent) {
			// Delayed banner display
			setTimeout(() => this.showBanner(), TIMINGS.BANNER_INITIAL_DELAY);
		} else if (consent === 'accepted') {
			this.banner.style.display = 'none';
		} else if (consent === 'declined') {
			this.minimizeBanner();
		}
	}

	showBanner() {
		if (!this.banner) return;

		this.banner.classList.add('show');
		if (this.acceptBtn) this.acceptBtn.focus();
	}

	minimizeBanner() {
		if (!this.banner || !this.container) return;

		this.banner.classList.remove('show');
		this.banner.classList.add('minimized');
		this.container.style.opacity = '0';
		this.container.style.maxHeight = '0';
	}

	expandBanner() {
		if (!this.banner || !this.container) return;

		this.banner.classList.remove('minimized');
		this.banner.classList.add('expanding');

		setTimeout(() => {
			this.banner.classList.add('show');
			this.container.style.maxHeight = this.container.scrollHeight + 'px';
			this.container.style.opacity = '1';
		}, TIMINGS.BANNER_EXPAND_DELAY);

		setTimeout(() => {
			this.banner.classList.remove('expanding');
			this.container.style.maxHeight = 'none';
		}, TIMINGS.BANNER_EXPAND_COMPLETE);
	}

	setupEventListeners() {
		if (!this.banner) return;

		// Event delegation for all cookie banner interactions
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
				this.banner.classList.contains('minimized')
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

	// Unified analytics banner management
	setupAnalyticsBanner() {
		if (!this.analyticsBanner || !this.analyticsAccept) return;

		this.analyticsBanner.classList.remove('fade-in');
		this.analyticsBanner.classList.remove('hidden');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');

		const analyticsChoice = storage.get(this.analyticsConsentKey);

		if (analyticsChoice === 'accepted') {
			this.hideAnalyticsBanner();
		} else {
			// Delayed banner display
			setTimeout(
				() => this.showAnalyticsBanner(),
				TIMINGS.BANNER_INITIAL_DELAY,
			);
		}

		this.analyticsAccept.addEventListener('click', () => {
			storage.set(this.analyticsConsentKey, 'accepted');
			this.hideAnalyticsBanner();

			// Update gtag consent
			if (typeof gtag !== 'undefined') {
				gtag('consent', 'update', {
					analytics_storage: 'granted',
					ad_storage: 'granted',
				});
			}
		});
	}

	showAnalyticsBanner() {
		if (!this.analyticsBanner) return;

		this.analyticsBanner.style.display = '';
		this.analyticsBanner.classList.add('show');
		this.analyticsBanner.classList.add('visible');
		this.analyticsBanner.setAttribute('aria-hidden', 'false');
	}

	hideAnalyticsBanner() {
		if (!this.analyticsBanner) return;

		this.analyticsBanner.classList.remove('show');
		this.analyticsBanner.classList.remove('visible');
		this.analyticsBanner.setAttribute('aria-hidden', 'true');
		this.analyticsBanner.style.display = 'none';
	}

	resetAndShowBanner() {
		if (!this.banner || !this.container) return;

		this.banner.style.display = '';
		this.banner.classList.remove('minimized');
		this.container.style.maxHeight = '';
		this.container.style.opacity = '1';
		this.showBanner();
	}

	acceptCookies() {
		localStorage.setItem(this.consentKey, 'accepted');
		if (this.banner) {
			this.banner.classList.remove('show');
			this.banner.style.display = 'none';
		}
		this.loadAnalytics();
		this.updateGtagConsent('granted');
	}

	declineCookies() {
		localStorage.setItem(this.consentKey, 'declined');
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
		this.ahrefsLoaded = true;
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
		const consent = localStorage.getItem(this.consentKey);
		if (consent === 'accepted') {
			this.loadAnalytics();
		}
	}

	clearConsent() {
		localStorage.removeItem(this.consentKey);
		this.disableAnalytics();
		this.removeAnalyticsCookies();

		if (this.banner && this.container) {
			this.banner.style.display = '';
			this.banner.classList.remove('minimized');
			this.container.style.maxHeight = '';
			this.container.style.opacity = '1';
			setTimeout(() => this.showBanner(), 10);
		}
	}
}

// ============================================================================
// POPUP & MODAL MANAGEMENT (Enhanced with conflict prevention)
// ============================================================================

class PopupManager {
	constructor() {
		this.popup = document.getElementById('popup');
		this.popupClose = document.getElementById('popup-close');
		this.popupContact = document.getElementById('popup-contact');
		this.popupContactClose = document.getElementById('popup-contact-close');
		this.privacyPopup = document.getElementById('privacy-popup');
		this.privacyClose = document.getElementById('privacy-close');

		this.lastFocusedElement = null;
		this.isClosing = false; // Prevent double-closing
		this.isOpening = false; // Prevent double-opening
		this.activeModals = new Set(); // Track active modals
		this.modalStack = []; // Stack for modal hierarchy
		this.visualFeedback = true; // Enable visual feedback to prevent flicker
		this.animationDuration = 200; // Animation duration in ms
		this.feedbackTimeout = null; // Track feedback timeout

		this.init();
	}

	init() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		// Event delegation for all popup interactions
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
			}

			// Backdrop clicks
			else if (e.target === this.popup) {
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
			}

			// Escape key
			else if (e.key === 'Escape') {
				if (this.popup && !this.popup.classList.contains('hidden')) {
					this.closePopup(this.popup);
				} else if (
					this.popupContact &&
					!this.popupContact.classList.contains('hidden')
				) {
					this.closePopup(this.popupContact);
				} else if (
					this.privacyPopup &&
					this.privacyPopup.classList.contains('show')
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

		// Prevent rapid successive openings
		if (this.activeModals.has(popupElement)) {
			return; // Already open
		}

		this.isOpening = true;

		// Close any existing modals to prevent conflicts
		this.closeAllModals();

		// Add visual feedback to prevent flicker
		if (this.visualFeedback) {
			popupElement.style.opacity = '0';
			// Animate both opacity and transform for a smooth scale+fade open
			popupElement.style.transition = `opacity ${this.animationDuration}ms ease, transform ${this.animationDuration}ms ease`;
			popupElement.style.transform = 'scale(0.95)';
			// Ensure the backdrop starts transparent during the open animation to avoid
			// an initial black paint flash on some browsers. We'll restore the backdrop
			// after the animation completes.
			popupElement.style.background = 'transparent';
			popupElement.style.pointerEvents = 'none';
			// Hint the browser that opacity/transform will change to improve smoothness
			popupElement.style.willChange = 'opacity, transform';
		}

		// Add opening delay to prevent conflicts
		setTimeout(() => {
			if (this.isClosing) {
				this.isOpening = false;
				return; // Check if closing was initiated during delay
			}

			this.closeMenu();
			this.lastFocusedElement = document.activeElement;
			popupElement.classList.remove('hidden');
			if (popupElement === this.popup && window.aboutCarousel) {
				window.aboutCarousel.reset();
			}

			// Smooth fade-in to prevent flicker
			if (this.visualFeedback) {
				requestAnimationFrame(() => {
					popupElement.style.opacity = '1';
					popupElement.style.transform = 'scale(1)';
					popupElement.style.pointerEvents = 'auto';
					// Remove the inline transparent backdrop so the CSS background-color
					// transition (defined in CSS) begins at the same frame as the
					// content animation — this prevents the two-stage appearance effect.
					popupElement.style.background = '';
				});
			}

			const closeButton = popupElement.querySelector('.popup__close');
			if (closeButton) closeButton.focus();
			document.documentElement.style.overflow = 'hidden';

			// Track active modal
			this.activeModals.add(popupElement);
			this.modalStack.push(popupElement);

			// Reset opening flag after animation
			this.feedbackTimeout = setTimeout(() => {
				this.isOpening = false;
				if (this.visualFeedback) {
					popupElement.style.transition = '';
					popupElement.style.opacity = '';
					popupElement.style.transform = '';
					// Restore the CSS-defined backdrop after the open animation so the
					// element no longer relies on inline background. This prevents the
					// inline 'transparent' background from remaining.
					popupElement.style.background = '';
					popupElement.style.pointerEvents = '';
					popupElement.style.willChange = '';
				}
			}, this.animationDuration);
		}, TIMINGS.MODAL_OPENING_DELAY);
	}

	closePopup(popupElement) {
		if (!popupElement || this.isClosing || this.isOpening) return;

		this.isClosing = true;

		// Smooth fade-out to prevent flicker
		if (this.visualFeedback) {
			// Make backdrop transparent while closing to avoid a lingering dark
			// background during the scale/opacity animation on some browsers.
			popupElement.style.background = 'transparent';
			popupElement.style.pointerEvents = 'none';
			popupElement.style.transition = `opacity ${this.animationDuration}ms ease, transform ${this.animationDuration}ms ease`;
			popupElement.style.opacity = '0';
			popupElement.style.transform = 'scale(0.95)';

			setTimeout(() => {
				popupElement.classList.add('hidden');
				popupElement.style.transition = '';
				popupElement.style.opacity = '';
				popupElement.style.transform = '';
				popupElement.style.background = '';
				popupElement.style.pointerEvents = '';
			}, this.animationDuration);
		} else {
			popupElement.classList.add('hidden');
		}

		if (this.lastFocusedElement) this.lastFocusedElement.focus();
		document.documentElement.style.overflow = 'auto';

		// Remove from tracking
		this.activeModals.delete(popupElement);
		const index = this.modalStack.indexOf(popupElement);
		if (index > -1) {
			this.modalStack.splice(index, 1);
		}

		// Reset closing flag after animation
		setTimeout(() => {
			this.isClosing = false;
		}, TIMINGS.MODAL_ANIMATION);
	}

	openPrivacyPopup() {
		if (!this.privacyPopup || this.isClosing) return;

		this.closeMenu();
		this.lastFocusedElement = document.activeElement;
		this.privacyPopup.classList.add('show');
		this.privacyPopup.setAttribute('aria-hidden', 'false');
		const closeButton = this.privacyPopup.querySelector(
			'.privacy-popup__close',
		);
		if (closeButton) closeButton.focus();
		document.documentElement.style.overflow = 'hidden';
		document.body.classList.add('modal-open');
	}

	closePrivacyPopup() {
		if (!this.privacyPopup || this.isClosing) return;

		this.isClosing = true;
		this.privacyPopup.classList.remove('show');
		this.privacyPopup.setAttribute('aria-hidden', 'true');
		if (this.lastFocusedElement) this.lastFocusedElement.focus();
		document.documentElement.style.overflow = 'auto';
		document.body.classList.remove('modal-open');

		// Reset closing flag after animation
		setTimeout(() => {
			this.isClosing = false;
		}, TIMINGS.MODAL_ANIMATION);
	}

	// Safe menu closing with conflict prevention
	closeMenu() {
		if (
			window.mobileMenuManager &&
			typeof window.mobileMenuManager.closeMenu === 'function'
		) {
			window.mobileMenuManager.closeMenu({ restoreFocus: false });
			return;
		}
		// Fallback: use cached elements from MobileMenuManager if available
		const menu =
			window.mobileMenuManager?.menu || document.querySelector('.nav-menu');
		const burger =
			window.mobileMenuManager?.burger || document.querySelector('.burger');

		if (menu && burger && menu.classList.contains('active')) {
			menu.classList.remove('active');
			const isMobile = isMobileViewport();
			if (isMobile) {
				menu.setAttribute('aria-hidden', 'true');
				setTimeout(() => {
					// Cache the viewport check result
					if (!menu.classList.contains('active') && isMobile) {
						menu.setAttribute('hidden', '');
					}
				}, 400);
				burger.style.display = 'flex';
			} else {
				menu.removeAttribute('hidden');
				menu.setAttribute('aria-hidden', 'false');
				burger.style.display = '';
			}
			document.body.classList.remove('menu-open');
			burger.setAttribute('aria-expanded', 'false');
		}
	}

	// Close all active modals to prevent conflicts
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

	// Get the topmost modal (for proper focus management)
	getTopModal() {
		return this.modalStack[this.modalStack.length - 1];
	}

	// Check if any modal is currently open
	hasActiveModals() {
		return this.activeModals.size > 0;
	}

	// Prevent rapid modal operations
	debounceModalOperation(operation, delay = 100) {
		clearTimeout(this.modalDebounceTimer);
		this.modalDebounceTimer = setTimeout(operation, delay);
	}

	// Safe modal opening with conflict prevention
	safeOpenPopup(popupElement) {
		if (this.isClosing || this.activeModals.has(popupElement)) return;

		this.debounceModalOperation(() => {
			this.openPopup(popupElement);
		});
	}

	// Safe modal closing with conflict prevention
	safeClosePopup(popupElement) {
		if (this.isClosing) return;

		this.debounceModalOperation(() => {
			this.closePopup(popupElement);
		});
	}

	// Reset modal state (for debugging or manual reset)
	resetModalState() {
		this.isClosing = false;
		this.isOpening = false;
		this.activeModals.clear();
		this.modalStack = [];
		document.documentElement.style.overflow = 'auto';
		document.body.classList.remove('modal-open');

		// Reset visual feedback styles
		if (this.visualFeedback) {
			[this.popup, this.popupContact, this.privacyPopup].forEach((modal) => {
				if (modal) {
					modal.style.transition = '';
					modal.style.opacity = '';
				}
			});
		}
	}

	// Toggle visual feedback (for performance tuning)
	setVisualFeedback(enabled) {
		this.visualFeedback = enabled;
	}

	// Get current modal state (for debugging)
	getModalState() {
		return {
			isClosing: this.isClosing,
			isOpening: this.isOpening,
			activeModals: Array.from(this.activeModals),
			modalStack: this.modalStack,
			visualFeedback: this.visualFeedback,
			animationDuration: this.animationDuration,
		};
	}

	// Set animation duration
	setAnimationDuration(duration) {
		this.animationDuration = Math.max(100, Math.min(1000, duration)); // Clamp between 100ms and 1000ms
	}

	// Enhanced visual feedback for rapid clicks
	enhanceVisualFeedback() {
		// Add subtle shake animation for rapid clicks
		const activeModal = this.getTopModal();
		if (activeModal && this.visualFeedback) {
			activeModal.style.animation = 'shake 0.3s ease-in-out';
			setTimeout(() => {
				activeModal.style.animation = '';
			}, 300);
		}
	}
}

// ============================================================================
// ABOUT POPUP TESTIMONIAL CAROUSEL
// ============================================================================

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
		this.isTouching = false;
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
			passive: true,
		});
		this.root.addEventListener('touchmove', this.handleTouchMove, {
			passive: true,
		});
		this.root.addEventListener('touchend', this.handleTouchEnd);
		window.addEventListener('resize', this.handleResize, { passive: true });
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
			this.toggleControls(false);
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
		// PERF: Batch layout read before DOM write to avoid forced reflow
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
		// PERF: Batch layout reads before DOM writes to avoid forced reflow
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
		this.isTouching = true;
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
		this.isTouching = false;
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

// ============================================================================
// MOBILE MENU MANAGEMENT
// ============================================================================

class MobileMenuManager {
	constructor() {
		// Cache DOM elements
		this.burger = document.querySelector('.burger');
		this.menu = document.querySelector('.nav-menu');
		this.closeBtn = document.querySelector('.close-menu');
		this.overlay = document.querySelector('.menu-overlay');
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
				document.body.classList.add('menu-animations-ready');
				this.updateVisibilityState();
			});
		}

		// Add resize handler to reset menu state on viewport changes
		window.addEventListener('resize', this.handleResize);
	}

	init() {
		this.setupEventListeners();
		this.bindMenuActions();
	}

	setupEventListeners() {
		// Event delegation for mobile menu
		document.addEventListener('click', (e) => {
			const burgerClicked = e.target.closest && e.target.closest('.burger');
			const closeClicked = e.target.closest && e.target.closest('.close-menu');
			const overlayClicked = this.overlay && e.target === this.overlay;
			if (burgerClicked && this.burger && burgerClicked === this.burger) {
				if (this.menu && this.menu.classList.contains('active')) {
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
				this.menu.classList.contains('active') &&
				!this.menu.contains(e.target) &&
				!this.burger.contains(e.target)
			) {
				this.closeMenu();
			}
		});

		document.addEventListener('keydown', (e) => {
			if (
				e.key === 'Escape' &&
				this.menu &&
				this.menu.classList.contains('active')
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
				this.closeMenu({ restoreFocus: false });
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
		if (!this.menu || !this.burger) return;
		if (!isMobileViewport()) {
			this.updateVisibilityState();
			return;
		}
		if (this.menu.classList.contains('active')) return;
		if (this.hideTimeout) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
		if (this.menu.hasAttribute('hidden')) {
			this.menu.removeAttribute('hidden');
			// PERF: Force reflow intentionally for transition, but batch all writes after
			void this.menu.offsetHeight;
		}
		// PERF: Batch all DOM writes after layout read
		this.menu.setAttribute('aria-hidden', 'false');
		this.menu.classList.add('active');
		this.menu.scrollTop = 0;
		this.burger.style.display = 'none';
		document.body.classList.add('menu-open');
		this.lockScroll();
		this.burger.setAttribute('aria-expanded', 'true');
	}

	closeMenu({ restoreFocus = true } = {}) {
		if (!this.menu || !this.burger) return;
		const wasActive = this.menu.classList.contains('active');
		this.menu.classList.remove('active');
		if (!isMobileViewport()) {
			this.updateVisibilityState();
		} else {
			this.burger.style.display = 'flex';
			document.body.classList.remove('menu-open');
			this.unlockScroll();
			this.menu.setAttribute('aria-hidden', 'true');
			if (this.hideTimeout) clearTimeout(this.hideTimeout);
			this.hideTimeout = setTimeout(() => {
				if (
					this.menu &&
					!this.menu.classList.contains('active') &&
					window.innerWidth <= 768
				) {
					this.menu.setAttribute('hidden', '');
				}
			}, 400);
			if (restoreFocus && wasActive) {
				this.burger.focus();
			}
		}
		this.burger.setAttribute('aria-expanded', 'false');
		if (!isMobileViewport()) {
			this.unlockScroll();
		}
	}

	updateVisibilityState() {
		if (!this.menu) return;
		const isMobile = isMobileViewport();
		const menuActive = this.menu.classList.contains('active');
		if (isMobile) {
			if (!menuActive) {
				this.menu.setAttribute('aria-hidden', 'true');
				if (!this.menu.hasAttribute('hidden')) {
					this.menu.setAttribute('hidden', '');
				}
				if (this.burger) {
					this.burger.style.display = 'flex';
					this.burger.setAttribute('aria-expanded', 'false');
				}
				document.body.classList.remove('menu-open');
				this.unlockScroll();
			} else {
				this.menu.removeAttribute('hidden');
				this.menu.setAttribute('aria-hidden', 'false');
				document.body.classList.add('menu-open');
				this.lockScroll();
				if (this.burger) {
					this.burger.style.display = 'none';
					this.burger.setAttribute('aria-expanded', 'true');
				}
			}
		} else {
			if (this.hideTimeout) {
				clearTimeout(this.hideTimeout);
				this.hideTimeout = null;
			}
			this.menu.removeAttribute('hidden');
			this.menu.setAttribute('aria-hidden', 'false');
			this.menu.classList.remove('active');
			document.body.classList.remove('menu-open');
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

// ============================================================================
// FORM MANAGEMENT
// ============================================================================

class FormManager {
	constructor() {
		// Cache DOM elements
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
					this.successMessage.classList.remove('hidden');
					setTimeout(() => this.successMessage.classList.add('hidden'), 5000);
				} else {
					alert("Erreur lors de l'envoi. Veuillez réessayer.");
				}
			} catch {
				alert('Erreur de réseau. Vérifiez votre connexion.');
			}
		});
	}
}

// ============================================================================
// FAQ MANAGEMENT
// ============================================================================

class FAQManager {
	constructor() {
		// Cache container for better performance
		this.faqSection = document.querySelector('.faq-section');
		this.faqQuestions =
			this.faqSection?.querySelectorAll('.faq-question') || [];
		this.lazyAttachThreshold = 50; // Use lazy attach for more than 50 FAQ items
		// Hard-disable virtual scrolling by using extremely high thresholds
		this.virtualScrollThreshold = Number.MAX_SAFE_INTEGER;
		this.ultraLargeThreshold = Number.MAX_SAFE_INTEGER;
		this.extremeThreshold = 1000; // Use DOM recycling for more than 1000 FAQ items
		this.attachedElements = new Set();
		this.intersectionObserver = null;
		this.virtualScrollEnabled = false;
		this.visibleRange = { start: 0, end: 0 };

		this.init();
	}

	init() {
		this.setupFAQ();
		if (this.faqQuestions.length > this.extremeThreshold) {
			this.setupDOMRecycling();
		} else if (this.faqQuestions.length > this.ultraLargeThreshold) {
			this.setupEnhancedVirtualScrolling();
		} else if (this.faqQuestions.length > this.virtualScrollThreshold) {
			this.setupVirtualScrolling();
		} else if (this.faqQuestions.length > this.lazyAttachThreshold) {
			this.setupLazyAttach();
		}
	}

	setupFAQ() {
		// Use container-based delegation for better performance
		const container = this.faqSection || document;

		// Event delegation for FAQ interactions
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

	// Lazy attach for large FAQ sections
	setupLazyAttach() {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const faqItem = entry.target;
						if (!this.attachedElements.has(faqItem)) {
							this.attachFAQEvents(faqItem);
							this.attachedElements.add(faqItem);
						}
						// Unobserve after attaching
						this.intersectionObserver.unobserve(faqItem);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '100px' },
		);

		// Observe all FAQ questions
		this.faqQuestions.forEach((question) => {
			this.intersectionObserver.observe(question);
		});
	}

	attachFAQEvents(faqItem) {
		// Attach specific events to individual FAQ item if needed
		// This is called when the FAQ item comes into view
	}

	// Virtual scrolling setup for very large FAQ sections
	setupVirtualScrolling() {
		this.virtualScrollEnabled = true;
		const container = this.faqSection;
		if (!container) return;

		// Create virtual scroll container
		const virtualContainer = document.createElement('div');
		virtualContainer.className = 'virtual-faq-container';
		virtualContainer.style.height = `${this.faqQuestions.length * 60}px`; // Estimated height

		// Replace original content with virtual container
		container.innerHTML = '';
		container.appendChild(virtualContainer);

		// Setup intersection observer for virtual scrolling
		this.setupVirtualScrollObserver(virtualContainer);
	}

	setupVirtualScrollObserver(virtualContainer) {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.updateVisibleFAQItems(entry.target);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '200px' },
		);

		this.intersectionObserver.observe(virtualContainer);
	}

	updateVisibleFAQItems(container) {
		// Calculate visible range based on scroll position
		// PERF: Batch layout reads before DOM writes to avoid forced reflow
		const scrollTop = container.scrollTop || window.pageYOffset;
		const containerHeight = container.clientHeight;
		const itemHeight = 60; // Estimated FAQ item height

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
		const end = Math.min(
			this.faqQuestions.length,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + 5,
		);

		// Only update if range has changed significantly
		if (
			Math.abs(start - this.visibleRange.start) > 3 ||
			Math.abs(end - this.visibleRange.end) > 3
		) {
			this.renderVisibleFAQItems(start, end);
			this.visibleRange = { start, end };
		}
	}

	renderVisibleFAQItems(start, end) {
		// This would render only visible FAQ items
		// Implementation depends on specific FAQ structure
		/* no-op in production */
	}

	// Enhanced virtual scrolling for ultra-large sections (>500 items)
	setupEnhancedVirtualScrolling() {
		this.virtualScrollEnabled = true;
		const container = this.faqSection;
		if (!container) return;

		// Create enhanced virtual scroll container with performance optimizations
		const virtualContainer = document.createElement('div');
		virtualContainer.className = 'enhanced-virtual-faq-container';
		virtualContainer.style.height = `${this.faqQuestions.length * 60}px`;
		virtualContainer.style.position = 'relative';

		// Add performance optimizations
		virtualContainer.style.willChange = 'transform';
		virtualContainer.style.contain = 'layout style paint';

		// Replace original content with virtual container
		container.innerHTML = '';
		container.appendChild(virtualContainer);

		// Setup enhanced intersection observer
		this.setupEnhancedVirtualScrollObserver(virtualContainer);

		// Add scroll throttling for better performance
		this.setupScrollThrottling(virtualContainer);
	}

	setupEnhancedVirtualScrollObserver(virtualContainer) {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.updateVisibleFAQItemsEnhanced(entry.target);
					}
				});
			},
			{ threshold: 0.05, rootMargin: '300px' }, // Larger margin for better performance
		);

		this.intersectionObserver.observe(virtualContainer);
	}

	updateVisibleFAQItemsEnhanced(container) {
		// Enhanced calculation with performance optimizations
		// PERF: Batch layout reads before DOM writes to avoid forced reflow
		const scrollTop = container.scrollTop || window.pageYOffset;
		const containerHeight = container.clientHeight;
		const itemHeight = 60;

		// Use more aggressive buffering for ultra-large lists
		const bufferSize = Math.min(20, Math.ceil(containerHeight / itemHeight));

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
		const end = Math.min(
			this.faqQuestions.length,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize,
		);

		// Only update if range has changed significantly (reduced sensitivity)
		if (
			Math.abs(start - this.visibleRange.start) > 5 ||
			Math.abs(end - this.visibleRange.end) > 5
		) {
			this.renderVisibleFAQItemsEnhanced(start, end);
			this.visibleRange = { start, end };
		}
	}

	renderVisibleFAQItemsEnhanced(start, end) {
		// Enhanced rendering with performance optimizations
		/* no-op in production */
	}

	setupScrollThrottling(container) {
		let scrollTimeout;
		container.addEventListener(
			'scroll',
			() => {
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(() => {
					this.updateVisibleFAQItemsEnhanced(container);
				}, TIMINGS.SCROLL_DEBOUNCE);
			},
			{ passive: true },
		);
	}

	// DOM recycling for extreme lists (>1000 items)
	setupDOMRecycling() {
		this.virtualScrollEnabled = true;
		this.domRecyclingEnabled = true;
		const container = this.faqSection;
		if (!container) return;

		// Create minimal DOM structure with recycling
		const virtualContainer = document.createElement('div');
		virtualContainer.className = 'dom-recycled-faq-container';
		virtualContainer.style.height = `${this.faqQuestions.length * 60}px`;
		virtualContainer.style.position = 'relative';

		// Performance optimizations for extreme lists
		virtualContainer.style.willChange = 'transform';
		virtualContainer.style.contain = 'layout style paint';
		virtualContainer.style.overflow = 'hidden';

		// Replace original content
		container.innerHTML = '';
		container.appendChild(virtualContainer);

		// Setup DOM recycling
		this.setupDOMRecyclingObserver(virtualContainer);
		this.setupScrollThrottling(virtualContainer);
	}

	setupDOMRecyclingObserver(virtualContainer) {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.updateDOMRecycledItems(entry.target);
					}
				});
			},
			{ threshold: 0.01, rootMargin: '100px' }, // Very sensitive for extreme lists
		);

		this.intersectionObserver.observe(virtualContainer);
	}

	updateDOMRecycledItems(container) {
		// Calculate visible range with aggressive buffering
		const scrollTop = container.scrollTop || window.pageYOffset;
		const containerHeight = container.clientHeight;
		const itemHeight = 60;

		// Minimal buffer for extreme performance
		const bufferSize = 5;

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
		const end = Math.min(
			this.faqQuestions.length,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize,
		);

		// Only update if range has changed significantly
		if (
			Math.abs(start - this.visibleRange.start) > 2 ||
			Math.abs(end - this.visibleRange.end) > 2
		) {
			this.renderDOMRecycledItems(start, end, container);
			this.visibleRange = { start, end };
		}
	}

	renderDOMRecycledItems(start, end, container) {
		// DOM recycling: reuse existing elements instead of creating new ones
		/* no-op in production */

		// Clear container and render only visible items
		container.innerHTML = '';

		// Create only the visible items
		for (let i = start; i < end; i++) {
			const item = this.createRecycledFAQItem(i);
			container.appendChild(item);
		}
	}

	createRecycledFAQItem(index) {
		// Create minimal DOM structure for each FAQ item
		const item = document.createElement('div');
		item.className = 'faq-item-recycled';
		item.style.position = 'absolute';
		item.style.top = `${index * 60}px`;
		item.style.height = '60px';
		item.textContent = `FAQ Item ${index + 1}`;
		return item;
	}

	toggleFAQ(button) {
		const answer = button.nextElementSibling;
		const isOpen = button.getAttribute('aria-expanded') === 'true';

		if (isOpen) {
			// Set current height first to enable transition
			answer.style.maxHeight = answer.scrollHeight + 'px';
			// Force reflow
			answer.offsetHeight;
			// Then collapse
			requestAnimationFrame(() => {
				answer.style.maxHeight = '0';
			});
			button.setAttribute('aria-expanded', 'false');
			answer.classList.remove('open');
		} else {
			// Close any other open FAQ items (accordion behavior)
			// Use cached questions if available, otherwise query
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
						// Force reflow
						openAnswer.offsetHeight;
						requestAnimationFrame(() => {
							openAnswer.style.maxHeight = '0';
						});
						openAnswer.classList.remove('open');
					}
					openBtn.setAttribute('aria-expanded', 'false');
				}
			});

			// Set starting point, then animate to full height
			answer.style.maxHeight = '0';
			answer.classList.add('open');
			button.setAttribute('aria-expanded', 'true');

			// Trigger reflow then set target height for smooth transition
			answer.offsetHeight;
			requestAnimationFrame(() => {
				answer.style.maxHeight = answer.scrollHeight + 'px';
			});
		}
	}

	// Cleanup method for memory management
	cleanup() {
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}
		this.attachedElements.clear();

		if (this.mostVisibleObserver) {
			this.mostVisibleObserver.disconnect();
			this.mostVisibleObserver = null;
		}

		if (this.mostVisibleMutationObserver) {
			this.mostVisibleMutationObserver.disconnect();
			this.mostVisibleMutationObserver = null;
		}

		if (this.mostVisibleResizeHandler) {
			window.removeEventListener('resize', this.mostVisibleResizeHandler, {
				passive: true,
			});
			this.mostVisibleResizeHandler = null;
		}
	}
}

// ============================================================================
// CASINO BUTTONS ACCESSIBILITY
// ============================================================================

class CasinoButtonsManager {
	constructor() {
		// Cache container for better performance
		this.casinoContainer = document.querySelector('.casino-cards-container');
		this.casinoButtons =
			this.casinoContainer?.querySelectorAll('.casino-card__button') || [];
		this.lazyAttachThreshold = 30; // Use lazy attach for more than 30 casino buttons
		// Hard-disable virtual scrolling by using extremely high thresholds
		this.virtualScrollThreshold = Number.MAX_SAFE_INTEGER;
		this.ultraLargeThreshold = Number.MAX_SAFE_INTEGER;
		this.attachedElements = new Set();
		this.intersectionObserver = null;
		this.virtualScrollEnabled = false;
		this.visibleRange = { start: 0, end: 0 };

		this.init();
	}

	init() {
		this.setupCasinoButtons();

		// On mobile we enable the "most-visible" highlighting behavior which
		// highlights the single card that occupies the largest visible area.
		if (typeof window !== 'undefined' && window.matchMedia) {
			if (window.matchMedia('(max-width: 767px)').matches) {
				this.setupMostVisibleHighlighting();
			}
		}
		if (this.casinoButtons.length > this.ultraLargeThreshold) {
			this.setupEnhancedVirtualScrolling();
		} else if (this.casinoButtons.length > this.virtualScrollThreshold) {
			this.setupVirtualScrolling();
		} else if (this.casinoButtons.length > this.lazyAttachThreshold) {
			this.setupLazyAttach();
		}
	}

	setupCasinoButtons() {
		// Use container-based delegation for better performance
		const container = this.casinoContainer || document;

		// Event delegation for keyboard activation
		container.addEventListener('keydown', (e) => {
			const isActivateKey = e.key === 'Enter' || e.key === ' ';
			if (!isActivateKey) return;

			// Casino buttons
			const casinoBtn = e.target?.closest?.('.casino-card__button');
			if (casinoBtn) {
				e.preventDefault();
				casinoBtn.click();
				return;
			}

			// Footer links (skip ones with their own handlers)
			const link = e.target?.closest?.('.footer__link');
			if (link) {
				if (link.id === 'privacy-link' || link.id === 'cookie-settings-link')
					return;
				const href = link.getAttribute('href');
				if (
					link.hasAttribute('disabled') ||
					link.getAttribute('aria-disabled') === 'true'
				)
					return;
				if (href === '#about' || href === '#contact') return;
				e.preventDefault();
				link.click();
			}
		});
	}

	// Lazy attach for large casino sections
	setupLazyAttach() {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const casinoCard = entry.target;
						if (!this.attachedElements.has(casinoCard)) {
							this.attachCasinoEvents(casinoCard);
							this.attachedElements.add(casinoCard);
						}
						// Unobserve after attaching
						this.intersectionObserver.unobserve(casinoCard);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '100px' },
		);

		// Observe all casino cards
		this.casinoButtons.forEach((button) => {
			const casinoCard = button.closest('.casino-card');
			if (casinoCard) {
				this.intersectionObserver.observe(casinoCard);
			}
		});
	}

	attachCasinoEvents(casinoCard) {
		// Attach specific events to individual casino card if needed
		// This is called when the casino card comes into view
	}

	// Mobile-only: observe casino cards and add `most-visible` class to the one
	// with the largest visible intersection ratio. This keeps a single card
	// highlighted without any press/selection animation.
	setupMostVisibleHighlighting() {
		// Helper to (re)collect cards and observe them
		const collectCards = () => {
			const cards = Array.from(
				document.querySelectorAll('.casino-card, .casino-card--top, .top-card'),
			).filter(Boolean);
			if (!cards.length) return;

			// reset ratios map
			if (this.mostVisibleRatios) this.mostVisibleRatios.clear();
			cards.forEach((c) => {
				if (!this.mostVisibleObserved || !this.mostVisibleObserved.has(c)) {
					this.mostVisibleObserved = this.mostVisibleObserved || new Set();
					this.mostVisibleObserved.add(c);
					this.mostVisibleObserver.observe(c);
				}
				this.mostVisibleRatios.set(c, 0);
			});
		};

		// Map of latest intersection ratios
		this.mostVisibleRatios = new Map();
		this.mostVisibleObserved = new Set();
		let mostVisibleCard = null;

		// Adaptive throttle: weaker devices get a longer minimum interval
		const hwConcurrency = navigator.hardwareConcurrency || 4;
		const saveData = navigator.connection && navigator.connection.saveData;
		const defaultInterval = hwConcurrency <= 2 || saveData ? 200 : 100;
		this.mostVisibleMinInterval = defaultInterval;
		this.mostVisibleScheduled = false;

		const thresholds = [];
		for (let i = 0; i <= 100; i += 5) thresholds.push(i / 100);

		// applyMostVisible: computes the current max and updates classes
		const applyMostVisible = () => {
			// compute the most-visible card and update classes
			let maxRatio = 0;
			let maxEl = null;
			this.mostVisibleRatios.forEach((r, el) => {
				if (r > maxRatio) {
					maxRatio = r;
					maxEl = el;
				}
			});

			if (maxEl !== mostVisibleCard) {
				if (mostVisibleCard) {
					mostVisibleCard.classList.remove('most-visible');
					mostVisibleCard.classList.remove('primary-most-visible');
				}
				mostVisibleCard = maxEl;
				if (mostVisibleCard) mostVisibleCard.classList.add('most-visible');
			}
		};

		// schedule an update instead of updating on every IO callback
		const scheduleMostVisibleUpdate = () => {
			if (this.mostVisibleScheduled) return;
			this.mostVisibleScheduled = true;
			setTimeout(() => {
				applyMostVisible();
				this.mostVisibleScheduled = false;
			}, this.mostVisibleMinInterval);
		};

		this.mostVisibleObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const el = entry.target;
					this.mostVisibleRatios.set(el, entry.intersectionRatio || 0);
				});
				// Defer actual class updates to throttled scheduler
				scheduleMostVisibleUpdate();
			},
			{ threshold: thresholds },
		);

		// Observe dynamic additions to the casino container if present
		const container =
			document.querySelector('.casino-cards-container') || document;
		this.mostVisibleMutationObserver = new MutationObserver(() => {
			collectCards();
		});
		if (container && container.nodeType === 1) {
			this.mostVisibleMutationObserver.observe(container, {
				childList: true,
				subtree: true,
			});
		}

		// initial collect & observe
		collectCards();

		// keep a resize handler to enable/disable observer when viewport changes
		this.mostVisibleResizeHandler = () => {
			if (window.matchMedia('(max-width: 1024px)').matches) {
				// ensure observed cards are collected
				collectCards();
			} else {
				if (this.mostVisibleObserver) {
					this.mostVisibleObserver.disconnect();
				}
				if (mostVisibleCard) {
					mostVisibleCard.classList.remove('most-visible');
					mostVisibleCard = null;
				}
			}
		};
		window.addEventListener('resize', this.mostVisibleResizeHandler, {
			passive: true,
		});

		window.addEventListener('resize', this.mostVisibleResizeHandler, {
			passive: true,
		});
	}

	// Virtual scrolling setup for very large casino sections
	setupVirtualScrolling() {
		this.virtualScrollEnabled = true;
		const container = this.casinoContainer;
		if (!container) return;

		// Create virtual scroll container
		const virtualContainer = document.createElement('div');
		virtualContainer.className = 'virtual-casino-container';
		virtualContainer.style.height = `${this.casinoButtons.length * 200}px`; // Estimated height

		// Replace original content with virtual container
		container.innerHTML = '';
		container.appendChild(virtualContainer);

		// Setup intersection observer for virtual scrolling
		this.setupVirtualScrollObserver(virtualContainer);
	}

	setupVirtualScrollObserver(virtualContainer) {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.updateVisibleCasinoCards(entry.target);
					}
				});
			},
			{ threshold: 0.1, rootMargin: '200px' },
		);

		this.intersectionObserver.observe(virtualContainer);
	}

	updateVisibleCasinoCards(container) {
		// Calculate visible range based on scroll position
		// PERF: Batch layout reads before DOM writes to avoid forced reflow
		const scrollTop = container.scrollTop || window.pageYOffset;
		const containerHeight = container.clientHeight;
		const itemHeight = 200; // Estimated casino card height

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
		const end = Math.min(
			this.casinoButtons.length,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + 3,
		);

		// Only update if range has changed significantly
		if (
			Math.abs(start - this.visibleRange.start) > 2 ||
			Math.abs(end - this.visibleRange.end) > 2
		) {
			this.renderVisibleCasinoCards(start, end);
			this.visibleRange = { start, end };
		}
	}

	renderVisibleCasinoCards(start, end) {
		// This would render only visible casino cards
		// Implementation depends on specific casino card structure
		/* no-op in production */
	}

	// Enhanced virtual scrolling for ultra-large casino sections (>300 items)
	setupEnhancedVirtualScrolling() {
		this.virtualScrollEnabled = true;
		const container = this.casinoContainer;
		if (!container) return;

		// Create enhanced virtual scroll container with performance optimizations
		const virtualContainer = document.createElement('div');
		virtualContainer.className = 'enhanced-virtual-casino-container';
		virtualContainer.style.height = `${this.casinoButtons.length * 200}px`;
		virtualContainer.style.position = 'relative';

		// Add performance optimizations
		virtualContainer.style.willChange = 'transform';
		virtualContainer.style.contain = 'layout style paint';

		// Replace original content with virtual container
		container.innerHTML = '';
		container.appendChild(virtualContainer);

		// Setup enhanced intersection observer
		this.setupEnhancedVirtualScrollObserver(virtualContainer);

		// Add scroll throttling for better performance
		this.setupScrollThrottling(virtualContainer);
	}

	setupEnhancedVirtualScrollObserver(virtualContainer) {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.updateVisibleCasinoCardsEnhanced(entry.target);
					}
				});
			},
			{ threshold: 0.05, rootMargin: '400px' }, // Larger margin for casino cards
		);

		this.intersectionObserver.observe(virtualContainer);
	}

	updateVisibleCasinoCardsEnhanced(container) {
		// Enhanced calculation with performance optimizations
		const scrollTop = container.scrollTop || window.pageYOffset;
		const containerHeight = container.clientHeight;
		const itemHeight = 200;

		// Use more aggressive buffering for ultra-large lists
		const bufferSize = Math.min(10, Math.ceil(containerHeight / itemHeight));

		const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
		const end = Math.min(
			this.casinoButtons.length,
			Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize,
		);

		// Only update if range has changed significantly (reduced sensitivity)
		if (
			Math.abs(start - this.visibleRange.start) > 3 ||
			Math.abs(end - this.visibleRange.end) > 3
		) {
			this.renderVisibleCasinoCardsEnhanced(start, end);
			this.visibleRange = { start, end };
		}
	}

	renderVisibleCasinoCardsEnhanced(start, end) {
		// Enhanced rendering with performance optimizations
		/* no-op in production */
	}

	setupScrollThrottling(container) {
		let scrollTimeout;
		container.addEventListener(
			'scroll',
			() => {
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(() => {
					this.updateVisibleCasinoCardsEnhanced(container);
				}, 16); // ~60fps throttling
			},
			{ passive: true },
		);
	}

	// Cleanup method for memory management
	cleanup() {
		if (this.intersectionObserver) {
			this.intersectionObserver.disconnect();
			this.intersectionObserver = null;
		}
		this.attachedElements.clear();
	}
}

// ============================================================================
// ANIMATION MANAGEMENT
// ============================================================================

class AnimationManager {
	constructor() {
		// Cache DOM elements
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

		// Rotate once on initial load
		this.headerLogo.classList.add('rotate-once');

		// Rotate on click (or keyboard activate) — replace hover behavior with explicit activation
		const runLogoRotate = (e) => {
			// prevent if reduced-motion is active
			if (this.reduceMotion) return;
			// re-trigger animation by adding the class; animationend handler will remove it
			this.headerLogo.classList.add('rotate-once');
			// ensure focus remains for keyboard users
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

		// Trigger bell animation after 2 seconds on every page load
		setTimeout(() => {
			this.disclaimer.classList.add('bell-start');
			setTimeout(() => {
				this.disclaimer.classList.remove('bell-start');
			}, 2000);
		}, 2000);

		// Also trigger on hover
		this.disclaimer.addEventListener('mouseenter', () => {
			this.disclaimer.classList.add('bell-start');
			setTimeout(() => {
				this.disclaimer.classList.remove('bell-start');
			}, 2000);
		});
	}
}

// ============================================================================
// SCROLL REVEAL ANIMATION MANAGEMENT (Enhanced with adaptive parameters and once option)
// ============================================================================

class ScrollRevealManager {
	constructor() {
		// Cache DOM elements and sections
		this.elements = document.querySelectorAll('.fade-in');
		this.faqSection = document.querySelector('.faq-section');
		this.casinoSection = document.querySelector('.casino-cards-container');
		this.heroSection = document.querySelector('.hero-section');

		// Section-based element collections
		this.sectionElements = {
			faq: this.faqSection
				? Array.from(this.faqSection.querySelectorAll('.fade-in'))
				: [],
			casino: this.casinoSection
				? Array.from(this.casinoSection.querySelectorAll('.fade-in'))
				: [],
			hero: this.heroSection
				? Array.from(this.heroSection.querySelectorAll('.fade-in'))
				: [],
			other: [],
		};

		// Adaptive parameters based on screen size
		this.adaptiveConfig = this.getAdaptiveConfig();
		this.animationOnce = true; // Set to false if animations should repeat

		// Section-specific once settings
		this.sectionOnceSettings = {
			faq: true, // FAQ animations should not repeat
			casino: true, // Casino animations should not repeat
			hero: false, // Hero animations can repeat
			other: true, // Other animations should not repeat
		};

		// Element-specific once settings (for individual control)
		this.elementOnceSettings = new Map();

		// Enable scroll-up animations (allows elements to animate again when scrolling up)
		this.enableScrollUpAnimations = true;

		this.init();
	}

	// Get adaptive configuration based on screen size and device type
	getAdaptiveConfig() {
		const isMobile = window.innerWidth <= 768;
		const isTablet = window.innerWidth <= 1024;
		const isLargeScreen = window.innerWidth > 1440;
		const isUltraWide = window.innerWidth > 1920;

		// Dynamic configuration based on page characteristics
		const pageHeight = document.documentElement.scrollHeight;
		const viewportHeight = window.innerHeight;
		const isLongPage = pageHeight > viewportHeight * 3; // More than 3 viewports
		const isVeryLongPage = pageHeight > viewportHeight * 5; // More than 5 viewports
		const totalFadeElements = this.elements.length;
		const isHighElementCount = totalFadeElements > 100;

		// Enhanced rootMargin for long pages and high element count
		let rootMargin = '0px 0px -5px 0px'; // Base: 5px as requested

		if (isMobile) {
			// Mobile: minimal rootMargin to prevent blocking scroll
			rootMargin = '0px 0px -2px 0px';
		} else if (isVeryLongPage || isHighElementCount) {
			// For very long pages or many elements, trigger earlier
			rootMargin = '0px 0px -50px 0px';
		} else if (isLongPage) {
			// For long pages, slightly earlier trigger
			rootMargin = '0px 0px -20px 0px';
		}

		// Adaptive threshold based on page characteristics
		let threshold = isMobile ? 0.01 : isTablet ? 0.08 : 0.05;
		if (isVeryLongPage || isHighElementCount) {
			threshold = Math.max(0.01, threshold * 0.5); // Lower threshold for better performance
		}

		return {
			threshold,
			rootMargin,
			sectionThreshold: isMobile ? 10 : isTablet ? 15 : 20,
			once: true, // Prevent re-triggering animations
			isLongPage,
			isVeryLongPage,
			isHighElementCount,
			totalElements: totalFadeElements,
		};
	}

	init() {
		if (!this.elements.length) return;
		this.categorizeElements();
		// Immediately show elements that are already in viewport to prevent flash
		this.showVisibleElementsImmediately();
		this.setupSectionObservers();
		this.setupResizeListener();
	}

	// Immediately show elements already in viewport to prevent flash on page load
	showVisibleElementsImmediately() {
		// Use a simple viewport check without IntersectionObserver for immediate results
		const viewportHeight = window.innerHeight;
		const viewportWidth = window.innerWidth;

		this.elements.forEach((element) => {
			const rect = element.getBoundingClientRect();
			// Check if element is in viewport (with small margin for better UX)
			const isInViewport =
				rect.top < viewportHeight * 0.9 &&
				rect.bottom > 0 &&
				rect.left < viewportWidth &&
				rect.right > 0;

			if (isInViewport) {
				// Immediately add visible class to prevent flash
				element.classList.add('visible');
			}
		});
	}

	// Listen for resize events to update adaptive config
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

	// Categorize elements by sections for better performance
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
						entry.target.classList.add('visible');

						const elementOnce = this.getElementOnce(entry.target);

						if (elementOnce && entry.intersectionRatio >= 0.5) {
							observer.unobserve(entry.target);
						}
					} else if (this.enableScrollUpAnimations && window.innerWidth > 768) {
						entry.target.classList.remove('visible');
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
							entry.target.classList.add('visible');

							if (entry.intersectionRatio >= 0.5) {
								observerRegistry.globalScrollObserver.unobserve(entry.target);
							}
						} else if (
							this.enableScrollUpAnimations &&
							window.innerWidth > 768
						) {
							entry.target.classList.remove('visible');
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

	// Recreate observers with new adaptive config
	recreateObservers() {
		this.cleanup();
		this.setupSectionObservers();
	}

	// Toggle scroll-up animations
	setScrollUpAnimations(enabled) {
		this.enableScrollUpAnimations = enabled;
	}

	// Set individual element once setting
	setElementOnce(element, once) {
		if (element && element.nodeType === Node.ELEMENT_NODE) {
			this.elementOnceSettings.set(element, once);
		}
	}

	// Get individual element once setting
	getElementOnce(element) {
		if (element && this.elementOnceSettings.has(element)) {
			return this.elementOnceSettings.get(element);
		}
		// Fall back to section setting
		const section = this.getElementSection(element);
		return this.sectionOnceSettings[section] ?? true;
	}

	// Determine which section an element belongs to
	getElementSection(element) {
		if (this.faqSection && this.faqSection.contains(element)) return 'faq';
		if (this.casinoSection && this.casinoSection.contains(element))
			return 'casino';
		if (this.heroSection && this.heroSection.contains(element)) return 'hero';
		return 'other';
	}

	// Get current animation settings
	getAnimationSettings() {
		return {
			enableScrollUpAnimations: this.enableScrollUpAnimations,
			sectionOnceSettings: this.sectionOnceSettings,
			adaptiveConfig: this.adaptiveConfig,
			elementOnceSettings: Array.from(this.elementOnceSettings.entries()),
		};
	}

	// Cleanup method for memory management
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

// ============================================================================
// DARK MODE MANAGEMENT (Enhanced with MutationObserver for dynamic elements)
// ============================================================================

class DarkModeManager {
	constructor() {
		// Cache DOM elements
		this.toggleButton = document.getElementById('theme-toggle');
		this.themeIcon = document.querySelector('.theme-icon');
		this.body = document.body;
		this.casinoImages = document.querySelectorAll('.casino-card__image');

		// MutationObserver for dynamic elements
		this.mutationObserver = null;
		this.observedContainers = new Set();
		this.pendingUpdates = new Set(); // Batch updates
		this.updateScheduled = false; // Prevent multiple RAF calls

		this.init();
	}

	init() {
		this.loadSavedTheme();
		if (this.toggleButton && this.body) {
			this.setupEventListeners();
			this.setupMutationObserver();
		}
	}

	loadSavedTheme() {
		if (!this.body) return;

		const savedTheme = localStorage.getItem('theme');
		let isDark;

		if (savedTheme) {
			this.body.classList.add(savedTheme);
			isDark = savedTheme === 'dark';
			this.updateToggleButtonState(isDark);
		} else {
			const prefersDark = window.matchMedia(
				'(prefers-color-scheme: dark)',
			).matches;
			this.body.classList.add(prefersDark ? 'dark' : 'light');
			isDark = prefersDark;
			this.updateToggleButtonState(isDark);
		}

		this.updateToggleUI(isDark);
		this.updateToggleButtonState(isDark);
		this.updateLogos();

		// Listen for system theme changes
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', (e) => {
				if (!localStorage.getItem('theme')) {
					const isDark = e.matches;
					if (!this.body) return;
					this.body.classList.toggle('dark', isDark);
					this.body.classList.toggle('light', !isDark);
					this.updateToggleUI(isDark);
					this.updateLogos();
					this.updateToggleButtonState(isDark);
				}
			});
	}

	setupEventListeners() {
		if (!this.toggleButton) return;
		this.toggleButton.addEventListener('click', () => this.toggleTheme());
	}

	// Setup MutationObserver to watch for dynamically added casino cards
	setupMutationObserver() {
		if (!this.mutationObserver) {
			this.mutationObserver = new MutationObserver((mutations) => {
				// Batch all mutations to avoid excessive updates
				mutations.forEach((mutation) => {
					if (mutation.type === 'childList') {
						mutation.addedNodes.forEach((node) => {
							if (node.nodeType === Node.ELEMENT_NODE) {
								// Check if it's a casino card or contains casino cards
								const casinoImages = node.matches?.('.casino-card__image')
									? [node]
									: node.querySelectorAll?.('.casino-card__image') || [];

								if (casinoImages.length > 0) {
									// Add to pending updates instead of immediate processing
									casinoImages.forEach((img) => this.pendingUpdates.add(img));
								}
							}
						});
					}
				});

				// Schedule batched update using requestAnimationFrame
				this.scheduleBatchedUpdate();
			});
		}

		// Observe common containers where casino cards might be added
		const containers = [
			document.querySelector('.casino-cards-container'),
			document.querySelector('.casino-section'),
			document.querySelector('.main-content'),
		].filter(Boolean);

		containers.forEach((container) => {
			if (!this.observedContainers.has(container)) {
				this.mutationObserver.observe(container, {
					childList: true,
					subtree: true,
				});
				this.observedContainers.add(container);
			}
		});
	}

	// Schedule batched update using requestAnimationFrame
	scheduleBatchedUpdate() {
		if (this.updateScheduled) return;

		this.updateScheduled = true;
		requestAnimationFrame(() => {
			this.processBatchedUpdates();
			this.updateScheduled = false;
		});
	}

	// Process all pending updates in a single batch
	processBatchedUpdates() {
		if (this.pendingUpdates.size === 0) return;

		const images = Array.from(this.pendingUpdates);
		this.pendingUpdates.clear();
		this.updateDynamicLogos(images);
	}

	// Update logos for dynamically added elements
	updateDynamicLogos(images) {
		const isDark = this.body.classList.contains('dark');
		images.forEach((img) => {
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
		});
	}

	// Manual method to update logos for newly inserted casino cards
	// Call this method after programmatically adding casino cards
	updateNewCasinoCards(container = null) {
		const targetContainer = container || document;
		const newImages = targetContainer.querySelectorAll('.casino-card__image');
		if (newImages.length > 0) {
			this.updateDynamicLogos(Array.from(newImages));
		}
	}

	// Public method to force update all casino logos
	forceUpdateAllLogos() {
		// Update existing cached images
		this.updateLogos();

		// Update any new images that might have been added
		const allCasinoImages = document.querySelectorAll('.casino-card__image');
		this.updateDynamicLogos(Array.from(allCasinoImages));
	}

	toggleTheme() {
		if (!this.body) return;

		const isDark = !this.body.classList.contains('dark');
		this.body.classList.toggle('dark', isDark);
		this.body.classList.toggle('light', !isDark);
		this.updateToggleUI(isDark);
		this.updateToggleButtonState(isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		this.updateLogos();
	}

	updateToggleUI(isDark) {
		// Update icon in button
		// Moon for light theme, Sun for dark theme
		if (this.themeIcon) {
			this.themeIcon.textContent = isDark ? '☀️' : '🌙';
		}
	}

	updateToggleButtonState(isDark) {
		// Add/remove active class for glow effect
		// Active when dark mode is ON (sun icon glows white)
		// Inactive when light mode is ON (moon icon glows dark)
		if (this.toggleButton) {
			if (isDark) {
				// Dark theme is active - sun glows white
				this.toggleButton.classList.add('active');
				this.toggleButton.classList.add('dark-mode');
			} else {
				// Light theme is active - moon glows dark
				this.toggleButton.classList.remove('active');
				this.toggleButton.classList.remove('dark-mode');
				this.toggleButton.classList.add('light-mode');
			}
		}
	}

	// Enhanced logo updating with safe attribute checking
	updateLogos() {
		if (!this.body) return;

		const isDark = this.body.classList.contains('dark');
		// Get fresh list of all images with data-dark attribute each time
		const allCasinoImages = document.querySelectorAll('img[data-dark]');
		// PERF: Batch layout reads before DOM writes to avoid forced reflow
		allCasinoImages.forEach((img) => {
			const darkSrc = img.dataset.dark;
			if (!darkSrc) return;
			// Read layout if needed (e.g. img.offsetWidth)
			if (isDark) {
				if (!img.dataset.light) {
					img.dataset.light = img.src;
				}
				img.src = darkSrc;
			} else if (img.dataset.light) {
				img.src = img.dataset.light;
			}

			// Update srcset if it exists
			if (img.srcset) {
				if (isDark) {
					if (!img.dataset.originalSrcset) {
						img.dataset.originalSrcset = img.srcset;
					}
					img.srcset = ''; // Clear srcset in dark mode to use src
				} else {
					if (img.dataset.originalSrcset) {
						img.srcset = img.dataset.originalSrcset; // Restore srcset in light mode
					}
				}
			}
		});
	}

	// Cleanup MutationObserver
	cleanup() {
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
		this.observedContainers.clear();
	}
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
	// Show all fade-in elements immediately
	const fadeIns = Array.from(document.querySelectorAll('.fade-in'));
	fadeIns.forEach((el) => {
		el.classList.add('visible');
	});

	// Immediately reset overflow and body classes
	document.documentElement.style.overflow = '';
	document.body.classList.remove('menu-open', 'modal-open');

	// Initialize all managers immediately
	window.cookieConsentManager = new CookieConsentManager();
	window.popupManager = new PopupManager();
	window.mobileMenuManager = new MobileMenuManager();
	window.formManager = new FormManager();
	window.faqManager = new FAQManager();
	// window.casinoButtonsManager = new CasinoButtonsManager(); // DISABLED - causes content to disappear
	window.darkModeManager = new DarkModeManager();
	window.aboutCarousel = new AboutCarousel();

	// Avis dropdown toggle
	const avisToggle = document.querySelector('.avis-toggle');
	const avisWrapper = document.querySelector('.avis-wrapper');
	if (avisToggle && avisWrapper) {
		avisToggle.addEventListener('click', (e) => {
			e.preventDefault();
			avisWrapper.classList.toggle('open');
			const expanded = avisWrapper.classList.contains('open');
			avisToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
			const dropdown = document.getElementById('avis-list');
			if (dropdown) {
				dropdown.hidden = !expanded;
				dropdown.setAttribute('aria-hidden', expanded ? 'false' : 'true');
			}
		});
	}

	// ============================================================================
	// STICKY HEADER - Add scrolled class when scrolling
	// ============================================================================
	const header = document.querySelector('.header');
	if (header) {
		let ticking = false;
		// PERF: Only use rAF for DOM writes, read scrollY outside
		const updateHeader = (scrollY) => {
			// Add scrolled class when scrolled down more than 10px
			if (scrollY > 10) {
				header.classList.add('scrolled');
			} else {
				header.classList.remove('scrolled');
			}
			// No forced reflow: no layout reads here
			ticking = false;
		};
		const onScroll = () => {
			if (!ticking) {
				ticking = true;
				window.requestAnimationFrame(() => {
					const scrollY = window.scrollY;
					updateHeader(scrollY);
				});
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		// Initial state
		updateHeader(window.scrollY);
	}

	// ============================================================================
	// SCROLL TO TOP BUTTON
	// ============================================================================
	const scrollBtn = document.getElementById('scrolltop');

	if (scrollBtn) {
		window.addEventListener('scroll', () => {
			if (window.scrollY > 300) {
				scrollBtn.classList.add('show');
			} else {
				scrollBtn.classList.remove('show');
			}
		});

		scrollBtn.addEventListener('click', (e) => {
			e.preventDefault();
			window.scrollTo({ top: 0, behavior: 'smooth' });
		});

		// Reset background on mouseup to ensure it returns to transparent
		scrollBtn.addEventListener('mouseup', (e) => {
			// Only reset if mouse is not hovering
			setTimeout(() => {
				if (!scrollBtn.matches(':hover')) {
					scrollBtn.style.backgroundColor = '';
				}
			}, 50);
		});

		// Reset background when mouse leaves button
		scrollBtn.addEventListener('mouseleave', () => {
			scrollBtn.style.backgroundColor = '';
		});

		// Reset background after touch/click ends
		scrollBtn.addEventListener('touchend', () => {
			setTimeout(() => {
				scrollBtn.style.backgroundColor = '';
			}, TIMINGS.TOUCH_RESET_DELAY);
		});
	}

	// Initialize scroll reveal immediately to prevent flash of invisible content
	// But defer animation manager to idle time
	window.scrollRevealManager = new ScrollRevealManager();

	const defer = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
	defer(() => {
		window.animationManager = new AnimationManager();
	});

	// ========================================================================
	// INPUT METHOD DETECTION (Keyboard-only focus outlines)
	// ========================================================================
	(function setupInputMethodDetection() {
		let usingKeyboard = false;
		const body = document.body;
		if (!body) return;

		window.addEventListener(
			'keydown',
			(e) => {
				if (KEYBOARD_KEYS.has(e.key)) {
					usingKeyboard = true;
					body.classList.add('user-is-tabbing');
				}
			},
			{ passive: true },
		);

		const disableKeyboardMode = () => {
			if (!usingKeyboard) return;
			usingKeyboard = false;
			body.classList.remove('user-is-tabbing');
		};

		window.addEventListener('mousedown', disableKeyboardMode, {
			passive: true,
		});
		window.addEventListener('touchstart', disableKeyboardMode, {
			passive: true,
		});
		window.addEventListener('pointerdown', disableKeyboardMode, {
			passive: true,
		});
	})();

	// Prevent touch / pointer taps from producing persistent focus on cards.
	// Selection should be handled by scroll (IntersectionObserver). Keep keyboard
	// focus intact for accessibility (body.user-is-tabbing is set on keyboard input).
	(function preventCardFocusOnTouch() {
		if (typeof document === 'undefined') return;
		// Capture focusin events so we can blur programmatically when the user
		// is interacting via touch/pointer rather than keyboard.
		document.addEventListener(
			'focusin',
			function (e) {
				try {
					if (document.body.classList.contains('user-is-tabbing')) return;
					const card =
						e.target && e.target.closest && e.target.closest('.casino-card');
					if (card) {
						// Remove focus obtained by touch so :focus-within styles do not apply.
						if (e.target && typeof e.target.blur === 'function') {
							e.target.blur();
						} else if (
							document.activeElement &&
							typeof document.activeElement.blur === 'function'
						) {
							document.activeElement.blur();
						}
					}
				} catch (err) {
					// Fail silently; this is a non-critical UX improvement
				}
			},
			true,
		);
	})();
});

// ============================================================================
// TESTING HELPERS
// ============================================================================

window.clearCookies = function () {
	if (window.cookieConsentManager) {
		window.cookieConsentManager.clearConsent();
	}
};

// ============================================================================
// CLEANUP ON PAGE UNLOAD (Memory management)
// ============================================================================

window.addEventListener('beforeunload', () => {
	// Cleanup all managers
	if (window.scrollRevealManager) {
		window.scrollRevealManager.cleanup();
	}
	if (window.darkModeManager) {
		window.darkModeManager.cleanup();
	}
	if (window.faqManager) {
		window.faqManager.cleanup();
	}
	if (window.casinoButtonsManager) {
		window.casinoButtonsManager.cleanup();
	}
});

// ========================================================================
// MOBILE SCROLL SAFEGUARD
// ========================================================================
const mobileScrollSafeguard = () => {
	if (window.innerWidth > 768) return;
	const unblock = () => {
		if (
			document.body.classList.contains('menu-open') ||
			document.body.classList.contains('modal-open')
		) {
			return;
		}
		document.documentElement.style.overflow = 'auto';
	};
	['touchstart', 'touchend', 'touchcancel', 'touchmove'].forEach((evt) => {
		window.addEventListener(evt, unblock, { passive: true });
	});
};
mobileScrollSafeguard();
