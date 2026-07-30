const observerRegistry = {
        scrollObservers: new Map,
        globalScrollObserver: null
    },
    TIMINGS = {
        BANNER_INITIAL_DELAY: 2e3,
        BANNER_COLLAPSE_DELAY: 400,
        BANNER_DISMISS_DELAY: 500,
        BANNER_EXPAND_COMPLETE: 400,
        MODAL_ANIMATION: 300,
        MODAL_OPENING_DELAY: 50,
        TOUCH_RESET_DELAY: 100
    },
    SCROLLTOP_VISIBLE_OFFSET = 300,
    KEYBOARD_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]),
    MOBILE_MAX_WIDTH = 768,
    TABLET_MAX_WIDTH = 1024,
    storage = {
        get(e) {
            try {
                return localStorage.getItem(e)
            } catch {
                return null
            }
        },
        set(e, t) {
            try {
                return localStorage.setItem(e, t), !0
            } catch {
                return !1
            }
        },
        remove(e) {
            try {
                return localStorage.removeItem(e), !0
            } catch {
                return !1
            }
        }
    },
    ANALYTICS_BANNER_MARKUP = '\n<div class="cookie-consent-banner">\n\t<p>\n\t\tNous utilisons Google Analytics pour améliorer votre expérience.\n\t\tAcceptez-vous ?\n\t</p>\n\t<button id="accept-analytics-btn" tabindex="-1">Accepter</button>\n</div>',
    COOKIE_BANNER_MARKUP = '\n<div\n\tid="cookie-banner"\n\tclass="cookie-banner"\n\trole="dialog"\n\taria-labelledby="cookie-title"\n\taria-describedby="cookie-description"\n\ttabindex="-1"\n>\n\t<div\n\t\tclass="cookie-banner__minimized-icon"\n\t\taria-label="Afficher les parametres des cookies"\n\t\ttabindex="0"\n\t\trole="button"\n\t>\n\t\t🍪\n\t</div>\n\t<div class="cookie-banner__container">\n\t\t<div class="cookie-banner__content">\n\t\t\t<h4 id="cookie-title">Nous sommes des cookies</h4>\n\t\t\t<p id="cookie-description" class="cookie-banner__text">\n\t\t\t\tNous utilisons des cookies pour améliorer votre expérience sur\n\t\t\t\tTopJeu. En continuant à naviguer, vous acceptez notre utilisation\n\t\t\t\tdes cookies.\n\t\t\t</p>\n\t\t\t<p class="cookie-banner__note">\n\t\t\t\t<a\n\t\t\t\t\thref="#privacy-popup"\n\t\t\t\t\tclass="footer__link cookie-banner__link--emphasis"\n\t\t\t\t\tid="cookie-privacy-link"\n\t\t\t\t\tdata-popup-target="privacy"\n\t\t\t\t\t>Lire la politique de confidentialité</a\n\t\t\t\t>\n\t\t\t</p>\n\t\t</div>\n\t\t<div class="cookie-banner__actions">\n\t\t\t<button\n\t\t\t\tid="cookie-accept"\n\t\t\t\tclass="cookie-banner__btn cookie-banner__btn--accept"\n\t\t\t\taria-label="Accepter tous les cookies"\n\t\t\t>\n\t\t\t\tOK pour moi\n\t\t\t</button>\n\t\t\t<button\n\t\t\t\tid="cookie-decline"\n\t\t\t\tclass="cookie-banner__btn cookie-banner__btn--decline"\n\t\t\t\taria-label="Refuser les cookies non essentiels"\n\t\t\t>\n\t\t\t\tNon merci\n\t\t\t</button>\n\t\t</div>\n\t</div>\n</div>';
let cachedIsMobile = null,
    viewportCheckTime = 0;
const VIEWPORT_CACHE_DURATION = 100;

function isMobileViewport() {
    const e = Date.now();
    if (null !== cachedIsMobile && e - viewportCheckTime < 100) return cachedIsMobile;
    const t = document.documentElement,
        i = ["number" == typeof window.innerWidth ? window.innerWidth : null, t && "number" == typeof t.clientWidth ? t.clientWidth : null, window.screen && "number" == typeof window.screen.width ? window.screen.width : null].filter(e => e && e > 0),
        s = i.length ? Math.min(...i) <= 768 : window.innerWidth <= 768;
    return cachedIsMobile = s, viewportCheckTime = e, s
}

function isCanadianPage() {
    const e = [document.documentElement?.getAttribute("lang"), document.body?.getAttribute("lang")].filter(Boolean).join(" ").toLowerCase(),
        t = window.location.pathname.toLowerCase();
    return e.includes("ca") || "/ca" === t || t.startsWith("/ca/")
}

function ensureCookieMarkup() {
    if (document.body) {
        if (!document.querySelector(".cookie-consent-banner")) {
            const e = document.querySelector(".nav-menu__overlay");
            e ? e.insertAdjacentHTML("beforebegin", `${ANALYTICS_BANNER_MARKUP}\n`) : document.body.insertAdjacentHTML("afterbegin", ANALYTICS_BANNER_MARKUP)
        }
        if (!document.getElementById("cookie-banner")) {
            const e = document.getElementById("scrolltop");
            e ? e.insertAdjacentHTML("beforebegin", `${COOKIE_BANNER_MARKUP}\n`) : document.body.insertAdjacentHTML("beforeend", COOKIE_BANNER_MARKUP)
        }
    }
}

function runWhenIdle(e, t = 2500) {
    "function" != typeof window.requestIdleCallback ? setTimeout(e, Math.min(t, 1200)) : window.requestIdleCallback(() => e(), {
        timeout: t
    })
}

function scheduleNonCriticalTask(e, {
    timeout: t = 2500,
    waitForLoad: i = !1
} = {}) {
    const s = () => runWhenIdle(e, t);
    i && "complete" !== document.readyState ? window.addEventListener("load", s, {
        once: !0
    }) : s()
}
window.addEventListener("resize", () => {
    cachedIsMobile = null
}, {
    passive: !0
});
class CookieConsentManager {
    constructor() {
        this.banner = document.getElementById("cookie-banner"), this.acceptBtn = document.getElementById("cookie-accept"), this.declineBtn = document.getElementById("cookie-decline"), this.settingsLink = document.getElementById("cookie-settings-link"), this.minimizedIcon = this.banner?.querySelector(".cookie-banner__minimized-icon"), this.container = this.banner?.querySelector(".cookie-banner__container"), this.analyticsBanner = document.querySelector(".cookie-consent-banner"), this.analyticsAccept = document.getElementById("accept-analytics-btn"), this.consentKey = "cookieConsent", this.analyticsConsentKey = "analyticsConsent", this.analyticsLoaded = !1, this.init()
    }
    init() {
        this.loadConsentState(), this.setupEventListeners(), this.loadAnalyticsIfConsented(), this.setupAnalyticsBanner()
    }
    loadConsentState() {
        if (!this.banner) return;
        const e = storage.get(this.consentKey);
        e ? "accepted" === e ? this.banner.style.display = "none" : "declined" === e && this.minimizeBanner() : setTimeout(() => this.showBanner(), TIMINGS.BANNER_INITIAL_DELAY)
    }
    showBanner() {
        this.banner && requestAnimationFrame(() => {
            this.banner.classList.add("is-visible"), this.acceptBtn && this.acceptBtn.focus()
        })
    }
    resetBannerAnimationClasses() {
        this.banner && (this.banner.classList.remove("cookie-banner--expanding"), this.banner.classList.remove("cookie-banner--minimizing"))
    }
    setContainerState({
        maxHeight: e,
        opacity: t,
        transform: i
    } = {}) {
        this.container && (void 0 !== e && (this.container.style.maxHeight = e), void 0 !== t && (this.container.style.opacity = t), void 0 !== i && (this.container.style.transform = i))
    }
    getExpandedContainerHeight() {
        return this.container ? `${this.container.scrollHeight}px` : "0px"
    }
    finalizeExpandedBanner() {
        this.resetBannerAnimationClasses(), this.setContainerState({
            maxHeight: "none",
            opacity: "1",
            transform: ""
        })
    }
    finalizeMinimizedBanner() {
        this.banner && (this.resetBannerAnimationClasses(), this.banner.classList.add("cookie-banner--minimized"), this.setContainerState({
            maxHeight: "0",
            opacity: "0"
        }))
    }
    minimizeBanner() {
        this.banner && this.container && (this.setContainerState({
            maxHeight: this.getExpandedContainerHeight()
        }), requestAnimationFrame(() => {
            this.resetBannerAnimationClasses(), this.banner.classList.remove("is-visible"), this.banner.classList.add("cookie-banner--minimizing"), this.setContainerState({
                opacity: "0"
            })
        }), setTimeout(() => {
            requestAnimationFrame(() => {
                this.finalizeMinimizedBanner()
            })
        }, TIMINGS.BANNER_COLLAPSE_DELAY))
    }
    expandBanner() {
        this.banner && this.container && (requestAnimationFrame(() => {
            this.resetBannerAnimationClasses(), this.banner.classList.remove("cookie-banner--minimized"), this.banner.classList.add("cookie-banner--expanding"), this.banner.classList.add("is-visible"), this.setContainerState({
                maxHeight: this.getExpandedContainerHeight(),
                opacity: "1",
                transform: "translate3d(0, 0, 0) scale(1)"
            })
        }), setTimeout(() => {
            requestAnimationFrame(() => {
                this.finalizeExpandedBanner()
            })
        }, TIMINGS.BANNER_EXPAND_COMPLETE))
    }
    setupEventListeners() {
        this.banner && (document.addEventListener("click", e => {
            e.target === this.acceptBtn ? this.acceptCookies() : e.target === this.declineBtn ? this.declineCookies() : e.target === this.settingsLink ? (e.preventDefault(), this.resetAndShowBanner()) : (e.target === this.minimizedIcon || e.target === this.banner && this.banner.classList.contains("cookie-banner--minimized")) && this.expandBanner()
        }), document.addEventListener("keydown", e => {
            const t = "Enter" === e.key || " " === e.key;
            e.target === this.settingsLink && t ? (e.preventDefault(), this.resetAndShowBanner()) : e.target === this.minimizedIcon && t && (e.preventDefault(), this.expandBanner())
        }))
    }
    setupAnalyticsBanner() {
        this.analyticsBanner && this.analyticsAccept && (this.analyticsBanner.classList.remove("u-fade-in"), this.analyticsBanner.classList.remove("u-hidden"), this.analyticsBanner.setAttribute("aria-hidden", "true"), this.analyticsAccept.setAttribute("tabindex", "-1"), "accepted" === storage.get(this.analyticsConsentKey) ? this.hideAnalyticsBanner() : setTimeout(() => this.showAnalyticsBanner(), TIMINGS.BANNER_INITIAL_DELAY), this.analyticsAccept.addEventListener("click", () => {
            storage.set(this.analyticsConsentKey, "accepted"), this.hideAnalyticsBanner(), this.loadAnalytics(), this.updateGtagConsent("granted")
        }))
    }
    showAnalyticsBanner() {
        this.analyticsBanner && (this.analyticsBanner.style.display = "", this.analyticsBanner.classList.add("is-visible"), this.analyticsBanner.setAttribute("aria-hidden", "false"), this.analyticsAccept && this.analyticsAccept.removeAttribute("tabindex"))
    }
    hideAnalyticsBanner() {
        this.analyticsBanner && (this.analyticsBanner.classList.remove("is-visible"), this.analyticsBanner.setAttribute("aria-hidden", "true"), this.analyticsAccept && this.analyticsAccept.setAttribute("tabindex", "-1"), this.analyticsBanner.style.display = "none")
    }
    resetAndShowBanner() {
        this.banner && this.container && (this.banner.style.display = "", this.resetBannerAnimationClasses(), this.banner.classList.remove("cookie-banner--minimized"), this.setContainerState({
            maxHeight: "",
            opacity: "1",
            transform: ""
        }), this.showBanner())
    }
    acceptCookies() {
        storage.set(this.consentKey, "accepted"), this.banner && (this.banner.classList.remove("is-visible"), setTimeout(() => {
            this.banner.style.display = "none"
        }, TIMINGS.BANNER_DISMISS_DELAY)), this.loadAnalytics(), this.updateGtagConsent("granted")
    }
    declineCookies() {
        storage.set(this.consentKey, "declined"), this.minimizeBanner(), this.disableAnalytics(), this.updateGtagConsent("denied")
    }
    loadAnalytics() {
        this.analyticsLoaded || (this.loadGoogleAnalytics(), this.loadAhrefsAnalytics(), this.analyticsLoaded = !0)
    }
    loadGoogleAnalytics() {
        const e = document.createElement("script");
        e.async = !0, e.src = "https://www.googletagmanager.com/gtag/js?id=G-YYE4H0PHYY", document.head.appendChild(e), e.onload = () => {
            "undefined" != typeof gtag && (gtag("js", new Date), gtag("config", "G-YYE4H0PHYY"))
        }
    }
    loadAhrefsAnalytics() {
        const e = document.createElement("script");
        e.async = !0, e.src = "https://analytics.ahrefs.com/analytics.js", e.setAttribute("data-key", "flKbnmCKyZQK+Qsr+U37qQ"), document.head.appendChild(e)
    }
    disableAnalytics() {
        "undefined" != typeof gtag && gtag("consent", "update", {
            analytics_storage: "denied",
            ad_storage: "denied"
        }), this.removeAnalyticsCookies()
    }
    removeAnalyticsCookies() {
        const e = "Thu, 01 Jan 1970 00:00:00 GMT";
        ["_ga", "_gid", "_gat", "_gcl_au", "_fbp", "_uetsid", "_uetvid"].forEach(t => {
            document.cookie = `${t}=; expires=${e}; path=/; domain=.${window.location.hostname}`, document.cookie = `${t}=; expires=${e}; path=/`
        })
    }
    updateGtagConsent(e) {
        "undefined" != typeof gtag && gtag("consent", "update", {
            analytics_storage: e,
            ad_storage: e
        })
    }
    loadAnalyticsIfConsented() {
        "accepted" === storage.get(this.consentKey) && this.loadAnalytics()
    }
    clearConsent() {
        storage.remove(this.consentKey), this.disableAnalytics(), this.removeAnalyticsCookies(), this.banner && this.container && (this.banner.style.display = "", this.resetBannerAnimationClasses(), this.banner.classList.remove("cookie-banner--minimized"), this.setContainerState({
            maxHeight: "",
            opacity: "1",
            transform: ""
        }), setTimeout(() => this.showBanner(), 10))
    }
}
class LanguageToggleManager {
    constructor() {
        this.root = document.querySelector("[data-language-toggle]"), this.toggleButton = this.root?.querySelector("[data-language-toggle-button]") || null, this.options = this.root?.querySelector("[data-language-options]") || null, this.isOpen = !1, this.heroBaseTop = null, this.handleDocumentClick = this.handleDocumentClick.bind(this), this.handleKeydown = this.handleKeydown.bind(this), this.handleResize = this.handleResize.bind(this), this.init()
    }
    init() {
        this.root && this.toggleButton && this.options && (this.syncActiveOption(), this.toggleButton.addEventListener("click", e => {
            e.preventDefault(), this.toggle()
        }), this.options.addEventListener("click", e => {
            const t = e.target?.closest?.(".language-toggle__option");
            t && (this.isSamePage(t) && e.preventDefault(), this.close())
        }), document.addEventListener("click", this.handleDocumentClick), document.addEventListener("keydown", this.handleKeydown), window.addEventListener("resize", this.handleResize), this.updateMobileHeroOffset())
    }
    normalizePath(e) {
        let t = e || "/";
        for (; t.length > 1 && t.endsWith("/");) t = t.slice(0, -1);
        return t
    }
    syncActiveOption() {
        const e = Array.from(this.options?.querySelectorAll(".language-toggle__option") || []);
        if (!e.length) return;
        const t = new URL(window.location.href),
            i = this.normalizePath(t.pathname);
        let s = null;
        if (e.forEach(e => {
                try {
                    const n = new URL(e.href, window.location.href),
                        o = n.origin === t.origin && this.normalizePath(n.pathname) === i;
                    e.classList.toggle("is-active", o), o ? (e.setAttribute("aria-current", "page"), s = e) : e.removeAttribute("aria-current")
                } catch {}
            }), !s) {
            const t = this.toggleButton?.querySelector(".language-toggle__flag")?.textContent?.trim();
            t && (s = e.find(e => e.querySelector(".language-toggle__flag")?.textContent?.trim() === t) || null, s && (s.classList.add("is-active"), s.setAttribute("aria-current", "page")))
        }
    }
    isSamePage(e) {
        try {
            const t = new URL(e.href, window.location.href),
                i = new URL(window.location.href);
            return t.origin === i.origin && this.normalizePath(t.pathname) === this.normalizePath(i.pathname) && t.search === i.search && t.hash === i.hash
        } catch {
            return e.classList.contains("is-active")
        }
    }
    toggle() {
        this.isOpen ? this.close() : this.open()
    }
    open() {
        !this.isOpen && this.root && this.toggleButton && (this.isOpen = !0, this.root.classList.add("is-open"), this.toggleButton.setAttribute("aria-expanded", "true"), this.updateMobileHeroOffset())
    }
    close() {
        this.isOpen && this.root && this.toggleButton && (this.isOpen = !1, this.root.classList.remove("is-open"), this.toggleButton.setAttribute("aria-expanded", "false"), this.clearMobileHeroOffset())
    }
    handleDocumentClick(e) {
        this.isOpen && this.root && (this.root.contains(e.target) || this.close())
    }
    handleKeydown(e) {
        "Escape" === e.key && this.isOpen && this.close()
    }
    handleResize() {
        this.isOpen ? this.updateMobileHeroOffset() : this.clearMobileHeroOffset()
    }
    updateMobileHeroOffset() {
        if (!this.root || !this.toggleButton) return;
        const e = isMobileViewport(),
            t = document.querySelector("main > .hero__title");
        if (!e || !t || !this.isOpen) return void this.clearMobileHeroOffset();
        null == this.heroBaseTop && (this.heroBaseTop = t.getBoundingClientRect().top);
        const i = () => {
            const e = this.root.getBoundingClientRect(),
                i = this.options ? this.options.getBoundingClientRect() : e,
                s = Math.max(e.bottom, i.bottom),
                n = null != this.heroBaseTop ? this.heroBaseTop : t.getBoundingClientRect().top,
                o = Math.max(0, Math.ceil(s - n + 10));
            document.documentElement.style.setProperty("--language-toggle-hero-offset", o + "px"), document.body.classList.toggle("is-language-toggle-open", o > 0 && this.isOpen)
        };
        requestAnimationFrame(i), setTimeout(i, 90), setTimeout(i, 240)
    }
    clearMobileHeroOffset() {
        this.heroBaseTop = null, document.documentElement.style.setProperty("--language-toggle-hero-offset", "0px"), document.body.classList.remove("is-language-toggle-open")
    }
    cleanup() {
        document.removeEventListener("click", this.handleDocumentClick), document.removeEventListener("keydown", this.handleKeydown), window.removeEventListener("resize", this.handleResize), this.clearMobileHeroOffset()
    }
}
class MobileMenuManager {
    constructor() {
        this.header__burger = document.querySelector(".header__burger"), this.menu = document.querySelector(".nav-menu"), this.closeBtn = document.querySelector(".nav-menu__close"), this.overlay = document.querySelector(".nav-menu__overlay"), this.hideTimeout = null, this.scrollLocked = !1, this.savedBodyStyles = null, this.savedRootStyles = null, this.handleResize = this.handleResize.bind(this), this.updateVisibilityState = this.updateVisibilityState.bind(this), this.init(), this.menu && (this.updateVisibilityState(), requestAnimationFrame(() => {
            document.body.classList.add("is-menu-animations-ready"), this.updateVisibilityState()
        })), window.addEventListener("resize", this.handleResize)
    }
    init() {
        this.setupEventListeners(), this.bindMenuActions()
    }
    setupEventListeners() {
        document.addEventListener("click", e => {
            const t = e.target.closest && e.target.closest(".header__burger"),
                i = e.target.closest && e.target.closest(".nav-menu__close"),
                s = this.overlay && e.target === this.overlay;
            t && this.header__burger && t === this.header__burger ? this.menu && this.menu.classList.contains("is-active") ? this.closeMenu() : this.openMenu() : (i && this.closeBtn && i === this.closeBtn || s || this.menu && this.menu.classList.contains("is-active") && !this.menu.contains(e.target) && !this.header__burger.contains(e.target)) && this.closeMenu()
        }), document.addEventListener("keydown", e => {
            "Escape" === e.key && this.menu && this.menu.classList.contains("is-active") && this.closeMenu()
        })
    }
    bindMenuActions() {
        this.menu && this.menu.querySelectorAll("[data-popup-target]").forEach(e => {
            const t = () => {
                const t = e.dataset.popupTarget;
                t && window.popupManager && (this.closeMenu({
                    restoreFocus: !1
                }), requestAnimationFrame(() => {
                    window.popupManager?.open && window.popupManager.open(t)
                }))
            };
            e.addEventListener("click", t), e.addEventListener("touchstart", e => {
                e.touches && e.touches.length > 1 || t()
            })
        })
    }
    openMenu() {
        if (this.menu && this.header__burger)
            if (isMobileViewport()) {
                if (!this.menu.classList.contains("is-active")) {
                    if (this.hideTimeout && (clearTimeout(this.hideTimeout), this.hideTimeout = null), this.menu.hasAttribute("hidden")) return this.menu.removeAttribute("hidden"), void requestAnimationFrame(() => this.activateMenu());
                    this.activateMenu()
                }
            } else this.updateVisibilityState()
    }
    activateMenu() {
        this.menu && this.header__burger && (this.menu.classList.contains("is-active") || (this.menu.setAttribute("aria-hidden", "false"), this.menu.classList.add("is-active"), this.menu.scrollTop = 0, this.header__burger.style.display = "none", document.body.classList.add("is-menu-open"), this.lockScroll(), this.header__burger.setAttribute("aria-expanded", "true")))
    }
    closeMenu({
        restoreFocus: e = !0
    } = {}) {
        if (!this.menu || !this.header__burger) return;
        const t = this.menu.classList.contains("is-active");
        this.menu.classList.remove("is-active"), isMobileViewport() ? (this.header__burger.style.display = "flex", document.body.classList.remove("is-menu-open"), this.unlockScroll(), this.menu.setAttribute("aria-hidden", "true"), this.hideTimeout && clearTimeout(this.hideTimeout), this.hideTimeout = setTimeout(() => {
            this.menu && !this.menu.classList.contains("is-active") && isMobileViewport() && this.menu.setAttribute("hidden", "")
        }, 400), e && t && this.header__burger.focus()) : this.updateVisibilityState(), this.header__burger.setAttribute("aria-expanded", "false"), isMobileViewport() || this.unlockScroll()
    }
    updateVisibilityState() {
        if (!this.menu) return;
        const e = isMobileViewport(),
            t = this.menu.classList.contains("is-active");
        e ? t ? (this.menu.removeAttribute("hidden"), this.menu.setAttribute("aria-hidden", "false"), document.body.classList.add("is-menu-open"), this.lockScroll(), this.header__burger && (this.header__burger.style.display = "none", this.header__burger.setAttribute("aria-expanded", "true"))) : (this.menu.setAttribute("aria-hidden", "true"), this.menu.hasAttribute("hidden") || this.menu.setAttribute("hidden", ""), this.header__burger && (this.header__burger.style.display = "flex", this.header__burger.setAttribute("aria-expanded", "false")), document.body.classList.remove("is-menu-open"), this.unlockScroll()) : (this.hideTimeout && (clearTimeout(this.hideTimeout), this.hideTimeout = null), this.menu.removeAttribute("hidden"), this.menu.setAttribute("aria-hidden", "false"), this.menu.classList.remove("is-active"), document.body.classList.remove("is-menu-open"), this.unlockScroll(), this.header__burger && (this.header__burger.style.display = "", this.header__burger.setAttribute("aria-expanded", "false")))
    }
    lockScroll() {
        if (this.scrollLocked) return;
        this.scrollLocked = !0;
        const e = document.body.style,
            t = document.documentElement.style;
        this.savedBodyStyles = {
            overflow: e.overflow || "",
            overscrollBehavior: e.overscrollBehavior || ""
        }, this.savedRootStyles = {
            overflow: t.overflow || "",
            overscrollBehavior: t.overscrollBehavior || ""
        }, e.overflow = "hidden", e.overscrollBehavior = "contain", t.overflow = "hidden", t.overscrollBehavior = "contain"
    }
    unlockScroll() {
        if (!this.scrollLocked) return;
        const e = document.body.style,
            t = document.documentElement.style,
            i = this.savedBodyStyles || {},
            s = this.savedRootStyles || {};
        e.overflow = i.overflow || "", e.overscrollBehavior = i.overscrollBehavior || "", t.overflow = s.overflow || "", t.overscrollBehavior = s.overscrollBehavior || "", this.scrollLocked = !1, this.savedBodyStyles = null, this.savedRootStyles = null
    }
    handleResize() {
        this.updateVisibilityState(), isMobileViewport() || this.closeMenu({
            restoreFocus: !1
        })
    }
}
class FormManager {
    constructor() {
        this.contactForm = null, this.successMessage = null
    }
    setupContactForm() {}
}
class FAQManager {
    constructor() {
        this.faqSection = document.querySelector(".faq-section"), this.faqQuestions = this.faqSection?.querySelectorAll(".faq-question") || [], this.init()
    }
    init() {
        this.setupFAQ()
    }
    setupFAQ() {
        const e = this.faqSection || document;
        e.addEventListener("click", e => {
            const t = e.target?.closest?.(".faq-question");
            t && this.toggleFAQ(t)
        }), e.addEventListener("keydown", e => {
            const t = "Enter" === e.key || " " === e.key;
            if (e.defaultPrevented || !t) return;
            const i = e.target?.closest?.(".faq-question");
            i && (e.preventDefault(), this.toggleFAQ(i))
        })
    }
    toggleFAQ(e) {
        const t = e.nextElementSibling;
        t && ("true" === e.getAttribute("aria-expanded") ? (t.style.maxHeight = t.scrollHeight + "px", t.offsetHeight, requestAnimationFrame(() => {
            t.style.maxHeight = "0"
        }), e.setAttribute("aria-expanded", "false"), t.classList.remove("is-open")) : ((this.faqQuestions.length > 0 ? Array.from(this.faqQuestions).filter(e => "true" === e.getAttribute("aria-expanded")) : Array.from(document.querySelectorAll('.faq-question[aria-expanded="true"]'))).forEach(t => {
            if (t !== e) {
                const e = t.nextElementSibling;
                e && (e.style.maxHeight = e.scrollHeight + "px", e.offsetHeight, requestAnimationFrame(() => {
                    e.style.maxHeight = "0"
                }), e.classList.remove("is-open")), t.setAttribute("aria-expanded", "false")
            }
        }), t.style.maxHeight = "0", t.classList.add("is-open"), e.setAttribute("aria-expanded", "true"), t.offsetHeight, requestAnimationFrame(() => {
            t.style.maxHeight = t.scrollHeight + "px"
        })))
    }
    cleanup() {}
}
class AnimationManager {
    constructor() {
        this.headerLogo = document.querySelector(".header__logo"), this.disclaimer = document.querySelector(".disclaimer"), this.reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, this.init()
    }
    init() {
        this.setupHeaderLogoAnimation(), this.setupBellAnimation()
    }
    setupHeaderLogoAnimation() {
        if (!this.headerLogo || this.reduceMotion) return;
        this.headerLogo.classList.add("rotate-once");
        const e = e => {
            this.reduceMotion || (this.headerLogo.classList.add("rotate-once"), e && "keydown" === e.type && e.preventDefault())
        };
        this.headerLogo.addEventListener("click", e), this.headerLogo.addEventListener("keydown", t => {
            "Enter" !== t.key && " " !== t.key || e(t)
        }), this.headerLogo.addEventListener("animationend", () => {
            this.headerLogo.classList.remove("rotate-once")
        })
    }
    setupBellAnimation() {
        this.disclaimer && !this.reduceMotion && (setTimeout(() => {
            this.disclaimer.classList.contains("bell-muted") || (this.disclaimer.classList.add("bell-start"), setTimeout(() => {
                this.disclaimer.classList.remove("bell-start")
            }, 2e3))
        }, 2e3), this.disclaimer.addEventListener("mouseenter", () => {
            this.disclaimer.classList.contains("bell-muted") || (this.disclaimer.classList.add("bell-start"), setTimeout(() => {
                this.disclaimer.classList.remove("bell-start")
            }, 2e3))
        }), this.disclaimer.addEventListener("click", () => {
            this.disclaimer.classList.toggle("bell-muted"), this.disclaimer.classList.remove("bell-start")
        }))
    }
}
class ScrollRevealManager {
    constructor() {
        this.elements = document.querySelectorAll(".u-fade-in"), this.faqSection = document.querySelector(".faq-section"), this.casinoSection = document.querySelector(".casino-cards-container"), this.heroSection = document.querySelector(".hero-section"), this.sectionElements = {
            faq: [],
            casino: [],
            hero: [],
            other: []
        }, this.adaptiveConfig = this.getAdaptiveConfig(), this.sectionOnceSettings = {
            faq: !0,
            casino: !0,
            hero: !1,
            other: !0
        }, this.elementOnceSettings = new Map, this.enableScrollUpAnimations = !0, this.init()
    }
    getAdaptiveConfig() {
        const e = isMobileViewport(),
            t = window.innerWidth <= 1024,
            i = document.documentElement.scrollHeight,
            s = window.innerHeight,
            n = i > 3 * s,
            o = i > 5 * s,
            a = this.elements.length,
            r = a > 100;
        let c = "0px 0px -5px 0px";
        e ? c = "0px 0px -2px 0px" : o || r ? c = "0px 0px -50px 0px" : n && (c = "0px 0px -20px 0px");
        let l = e ? .01 : t ? .08 : .05;
        return (o || r) && (l = Math.max(.01, .5 * l)), {
            threshold: l,
            rootMargin: c,
            sectionThreshold: e ? 10 : t ? 15 : 20,
            isLongPage: n,
            isVeryLongPage: o,
            isHighElementCount: r,
            totalElements: a
        }
    }
    init() {
        this.elements.length && (this.categorizeElements(), this.setupSectionObservers(), this.setupResizeListener())
    }
    showVisibleElementsImmediately() {
        const e = () => {
            const e = window.innerHeight,
                t = window.innerWidth;
            this.elements.forEach(i => {
                const s = i.getBoundingClientRect();
                s.top < .9 * e && s.bottom > 0 && s.left < t && s.right > 0 && i.classList.add("is-visible")
            })
        };
        "function" == typeof window.requestAnimationFrame ? window.requestAnimationFrame(e) : e()
    }
    setupResizeListener() {
        let e;
        window.addEventListener("resize", () => {
            clearTimeout(e), e = setTimeout(() => {
                this.adaptiveConfig = this.getAdaptiveConfig(), this.recreateObservers()
            }, 250)
        })
    }
    categorizeElements() {
        Array.from(this.elements).forEach(e => {
            this.faqSection && this.faqSection.contains(e) ? this.sectionElements.faq.push(e) : this.casinoSection && this.casinoSection.contains(e) ? this.sectionElements.casino.push(e) : this.heroSection && this.heroSection.contains(e) ? this.sectionElements.hero.push(e) : this.sectionElements.other.push(e)
        })
    }
    setupSectionObservers() {
        Object.entries(this.sectionElements).forEach(([e, t]) => {
            0 !== t.length && (t.length > this.adaptiveConfig.sectionThreshold ? this.createSectionObserver(e, t) : this.useGlobalObserver(t))
        })
    }
    createSectionObserver(e, t) {
        const i = new IntersectionObserver(e => {
            e.forEach(e => {
                e.isIntersecting ? (e.target.classList.add("is-visible"), this.getElementOnce(e.target) && e.intersectionRatio >= .5 && i.unobserve(e.target)) : this.enableScrollUpAnimations && !isMobileViewport() && e.target.classList.remove("is-visible")
            })
        }, {
            threshold: this.adaptiveConfig.threshold,
            rootMargin: this.adaptiveConfig.rootMargin
        });
        observerRegistry.scrollObservers.set(e, i), t.forEach(e => i.observe(e))
    }
    useGlobalObserver(e) {
        observerRegistry.globalScrollObserver || (observerRegistry.globalScrollObserver = new IntersectionObserver(e => {
            e.forEach(e => {
                e.isIntersecting ? (e.target.classList.add("is-visible"), e.intersectionRatio >= .5 && observerRegistry.globalScrollObserver.unobserve(e.target)) : this.enableScrollUpAnimations && !isMobileViewport() && e.target.classList.remove("is-visible")
            })
        }, {
            threshold: this.adaptiveConfig.threshold,
            rootMargin: this.adaptiveConfig.rootMargin
        })), e.forEach(e => observerRegistry.globalScrollObserver.observe(e))
    }
    recreateObservers() {
        this.cleanup(), this.setupSectionObservers()
    }
    setScrollUpAnimations(e) {
        this.enableScrollUpAnimations = e
    }
    setElementOnce(e, t) {
        e && e.nodeType === Node.ELEMENT_NODE && this.elementOnceSettings.set(e, t)
    }
    getElementOnce(e) {
        if (e && this.elementOnceSettings.has(e)) return this.elementOnceSettings.get(e);
        const t = this.getElementSection(e);
        return this.sectionOnceSettings[t] ?? !0
    }
    getElementSection(e) {
        return this.faqSection && this.faqSection.contains(e) ? "faq" : this.casinoSection && this.casinoSection.contains(e) ? "casino" : this.heroSection && this.heroSection.contains(e) ? "hero" : "other"
    }
    getAnimationSettings() {
        return {
            enableScrollUpAnimations: this.enableScrollUpAnimations,
            sectionOnceSettings: this.sectionOnceSettings,
            adaptiveConfig: this.adaptiveConfig,
            elementOnceSettings: Array.from(this.elementOnceSettings.entries())
        }
    }
    cleanup() {
        observerRegistry.scrollObservers.forEach(e => e.disconnect()), observerRegistry.scrollObservers.clear(), observerRegistry.globalScrollObserver && (observerRegistry.globalScrollObserver.disconnect(), observerRegistry.globalScrollObserver = null)
    }
}
class DarkModeManager {
    constructor() {
        this.toggleButton = document.getElementById("theme-toggle"), this.themeIcon = this.toggleButton?.querySelector(".theme-icon") || null, this.body = document.body, this.mutationObserver = null, this.darkImageObserver = null, this.observedContainers = new Set, this.pendingUpdates = new Set, this.updateScheduled = !1, this.init()
    }
    init() {
        this.body && this.setupDarkImageObserver(), this.loadSavedTheme(), this.toggleButton && this.body && (this.setupEventListeners(), this.setupMutationObserver())
    }
    loadSavedTheme() {
        if (!this.body) return;
        const e = storage.get("theme"),
            t = window.matchMedia("(prefers-color-scheme: dark)");
        let i;
        if (e) i = "dark" === e, this.body.classList.toggle("is-dark", i), this.body.classList.toggle("is-light", !i);
        else {
            const e = t.matches;
            this.body.classList.toggle("is-dark", e), this.body.classList.toggle("is-light", !e), i = e
        }
        this.updateToggleButtonState(i), this.updateLogos({
            deferOffscreen: !0
        });
        const s = e => {
            if (!storage.get("theme")) {
                const t = e.matches;
                if (!this.body) return;
                this.body.classList.toggle("is-dark", t), this.body.classList.toggle("is-light", !t), this.updateLogos({
                    deferOffscreen: !0
                }), this.updateToggleButtonState(t)
            }
        };
        "function" == typeof t.addEventListener ? t.addEventListener("change", s) : "function" == typeof t.addListener && t.addListener(s)
    }
    setupEventListeners() {
        this.toggleButton && this.toggleButton.addEventListener("click", () => this.toggleTheme())
    }
    setupMutationObserver() {
        this.mutationObserver || (this.mutationObserver = new MutationObserver(e => {
            e.forEach(e => {
                "childList" === e.type && e.addedNodes.forEach(e => {
                    if (e.nodeType === Node.ELEMENT_NODE) {
                        const t = e.matches?.(".casino-card__image") ? [e] : e.querySelectorAll?.(".casino-card__image") || [];
                        t.length > 0 && t.forEach(e => this.pendingUpdates.add(e))
                    }
                })
            }), this.scheduleBatchedUpdate()
        })), [document.querySelector(".casino-cards-container"), document.querySelector(".casino-section"), document.querySelector(".main-content")].filter(Boolean).forEach(e => {
            this.observedContainers.has(e) || (this.mutationObserver.observe(e, {
                childList: !0,
                subtree: !0
            }), this.observedContainers.add(e))
        })
    }
    scheduleBatchedUpdate() {
        this.updateScheduled || (this.updateScheduled = !0, requestAnimationFrame(() => {
            this.processBatchedUpdates(), this.updateScheduled = !1
        }))
    }
    processBatchedUpdates() {
        if (0 === this.pendingUpdates.size) return;
        const e = Array.from(this.pendingUpdates);
        this.pendingUpdates.clear(), this.updateDynamicLogos(e)
    }
    setupDarkImageObserver() {
        "function" == typeof IntersectionObserver && (this.darkImageObserver = new IntersectionObserver(e => {
            e.forEach(e => {
                e.isIntersecting && (this.applyThemeToImage(e.target), this.darkImageObserver?.unobserve(e.target))
            })
        }, {
            rootMargin: "300px 0px"
        }))
    }
    shouldDeferThemeSync(e) {
        if (!e || !this.darkImageObserver) return !1;
        if ("lazy" !== e.loading || e.complete) return !1;
        const t = e.getBoundingClientRect(),
            i = Math.max(.5 * window.innerHeight, 200);
        return t.top > window.innerHeight + i || t.bottom < -i
    }
    observeDarkImages(e) {
        this.darkImageObserver && e.forEach(e => {
            e?.dataset?.dark && (this.shouldDeferThemeSync(e) ? this.darkImageObserver.observe(e) : this.darkImageObserver.unobserve(e))
        })
    }
    applyThemeToImage(e) {
        if (!e || !this.body) return;
        const t = this.body.classList.contains("is-dark"),
            i = e.dataset.dark;
        i && (t ? (e.dataset.light || (e.dataset.light = e.src), e.src = i) : e.dataset.light && (e.src = e.dataset.light), e.srcset && (t ? (e.dataset.originalSrcset || (e.dataset.originalSrcset = e.srcset), e.srcset = "") : e.dataset.originalSrcset && (e.srcset = e.dataset.originalSrcset)))
    }
    syncThemeForImages(e) {
        e.forEach(e => {
            e?.dataset?.dark && (this.shouldDeferThemeSync(e) ? this.darkImageObserver?.observe(e) : (this.darkImageObserver?.unobserve(e), this.applyThemeToImage(e)))
        })
    }
    updateDynamicLogos(e) {
        this.syncThemeForImages(e)
    }
    updateNewCasinoCards(e = null) {
        const t = (e || document).querySelectorAll("img[data-dark]");
        t.length > 0 && this.updateDynamicLogos(Array.from(t))
    }
    forceUpdateAllLogos() {
        this.updateLogos();
        const e = document.querySelectorAll("img[data-dark]");
        this.updateDynamicLogos(Array.from(e))
    }
    toggleTheme() {
        if (!this.body) return;
        const e = !this.body.classList.contains("is-dark");
        this.body.classList.toggle("is-dark", e), this.body.classList.toggle("is-light", !e), this.updateToggleUI(e), this.updateToggleButtonState(e), storage.set("theme", e ? "dark" : "light"), this.updateLogos({
            deferOffscreen: !0
        })
    }
    updateToggleUI(e) {
        if (this.themeIcon) {
            const t = e ? "☀️" : "🌙";
            this.themeIcon.textContent !== t && (this.themeIcon.textContent = t)
        }
    }
    updateToggleButtonState(e) {
        this.toggleButton && (e ? (this.toggleButton.classList.add("is-active", "is-dark-mode"), this.toggleButton.classList.remove("is-light-mode")) : (this.toggleButton.classList.remove("is-active"), this.toggleButton.classList.remove("is-dark-mode"), this.toggleButton.classList.add("is-light-mode")))
    }
    updateLogos({
        deferOffscreen: e = !1
    } = {}) {
        if (!this.body) return;
        const t = Array.from(document.querySelectorAll("img[data-dark]"));
        if (!e) return void this.syncThemeForImages(t);
        const i = t.filter(e => !this.shouldDeferThemeSync(e));
        this.syncThemeForImages(i), this.observeDarkImages(t)
    }
    cleanup() {
        this.mutationObserver && (this.mutationObserver.disconnect(), this.mutationObserver = null), this.darkImageObserver && (this.darkImageObserver.disconnect(), this.darkImageObserver = null), this.observedContainers.clear()
    }
}
document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.style.overflow = "", document.body.classList.remove("is-menu-open", "is-modal-open"), window.languageToggleManager = new LanguageToggleManager, window.mobileMenuManager = new MobileMenuManager, window.darkModeManager = new DarkModeManager,
        function() {
            const e = document.querySelector(".nav-menu__avis-toggle"),
                t = document.querySelector(".nav-menu__avis"),
                i = document.getElementById("avis-list");
            if (!(e && t && i)) return;
            const s = s => {
                t.classList.toggle("is-open", s), e.setAttribute("aria-expanded", s ? "true" : "false"), i.setAttribute("aria-hidden", s ? "false" : "true"), s && i.removeAttribute("hidden")
            };
            i.removeAttribute("hidden"), i.setAttribute("aria-hidden", "true"), e.addEventListener("click", e => {
                e.preventDefault(), s(!t.classList.contains("is-open"))
            }), document.addEventListener("click", e => {
                !t.contains(e.target) && t.classList.contains("is-open") && s(!1)
            })
        }(),
        function() {
            const e = document.querySelector(".header"),
                t = document.getElementById("scrolltop");
            if (e || t) {
                let i = !1;
                const s = s => {
                        e && (s > 10 ? e.classList.add("is-scrolled") : e.classList.remove("is-scrolled")), t && (s > 300 ? t.classList.add("is-visible") : t.classList.remove("is-visible")), i = !1
                    },
                    n = () => {
                        i || (i = !0, window.requestAnimationFrame(() => {
                            s(window.scrollY)
                        }))
                    };
                window.addEventListener("scroll", n, {
                    passive: !0
                }), s(window.scrollY)
            }
            t && (t.addEventListener("click", e => {
                e.preventDefault(), window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                })
            }), t.addEventListener("mouseup", () => {
                setTimeout(() => {
                    t.matches(":hover") || (t.style.backgroundColor = "")
                }, 50)
            }), t.addEventListener("mouseleave", () => {
                t.style.backgroundColor = ""
            }), t.addEventListener("touchend", () => {
                setTimeout(() => {
                    t.style.backgroundColor = ""
                }, TIMINGS.TOUCH_RESET_DELAY)
            }))
        }(),
        function() {
            let e = !1;
            const t = document.body;
            if (!t) return;
            window.addEventListener("keydown", i => {
                KEYBOARD_KEYS.has(i.key) && (e = !0, t.classList.add("is-tabbing"))
            }, {
                passive: !0
            });
            const i = () => {
                e && (e = !1, t.classList.remove("is-tabbing"))
            };
            window.addEventListener("mousedown", i, {
                passive: !0
            }), window.addEventListener("touchstart", i, {
                passive: !0
            }), window.addEventListener("pointerdown", i, {
                passive: !0
            })
        }(), "undefined" != typeof document && document.addEventListener("focusin", function(e) {
            try {
                if (document.body.classList.contains("is-tabbing")) return;
                e.target && e.target.closest && e.target.closest(".casino-card") && (e.target && "function" == typeof e.target.blur ? e.target.blur() : document.activeElement && "function" == typeof document.activeElement.blur && document.activeElement.blur())
            } catch {}
        }, !0), window.requestAnimationFrame(() => {
            window.scrollRevealManager = new ScrollRevealManager
        }), scheduleNonCriticalTask(() => {
            window.formManager = new FormManager, window.faqManager = new FAQManager
        }), scheduleNonCriticalTask(() => {
            ensureCookieMarkup(), window.cookieConsentManager = new CookieConsentManager, window.animationManager = new AnimationManager
        }, {
            timeout: 1e3
        })
}), window.clearCookies = function() {
    window.cookieConsentManager && window.cookieConsentManager.clearConsent()
}, window.addEventListener("beforeunload", () => {
    window.scrollRevealManager && window.scrollRevealManager.cleanup(), window.darkModeManager && window.darkModeManager.cleanup(), window.faqManager && window.faqManager.cleanup(), window.languageToggleManager && window.languageToggleManager.cleanup()
});
const mobileScrollSafeguard = () => {
    if (!isMobileViewport()) return;
    const e = () => {
        document.body.classList.contains("is-menu-open") || document.body.classList.contains("is-modal-open") || (document.documentElement.style.overflow = "auto")
    };
    ["touchstart", "touchend", "touchcancel", "touchmove"].forEach(t => {
        window.addEventListener(t, e, {
            passive: !0
        })
    })
};
mobileScrollSafeguard(),
    function() {
        function e() {
            var e, t, i, s, n, o;
            window.__clarityLoaded || (window.__clarityLoaded = !0, e = window, t = document, s = "script", e[i = "clarity"] = e[i] || function() {
                (e[i].q = e[i].q || []).push(arguments)
            }, (n = t.createElement(s)).async = 1, n.src = "https://www.clarity.ms/tag/w5dbxt348h", (o = t.getElementsByTagName(s)[0]).parentNode.insertBefore(n, o))
        }
        var t = window.requestIdleCallback || function(e) {
            setTimeout(e, 1500)
        };

        function i() {
            t(e, {
                timeout: 8e3
            })
        }
        var s = ["pointerdown", "keydown", "touchstart", "scroll"],
            n = !1;

        function o() {
            n || (n = !0, i(), s.forEach(function(e) {
                window.removeEventListener(e, o, {
                    passive: !0
                })
            }))
        }
        s.forEach(function(e) {
            window.addEventListener(e, o, {
                once: !0,
                passive: !0
            })
        }), window.addEventListener("load", function() {
            setTimeout(i, 7e3)
        }, {
            once: !0
        }), document.addEventListener("DOMContentLoaded", function() {
            document.querySelectorAll(".show-more-casinos-wrapper").forEach(e => {
                const t = e.querySelector(".show-more-casinos-btn");
                if (!t) return;
                const i = e.previousElementSibling;
                if (!i || !i.classList.contains("casino-cards-container")) return;
                const s = i.querySelectorAll(".casino-article").length,
                    n = e.querySelector(".total-count"),
                    o = e.querySelector(".shown-count"),
                    a = e.querySelector(".show-more-text");
                n && (n.textContent = s), t.addEventListener("click", function() {
                    if (i.classList.contains("is-collapsed")) i.classList.remove("is-collapsed"), this.setAttribute("aria-expanded", "true"), a && (a.textContent = "Afficher moins"), o && (o.textContent = s);
                    else {
                        i.classList.add("is-collapsed"), this.setAttribute("aria-expanded", "false"), a && (a.textContent = "Afficher plus"), o && (o.textContent = Math.min(12, s));
                        const e = i.querySelector(".casino-article:nth-of-type(12)");
                        e && e.scrollIntoView({
                            behavior: "smooth",
                            block: "end"
                        })
                    }
                })
            }), document.querySelectorAll(".casino-review").forEach(e => {
                const t = e.querySelector(".casino-card__button");
                if (!t) return;
                const i = t.getAttribute("href");
                if (!i) return;
                const s = e.querySelector(".casino-card__rating");
                if (s) {
                    const e = s.querySelector("strong");
                    if (e && !e.querySelector("a")) {
                        const t = e.textContent.trim();
                        e.innerHTML = `<a href="${i}" target="_blank" rel="nofollow noopener noreferrer" class="casino-card__name-link">${t}</a>`
                    }
                }
                const n = e.querySelector("h2");
                if (n && !n.querySelector("a")) {
                    const e = s ? s.querySelector("strong") : null,
                        t = e ? e.textContent.trim() : null;
                    if (t) {
                        const e = n.innerHTML,
                            s = e.indexOf(t); - 1 !== s && (n.innerHTML = e.substring(0, s) + `<a href="${i}" target="_blank" rel="nofollow noopener noreferrer" class="casino-review-title-link">${t}</a>` + e.substring(s + t.length))
                    }
                }
                e.querySelectorAll(".casino-review-link").forEach(e => {
                    e.setAttribute("href", i), e.setAttribute("target", "_blank"), e.setAttribute("rel", "nofollow noopener noreferrer")
                })
            }), document.querySelectorAll(".crown-table").forEach(e => {
                if (e.parentElement && e.parentElement.classList.contains("crown-table-wrapper")) return;
                const t = document.createElement("div");
                t.className = "crown-table-wrapper", e.parentNode.insertBefore(t, e), t.appendChild(e)
            })
        })
    }();