/**
 * Shabash — UI bootstrap
 */

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initAccordions();
  initDocsTabs();
  initDocsLightbox();
  initPriceTabs();
  initReveal();
});

function initMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("menu-overlay");

  if (!burger || !menu || !overlay) return;

  /* trap focus: burger (always) + links inside drawer */
  const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocus = null;

  const open = () => {
    lastFocus = document.activeElement;
    menu.classList.add("is-open");
    overlay.classList.add("is-open");
    overlay.hidden = false;
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Закрыть меню");
    document.body.classList.add("is-menu-open");
    burger.focus();
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

    burger.focus();
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
    };

    setOpen(false);

    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });
  });
}

/**
 * Price category chips:
 * [data-price-tabs]
 *   [data-price-tab][aria-controls] → [data-price-panel]
 */
function initPriceTabs() {
  const roots = document.querySelectorAll("[data-price-tabs]");
  if (!roots.length) return;

  roots.forEach((root) => {
    const tabs = [...root.querySelectorAll("[data-price-tab]")];
    const panels = [...root.querySelectorAll("[data-price-panel]")];
    if (!tabs.length || !panels.length) return;

    const activate = (index) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });

      /* keep all panels in layout (same grid cell) so photo height stays stable */
      panels.forEach((panel, i) => {
        const on = i === index;
        panel.classList.toggle("is-active", on);
        panel.hidden = false;
        panel.setAttribute("aria-hidden", on ? "false" : "true");
        panel.inert = !on;
      });
    };

    activate(Math.max(0, tabs.findIndex((tab) => tab.classList.contains("is-active"))));

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const dir = event.key === "ArrowRight" ? 1 : -1;
        const next = (index + dir + tabs.length) % tabs.length;
        tabs[next].focus();
        activate(next);
      });
    });
  });
}

/**
 * Docs: person switcher + independent slider per master.
 *
 * [data-docs]
 *   [data-docs-person][aria-controls] → [data-docs-pack]
 *   [data-docs-slider]
 *     [data-docs-track] > [data-docs-slide] (1 cert each)
 *     desktop: 3 visible, mobile: 1 visible + swipe
 *     [data-docs-prev] / [data-docs-next]
 *     [data-docs-dots]
 */
function initDocsTabs() {
  const roots = document.querySelectorAll("[data-docs]");
  if (!roots.length) return;

  roots.forEach((root) => {
    const people = [...root.querySelectorAll("[data-docs-person]")];
    const packs = [...root.querySelectorAll("[data-docs-pack]")];
    const sliders = new Map();

    packs.forEach((pack) => {
      if (pack.hasAttribute("data-docs-slider")) {
        sliders.set(pack, createDocsSlider(pack));
      }
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
        if (on) sliders.get(pack)?.refresh();
      });
    };

    people.forEach((btn) => {
      btn.addEventListener("click", () => activate(btn));
    });
  });
}

/** One slider: 3 certs desktop / 1 cert mobile, swipe + arrows. */
function createDocsSlider(root) {
  const viewport = root.querySelector("[data-docs-viewport]");
  const track = root.querySelector("[data-docs-track]");
  const slides = [...root.querySelectorAll("[data-docs-slide]")];
  const prev = root.querySelector("[data-docs-prev]");
  const next = root.querySelector("[data-docs-next]");
  const dotsHost = root.querySelector("[data-docs-dots]");

  if (!viewport || !track || !slides.length) {
    return { refresh() {} };
  }

  let index = 0;
  let maxIndex = 0;
  let slideW = 0;
  let gap = 0;
  let dots = [];
  const total = slides.length;
  const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMq = window.matchMedia("(max-width: 640px)");

  const getPerView = () => (mobileMq.matches ? 1 : 3);

  const getGap = () => {
    const g = getComputedStyle(track).gap || getComputedStyle(track).columnGap || "0";
    return parseFloat(g) || 0;
  };

  const getInnerWidth = () => {
    const s = getComputedStyle(viewport);
    const pad =
      (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0);
    return Math.max(0, viewport.clientWidth - pad);
  };

  const step = () => slideW + gap;

  const buildDots = () => {
    if (!dotsHost) return;
    dotsHost.replaceChildren();
    const count = maxIndex + 1;
    dots = Array.from({ length: count }, (_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "docs__dot";
      dot.setAttribute("aria-label", `Слайд ${i + 1} из ${count}`);
      dot.addEventListener("click", () => go(i));
      dotsHost.appendChild(dot);
      return dot;
    });
    dotsHost.hidden = count <= 1;
  };

  const render = (offsetPx = null) => {
    const x = offsetPx != null ? offsetPx : -(index * step());
    if (offsetPx == null) {
      track.style.transition = reduceMq.matches ? "none" : "";
    }
    track.style.transform = `translate3d(${x}px, 0, 0)`;

    const perView = getPerView();
    slides.forEach((slide, i) => {
      const visible = i >= index && i < index + perView;
      slide.classList.toggle("is-active", visible);
      slide.setAttribute("aria-hidden", visible ? "false" : "true");
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
      dot.setAttribute("aria-current", i === index ? "true" : "false");
    });

    if (prev) {
      prev.disabled = index <= 0;
      prev.hidden = maxIndex <= 0;
    }
    if (next) {
      next.disabled = index >= maxIndex;
      next.hidden = maxIndex <= 0;
    }
  };

  const go = (i) => {
    index = Math.max(0, Math.min(maxIndex, i));
    render();
  };

  const layout = () => {
    const perView = getPerView();
    gap = getGap();
    const inner = getInnerWidth();
    slideW = Math.max(0, (inner - gap * (perView - 1)) / perView);

    slides.forEach((slide) => {
      slide.style.flex = `0 0 ${slideW}px`;
      slide.style.width = `${slideW}px`;
    });

    maxIndex = Math.max(0, total - perView);
    if (index > maxIndex) index = maxIndex;

    buildDots();
    render();
  };

  prev?.addEventListener("click", () => go(index - 1));
  next?.addEventListener("click", () => go(index + 1));

  /* finger swipe + mouse drag (viewport hit area) */
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let dragging = false;
  let locked = false; /* horizontal lock after intent */
  let pointerId = null;
  let suppressClick = false;

  const finishDrag = () => {
    if (!dragging) return;
    const moved = Math.abs(deltaX) > 10;
    dragging = false;
    locked = false;
    pointerId = null;
    track.classList.remove("is-dragging");
    track.style.transition = reduceMq.matches ? "none" : "";

    const threshold = Math.max(36, getInnerWidth() * 0.12);
    if (deltaX > threshold) go(index - 1);
    else if (deltaX < -threshold) go(index + 1);
    else render();

    if (moved) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 80);
    }
    deltaX = 0;
  };

  root.addEventListener(
    "click",
    (e) => {
      if (!suppressClick) return;
      const link = e.target.closest(".docs__cert-link");
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    /* don't steal clicks from lightbox links until drag is confirmed */
    dragging = true;
    locked = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    deltaX = 0;
  };

  const onPointerMove = (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      /* only claim horizontal swipes; let page scroll vertically */
      if (Math.abs(dy) > Math.abs(dx)) {
        dragging = false;
        locked = false;
        pointerId = null;
        return;
      }
      locked = true;
      track.classList.add("is-dragging");
      track.style.transition = "none";
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    deltaX = dx;
    if (e.cancelable) e.preventDefault();
    render(-(index * step()) + deltaX);
  };

  const onPointerUp = (e) => {
    if (pointerId != null && e.pointerId !== pointerId) return;
    finishDrag();
  };

  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove, { passive: false });
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("lostpointercapture", () => {
    if (dragging && locked) finishDrag();
  });

  /* native image drag breaks swipe */
  root.querySelectorAll("img").forEach((img) => {
    img.setAttribute("draggable", "false");
  });

  const onResize = () => layout();
  window.addEventListener("resize", onResize);
  if (typeof mobileMq.addEventListener === "function") {
    mobileMq.addEventListener("change", onResize);
  } else if (typeof mobileMq.addListener === "function") {
    mobileMq.addListener(onResize);
  }

  layout();

  return {
    refresh() {
      requestAnimationFrame(layout);
    },
  };
}

/** GLightbox for certificate photos (CDN). */
function initDocsLightbox() {
  const start = () => {
    if (typeof GLightbox !== "function") return false;

    GLightbox({
      selector: ".docs__cert-link",
      touchNavigation: true,
      loop: true,
      zoomable: true,
      openEffect: "fade",
      closeEffect: "fade",
    });
    return true;
  };

  if (start()) return;

  /* CDN script may still be loading */
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (start() || tries > 40) window.clearInterval(timer);
  }, 50);
}

/** One-shot scroll reveal for specialist cards + location block. */
function initReveal() {
  const targets = [
    ...document.querySelectorAll(".specialist__card"),
    ...document.querySelectorAll(".docs"),
    ...document.querySelectorAll(".location"),
  ];
  if (!targets.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-inview"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      });
    },
    /* later in viewport so motion is on-screen, not already done */
    { threshold: 0.22, rootMargin: "0px 0px -12% 0px" }
  );

  targets.forEach((el) => io.observe(el));
}
