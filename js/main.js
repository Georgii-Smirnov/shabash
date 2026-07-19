/**
 * Shabash — UI bootstrap
 *
 * Heavy layout work (Swiper measure, price panel heights) is deferred until
 * needed so we avoid forced reflow on first paint / LCP.
 */

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initAccordions();
  initPriceTabs();
  initReveal();
  // Swiper / lightbox: wait until near viewport (or idle fallback)
  whenIdleOrVisible(
    [
      ...document.querySelectorAll("[data-specialist-swiper]"),
      ...document.querySelectorAll("[data-docs]"),
    ],
    () => {
      initSpecialistSwipers();
      initDocsTabs();
      initDocsLightbox();
    }
  );
});

/**
 * Run `fn` when any target nears the viewport, or on idle if IO unavailable.
 * Avoids Swiper reading geometry for off-screen carousels during load.
 */
function whenIdleOrVisible(targets, fn) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };

  const nodes = targets.filter(Boolean);
  if (!nodes.length) {
    scheduleIdle(run);
    return;
  }

  if (!("IntersectionObserver" in window)) {
    scheduleIdle(run);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      run();
    },
    { rootMargin: "240px 0px", threshold: 0.01 }
  );

  nodes.forEach((el) => io.observe(el));

  // Safety: if user never scrolls, still init after idle so features work
  scheduleIdle(() => {
    // keep IO; if already run, no-op. If not, allow longer wait —
    // only force after 4s so LCP path stays clear.
    window.setTimeout(run, 4000);
  });
}

function scheduleIdle(fn) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn(), { timeout: 2000 });
  } else {
    window.setTimeout(fn, 1);
  }
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
        requestAnimationFrame(() => {
          root
            .closest(".specialist__card")
            ?.querySelectorAll("[data-specialist-swiper]")
            .forEach((node) => refreshSpecialistSwiper(node));
        });
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

      // Read geometry in one place, after DOM class writes have flushed via rAF
      const active = panels.find((p) => p.classList.contains("is-active"));
      const to = active ? active.scrollHeight : 0;

      if (!animate || reduceMotion) {
        shell.style.height = `${to}px`;
        return;
      }

      const from = shell.getBoundingClientRect().height;
      shell.style.height = `${from}px`;

      // Double rAF instead of void offsetHeight — same frame-split, less sync thrash
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

      people.forEach((btn) => {
        btn.addEventListener("click", () => activate(btn));
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
