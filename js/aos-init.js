(() => {
  "use strict";

  let fallbackObserver;

  const setAnimation = (selector, animation, delayStep = 0) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (!element.dataset.aos) element.dataset.aos = animation;
      if (delayStep && !element.dataset.aosDelay) {
        element.dataset.aosDelay = String((index % 3) * delayStep);
      }
    });
  };

  const observeFallbackElements = () => {
    if (!fallbackObserver) return;
    document.querySelectorAll("[data-aos]:not([data-aos-observed])").forEach((element) => {
      element.dataset.aosObserved = "true";
      element.style.setProperty("--aos-delay", `${Number(element.dataset.aosDelay) || 0}ms`);
      fallbackObserver.observe(element);
    });
  };

  const initializeFallback = () => {
    document.documentElement.classList.add("aos-fallback");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-aos]").forEach((element) => {
        element.classList.add("aos-animate", "aos-finished");
      });
      return;
    }

    fallbackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          const delay = Number(element.dataset.aosDelay) || 0;
          element.classList.add("aos-animate");
          window.setTimeout(() => {
            element.classList.add("aos-finished");
            element.style.removeProperty("--aos-delay");
          }, 800 + delay);
          fallbackObserver.unobserve(element);
        });
      },
      {
        rootMargin: "0px 0px -80px 0px",
        threshold: 0.08,
      }
    );

    observeFallbackElements();
  };

  const applyAnimations = () => {
    setAnimation(".nav-shell", "fade-down");
    setAnimation(".site-footer", "fade-up");
    setAnimation(".home-hero", "fade-up");
    setAnimation("#about", "fade-up");
    setAnimation(".home-stats article, .card.stat", "zoom-in", 100);
    setAnimation(".home-floor-explorer, .floor-plan-panel", "fade-right");
    setAnimation(".floor-layout .form-panel, .data-toolbar", "fade-left");
    setAnimation('[aria-label="Available room list"] .card', "fade-up", 100);
    setAnimation(".home-facility-card", "zoom-in-up", 100);
    setAnimation(".home-steps, .booking-rules", "fade-left");
  };

  const refresh = () => {
    applyAnimations();
    if (window.AOS) window.AOS.refreshHard();
    else observeFallbackElements();
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyAnimations();

    if (!window.AOS) {
      initializeFallback();
      return;
    }

    window.AOS.init({
      duration: 800,
      easing: "ease-out",
      once: true,
      offset: 80,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  });

  window.PTTAAOS = { refresh };
})();
