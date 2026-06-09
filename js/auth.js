(() => {
  "use strict";

  const SESSION_KEYS = {
    loggedIn: "isLoggedIn",
    role: "userRole",
    userId: "currentUserId",
    message: "authMessage",
  };

  const USER_PAGES = new Set([
    "availability.html",
    "room-details.html",
    "booking.html",
    "confirmation.html",
    "dashboard.html",
    "profile.html",
    "history.html",
    "notifications.html",
    "manage-bookings.html",
    "edit-booking.html",
    "cancel-booking.html",
    "help.html",
  ]);

  const ADMIN_PAGES = new Set([
    "admin-dashboard.html",
    "admin-rooms.html",
    "admin-bookings.html",
    "admin-users.html",
    "admin-reports.html",
  ]);

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.documentElement.classList.add("auth-loading");

  const readSession = () => ({
    isLoggedIn: sessionStorage.getItem(SESSION_KEYS.loggedIn) === "true",
    userRole: sessionStorage.getItem(SESSION_KEYS.role) || "",
    userId: sessionStorage.getItem(SESSION_KEYS.userId) || "",
  });

  const setSession = (role, userId = "") => {
    sessionStorage.setItem(SESSION_KEYS.loggedIn, "true");
    sessionStorage.setItem(SESSION_KEYS.role, role);
    sessionStorage.setItem(SESSION_KEYS.userId, userId);
  };

  const clearSession = () => {
    sessionStorage.removeItem(SESSION_KEYS.loggedIn);
    sessionStorage.removeItem(SESSION_KEYS.role);
    sessionStorage.removeItem(SESSION_KEYS.userId);
  };

  const homeForRole = (role) => (role === "admin" ? "admin-dashboard.html" : "dashboard.html");

  const denyAccess = () => {
    clearSession();
    sessionStorage.setItem(SESSION_KEYS.message, "Please log in first.");
    window.location.replace("login.html");
  };

  const requiredRole = ADMIN_PAGES.has(currentPage)
    ? "admin"
    : USER_PAGES.has(currentPage)
      ? "student"
      : "";

  const session = readSession();

  if (requiredRole && (!session.isLoggedIn || session.userRole !== requiredRole)) {
    denyAccess();
    return;
  }

  if (currentPage === "admin.html") {
    if (session.isLoggedIn && session.userRole === "admin") {
      window.location.replace("admin-dashboard.html");
    } else {
      denyAccess();
    }
    return;
  }

  if (currentPage === "reports.html") {
    if (session.isLoggedIn && session.userRole === "admin") {
      window.location.replace("admin-reports.html");
    } else {
      denyAccess();
    }
    return;
  }

  if (["login.html", "register.html", "admin-login.html"].includes(currentPage) && session.isLoggedIn) {
    window.location.replace(homeForRole(session.userRole));
    return;
  }

  const navLink = (href, label, activePage = href) => {
    const active = currentPage === activePage ? " active" : "";
    return `<a class="nav-link${active}" href="${href}">${label}</a>`;
  };

  const publicNavigation = () => ({
    links:
      currentPage === "index.html"
        ? `
          <a class="nav-link" href="#home">Home</a>
          <a class="nav-link" href="#about">About System</a>
          <a class="nav-link" href="#features">Features</a>
        `
        : `
          ${navLink("index.html", "Home", "index.html")}
          <a class="nav-link" href="index.html#about">About System</a>
          <a class="nav-link" href="index.html#features">Features</a>
        `,
    actions: `
      <a class="button small ghost" href="login.html">Login</a>
      <a class="button small" href="register.html">Register</a>
    `,
  });

  const userNavigation = () => ({
    links: `
      ${navLink("index.html", "Home", "index.html")}
      ${navLink("availability.html", "Availability")}
      ${navLink("dashboard.html", "Dashboard")}
      ${navLink("help.html", "Help")}
    `,
    actions: `
      <button class="button small warning" type="button" data-auth-logout>Logout</button>
    `,
  });

  const adminNavigation = () => ({
    links: `
      ${navLink("admin-dashboard.html", "Admin Dashboard")}
      ${navLink("admin-rooms.html", "Rooms Management")}
      ${navLink("admin-bookings.html", "Bookings Management")}
      ${navLink("admin-users.html", "Users Management")}
      ${navLink("admin-reports.html", "Reports")}
    `,
    actions: `
      <button class="button small warning" type="button" data-auth-logout>Logout</button>
    `,
  });

  const renderNavigation = () => {
    const navigation = document.querySelector(".nav-shell");
    if (!navigation) return;
    const links = navigation.querySelector(".nav-links");
    const actions = navigation.querySelector(".nav-actions");
    if (!links || !actions) return;

    const activeSession = readSession();
    let navigationContent;
    if (!activeSession.isLoggedIn) {
      navigationContent = publicNavigation();
    } else if (activeSession.userRole === "admin") {
      navigationContent = adminNavigation();
    } else {
      navigationContent = userNavigation();
    }

    links.innerHTML = navigationContent.links;
    actions.innerHTML = navigationContent.actions;
  };

  const initializeHomeScrollSpy = () => {
    if (currentPage !== "index.html") return;

    const sectionIds = ["home", "about", "features"];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    const navigationLinks = [...document.querySelectorAll(".nav-links .nav-link")];
    const sectionLinks = navigationLinks.filter((link) => sectionIds.includes(link.hash.slice(1)));
    if (!sections.length || !sectionLinks.length) return;

    let pendingTarget = "";
    let pendingTimer = 0;

    const setActiveLink = (sectionId) => {
      navigationLinks.forEach((link) => {
        const isActive = link.hash === `#${sectionId}`;
        link.classList.toggle("active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const activeSectionAtViewportPosition = () => {
      const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
      const activationLine = headerHeight + Math.min(180, window.innerHeight * 0.28);
      return sections.reduce((activeSection, section) => {
        return section.getBoundingClientRect().top <= activationLine ? section : activeSection;
      }, sections[0]);
    };

    const updateFromViewport = () => {
      if (pendingTarget) {
        const target = document.getElementById(pendingTarget);
        const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
        if (target && Math.abs(target.getBoundingClientRect().top - headerHeight) > 48) return;
        pendingTarget = "";
        window.clearTimeout(pendingTimer);
      }
      setActiveLink(activeSectionAtViewportPosition().id);
    };

    sectionLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const sectionId = link.hash.slice(1);
        pendingTarget = sectionId;
        setActiveLink(sectionId);
        window.clearTimeout(pendingTimer);
        pendingTimer = window.setTimeout(() => {
          pendingTarget = "";
          updateFromViewport();
        }, 900);
      });
    });

    const observer = new IntersectionObserver(updateFromViewport, {
      rootMargin: "-18% 0px -62% 0px",
      threshold: [0, 0.01, 0.25, 0.5],
    });
    sections.forEach((section) => observer.observe(section));

    window.addEventListener("hashchange", () => {
      const sectionId = window.location.hash.slice(1);
      if (!sectionIds.includes(sectionId)) return;
      pendingTarget = sectionId;
      setActiveLink(sectionId);
      window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => {
        pendingTarget = "";
        updateFromViewport();
      }, 900);
    });

    const initialSection = window.location.hash.slice(1);
    if (sectionIds.includes(initialSection)) {
      pendingTarget = initialSection;
      setActiveLink(initialSection);
      window.requestAnimationFrame(() => {
        document.getElementById(initialSection)?.scrollIntoView({ block: "start" });
      });
      pendingTimer = window.setTimeout(() => {
        pendingTarget = "";
        updateFromViewport();
      }, 900);
    } else {
      updateFromViewport();
    }
  };

  const displayAccessMessage = () => {
    const message = sessionStorage.getItem(SESSION_KEYS.message);
    if (!message) return;
    sessionStorage.removeItem(SESSION_KEYS.message);

    const main = document.querySelector("main");
    if (main) {
      const notice = document.createElement("div");
      notice.className = "section compact";
      notice.innerHTML = `<div class="alert conflict auth-message" role="alert">${message}</div>`;
      main.prepend(notice);
    }
    window.alert(message);
  };

  const initializeLogout = () => {
    document.querySelectorAll("[data-auth-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        clearSession();
        window.location.replace("login.html");
      });
    });
  };

  const initializeAdminLogin = () => {
    const form = document.getElementById("admin-login-form");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = form.elements["admin-username"].value.trim();
      const password = form.elements["admin-password"].value;
      let error = form.querySelector(".admin-login-error");

      if (username !== "admin" || password !== "admin123") {
        if (!error) {
          error = document.createElement("p");
          error.className = "field-error admin-login-error";
          error.setAttribute("role", "alert");
          form.querySelector("button[type='submit']").insertAdjacentElement("beforebegin", error);
        }
        error.textContent = "Invalid administrator username or password.";
        form.elements["admin-password"].value = "";
        form.elements["admin-password"].focus();
        return;
      }

      setSession("admin", "admin");
      window.location.replace("admin-dashboard.html");
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderNavigation();
    initializeHomeScrollSpy();
    initializeLogout();
    initializeAdminLogin();
    displayAccessMessage();
    document.documentElement.classList.remove("auth-loading");
  });

  window.AppAuth = {
    getSession: readSession,
    isLoggedIn: () => readSession().isLoggedIn,
    hasRole: (role) => {
      const activeSession = readSession();
      return activeSession.isLoggedIn && activeSession.userRole === role;
    },
    login(role, userId = "") {
      setSession(role, userId);
    },
    logout() {
      clearSession();
      window.location.replace("login.html");
    },
  };
})();
