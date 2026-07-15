/**
 * Shabash — UI bootstrap
 */

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initAccordions();
  initDocsTabs();
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
 * Docs: person switcher + accordion items.
 * Open state = .is-open only (CSS animates height/opacity).
 *
 * [data-docs]
 *   [data-docs-person][aria-controls] → [data-docs-pack]
 *   [data-docs-item] > [data-docs-trigger] + [data-docs-body]
 */
function initDocsTabs() {
  const roots = document.querySelectorAll("[data-docs]");
  if (!roots.length) return;

  roots.forEach((root) => {
    const people = [...root.querySelectorAll("[data-docs-person]")];
    const packs = [...root.querySelectorAll("[data-docs-pack]")];

    people.forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("aria-controls");
        people.forEach((p) => p.classList.toggle("is-active", p === btn));
        packs.forEach((pack) => {
          const on = pack.id === id;
          pack.classList.toggle("is-active", on);
          pack.hidden = !on;
        });
      });
    });

    root.querySelectorAll("[data-docs-pack]").forEach((pack) => {
      const items = [...pack.querySelectorAll("[data-docs-item]")];

      items.forEach((item) => {
        const trigger = item.querySelector("[data-docs-trigger]");
        if (!trigger) return;

        trigger.addEventListener("click", () => {
          const wasOpen = item.classList.contains("is-open");

          items.forEach((other) => {
            const open = other === item && !wasOpen;
            other.classList.toggle("is-open", open);
            const t = other.querySelector("[data-docs-trigger]");
            const b = other.querySelector("[data-docs-body]");
            if (t) t.setAttribute("aria-expanded", open ? "true" : "false");
            if (b) b.setAttribute("aria-hidden", open ? "false" : "true");
          });
        });
      });
    });
  });
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
