/**
 * TopJeu - Modular Popups System
 * Pure vanilla JS, zero-dependency, bulletproof popup management.
 */

(function () {
	'use strict';

	/* ==========================================================================
	   1. CORE UTILITIES & STORAGE (Self-Contained)
	   ========================================================================== */

	const storage = {
		get(key) {
			try { return localStorage.getItem(key); } catch { return null; }
		},
		set(key, value) {
			try { localStorage.setItem(key, value); } catch {}
		}
	};

	function isCanadianPage() {
		const lang = [
			document.documentElement?.getAttribute('lang'),
			document.body?.getAttribute('lang'),
		].filter(Boolean).join(' ').toLowerCase();
		const path = window.location.pathname.toLowerCase();
		return lang.includes('ca') || path === '/ca' || path.startsWith('/ca/');
	}

	function scheduleTask(task, delay = 200) {
		if (document.readyState === 'complete') {
			setTimeout(task, delay);
		} else {
			window.addEventListener('load', () => setTimeout(task, delay), { once: true });
		}
	}

	/* ==========================================================================
	   2. POPUP MODULE (Modal Dialogs: Contact, Privacy, etc.)
	   ========================================================================== */

	const PRIVACY_POPUP_MARKUP = `
<template id="privacy-popup-template">
	<div id="privacy-popup" class="privacy-popup" role="dialog" aria-modal="true" aria-labelledby="privacy-title" aria-hidden="true">
		<div class="privacy-popup__content">
			<button class="privacy-popup__close" id="privacy-close" aria-label="Fermer">&times;</button>
			<h2 id="privacy-title">Politique de confidentialité</h2>
			<p class="privacy-popup__meta"><strong>Mise à jour :</strong> Septembre 2025</p>
			<p>Chez TopJeu, nous attachons une grande importance à la protection de vos données personnelles. La présente Politique de Confidentialité a pour objectif de vous informer de manière claire et transparente sur la manière dont nous collectons, utilisons et protégeons vos informations.</p>
			<h3>1. Collecte de données</h3>
			<p>Nous collectons les données suivantes :</p>
			<ul>
				<li><strong>Données de navigation :</strong> pages visitées, durée de visite, source de trafic</li>
				<li><strong>Données techniques :</strong> adresse IP (anonymisée), type de navigateur, système d'exploitation</li>
				<li><strong>Données de contact :</strong> nom, email, message (via formulaire de contact uniquement)</li>
			</ul>
			<h3>2. Finalité de l'utilisation</h3>
			<p>Les données sont utilisées pour :</p>
			<ul>
				<li>Analyser l'audience et améliorer l'expérience utilisateur</li>
				<li>Répondre aux demandes de contact</li>
				<li>Assurer la sécurité du site</li>
				<li>Respecter les obligations légales</li>
			</ul>
			<h3>3. Durée de conservation</h3>
			<ul>
				<li><strong>Cookies analytiques :</strong> 24 mois maximum</li>
				<li><strong>Données de contact :</strong> 3 ans après le dernier échange</li>
				<li><strong>Logs de sécurité :</strong> 12 mois</li>
			</ul>
			<h3>4. Partage des données</h3>
			<p>Vos données peuvent être partagées avec :</p>
			<ul>
				<li><strong>Google Analytics :</strong> pour l'analyse d'audience (données anonymisées)</li>
				<li><strong>Ahrefs :</strong> pour l'analyse de trafic (données anonymisées)</li>
				<li><strong>Formbold :</strong> pour le traitement des formulaires de contact</li>
			</ul>
			<h3>5. Vos droits</h3>
			<p>Conformément au RGPD, vous disposez des droits suivants :</p>
			<ul>
				<li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
				<li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
				<li><strong>Droit d'effacement :</strong> demander la suppression de vos données</li>
				<li><strong>Droit d'opposition :</strong> refuser le traitement de vos données</li>
				<li><strong>Droit de portabilité :</strong> récupérer vos données dans un format lisible</li>
			</ul>
			<h3>6. Cookies et consentement</h3>
			<p>Ce site utilise des cookies techniques (obligatoires) et des cookies analytiques (optionnels). Vous pouvez modifier vos préférences à tout moment via le lien "Modifier les paramètres des cookies" en bas de page.</p>
			<h3>7. Contact</h3>
			<p>Pour exercer vos droits ou pour toute question concernant cette politique :<br />Email : <a href="mailto:topjeu777@gmail.com" class="footer__link privacy-popup__email">topjeu777@gmail.com</a></p>
			<p>👉 Cette politique pourra être mise à jour afin de refléter les évolutions légales ou techniques.</p>
		</div>
	</div>
</template>`;

	const CONTACT_POPUP_MARKUP = `
<template id="popup-contact-template">
	<div id="popup-contact" class="popup u-hidden" role="dialog" aria-modal="true" aria-labelledby="contact-title">
		<div class="popup__content">
			<button id="popup-contact-close" class="popup__close" aria-label="Fermer">&times;</button>
			<h2 id="contact-title">Contactez-moi</h2>
			<div class="underline"></div>
			<form id="contact-form" action="https://formbold.com/s/6vdYK" method="POST">
				<input type="hidden" name="_subject" value="TopJeu contact" />
				<label for="name">Nom *</label>
				<input type="text" id="name" name="name" required class="popup__input" />
				<label for="email">Email *</label>
				<input type="email" id="email" name="email" required class="popup__input" />
				<label for="message">Message *</label>
				<textarea id="message" name="message" required rows="5" class="popup__input"></textarea>
				<button type="submit" class="popup__button">Envoyer</button>
			</form>
			<p id="form-success-message" class="form-success-message u-hidden">
				Message envoyé avec succès !
			</p>
		</div>
	</div>
</template>`;

	class PopupModule {
		constructor() {
			this.activeModals = new Set();
			this.init();
		}

		init() {
			this.setupDelegation();
		}

		mountTemplate(target) {
			let popupId = target;
			if (target === 'privacy') popupId = 'privacy-popup';
			else if (target === 'contact') popupId = 'popup-contact';
			else if (!target.startsWith('popup-') && !target.endsWith('-popup')) popupId = `popup-${target}`;

			if (document.getElementById(popupId)) return document.getElementById(popupId);

			const templateId = `${popupId}-template`;
			let template = document.getElementById(templateId);

			if (!template) {
				if (target === 'privacy') {
					document.body.insertAdjacentHTML('beforeend', PRIVACY_POPUP_MARKUP);
					template = document.getElementById(templateId);
				} else if (target === 'contact') {
					document.body.insertAdjacentHTML('beforeend', CONTACT_POPUP_MARKUP);
					template = document.getElementById(templateId);
				}
			}

			if (template && template.content) {
				const clone = template.content.cloneNode(true);
				document.body.appendChild(clone);
			}
			return document.getElementById(popupId);
		}

		open(target) {
			try {
				if (!target) return;

				let element = typeof target === 'string'
					? (document.getElementById(target) || document.getElementById(`popup-${target}`) || document.getElementById(`${target}-popup`) || this.mountTemplate(target))
					: target;

				if (!element) {
					console.warn('[PopupModule] open() failed: Element not found for target:', target);
					return;
				}

				console.log('[PopupModule] Opening modal:', element.id || element);

				if ((element.id === 'popup-contact' || target === 'contact') && window.formManager) {
					try {
						window.formManager.setupContactForm();
					} catch (formErr) {
						console.error('[PopupModule] formManager.setupContactForm error:', formErr);
					}
				}

				element.classList.remove('u-hidden');
				element.classList.add('is-visible');
				element.style.display = '';
				element.setAttribute('aria-hidden', 'false');

				element.dataset.openedAt = Date.now().toString();

				document.documentElement.style.overflow = 'hidden';
				this.activeModals.add(element);

				const closeBtn = element.querySelector('.popup__close, .privacy-popup__close');
				if (closeBtn) closeBtn.focus();
			} catch (err) {
				console.error('[PopupModule Error in open()]:', err);
			}
		}

		close(target) {
			try {
				let element = typeof target === 'string' ? document.getElementById(target) : target;
				if (!element) {
					console.warn('[PopupModule] close() failed: Element not found for target:', target);
					return;
				}

				console.log('[PopupModule] Closing modal:', element.id || element);

				// Blur focused element inside popup to prevent ARIA focus warning
				if (document.activeElement && element.contains(document.activeElement)) {
					document.activeElement.blur();
				}

				element.classList.add('u-hidden');
				element.classList.remove('is-visible');
				element.style.display = 'none';
				element.setAttribute('aria-hidden', 'true');

				this.activeModals.delete(element);

				if (this.activeModals.size === 0) {
					document.documentElement.style.overflow = '';
					document.body.classList.remove('is-modal-open');
				}
			} catch (err) {
				console.error('[PopupModule Error in close()]:', err);
			}
		}

		closeAll() {
			this.activeModals.forEach(el => this.close(el));
		}

		// Backward compatibility aliases for app.js and external callers
		openByTarget(target) {
			this.open(target);
		}

		openPopup(element) {
			this.open(element);
		}

		closePopup(element) {
			this.close(element);
		}

		openPrivacyPopup() {
			this.open('privacy');
		}

		closePrivacyPopup() {
			this.close('privacy-popup');
		}

		setupDelegation() {
			console.log('[PopupModule] Setting up event delegation listener.');
			document.addEventListener('click', (e) => {
				// 1. Close Triggers (close buttons or data-popup-close) - Evaluated FIRST
				const closeTrigger = e.target.closest('.popup__close, .privacy-popup__close, [data-popup-close], #popup-contact-close, #privacy-close');
				if (closeTrigger) {
					console.log('[PopupModule] Close trigger clicked:', closeTrigger);
					e.preventDefault();
					const modal = closeTrigger.closest('.popup, .privacy-popup') || document.getElementById('popup-contact') || Array.from(this.activeModals).pop();
					if (modal) {
						this.close(modal);
					} else {
						console.warn('[PopupModule] Could not find modal container for closeTrigger:', closeTrigger);
					}
					return;
				}

				// 2. Open Triggers
				const openTrigger = e.target.closest('[data-popup-target], a[href*="privacy"], a[href*="contact"]');
				if (openTrigger) {
					let target = openTrigger.dataset?.popupTarget;
					if (!target) {
						const href = (openTrigger.getAttribute('href') || '').toLowerCase();
						if (href.includes('privacy')) target = 'privacy';
						else if (href.includes('contact')) target = 'contact';
					}
					if (target) {
						console.log('[PopupModule] Open trigger clicked:', openTrigger, 'Target:', target);
						e.preventDefault();
						this.open(target);
						return;
					}
				}

				// 3. Backdrop Click (clicking outside popup__content)
				if (e.target.classList.contains('popup') || e.target.classList.contains('privacy-popup')) {
					const openedAt = Number(e.target.dataset.openedAt || 0);
					if (Date.now() - openedAt < 300) {
						console.log('[PopupModule] Ignoring backdrop click (modal opened', Date.now() - openedAt, 'ms ago)');
						return;
					}
					console.log('[PopupModule] Backdrop clicked:', e.target);
					this.close(e.target);
				}
			});

			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape' && this.activeModals.size > 0) {
					console.log('[PopupModule] Escape key pressed, closing modals.');
					this.closeAll();
				}
			});
		}
	}

	/* ==========================================================================
	   3. NO DEPOSIT BONUS BANNER MANAGER
	   ========================================================================== */

	const NO_DEPOSIT_BONUS_MARKUP = `
<div id="no-deposit-bonus" class="no-deposit-bonus" role="dialog" aria-labelledby="no-deposit-bonus-title" tabindex="-1">
	<button type="button" class="no-deposit-bonus__close" aria-label="Réduire le bonus sans dépôt">×</button>
	<div class="no-deposit-bonus__minimized-icon" aria-label="Afficher le bonus sans dépôt" tabindex="0" role="button">🎁</div>
	<div class="no-deposit-bonus__container">
		<div class="no-deposit-bonus__content">
			<p class="no-deposit-bonus__eyebrow">Bonus exclusif TopJeu</p>
			<a class="banners" href="https://gowildtokyo.com/dux4cvahr" rel="nofollow noopener noreferrer sponsored" aria-label="Wild Joker Diamonds - S'inscrire">
				<picture>
					<img src="/assets/img/banners/wild-joker-banner.webp" alt="Wild Joker Diamonds - Inscription rapide" width="200" height="200" loading="lazy" fetchpriority="low" />
				</picture>
			</a>
			<h4 id="no-deposit-bonus-title">🗼 Wild Tokyo vient de m’accorder quelque chose d’assez rare.</h4>
			<div id="no-deposit-bonus-description" class="no-deposit-bonus__text">
				<p>J’ai négocié en direct avec l’équipe du casino un bonus exclusif pour vous : <strong>20 tours gratuits sans aucun dépôt</strong>, rien que pour les abonnés TopJeu.</p>
				<p><strong>Le jeu :</strong> <em>NeverEnding - Wild Joker’s Diamonds</em><br /><strong>La condition :</strong> s’inscrire via mon lien.<br /><strong>Le dépôt nécessaire :</strong> zéro.</p>
				<p>C’est le genre d’offre que vous ne trouvez pas en cherchant “Wild Tokyo bonus” sur Google. Elle passe par moi, directement.</p>
			</div>
		</div>
		<div class="no-deposit-bonus__actions">
			<a href="https://gowildtokyo.com/dux4cvahr" class="no-deposit-bonus__cta" rel="nofollow noopener noreferrer" target="_blank">Je récupère mes 20 tours gratuits</a>
		</div>
	</div>
</div>`;

	/* ==========================================================================
	   ИНСТРУКЦИЯ ПО НАСТРОЙКЕ ГЕО-ОФФЕРОВ ДЛЯ БОНУСНОГО ПОПАПА (BONUS_CONFIGS):
	   --------------------------------------------------------------------------
	   Для добавления или активации эксклюзивного оффера под нужное ГЕО (например, CH):

	   1. Для активации оффера CH измените параметр `enabled: false` на `enabled: true`.
	   2. Измените параметры оффера под ваши нужды:
	      - eyebrow: Маленькая подпись над баннером (например, "Bonus exclusif Suisse 🇨🇭")
	      - title: Главный заголовок предложения
	      - imageSrc: Путь к картинке баннера (например, "/assets/img/banners/switzerland-banner.webp")
	      - imageAlt: Alt-текст картинки баннера
	      - link: Ваша индивидуальная реферальная ссылка для данного ГЕО
	      - textHtml: HTML-текст с описанием условий бонуса
	      - ctaText: Текст на главной кнопке действия
	   3. После внесения изменений выполните команду сборки в консоли: node tools/minify.js
	   ========================================================================== */

	const BONUS_CONFIGS = {
		ch: {
			enabled: false, // Заглушка: установите true, когда баннер и текст для CH будут готовы
			eyebrow: "Bonus exclusif Suisse 🇨🇭",
			title: "🇨🇭 Offre spéciale pour les joueurs Suisses",
			imageSrc: "/assets/img/banners/wild-joker-banner.webp",
			imageAlt: "Wild Joker Diamonds - Inscription Suisse",
			link: "https://gowildtokyo.com/dux4cvahr",
			textHtml: `
				<p>J’ai négocié un bonus exclusif pour la Suisse : <strong>50 tours gratuits sans aucun dépôt</strong>.</p>
				<p><strong>Le jeu :</strong> <em>Wild Joker’s Diamonds</em><br /><strong>Le dépôt nécessaire :</strong> zéro.</p>
			`,
			ctaText: "Je récupère mes 50 tours gratuits"
		},
		default: {
			enabled: true,
			eyebrow: "Bonus exclusif TopJeu",
			title: "🗼 Wild Tokyo vient de m’accorder quelque chose d’assez rare.",
			imageSrc: "/assets/img/banners/wild-joker-banner.webp",
			imageAlt: "Wild Joker Diamonds - Inscription rapide",
			link: "https://gowildtokyo.com/dux4cvahr",
			textHtml: `
				<p>J’ai négocié en direct avec l’équipe du casino un bonus exclusif pour vous : <strong>20 tours gratuits sans aucun dépôt</strong>, rien que pour les abonnés TopJeu.</p>
				<p><strong>Le jeu :</strong> <em>NeverEnding - Wild Joker’s Diamonds</em><br /><strong>La condition :</strong> s’inscrire via mon lien.<br /><strong>Le dépôt nécessaire :</strong> zéro.</p>
				<p>C’est le genre d’offre que vous ne trouvez pas en cherchant “Wild Tokyo bonus” sur Google. Elle passe par moi, directement.</p>
			`,
			ctaText: "Je récupère mes 20 tours gratuits"
		}
	};

	class NoDepositBonusManager {
		constructor() {
			this.popup = null;
			this.hasTriggered = false;
			this.showTimer = null;
			this.init();
		}

		init() {
			this.popup = document.getElementById('no-deposit-bonus');
			if (!this.popup) return;

			this.applyConfig();
			this.setupListeners();
			
			// Auto show after 10s or on scroll
			this.showTimer = setTimeout(() => this.show(), 10000);
			this.handleScroll = () => {
				if (window.scrollY > 140) this.show();
			};
			window.addEventListener('scroll', this.handleScroll, { passive: true });
		}

		getGeoConfig() {
			const path = window.location.pathname.toLowerCase();
			if ((path.includes('/ch/') || path === '/ch' || path.endsWith('/ch/index.html')) && BONUS_CONFIGS.ch?.enabled) {
				return BONUS_CONFIGS.ch;
			}
			return BONUS_CONFIGS.default;
		}

		applyConfig() {
			if (!this.popup) return;

			// 1. HTML Data Attribute Overrides (Highest priority: no JS edits needed)
			const dataset = this.popup.dataset || {};
			const hasHtmlOverride = dataset.bonusTitle || dataset.bonusLink || dataset.bonusImage;

			if (hasHtmlOverride) {
				if (dataset.bonusEyebrow) {
					const eyebrow = this.popup.querySelector('.no-deposit-bonus__eyebrow');
					if (eyebrow) eyebrow.textContent = dataset.bonusEyebrow;
				}
				if (dataset.bonusTitle) {
					const title = this.popup.querySelector('#no-deposit-bonus-title');
					if (title) title.textContent = dataset.bonusTitle;
				}
				if (dataset.bonusLink) {
					const cta = this.popup.querySelector('.no-deposit-bonus__cta');
					if (cta) cta.href = dataset.bonusLink;
					const bannerLink = this.popup.querySelector('.banners');
					if (bannerLink) bannerLink.href = dataset.bonusLink;
				}
				if (dataset.bonusCta) {
					const cta = this.popup.querySelector('.no-deposit-bonus__cta');
					if (cta) cta.textContent = dataset.bonusCta;
				}
				if (dataset.bonusImage) {
					const img = this.popup.querySelector('.banners img');
					if (img) img.src = dataset.bonusImage;
				}
				return;
			}

			// 2. JS BONUS_CONFIGS Fallback
			const config = this.getGeoConfig();

			const eyebrow = this.popup.querySelector('.no-deposit-bonus__eyebrow');
			if (eyebrow && config.eyebrow) eyebrow.textContent = config.eyebrow;

			const title = this.popup.querySelector('#no-deposit-bonus-title');
			if (title && config.title) title.textContent = config.title;

			const desc = this.popup.querySelector('#no-deposit-bonus-description');
			if (desc && config.textHtml) desc.innerHTML = config.textHtml;

			const cta = this.popup.querySelector('.no-deposit-bonus__cta');
			if (cta) {
				if (config.ctaText) cta.textContent = config.ctaText;
				if (config.link) cta.href = config.link;
			}

			const bannerLink = this.popup.querySelector('.banners');
			if (bannerLink) {
				if (config.link) bannerLink.href = config.link;
				const img = bannerLink.querySelector('img');
				if (img && config.imageSrc) {
					img.src = config.imageSrc;
					if (config.imageAlt) img.alt = config.imageAlt;
				}
			}
		}

		show() {
			if (!this.popup || this.hasTriggered) return;
			this.hasTriggered = true;

			if (this.showTimer) clearTimeout(this.showTimer);
			window.removeEventListener('scroll', this.handleScroll);

			this.popup.classList.remove('no-deposit-bonus--minimizing');
			this.popup.classList.add('no-deposit-bonus--expanding');
			this.popup.classList.add('is-visible');
			this.popup.setAttribute('aria-hidden', 'false');
			setTimeout(() => {
				this.popup.classList.remove('no-deposit-bonus--expanding');
			}, 350);
		}

		minimize() {
			if (!this.popup) return;
			this.popup.classList.remove('no-deposit-bonus--expanding');
			this.popup.classList.add('no-deposit-bonus--minimizing');
			setTimeout(() => {
				this.popup.classList.remove('no-deposit-bonus--minimizing');
				this.popup.classList.remove('is-visible');
				this.popup.classList.add('no-deposit-bonus--minimized');
			}, 330);
		}

		expand() {
			if (!this.popup) return;
			this.popup.classList.remove('no-deposit-bonus--minimized');
			this.popup.classList.remove('no-deposit-bonus--minimizing');
			this.popup.classList.add('no-deposit-bonus--expanding');
			this.popup.classList.add('is-visible');
			setTimeout(() => {
				this.popup.classList.remove('no-deposit-bonus--expanding');
			}, 330);
		}

		setupListeners() {
			this.popup.addEventListener('click', (e) => {
				if (e.target.closest('.no-deposit-bonus__close')) {
					e.preventDefault();
					this.minimize();
				} else if (e.target.closest('.no-deposit-bonus__minimized-icon') || (this.popup.classList.contains('no-deposit-bonus--minimized') && !e.target.closest('a'))) {
					e.preventDefault();
					this.expand();
				}
			});
		}
	}

	/* ==========================================================================
	   4. GEO POPUP MANAGER
	   ========================================================================== */

	class GeoPopupManager {
		constructor() {
			this.init();
		}

		init() {
			const country = document.documentElement.dataset.geoCountry;
			const currentLocale = document.documentElement.dataset.geoLocale || 'FR';
			if (!country || country === currentLocale) return;

			if (storage.get(`geo_dismissed_${country}`)) return;

			// Optionally mount and display if geo condition matches
		}
	}

	/* ==========================================================================
	   5. IMAGE LIGHTBOX MANAGER (Full-Screen Zoom for Proof Screenshots)
	   ========================================================================== */

	class ImageLightboxManager {
		constructor() {
			this.modal = null;
			this.init();
		}

		init() {
			document.addEventListener('click', (e) => {
				const proofCard = e.target.closest('.proof-card, [data-lightbox]');
				if (proofCard) {
					const img = proofCard.querySelector('img');
					if (img) {
						e.preventDefault();
						this.open(img.currentSrc || img.src, img.alt || '');
					}
				}
			});
		}

		open(src, alt) {
			if (!this.modal) {
				const markup = `
<div id="image-lightbox" class="image-lightbox u-hidden" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
	<button class="image-lightbox__close" aria-label="Fermer">&times;</button>
	<div class="image-lightbox__container">
		<img src="" alt="" class="image-lightbox__img" />
	</div>
</div>`;
				document.body.insertAdjacentHTML('beforeend', markup);
				this.modal = document.getElementById('image-lightbox');

				this.modal.addEventListener('click', (e) => {
					if (e.target === this.modal || e.target.closest('.image-lightbox__close') || e.target.closest('.image-lightbox__container') || e.target.closest('.image-lightbox__img')) {
						this.close();
					}
				});

				document.addEventListener('keydown', (e) => {
					if (e.key === 'Escape' && this.modal && this.modal.classList.contains('is-visible')) {
						this.close();
					}
				});
			}

			const imgEl = this.modal.querySelector('.image-lightbox__img');
			imgEl.src = src;
			imgEl.alt = alt;

			this.modal.classList.remove('u-hidden');
			this.modal.classList.add('is-visible');
			this.modal.setAttribute('aria-hidden', 'false');
			document.documentElement.style.overflow = 'hidden';
		}

		close() {
			if (this.modal) {
				this.modal.classList.remove('is-visible');
				this.modal.classList.add('u-hidden');
				this.modal.setAttribute('aria-hidden', 'true');
				document.documentElement.style.overflow = '';
			}
		}
	}

	/* ==========================================================================
	   6. INITIALIZATION
	   ========================================================================== */

	document.addEventListener('DOMContentLoaded', () => {
		window.popupManager = new PopupModule();
		window.imageLightboxManager = new ImageLightboxManager();

		scheduleTask(() => {
			if (isCanadianPage() && !document.getElementById('no-deposit-bonus')) {
				const scrolltop = document.getElementById('scrolltop');
				if (scrolltop) {
					scrolltop.insertAdjacentHTML('beforebegin', `${NO_DEPOSIT_BONUS_MARKUP}\n`);
				} else {
					document.body.insertAdjacentHTML('beforeend', NO_DEPOSIT_BONUS_MARKUP);
				}
			}
			window.noDepositBonusPopupManager = new NoDepositBonusManager();
			window.geoPopup = new GeoPopupManager();
		}, 1000);
	});

})();
