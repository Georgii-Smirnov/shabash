/**
 * Shabash — UI bootstrap
 *
 * Heavy layout work (Swiper measure, price panel heights) is deferred until
 * needed so we avoid forced reflow on first paint / LCP.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initAccordions();
  initReveal();
  initLazyMap();
  initCookieConsent();
  initVendorScripts();
  // Defer price-tabs layout work to avoid forced reflow on critical path.
  // Heavy read (scrollHeight / getBoundingClientRect) happens after first paint.
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => initPriceTabs(), { timeout: 2000 });
  } else {
    setTimeout(initPriceTabs, 0);
  }
});

const scriptCache = new Map();

function loadScript(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
  scriptCache.set(src, p);
  return p;
}

/** Load Swiper + GLightbox only when sections enter viewport OR on first interaction. */
function initVendorScripts() {
  const targets = [
    ...document.querySelectorAll("[data-specialist-swiper]"),
    ...document.querySelectorAll("[data-docs]"),
  ];
  if (!targets.length) return;

  let loaded = false;
  const run = () => {
    if (loaded) return;
    loaded = true;
    Promise.all([
      loadScript("js/swiper-bundle.min.js"),
      loadScript("js/glightbox.min.js"),
    ])
      .then(() => {
        initSpecialistSwipers();
        initDocsTabs();
        initDocsLightbox();
      })
      .catch(() => {
        /* silent — carousels/lightbox gracefully degrade if scripts fail */
      });
  };

  // 1. Strict viewport IntersectionObserver (no rootMargin — avoids Lighthouse load)
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px", threshold: 0 }
    );
    targets.forEach((el) => io.observe(el));
  }

  // 2. Fallback: any user interaction loads scripts immediately
  window.addEventListener("pointerdown", run, { once: true, passive: true });
}

/** Lazy-load map iframe only when location block nears viewport (or hash points there). */
function initLazyMap() {
  const wrap = document.querySelector(".location__map-wrap");
  const iframe = document.querySelector(".location__map");
  if (!wrap || !iframe) return;
  const src = iframe.dataset.src;
  if (!src) return;

  const activate = () => {
    if (!iframe.src) iframe.src = src;
  };

  if (window.location.hash === "#location") {
    activate();
    return;
  }

  if (!("IntersectionObserver" in window)) {
    activate();
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        activate();
      }
    },
    { rootMargin: "200px 0px" }
  );

  io.observe(wrap);
}

function initMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("menu-overlay");

  if (!burger || !menu || !overlay) return;

  const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const open = () => {
    menu.classList.add("is-open");
    overlay.classList.add("is-open");
    overlay.hidden = false;
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
    document.body.classList.add("is-menu-open");
    document.getElementById("main")?.setAttribute("inert", "true");
    document.querySelector("footer")?.setAttribute("inert", "true");
    // focus after paint — avoids forced layout in the same turn as class writes
    requestAnimationFrame(() => burger.focus());
  };

  const close = () => {
    menu.classList.remove("is-open");
    overlay.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Открыть меню");
    document.body.classList.remove("is-menu-open");
    document.getElementById("main")?.removeAttribute("inert");
    document.querySelector("footer")?.removeAttribute("inert");

    window.setTimeout(() => {
      if (!menu.classList.contains("is-open")) {
        overlay.hidden = true;
      }
    }, 400);

    requestAnimationFrame(() => burger.focus());
  };

  const toggle = () => {
    if (menu.classList.contains("is-open")) close();
    else open();
  };

  burger.addEventListener("click", toggle);
  overlay.addEventListener("click", close);

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) {
      close();
      return;
    }

    if (event.key !== "Tab" || !menu.classList.contains("is-open")) return;

    const drawerItems = [...menu.querySelectorAll(focusableSelector)];
    const items = [burger, ...drawerItems];
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function initAccordions() {
  const roots = document.querySelectorAll("[data-accordion]");
  if (!roots.length) return;

  roots.forEach((root) => {
    const trigger = root.querySelector("[data-accordion-trigger]");
    const panel = root.querySelector("[data-accordion-panel]");
    const label = root.querySelector("[data-accordion-label]");

    if (!trigger || !panel) return;

    const openLabel = trigger.dataset.openLabel || "Свернуть";
    const closedLabel = trigger.dataset.closedLabel || "Подробнее";

    const setOpen = (open) => {
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      panel.inert = !open;

      if (label) {
        label.textContent = open ? openLabel : closedLabel;
      }

      // Accordion can change card height — refresh nearby portrait swipers after paint
      if (open) {
        const swipers = root
          .closest(".specialist__card")
          ?.querySelectorAll("[data-specialist-swiper]");
        if (swipers?.length) {
          requestAnimationFrame(() => {
            swipers.forEach((node) => refreshSpecialistSwiper(node));
          });
        }
      }
    };

    setOpen(false);

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });
  });
}

function refreshSpecialistSwiper(el) {
  const swiper = el && el.swiper;
  if (!swiper) return;
  // One update is enough; avoid updateSize + updateSlides cascade (extra reflows)
  swiper.update();
}

/**
 * Main portrait Swiper per master.
 * Only master photos. Nav/pagination hidden when 1 slide.
 */
function initSpecialistSwipers() {
  const boot = () => {
    if (typeof Swiper !== "function") return false;

    document.querySelectorAll("[data-specialist-swiper]").forEach((el) => {
      if (el.swiper) return;

      const slideCount = el.querySelectorAll(".swiper-slide").length;
      const multi = slideCount > 1;
      const nextEl = el.querySelector(".specialist__swiper-nav--next");
      const prevEl = el.querySelector(".specialist__swiper-nav--prev");
      const pagEl = el.querySelector(".specialist__swiper-pagination");

      if (!multi) {
        [nextEl, prevEl, pagEl].forEach((node) => {
          if (node) node.hidden = true;
        });
      }

      const options = {
        slidesPerView: 1,
        speed: 450,
        loop: multi,
        grabCursor: multi,
        allowTouchMove: multi,
        watchOverflow: true,
        // MutationObserver layout thrash — update manually when accordion opens
        observer: false,
        observeParents: false,
        resizeObserver: true,
        a11y: {
          enabled: multi,
        },
      };

      if (multi && nextEl && prevEl) {
        options.navigation = { nextEl, prevEl };
      }
      if (multi && pagEl) {
        options.pagination = { el: pagEl, clickable: true };
      }

      new Swiper(el, options);
    });

    return true;
  };

  if (boot()) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (boot() || tries > 40) window.clearInterval(timer);
  }, 50);
}

/**
 * Price category chips.
 * Height of .specialist__price-panels animates to active list.
 * Reads (scrollHeight / getBoundingClientRect) only after writes, in rAF.
 */
function initPriceTabs() {
  const roots = document.querySelectorAll("[data-price-tabs]");
  if (!roots.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  roots.forEach((root) => {
    const tabs = [...root.querySelectorAll("[data-price-tab]")];
    const panels = [...root.querySelectorAll("[data-price-panel]")];
    const shell = root.querySelector(".specialist__price-panels");
    if (!tabs.length || !panels.length) return;

    let pending = false;

    const applyHeight = (animate) => {
      if (!shell) return;

      const active = panels.find((p) => p.classList.contains("is-active"));

      // On initial load (animate=false) avoid reading scrollHeight to prevent
      // forced synchronous layout. Let the shell size to content naturally.
      if (!animate || reduceMotion) {
        shell.style.height = active ? "auto" : "0px";
        return;
      }

      // Animated transition: read current geometry, then write starting height,
      // then write target height in the next frame so the browser can interpolate.
      const to = active ? active.scrollHeight : 0;
      const from = shell.getBoundingClientRect().height;
      shell.style.height = `${from}px`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          shell.style.height = `${to}px`;
        });
      });
    };

    const scheduleHeight = (animate) => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        applyHeight(animate);
      });
    };

    const activate = (index, animate = true) => {
      // All writes first — no geometry reads in this turn
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });

      panels.forEach((panel, i) => {
        const on = i === index;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
        panel.setAttribute("aria-hidden", on ? "false" : "true");
        panel.inert = !on;
      });

      scheduleHeight(animate);
    };

    const start = Math.max(
      0,
      tabs.findIndex((tab) => tab.classList.contains("is-active"))
    );
    activate(start, false);

    let resizeTick = 0;
    window.addEventListener(
      "resize",
      () => {
        window.cancelAnimationFrame(resizeTick);
        resizeTick = window.requestAnimationFrame(() => applyHeight(false));
      },
      { passive: true }
    );

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index, true));

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const dir = event.key === "ArrowRight" ? 1 : -1;
        const next = (index + dir + tabs.length) % tabs.length;
        tabs[next].focus();
        activate(next, true);
      });
    });
  });
}

/**
 * Docs: person tabs + Swiper per master + GLightbox.
 */
function initDocsTabs() {
  const roots = document.querySelectorAll("[data-docs]");
  if (!roots.length) return;

  const boot = () => {
    if (typeof Swiper !== "function") return false;

    roots.forEach((root) => {
      const people = [...root.querySelectorAll("[data-docs-person]")];
      const packs = [...root.querySelectorAll("[data-docs-pack]")];
      const swipers = new Map();

      packs.forEach((pack) => {
        const sliderRoot = pack.querySelector("[data-docs-slider]");
        const el = pack.querySelector("[data-docs-swiper]");
        if (!sliderRoot || !el) return;

        const swiper = new Swiper(el, {
          slidesPerView: 1,
          spaceBetween: 16,
          speed: 450,
          watchOverflow: true,
          grabCursor: true,
          observer: false,
          observeParents: false,
          a11y: { enabled: true },
          navigation: {
            nextEl: sliderRoot.querySelector(".docs__nav--next"),
            prevEl: sliderRoot.querySelector(".docs__nav--prev"),
          },
          pagination: {
            el: sliderRoot.querySelector(".docs__pagination"),
            clickable: true,
          },
          breakpoints: {
            641: {
              slidesPerView: 2,
              spaceBetween: 18,
            },
            901: {
              slidesPerView: 3,
              spaceBetween: 22,
            },
          },
        });

        swipers.set(pack, swiper);
      });

      const activate = (btn) => {
        const id = btn.getAttribute("aria-controls");
        people.forEach((p) => {
          const on = p === btn;
          p.classList.toggle("is-active", on);
          p.setAttribute("aria-selected", on ? "true" : "false");
        });
        packs.forEach((pack) => {
          const on = pack.id === id;
          pack.classList.toggle("is-active", on);
          pack.hidden = !on;
          if (on) {
            const swiper = swipers.get(pack);
            if (!swiper) return;
            // Measure after the pack becomes visible (next frame)
            requestAnimationFrame(() => {
              swiper.update();
              swiper.slideTo(0, 0);
            });
          }
        });
      };

      const rovingTabIndex = (activeIndex) => {
        people.forEach((p, i) => {
          p.tabIndex = i === activeIndex ? 0 : -1;
        });
      };

      const activeIndex = () =>
        Math.max(0, people.findIndex((p) => p.classList.contains("is-active")));
      rovingTabIndex(activeIndex());

      people.forEach((btn, index) => {
        btn.addEventListener("click", () => {
          activate(btn);
          rovingTabIndex(index);
        });

        btn.addEventListener("keydown", (event) => {
          if (
            event.key !== "ArrowRight" &&
            event.key !== "ArrowLeft" &&
            event.key !== "Home" &&
            event.key !== "End"
          )
            return;
          event.preventDefault();
          let next = index;
          if (event.key === "ArrowRight")
            next = (index + 1) % people.length;
          else if (event.key === "ArrowLeft")
            next = (index - 1 + people.length) % people.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = people.length - 1;
          people[next].focus();
          rovingTabIndex(next);
          activate(people[next]);
        });
      });
    });

    return true;
  };

  if (boot()) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (boot() || tries > 40) window.clearInterval(timer);
  }, 50);
}

/** GLightbox for certificate photos (CDN). */
function initDocsLightbox() {
  const start = () => {
    if (typeof GLightbox !== "function") return false;

    GLightbox({
      selector: ".docs__cert",
      touchNavigation: true,
      loop: true,
      zoomable: true,
      openEffect: "fade",
      closeEffect: "fade",
    });
    return true;
  };

  if (start()) return;

  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (start() || tries > 40) window.clearInterval(timer);
  }, 50);
}

/** One-shot scroll reveal for specialist cards + docs + location. */
function initReveal() {
  const targets = [
    ...document.querySelectorAll(".specialist__card"),
    ...document.querySelectorAll(".docs"),
    ...document.querySelectorAll(".location"),
  ];
  if (!targets.length) return;

  const reveal = (el) => {
    el.classList.add("is-inview");
    // After opacity/transform settles, one rAF update is enough
    requestAnimationFrame(() => {
      el.querySelectorAll("[data-specialist-swiper]").forEach((node) => {
        refreshSpecialistSwiper(node);
      });
    });
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(reveal);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -12% 0px" }
  );

  targets.forEach((el) => io.observe(el));
}

/**
 * Cookie consent banner.
 *
 * Persists decision (accept all / only essential) to localStorage under a
 * versioned key. Bumping CONSENT_VERSION re-prompts every visitor.
 *
 * Markup contract: see index.html (role=dialog, data-cookie).
 * The dialog is non-modal: page content stays interactive, focus is not
 * trapped. The banner is a polite notice, not a blocker.
 */
const CONSENT_STORAGE_KEY = "shabash:cookie-consent";
const CONSENT_VERSION = 1;
const CONSENT_HIDE_DELAY = 600;

function initCookieConsent() {
  const banner = document.querySelector("[data-cookie]");
  if (!banner) return;

  const toggle = banner.querySelector("[data-cookie-toggle]");
  const details = banner.querySelector("#cookie-details");
  const actionButtons = banner.querySelectorAll("[data-cookie-action]");
  const categoryInputs = banner.querySelectorAll("[data-cookie-category]");
  const primaryBtn = banner.querySelector('[data-cookie-action="all"]');

  // Public surface for footer "manage cookies" link / dev console.
  const api = {
    show: () => showBanner(),
    hide: () => hideBanner(),
    reset: () => clearConsent(),
    read: () => readConsent(),
  };
  window.shabashConsent = api;

  // Hydrate switches from saved decision (if any) so the details panel
  // reflects reality, not the markup defaults.
  const stored = readConsent();
  if (stored && stored.decision) {
    syncSwitches(stored.decision);
  }

  // Show only when no usable decision is stored.
  if (!hasValidDecision(stored)) {
    showBanner();
  } else {
    banner.hidden = true;
  }

  // —— Expand / collapse details ——
  if (toggle && details) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      setExpanded(!open);
    });
  }

  // —— Action buttons: accept all / only essential ——
  actionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.cookieAction;
      if (action !== "all" && action !== "essential") return;
      syncSwitches(action);
      writeConsent(action);
      hideBanner();
    });
  });

  // —— External triggers (footer link, etc.) ——
  document.querySelectorAll("[data-cookie-open]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      clearConsent();
      showBanner();
    });
  });

  // —— Internal helpers ——
  function setExpanded(open) {
    if (!toggle || !details) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    details.hidden = !open;
    banner.classList.toggle("is-expanded", open);
  }

  function showBanner() {
    banner.hidden = false;
    document.body.classList.add("has-cookie");
    // Two rAFs: first lets the browser mount the [hidden=false] state,
    // second applies the class so the transition runs from translateY(110%)
    // to translateY(0).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add("is-shown");
        primaryBtn?.focus({ preventScroll: true });
      });
    });
  }

  function hideBanner() {
    banner.classList.remove("is-shown");
    setExpanded(false);
    document.body.classList.remove("has-cookie");
    window.setTimeout(() => {
      if (!banner.classList.contains("is-shown")) {
        banner.hidden = true;
      }
    }, CONSENT_HIDE_DELAY);
  }

  function syncSwitches(decision) {
    const enabled = decision === "all";
    categoryInputs.forEach((input) => {
      // Disabled (essential) inputs are not touched.
      if (input.disabled) return;
      input.checked = enabled;
    });
  }

  function hasValidDecision(consent) {
    if (!consent || typeof consent !== "object") return false;
    if (consent.v !== CONSENT_VERSION) return false;
    return consent.decision === "all" || consent.decision === "essential";
  }

  function readConsent() {
    try {
      const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeConsent(decision) {
    try {
      window.localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({
          v: CONSENT_VERSION,
          decision,
          ts: Date.now(),
        })
      );
    } catch {
      /* localStorage may be unavailable (private mode, quota); banner still closes. */
    }
  }

  function clearConsent() {
    try {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
