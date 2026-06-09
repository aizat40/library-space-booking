(() => {
  "use strict";

  const STORAGE_KEY = "tta-library-booking-state-v3";
  const LEGACY_STORAGE_KEYS = ["tta-library-booking-state-v2", "tta-library-booking-state-v1"];
  const SESSION_KEY = "tta-library-booking-session-v1";

  const today = () => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  };

  const escapeHTML = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const titleCase = (value) =>
    String(value ?? "")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const statusClass = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (["confirmed", "completed", "active", "available"].includes(normalized)) return "confirmed";
    if (["pending", "review"].includes(normalized)) return "pending";
    if (["conflict", "cancelled", "closed"].includes(normalized)) return "conflict";
    return "info";
  };

  const statusBadge = (status) =>
    `<span class="status ${statusClass(status)}">${escapeHTML(titleCase(status))}</span>`;

  const formatDate = (dateValue) => {
    if (!dateValue) return "Not set";
    const [year, month, day] = String(dateValue).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return "Not set";
    const [hours, minutes] = String(timeValue).split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const localDateValue = (date = new Date()) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };

  const isDateValue = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const timeFromMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  const generateTimeSlots = (openingMinutes = 8 * 60, closingMinutes = 18 * 60, durationMinutes = 2 * 60) => {
    const slots = [];
    for (let start = openingMinutes; start + durationMinutes <= closingMinutes; start += durationMinutes) {
      slots.push([timeFromMinutes(start), timeFromMinutes(start + durationMinutes)]);
    }
    return slots;
  };

  const minutesFromTime = (timeValue) => {
    const [hours, minutes] = String(timeValue || "00:00").split(":").map(Number);
    return hours * 60 + minutes;
  };

  const overlaps = (firstStart, firstEnd, secondStart, secondEnd) =>
    minutesFromTime(firstStart) < minutesFromTime(secondEnd) &&
    minutesFromTime(secondStart) < minutesFromTime(firstEnd);

  const pageName = () => window.location.pathname.split("/").pop() || "index.html";
  const queryParams = () => new URLSearchParams(window.location.search);
  const byId = (id) => document.getElementById(id);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];

  const debounce = (callback, delay = 120) => {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback(...args), delay);
    };
  };

  const readSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
    } catch {
      return {};
    }
  };

  const writeSession = (updates) => {
    const next = { ...readSession(), ...updates };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  };

  const createRoom = (floor, code, id, name, type, capacity, status, description, equipment) => ({
    id,
    code,
    name,
    floor,
    zone: `Level ${floor}`,
    type,
    capacity,
    status: status === "available" ? "available" : "closed",
    description,
    equipment,
  });

  const PTTA_ROOMS = [
    createRoom(1, "L1-GAL", "l1-gallery", "Gallery", "Gallery", 40, "available", "Flexible exhibition and event space near the Level 1 entrance.", "Display panels, flexible seating"),
    createRoom(1, "L1-CC", "l1-circulation-counter", "Circulation Counter", "Library Service", 12, "closed", "Main counter for borrowing, returns, membership, and library assistance.", "Service counters, self-check facilities"),
    createRoom(1, "L1-AATA", "l1-aata-lounge", "AATA Lounge", "Lounge", 12, "available", "Informal lounge for small discussions and collaborative study.", "Lounge seating, power outlets"),
    createRoom(1, "L1-SUA", "l1-special-user-area", "Special User Area", "Accessible Study", 8, "available", "Accessible study area reserved for users who need additional support.", "Accessible desks, power outlets"),
    createRoom(1, "L1-CRR", "l1-closed-reference-room", "Closed Reference Room", "Reference Collection", 20, "closed", "Controlled-access reference collection managed by library staff.", "Reference shelving, consultation desk"),
    createRoom(1, "L1-MMR", "l1-multimedia-room", "Multimedia Room", "Multimedia", 24, "available", "Technology-supported room for multimedia learning and presentations.", "Display, audio system, computers"),
    createRoom(1, "L1-IO", "l1-international-office", "International Office", "Office", 10, "closed", "Administrative office supporting international library users and activities.", "Office workstations, consultation seating"),
    createRoom(1, "L1-PPS", "l1-pps-lounge", "PPS Lounge", "Lounge", 20, "available", "Comfortable postgraduate lounge for focused work and informal meetings.", "Lounge seating, tables, power outlets"),
    createRoom(1, "L1-GBCC", "l1-go-book-coffee-corner", "Go Book Coffee Corner", "Cafe", 24, "closed", "Refreshment corner with casual seating for library visitors.", "Cafe seating, service counter"),
    createRoom(1, "L1-24HR", "l1-24-hours-reading-room", "24 Hours Reading Room", "Reading Room", 80, "available", "Extended-hours reading room for individual and group study.", "Study desks, power outlets, Wi-Fi"),
    createRoom(1, "L1-MSU", "l1-makerspace-uthm", "MakerSpace UTHM", "Makerspace", 30, "available", "Hands-on innovation space for prototyping, making, and collaborative projects.", "Maker tables, presentation display, project equipment"),

    createRoom(2, "L2-SP", "l2-showcase-ptta", "Showcase PTTA", "Exhibition", 30, "closed", "Showcase area highlighting PTTA services, projects, and achievements.", "Display cases, exhibition panels"),
    createRoom(2, "L2-RA", "l2-reading-area", "Reading Area", "Reading Area", 80, "available", "Open Level 2 reading area for quiet individual study.", "Reading tables, study chairs, power outlets"),
    createRoom(2, "L2-ISR", "l2-information-searching-room", "Information Searching Room", "Computer Lab", 24, "available", "Dedicated room for catalogue, database, and information-searching activities.", "Computers, projector, network access"),
    createRoom(2, "L2-RC", "l2-references-collection", "References Collection", "Collection", 40, "closed", "Reference materials for consultation within the library.", "Reference shelving, reading desks"),
    createRoom(2, "L2-OAC", "l2-open-access-collection", "Open Access Collection", "Collection", 50, "closed", "Open-shelf collection available for browsing and study.", "Book shelving, catalogue stations"),
    createRoom(2, "L2-MM", "l2-mini-museum", "Mini Museum", "Museum", 25, "closed", "Compact museum area presenting selected institutional and library exhibits.", "Display cases, information panels"),
    createRoom(2, "L2-HR", "l2-hikmah-room", "Hikmah Room", "Discussion Room", 20, "available", "Enclosed collaborative room for meetings, discussions, and learning activities.", "Display, whiteboard, meeting tables"),

    createRoom(3, "L3-TSJJ", "l3-tan-sri-johan-jaaffar-collection", "Tan Sri Johan Jaaffar Collection", "Special Collection", 30, "closed", "Special collection dedicated to Tan Sri Johan Jaaffar.", "Collection shelving, reading tables"),
    createRoom(3, "L3-RA", "l3-reading-area", "Reading Area", "Reading Area", 100, "available", "Large Level 3 reading area for quiet study and research.", "Reading desks, power outlets, Wi-Fi"),
    createRoom(3, "L3-LR1", "l3-lestari-room-1", "Lestari Room 1", "Discussion Room", 12, "available", "Bookable discussion room for small-group learning and meetings.", "Display, whiteboard, meeting table"),
    createRoom(3, "L3-LR2", "l3-lestari-room-2", "Lestari Room 2", "Discussion Room", 12, "available", "Bookable discussion room for small-group learning and meetings.", "Display, whiteboard, meeting table"),
    createRoom(3, "L3-LL", "l3-lestari-lounge", "Lestari Lounge", "Lounge", 24, "available", "Informal collaborative lounge adjoining the Lestari rooms.", "Lounge seating, tables, power outlets"),
    createRoom(3, "L3-AJA", "l3-al-jazari-auditorium", "Al-Jazari Auditorium", "Auditorium", 180, "available", "Auditorium for talks, briefings, presentations, and academic events.", "Stage, projector, audio system, fixed seating"),
    createRoom(3, "L3-JMR", "l3-journal-magazine-room", "Journal & Magazine Room", "Periodicals", 35, "closed", "Reading room for current journals, magazines, and periodicals.", "Periodical shelving, reading tables"),
    createRoom(3, "L3-PH", "l3-permata-hikmah", "Permata Hikmah", "Learning Room", 16, "available", "Collaborative learning room for focused group activities.", "Interactive display, whiteboard, tables"),
    createRoom(3, "L3-ASR", "l3-al-shirazi-scholar-room", "Al-Shirazi Scholar Room", "Scholar Room", 10, "available", "Quiet scholar room intended for focused academic discussion and research.", "Meeting table, display, power outlets"),
    createRoom(3, "L3-DEA", "l3-drone-exhibition-area", "Drone Exhibition Area", "Exhibition", 30, "closed", "Exhibition area featuring drone technology and related projects.", "Exhibition stands, information panels"),
    createRoom(3, "L3-OAC", "l3-open-access-collection", "Open Access Collection", "Collection", 50, "closed", "Level 3 open-shelf collection for browsing and study.", "Book shelving, catalogue stations"),
    createRoom(3, "L3-SZ", "l3-sister-zone", "Sister Zone", "Learning Zone", 20, "available", "Dedicated collaborative zone for student learning and community activities.", "Flexible seating, tables, power outlets"),
    createRoom(3, "L3-EE", "l3-edu-entertainment", "Edu Entertainment", "Creative Learning", 30, "available", "Interactive education and entertainment space for group activities.", "Display, flexible seating, activity tables"),
    createRoom(3, "L3-ER", "l3-eksplorasi-room", "Eksplorasi Room", "Learning Room", 24, "available", "Flexible exploration room for workshops, project work, and collaborative sessions.", "Display, whiteboard, movable tables"),

    createRoom(4, "L4-RA", "l4-reading-area", "Reading Area", "Reading Area", 100, "available", "Level 4 reading area for quiet study and extended research.", "Reading desks, power outlets, Wi-Fi"),
    createRoom(4, "L4-BC", "l4-bibliotherapy-corner", "Bibliotherapy Corner", "Wellbeing Space", 12, "available", "Calm reading corner supporting reflective reading and wellbeing.", "Comfort seating, curated reading materials"),
    createRoom(4, "L4-CC", "l4-creative-collection", "Creative Collection", "Collection", 30, "closed", "Curated creative collection for browsing and inspiration.", "Collection shelving, display tables"),
    createRoom(4, "L4-OAC", "l4-open-access-collection", "Open Access Collection", "Collection", 50, "closed", "Level 4 open-shelf collection available for browsing.", "Book shelving, catalogue stations"),
    createRoom(4, "L4-IR", "l4-iqra-room", "Iqra' Room", "Discussion Room", 20, "available", "Bookable room for group reading, discussion, and academic activities.", "Display, whiteboard, meeting tables"),
  ];

  const FLOOR_PLAN_DATA = {
    1: {
      image: "images/floor-plan-level-1.png",
      title: "Visitor services, learning, and extended-hours spaces",
      caption: "Level 1 brings together the main visitor services, lounges, multimedia facilities, the 24 Hours Reading Room, and MakerSpace UTHM.",
      facilities: ["Gallery", "Circulation Counter", "AATA Lounge", "Special User Area", "Closed Reference Room", "Multimedia Room", "International Office", "PPS Lounge", "Go Book Coffee Corner", "24 Hours Reading Room", "MakerSpace UTHM"],
    },
    2: {
      image: "images/floor-plan-level-2.png",
      title: "Reading, information searching, and reference facilities",
      caption: "Level 2 provides open reading and information-searching facilities alongside reference collections, Showcase PTTA, the Mini Museum, and Hikmah Room.",
      facilities: ["Showcase PTTA", "Reading Area", "Information Searching Room", "References Collection", "Open Access Collection", "Mini Museum", "Hikmah Room"],
    },
    3: {
      image: "images/floor-plan-level-3.png",
      title: "Collaborative rooms, auditorium, collections, and learning zones",
      caption: "Level 3 is PTTA's largest mix of bookable and specialist spaces, including the Lestari rooms, Al-Jazari Auditorium, scholar facilities, exhibitions, and creative learning zones.",
      facilities: ["Tan Sri Johan Jaaffar Collection", "Reading Area", "Lestari Room 1", "Lestari Room 2", "Lestari Lounge", "Al-Jazari Auditorium", "Journal & Magazine Room", "Permata Hikmah", "Al-Shirazi Scholar Room", "Drone Exhibition Area", "Open Access Collection", "Sister Zone", "Edu Entertainment", "Eksplorasi Room"],
    },
    4: {
      image: "images/floor-plan-level-4.png",
      title: "Quiet reading, wellbeing, creative collections, and Iqra' Room",
      caption: "Level 4 offers focused reading and reflective spaces with Bibliotherapy Corner, Creative Collection, Open Access Collection, and the bookable Iqra' Room.",
      facilities: ["Reading Area", "Bibliotherapy Corner", "Creative Collection", "Open Access Collection", "Iqra' Room"],
    },
  };

  const seedState = () => ({
    rooms: PTTA_ROOMS.map((room) => ({ ...room })),
    users: [
      {
        id: "CI250058",
        name: "Nuraizat bin Mohd Azhar",
        email: "nuraizat@uthm.edu.my",
        password: "student123",
        role: "Student",
        status: "active",
      },
      {
        id: "CI250003",
        name: "Muhammad Syahmi bin Azhan",
        email: "syahmi@uthm.edu.my",
        password: "student123",
        role: "Student",
        status: "active",
      },
      {
        id: "CI250023",
        name: "Muhammad Ilham Hazim bin Rosdi",
        email: "ilham@uthm.edu.my",
        password: "student123",
        role: "Student",
        status: "active",
      },
      {
        id: "ADM001",
        name: "Library Staff",
        email: "library-admin@uthm.edu.my",
        role: "Administrator",
        status: "review",
      },
    ],
    bookings: [
      {
        id: "LB-LR1-0626",
        userId: "CI250058",
        roomId: "l3-lestari-room-1",
        date: "2026-06-10",
        start: "10:00",
        end: "12:00",
        purpose: "Group discussion",
        participants: 4,
        status: "confirmed",
        notes: "Prepare for presentation practice.",
        createdAt: "2026-06-01T08:30:00.000Z",
      },
      {
        id: "LB-HIK-0626",
        userId: "CI250003",
        roomId: "l2-hikmah-room",
        date: "2026-06-12",
        start: "14:00",
        end: "16:00",
        purpose: "Research meeting",
        participants: 5,
        status: "pending",
        notes: "",
        createdAt: "2026-06-02T06:20:00.000Z",
      },
      {
        id: "LB-EKS-0626",
        userId: "CI250023",
        roomId: "l3-eksplorasi-room",
        date: "2026-06-12",
        start: "15:00",
        end: "17:00",
        purpose: "Presentation practice",
        participants: 8,
        status: "conflict",
        notes: "Overlaps with a confirmed reservation.",
        createdAt: "2026-06-03T04:10:00.000Z",
      },
      {
        id: "LB-IQR-0526",
        userId: "CI250058",
        roomId: "l4-iqra-room",
        date: "2026-05-28",
        start: "09:00",
        end: "11:00",
        purpose: "Quiet study",
        participants: 2,
        status: "completed",
        notes: "",
        createdAt: "2026-05-20T01:00:00.000Z",
      },
      {
        id: "LB-MMR-0426",
        userId: "CI250003",
        roomId: "l1-multimedia-room",
        date: "2026-04-18",
        start: "11:00",
        end: "13:00",
        purpose: "Group discussion",
        participants: 6,
        status: "cancelled",
        notes: "Schedule changed.",
        createdAt: "2026-04-12T03:25:00.000Z",
      },
    ],
    notifications: [
      {
        id: "note-confirmed-lestari-room-1",
        bookingId: "LB-LR1-0626",
        title: "Lestari Room 1 approved",
        message: "Your booking for 10 June 2026 from 10:00 AM to 12:00 PM has been confirmed.",
        status: "confirmed",
        read: false,
        createdAt: "2026-06-01T08:31:00.000Z",
      },
      {
        id: "note-pending-hikmah-room",
        bookingId: "LB-HIK-0626",
        title: "Hikmah Room request",
        message: "Your request is waiting for administrator review.",
        status: "pending",
        read: false,
        createdAt: "2026-06-02T06:22:00.000Z",
      },
      {
        id: "note-conflict-eksplorasi-room",
        bookingId: "LB-EKS-0626",
        title: "Eksplorasi Room conflict",
        message: "The selected time overlaps with another reservation.",
        status: "conflict",
        read: true,
        createdAt: "2026-06-03T04:12:00.000Z",
      },
    ],
  });

  class DataStore {
    constructor() {
      this.state = this.load();
    }

    load() {
      const fallback = seedState();
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        const legacy = stored
          ? null
          : LEGACY_STORAGE_KEYS
              .map((key) => JSON.parse(localStorage.getItem(key)))
              .find(Boolean);
        const legacyUsers = Array.isArray(legacy?.users)
          ? legacy.users.filter((user) => !fallback.users.some((seedUser) => seedUser.id === user.id))
          : [];
        const legacyBookings = Array.isArray(legacy?.bookings)
          ? legacy.bookings.filter((booking) => fallback.rooms.some((room) => room.id === booking.roomId))
          : [];
        const migratedBookings = legacyBookings.length ? legacyBookings : fallback.bookings;
        const migratedBookingIds = new Set(migratedBookings.map((booking) => booking.id));
        const legacyNotifications = Array.isArray(legacy?.notifications)
          ? legacy.notifications.filter((notification) => migratedBookingIds.has(notification.bookingId))
          : [];
        const state = stored
          ? { ...fallback, ...stored }
          : {
              ...fallback,
              users: [...fallback.users, ...legacyUsers],
              bookings: migratedBookings,
              notifications: legacyNotifications.length ? legacyNotifications : fallback.notifications,
            };
        state.rooms = state.rooms.map((room) => ({
          ...room,
          status: room.status === "available" ? "available" : "closed",
        }));
        state.users = state.users.map((user) => ({
          ...user,
          password: user.password || (user.role === "Student" ? "student123" : ""),
        }));
        return state;
      } catch {
        return fallback;
      }
    }

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    all(collection) {
      return [...(this.state[collection] || [])];
    }

    find(collection, id) {
      return this.state[collection]?.find((record) => record.id === id);
    }

    create(collection, record) {
      const next = {
        ...record,
        id: record.id || this.nextId(collection),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.state[collection] = [...this.all(collection), next];
      this.save();
      return next;
    }

    update(collection, id, updates) {
      let updated;
      this.state[collection] = this.all(collection).map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      });
      this.save();
      return updated;
    }

    remove(collection, id) {
      const before = this.all(collection).length;
      this.state[collection] = this.all(collection).filter((record) => record.id !== id);
      this.save();
      return this.all(collection).length < before;
    }

    nextId(collection) {
      const prefix = {
        rooms: "room",
        users: "USR",
        bookings: "LB",
        notifications: "note",
      }[collection] || "item";
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    roomById(id) {
      return this.find("rooms", id);
    }

    userById(id) {
      return this.find("users", id);
    }

    bookingView(booking) {
      const room = this.roomById(booking.roomId);
      const user = this.userById(booking.userId);
      return {
        ...booking,
        roomName: room?.name || booking.roomId,
        roomCode: room?.code || booking.roomId,
        floor: room?.floor || "",
        zone: room?.zone || "",
        userName: user?.name || booking.userId,
      };
    }

    activeBookings() {
      return this.all("bookings").filter((booking) => !["cancelled", "completed"].includes(booking.status));
    }

    completedBookings() {
      return this.all("bookings").filter((booking) => ["cancelled", "completed"].includes(booking.status));
    }

    bookingConflict(candidate, ignoreId = "") {
      return this.activeBookings().find(
        (booking) =>
          booking.id !== ignoreId &&
          booking.roomId === candidate.roomId &&
          booking.date === candidate.date &&
          overlaps(candidate.start, candidate.end, booking.start, booking.end)
      );
    }

    createNotification({ bookingId, title, message, status = "confirmed" }) {
      return this.create("notifications", {
        bookingId,
        title,
        message,
        status,
        read: false,
      });
    }

    stats() {
      const bookings = this.all("bookings");
      const active = this.activeBookings();
      const statusCount = bookings.reduce((summary, booking) => {
        summary[booking.status] = (summary[booking.status] || 0) + 1;
        return summary;
      }, {});
      const usageByZone = bookings.reduce((summary, booking) => {
        const room = this.roomById(booking.roomId);
        const zone = room?.zone || "Unknown";
        summary[zone] = (summary[zone] || 0) + 1;
        return summary;
      }, {});
      return {
        totalBookings: bookings.length,
        activeBookings: active.length,
        completedBookings: this.completedBookings().length,
        rooms: this.all("rooms").length,
        users: this.all("users").length,
        notifications: this.all("notifications").filter((note) => !note.read).length,
        pending: bookings.filter((booking) => booking.status === "pending").length,
        conflicts: bookings.filter((booking) => booking.status === "conflict").length,
        confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
        cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
        statusCount,
        usageByZone,
      };
    }
  }

  const store = new DataStore();

  const notify = (message, type = "confirmed") => {
    let region = byId("toast-region");
    if (!region) {
      region = document.createElement("div");
      region.id = "toast-region";
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.append(region);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${statusClass(type)}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  };

  const clearFormErrors = (form) => {
    all(".field-error", form).forEach((error) => error.remove());
    all(".is-invalid", form).forEach((field) => field.classList.remove("is-invalid"));
  };

  const showFormErrors = (form, errors) => {
    clearFormErrors(form);
    errors.forEach(({ field, message }) => {
      const input = form.elements[field] || byId(field);
      if (!input) return;
      input.classList.add("is-invalid");
      const error = document.createElement("small");
      error.className = "field-error";
      error.textContent = message;
      input.insertAdjacentElement("afterend", error);
    });
    const firstField = form.querySelector(".is-invalid");
    firstField?.focus();
  };

  const matchesKeyword = (record, fields, keyword) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return true;
    return fields.some((field) => String(record[field] || "").toLowerCase().includes(normalized));
  };

  const sortByMode = (items, mode) => {
    const sorted = [...items];
    const byName = (a, b) => String(a.name || a.roomName || a.userName || "").localeCompare(String(b.name || b.roomName || b.userName || ""));
    const byDate = (a, b) => new Date(`${a.date || "1970-01-01"}T${a.start || "00:00"}`) - new Date(`${b.date || "1970-01-01"}T${b.start || "00:00"}`);
    if (mode === "name-desc") return sorted.sort((a, b) => byName(b, a));
    if (mode === "date-new") return sorted.sort((a, b) => byDate(b, a));
    if (mode === "date-old") return sorted.sort(byDate);
    if (mode === "capacity-high") return sorted.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    if (mode === "capacity-low") return sorted.sort((a, b) => Number(a.capacity || 0) - Number(b.capacity || 0));
    return sorted.sort(byName);
  };

  const buildToolbar = (target, options = {}) => {
    if (!target || target.previousElementSibling?.classList.contains("data-toolbar")) {
      return target?.previousElementSibling;
    }

    const toolbar = document.createElement("div");
    toolbar.className = "data-toolbar";
    if (!options.status) toolbar.classList.add("two-controls");
    toolbar.innerHTML = `
      <label>Search
        <input type="search" data-control="search" placeholder="${escapeHTML(options.search || "Search records")}">
      </label>
      ${
        options.status
          ? `<label>Status
              <select data-control="status">
                <option value="">All statuses</option>
                ${options.status.map((status) => `<option value="${escapeHTML(status)}">${escapeHTML(titleCase(status))}</option>`).join("")}
              </select>
            </label>`
          : ""
      }
      ${
        options.sort
          ? `<label>Sort
              <select data-control="sort">
                ${options.sort.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join("")}
              </select>
            </label>`
          : ""
      }
    `;
    target.parentElement.insertBefore(toolbar, target);
    return toolbar;
  };

  const toolbarValues = (toolbar) => ({
    search: toolbar?.querySelector('[data-control="search"]')?.value || "",
    status: toolbar?.querySelector('[data-control="status"]')?.value || "",
    sort: toolbar?.querySelector('[data-control="sort"]')?.value || "name-asc",
  });

  const bindToolbar = (toolbar, render) => {
    const debouncedRender = debounce(render);
    toolbar?.addEventListener("input", debouncedRender);
    toolbar?.addEventListener("change", render);
  };

  const emptyState = (message) => `<p class="empty-state">${escapeHTML(message)}</p>`;

  const initFloorPlanTabs = () => {
    all("[data-floor-plans]").forEach((floorPlans) => {
      const tabs = all("[data-floor-tab]", floorPlans);
      const image = floorPlans.querySelector("[data-floor-plan-image]");
      const caption = floorPlans.querySelector("[data-floor-plan-caption]");
      const label = floorPlans.querySelector("[data-floor-label]");
      const title = floorPlans.querySelector("[data-floor-title]");
      const facilities = floorPlans.querySelector("[data-floor-facilities]");
      const availabilityLink = floorPlans.querySelector("[data-floor-availability]");

      const selectFloor = (floor, updateFilter = true) => {
        const data = FLOOR_PLAN_DATA[floor];
        if (!data || !image) return;
        tabs.forEach((tab) => {
          const selected = tab.dataset.floorTab === String(floor);
          tab.classList.toggle("active", selected);
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
        });
        image.src = data.image;
        image.alt = `PTTA UTHM Level ${floor} floor plan`;
        if (caption) caption.textContent = data.caption;
        if (label) label.textContent = `Level ${floor} Facilities`;
        if (title) title.textContent = data.title;
        if (facilities) {
          facilities.innerHTML = data.facilities.map((facility) => `<li>${escapeHTML(facility)}</li>`).join("");
        }
        if (availabilityLink) {
          availabilityLink.href = `availability.html?floor=${floor}`;
          availabilityLink.textContent = `Check Level ${floor} Availability`;
        }

        const floorFilter = byId("floor");
        if (updateFilter && floorFilter && floorPlans.closest("main")) {
          floorFilter.value = String(floor);
          floorFilter.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };
      floorPlans.selectFloor = selectFloor;

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectFloor(tab.dataset.floorTab));
        tab.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let nextIndex = index;
          if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = tabs.length - 1;
          tabs[nextIndex].focus();
          selectFloor(tabs[nextIndex].dataset.floorTab);
        });
      });

      const queryFloor = Number(queryParams().get("floor"));
      const initialFloor = [1, 2, 3, 4].includes(queryFloor)
        ? queryFloor
        : Number(floorPlans.dataset.initialFloor || 1);
      selectFloor(initialFloor, false);
    });
  };

  const imageForRoom = (room) =>
    FLOOR_PLAN_DATA[Number(room?.floor)]?.image || FLOOR_PLAN_DATA[1].image;

  const slotStatusFor = (room, date, start, end) => {
    if (room.status !== "available") return "closed";
    const overlapsSlot = store
      .activeBookings()
      .filter(
        (booking) =>
          booking.roomId === room.id &&
          booking.date === date &&
          overlaps(start, end, booking.start, booking.end)
      );
    return overlapsSlot.length ? "closed" : "available";
  };

  const slotsForRoom = (room, date) =>
    generateTimeSlots().map(([start, end]) => ({
      start,
      end,
      status: slotStatusFor(room, date, start, end),
    }));

  const roomHasAvailableSlot = (room, date) =>
    slotsForRoom(room, date).some((slot) => slot.status === "available");

  const nextAvailableSlot = (room, date) =>
    slotsForRoom(room, date).find((slot) => slot.status === "available");

  const populateRoomSelect = (select, selectedRoomId = "") => {
    if (!select) return;
    const selected = selectedRoomId || select.value;
    select.innerHTML = store
      .all("rooms")
      .filter((room) => room.status === "available")
      .map((room) => `<option value="${escapeHTML(room.id)}">${escapeHTML(room.name)} (${escapeHTML(room.capacity)} users)</option>`)
      .join("");
    if (selected && store.roomById(selected)) select.value = selected;
  };

  const validateBooking = (booking, ignoreId = "") => {
    const errors = [];
    const bookingDate = booking.date ? new Date(`${booking.date}T00:00:00`) : null;
    const room = store.roomById(booking.roomId);

    if (!booking.roomId || !room) errors.push({ field: "room", message: "Choose a valid room." });
    if (!booking.date) errors.push({ field: "booking-date", message: "Choose a booking date." });
    if (bookingDate && bookingDate < today()) errors.push({ field: "booking-date", message: "Choose today or a future date." });
    if (!booking.start) errors.push({ field: "start-time", message: "Choose a start time." });
    if (!booking.end) errors.push({ field: "end-time", message: "Choose an end time." });
    if (booking.start && booking.end && minutesFromTime(booking.end) <= minutesFromTime(booking.start)) {
      errors.push({ field: "end-time", message: "End time must be later than start time." });
    }
    if (!Number.isInteger(booking.participants) || booking.participants < 1) {
      errors.push({ field: "participants", message: "Enter at least one participant." });
    }
    if (room && booking.participants > Number(room.capacity)) {
      errors.push({ field: "participants", message: `This room supports up to ${room.capacity} users.` });
    }
    if (room?.status !== "available") {
      errors.push({ field: "room", message: "This room is closed and cannot be booked." });
    }
    const duplicate = store.bookingConflict(booking, ignoreId);
    if (duplicate) {
      errors.push({
        field: "start-time",
        message: `This overlaps with ${duplicate.id}. Choose another time or room.`,
      });
    }
    return errors;
  };

  const bookingFromForm = (form, mode = "create") => ({
    roomId: form.elements[mode === "edit" ? "edit-room" : "room"]?.value || "",
    userId: window.AppAuth?.getSession().userId || "CI250058",
    date: form.elements[mode === "edit" ? "edit-date" : "booking-date"]?.value || "",
    start: form.elements[mode === "edit" ? "edit-start" : "start-time"]?.value || "",
    end: form.elements[mode === "edit" ? "edit-end" : "end-time"]?.value || "",
    participants: Number(form.elements[mode === "edit" ? "edit-participants" : "participants"]?.value || 0),
    purpose: form.elements.purpose?.value || "Group discussion",
    notes: form.elements.notes?.value || "",
  });

  const renderBookingRows = (bookings, options = {}) =>
    bookings
      .map((raw) => {
        const booking = store.bookingView(raw);
        const actions = options.actions
          ? `<td class="row-actions">
              ${options.actions(booking)}
            </td>`
          : "";
        return `
          <tr>
            <td>${escapeHTML(booking.id)}</td>
            ${options.showUser ? `<td>${escapeHTML(booking.userName)}</td>` : ""}
            <td>${escapeHTML(booking.roomName)}</td>
            <td>${escapeHTML(formatDate(booking.date))}${options.compactDate ? "" : `<br><span class="helper-text">${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</span>`}</td>
            <td>${statusBadge(booking.status)}</td>
            ${actions}
          </tr>
        `;
      })
      .join("");

  const renderAvailabilityPage = () => {
    const roomSection = document.querySelector('[aria-label="Available room list"]');
    if (!roomSection) return;

    const params = queryParams();
    const searchToolbar = buildToolbar(roomSection, {
      search: "Search by room, floor, or equipment",
      sort: [
        ["name-asc", "Name A-Z"],
        ["name-desc", "Name Z-A"],
        ["capacity-high", "Capacity high-low"],
        ["capacity-low", "Capacity low-high"],
      ],
    });
    const filterForm = document.querySelector('form[action="availability.html"]');
    const dateInput = byId("date");
    const floorInput = byId("floor");
    const selectedDate = isDateValue(params.get("date")) ? params.get("date") : localDateValue();
    const selectedFloor = ["1", "2", "3", "4"].includes(params.get("floor")) ? params.get("floor") : "1";
    if (dateInput) {
      dateInput.min = localDateValue();
      dateInput.value = selectedDate;
    }
    if (floorInput) floorInput.value = selectedFloor;

    const currentFilters = () => ({
      date: dateInput?.value || localDateValue(),
      floor: Number(floorInput?.value || 1),
    });

    const render = () => {
      const toolbar = toolbarValues(searchToolbar);
      const filters = currentFilters();
      const rooms = sortByMode(
        store
          .all("rooms")
          .filter((room) => matchesKeyword(room, ["name", "code", "zone", "floor", "type", "description", "equipment"], toolbar.search))
          .filter((room) => room.status === "available")
          .filter((room) => Number(room.floor) === filters.floor)
          .filter((room) => roomHasAvailableSlot(room, filters.date)),
        toolbar.sort
      );

      roomSection.innerHTML = rooms.length
        ? rooms
            .map(
              (room) => {
                const openSlot = nextAvailableSlot(room, filters.date);
                const detailsParameters = new URLSearchParams({
                  room: room.id,
                  date: filters.date,
                  floor: room.floor,
                });
                return `
                <article class="card">
                  <div class="room-image"><img src="${escapeHTML(imageForRoom(room))}" alt="PTTA Level ${escapeHTML(room.floor)} floor plan for ${escapeHTML(room.name)}"></div>
                  ${statusBadge("available")}
                  <h2>${escapeHTML(room.name)}</h2>
                  <ul class="room-meta">
                    <li><span>Floor</span><strong>Level ${escapeHTML(room.floor)}</strong></li>
                    <li><span>Capacity</span><strong>${escapeHTML(room.capacity)} users</strong></li>
                    <li><span>Next slot</span><strong>${escapeHTML(formatTime(openSlot.start))} - ${escapeHTML(formatTime(openSlot.end))}</strong></li>
                  </ul>
                  <div class="actions">
                    <a class="button small" href="room-details.html?${escapeHTML(detailsParameters.toString())}">View Details</a>
                  </div>
                </article>
              `;
              }
            )
            .join("")
        : emptyState(`No rooms on Level ${filters.floor} have an available time slot for ${formatDate(filters.date)}.`);
    };

    filterForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const filters = currentFilters();
      const nextParams = new URLSearchParams({ date: filters.date, floor: filters.floor });
      window.history.replaceState({}, "", `availability.html?${nextParams.toString()}`);
      render();
    });
    floorInput?.addEventListener("change", () => {
      const floor = Number(floorInput.value);
      const floorPlans = document.querySelector("[data-floor-plans]");
      if ([1, 2, 3, 4].includes(floor) && typeof floorPlans?.selectFloor === "function") {
        floorPlans.selectFloor(floor, false);
      }
      render();
    });
    bindToolbar(searchToolbar, render);

    render();
  };

  const renderRoomDetailsPage = () => {
    if (pageName() !== "room-details.html") return;
    const params = queryParams();
    const room = store.roomById(params.get("room")) || store.all("rooms")[0];
    const selectedDate = isDateValue(params.get("date")) ? params.get("date") : localDateValue();
    if (!room) return;
    const bookingDialog = byId("booking-dialog");
    const bookingForm = byId("room-details-booking-form");
    const bookingSuccess = byId("booking-success");

    document.querySelector(".page-title h1").textContent = room.name;
    const pageDescription = document.querySelector(".page-title .section > p:last-child");
    if (pageDescription) {
      pageDescription.textContent = `Availability for ${formatDate(selectedDate)}. Review room facilities and reservation slots before booking.`;
    }
    const roomImage = document.querySelector(".grid.two .panel img");
    if (roomImage) {
      roomImage.src = imageForRoom(room);
      roomImage.alt = `PTTA UTHM Level ${room.floor} floor plan showing ${room.name}`;
    }
    const infoPanel = all(".grid.two .panel")[1];
    const renderRoomInfo = () => {
      if (!infoPanel) return;
      const roomAvailability = roomHasAvailableSlot(room, selectedDate) ? "available" : "closed";
      infoPanel.innerHTML = `
        ${statusBadge(roomAvailability)}
        <h2>Room information</h2>
        <ul class="detail-list">
          <li><span>Room name</span><strong>${escapeHTML(room.name)}</strong></li>
          <li><span>Floor level</span><strong>Level ${escapeHTML(room.floor)}</strong></li>
          <li><span>Description</span><strong>${escapeHTML(room.description)}</strong></li>
          <li><span>Capacity</span><strong>${escapeHTML(room.capacity)} users</strong></li>
          <li><span>Availability</span><strong>${escapeHTML(titleCase(roomAvailability))}</strong></li>
          <li><span>Equipment</span><strong>${escapeHTML(room.equipment)}</strong></li>
        </ul>
        <div class="actions">
          <a class="button secondary" href="availability.html?date=${encodeURIComponent(selectedDate)}&floor=${encodeURIComponent(room.floor)}">Back to Availability</a>
        </div>
      `;
    };
    renderRoomInfo();

    const tbody = document.querySelector("tbody");
    if (!tbody) return;
    const caption = document.querySelector("table caption");
    if (caption) caption.textContent = `Time slots for ${room.name} on ${formatDate(selectedDate)}`;

    const renderSlots = () => {
      tbody.innerHTML = slotsForRoom(room, selectedDate)
        .map(
          ({ start, end, status }) => `
            <tr>
              <td>${escapeHTML(formatTime(start))} - ${escapeHTML(formatTime(end))}</td>
              <td>${statusBadge(status)}</td>
              <td>${
                status === "available"
                  ? `<button class="button small" type="button" data-select-slot data-start="${escapeHTML(start)}" data-end="${escapeHTML(end)}">Book</button>`
                  : `<span class="helper-text">Unavailable</span>`
              }</td>
            </tr>
          `
        )
        .join("");
    };

    const closeBookingDialog = () => {
      if (!bookingDialog) return;
      if (typeof bookingDialog.close === "function") bookingDialog.close();
      else bookingDialog.removeAttribute("open");
    };

    const openBookingDialog = (start, end) => {
      if (!bookingDialog || !bookingForm) return;
      if (slotStatusFor(room, selectedDate, start, end) !== "available") {
        notify("This time slot is closed. Choose another available slot.", "conflict");
        renderSlots();
        return;
      }

      clearFormErrors(bookingForm);
      bookingForm.reset();
      bookingForm.hidden = false;
      bookingSuccess.hidden = true;
      bookingSuccess.innerHTML = "";
      bookingForm.elements.room.value = room.id;
      bookingForm.elements["booking-date"].value = selectedDate;
      bookingForm.elements["start-time"].value = start;
      bookingForm.elements["end-time"].value = end;
      bookingForm.elements.participants.max = room.capacity;
      bookingForm.elements.participants.value = Math.min(4, room.capacity);
      byId("selected-room-name").textContent = room.name;
      byId("selected-booking-date").textContent = formatDate(selectedDate);
      byId("selected-booking-time").textContent = `${formatTime(start)} - ${formatTime(end)}`;
      byId("selected-room-capacity").textContent = `${room.capacity} users`;

      if (typeof bookingDialog.showModal === "function") bookingDialog.showModal();
      else bookingDialog.setAttribute("open", "");
      bookingForm.elements.participants.focus();
    };

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-slot]");
      if (!button) return;
      openBookingDialog(button.dataset.start, button.dataset.end);
    });

    all("[data-close-booking]").forEach((button) => button.addEventListener("click", closeBookingDialog));
    bookingDialog?.addEventListener("click", (event) => {
      if (event.target === bookingDialog) closeBookingDialog();
    });

    bookingForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = bookingFromForm(bookingForm);
      const errors = validateBooking(data);
      if (errors.length) {
        showFormErrors(bookingForm, errors);
        notify("This booking could not be saved. Choose an available slot and check the participant count.", "conflict");
        renderSlots();
        return;
      }

      const booking = store.create("bookings", { ...data, status: "confirmed" });
      store.createNotification({
        bookingId: booking.id,
        status: "confirmed",
        title: `${room.name} confirmed`,
        message: `Your booking for ${formatDate(booking.date)} from ${formatTime(booking.start)} to ${formatTime(booking.end)} is confirmed.`,
      });
      writeSession({ currentBookingId: booking.id, editingBookingId: "", cancelBookingId: "" });

      bookingForm.hidden = true;
      bookingSuccess.hidden = false;
      bookingSuccess.className = "alert confirmed";
      bookingSuccess.innerHTML = `
        ${statusBadge("confirmed")}
        <h3>Booking saved successfully</h3>
        <p><strong>${escapeHTML(room.name)}</strong><br>${escapeHTML(formatDate(booking.date))}, ${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</p>
        <p>Reservation ID: <strong>${escapeHTML(booking.id)}</strong></p>
        <div class="actions">
          <a class="button" href="dashboard.html">View Dashboard</a>
          <button class="button secondary" type="button" data-close-after-booking>Choose Another Slot</button>
        </div>
      `;
      bookingSuccess.querySelector("[data-close-after-booking]")?.addEventListener("click", closeBookingDialog);
      renderSlots();
      renderRoomInfo();
      notify("Booking saved successfully.", "confirmed");
    });

    renderSlots();
  };

  const initConfirmationPage = () => {
    if (pageName() !== "confirmation.html") return;
    const bookingId = readSession().currentBookingId || store.all("bookings").at(-1)?.id;
    const booking = store.bookingView(store.find("bookings", bookingId) || store.activeBookings()[0]);
    if (!booking) return;

    const title = document.querySelector(".page-title h1");
    if (title) title.textContent = booking.status === "confirmed" ? "Booking confirmed" : "Booking request saved";
    const alert = document.querySelector(".alert");
    if (alert) {
      alert.className = `alert ${statusClass(booking.status)}`;
      alert.innerHTML = `
        ${statusBadge(booking.status)}
        <h2>Reservation ID ${escapeHTML(booking.id)}</h2>
        <ul class="detail-list">
          <li><span>Room</span><strong>${escapeHTML(booking.roomName)}</strong></li>
          <li><span>Date</span><strong>${escapeHTML(formatDate(booking.date))}</strong></li>
          <li><span>Time</span><strong>${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</strong></li>
          <li><span>User</span><strong>${escapeHTML(booking.userName)}</strong></li>
        </ul>
        <div class="actions"><a class="button" href="dashboard.html">Go to Dashboard</a><a class="button secondary" href="availability.html">New Booking</a></div>
      `;
    }
  };

  const initDashboardPage = () => {
    if (pageName() !== "dashboard.html") return;
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    const userBookings = store.all("bookings").filter((booking) => booking.userId === userId);
    const activeBookings = userBookings.filter((booking) => !["cancelled", "completed"].includes(booking.status));
    const completedBookings = userBookings.filter((booking) => ["cancelled", "completed"].includes(booking.status));
    const unreadNotifications = store
      .all("notifications")
      .filter((note) => !note.read && store.find("bookings", note.bookingId)?.userId === userId).length;
    const pendingBookings = userBookings.filter((booking) => booking.status === "pending").length;
    const statNumbers = all(".card.stat strong");
    const values = [activeBookings.length, completedBookings.length, unreadNotifications, pendingBookings];
    statNumbers.forEach((node, index) => {
      node.textContent = values[index] ?? node.textContent;
    });

    const next = sortByMode(activeBookings.map((booking) => store.bookingView(booking)), "date-old")[0];
    const panels = all(".section.grid.two.compact .panel");
    if (next && panels[0]) {
      panels[0].innerHTML = `
        ${statusBadge(next.status)}
        <h2>Next reservation</h2>
        <ul class="detail-list">
          <li><span>Room</span><strong>${escapeHTML(next.roomName)}</strong></li>
          <li><span>Date</span><strong>${escapeHTML(formatDate(next.date))}</strong></li>
          <li><span>Time</span><strong>${escapeHTML(formatTime(next.start))} - ${escapeHTML(formatTime(next.end))}</strong></li>
        </ul>
        <div class="actions"><a class="button small" href="manage-bookings.html">Manage Booking</a><a class="button small secondary" href="notifications.html">Notifications</a></div>
      `;
    }

    const tbody = document.querySelector("tbody");
    if (tbody) {
      const active = sortByMode(activeBookings.map((booking) => store.bookingView(booking)), "date-old");
      tbody.innerHTML = active.length
        ? active
            .map(
              (booking) => `
                <tr>
                  <td>${escapeHTML(booking.id)}</td>
                  <td>${escapeHTML(booking.roomName)}</td>
                  <td>${escapeHTML(formatDate(booking.date))}</td>
                  <td>${statusBadge(booking.status)}</td>
                  <td><a class="button small" href="manage-bookings.html">Manage</a></td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="5">${emptyState("No active bookings yet.")}</td></tr>`;
    }
  };

  const initHistoryPage = () => {
    if (pageName() !== "history.html") return;
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    if (!tableWrap || !tbody) return;
    const toolbar = buildToolbar(tableWrap, {
      search: "Search reservation, room, or purpose",
      status: ["completed", "cancelled", "confirmed", "pending", "conflict"],
      sort: [
        ["date-new", "Newest first"],
        ["date-old", "Oldest first"],
        ["name-asc", "Room A-Z"],
        ["name-desc", "Room Z-A"],
      ],
    });
    const render = () => {
      const values = toolbarValues(toolbar);
      const rows = sortByMode(
        store
          .all("bookings")
          .filter((booking) => booking.userId === userId)
          .map((booking) => store.bookingView(booking))
          .filter((booking) => matchesKeyword(booking, ["id", "roomName", "purpose", "status"], values.search))
          .filter((booking) => !values.status || booking.status === values.status),
        values.sort
      );
      tbody.innerHTML = rows.length
        ? rows
            .map(
              (booking) => `
                <tr>
                  <td>${escapeHTML(booking.id)}</td>
                  <td>${escapeHTML(booking.roomName)}</td>
                  <td>${escapeHTML(formatDate(booking.date))}</td>
                  <td>${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</td>
                  <td>${statusBadge(booking.status)}</td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="5">${emptyState("No booking history matches your search.")}</td></tr>`;
    };
    bindToolbar(toolbar, render);
    render();
  };

  const initNotificationsPage = () => {
    if (pageName() !== "notifications.html") return;
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    const grid = document.querySelector(".section.grid.three");
    if (!grid) return;
    const toolbar = buildToolbar(grid, {
      search: "Search notifications",
      status: ["confirmed", "pending", "conflict"],
      sort: [
        ["date-new", "Newest first"],
        ["date-old", "Oldest first"],
        ["name-asc", "Title A-Z"],
      ],
    });

    const render = () => {
      const values = toolbarValues(toolbar);
      const notes = sortByMode(
        store
          .all("notifications")
          .filter((note) => store.find("bookings", note.bookingId)?.userId === userId)
          .filter((note) => matchesKeyword(note, ["title", "message", "status"], values.search))
          .filter((note) => !values.status || note.status === values.status)
          .map((note) => ({ ...note, name: note.title, date: note.createdAt?.slice(0, 10) })),
        values.sort
      );
      grid.innerHTML = notes.length
        ? notes
            .map(
              (note) => `
                <article class="alert ${statusClass(note.status)}">
                  ${statusBadge(note.status)}
                  <h2>${escapeHTML(note.title)}</h2>
                  <p>${escapeHTML(note.message)}</p>
                  <div class="actions">
                    <button class="button small secondary" type="button" data-action="toggle-note" data-id="${escapeHTML(note.id)}">${note.read ? "Mark Unread" : "Mark Read"}</button>
                    <button class="button small warning" type="button" data-action="delete-note" data-id="${escapeHTML(note.id)}">Delete</button>
                  </div>
                </article>
              `
            )
            .join("")
        : emptyState("No notifications match your filters.");
    };

    grid.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]");
      if (!action) return;
      const id = action.dataset.id;
      if (action.dataset.action === "toggle-note") {
        const note = store.find("notifications", id);
        store.update("notifications", id, { read: !note.read });
        notify("Notification updated.");
      }
      if (action.dataset.action === "delete-note" && window.confirm("Delete this notification?")) {
        store.remove("notifications", id);
        notify("Notification deleted.", "conflict");
      }
      render();
    });

    bindToolbar(toolbar, render);
    render();
  };

  const initManageBookingsPage = () => {
    if (pageName() !== "manage-bookings.html") return;
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    if (!tableWrap || !tbody) return;
    const toolbar = buildToolbar(tableWrap, {
      search: "Search active bookings",
      status: ["confirmed", "pending", "conflict"],
      sort: [
        ["date-old", "Oldest first"],
        ["date-new", "Newest first"],
        ["name-asc", "Room A-Z"],
      ],
    });

    const render = () => {
      const values = toolbarValues(toolbar);
      const bookings = sortByMode(
        store
          .activeBookings()
          .filter((booking) => booking.userId === userId)
          .map((booking) => store.bookingView(booking))
          .filter((booking) => matchesKeyword(booking, ["id", "roomName", "purpose", "status"], values.search))
          .filter((booking) => !values.status || booking.status === values.status),
        values.sort
      );
      tbody.innerHTML = bookings.length
        ? bookings
            .map(
              (booking) => `
                <tr>
                  <td>${escapeHTML(booking.id)}</td>
                  <td>${escapeHTML(booking.roomName)}</td>
                  <td>${escapeHTML(formatDate(booking.date))}, ${escapeHTML(formatTime(booking.start))}</td>
                  <td>${statusBadge(booking.status)}</td>
                  <td class="row-actions">
                    <button class="button small" type="button" data-action="edit-booking" data-id="${escapeHTML(booking.id)}">Edit</button>
                    <button class="button small warning" type="button" data-action="cancel-booking" data-id="${escapeHTML(booking.id)}">Cancel</button>
                    <button class="button small ghost" type="button" data-action="delete-booking" data-id="${escapeHTML(booking.id)}">Delete</button>
                  </td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="5">${emptyState("No active bookings found.")}</td></tr>`;
    };

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const id = button.dataset.id;
      if (button.dataset.action === "edit-booking") {
        writeSession({ editingBookingId: id });
        window.location.href = `edit-booking.html?id=${encodeURIComponent(id)}`;
      }
      if (button.dataset.action === "cancel-booking") {
        writeSession({ cancelBookingId: id });
        window.location.href = `cancel-booking.html?id=${encodeURIComponent(id)}`;
      }
      if (button.dataset.action === "delete-booking" && window.confirm("Delete this booking permanently?")) {
        store.remove("bookings", id);
        store.createNotification({
          bookingId: id,
          status: "conflict",
          title: "Booking deleted",
          message: `${id} was removed from the booking records.`,
        });
        notify("Booking deleted.", "conflict");
        render();
      }
    });

    bindToolbar(toolbar, render);
    render();
  };

  const initEditBookingPage = () => {
    if (pageName() !== "edit-booking.html") return;
    const form = document.querySelector('form[action="confirmation.html"]');
    if (!form) return;
    const bookingId = queryParams().get("id") || readSession().editingBookingId || store.activeBookings()[0]?.id;
    const booking = store.find("bookings", bookingId);
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    if (!booking || booking.userId !== userId) {
      window.location.replace("dashboard.html");
      return;
    }
    populateRoomSelect(form.elements["edit-room"], booking.roomId);
    form.elements["edit-date"].value = booking.date;
    form.elements["edit-participants"].value = booking.participants;
    form.elements["edit-start"].value = booking.start;
    form.elements["edit-end"].value = booking.end;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = bookingFromForm(form, "edit");
      const errors = validateBooking(data, booking.id).map((error) => ({
        ...error,
        field:
          {
            room: "edit-room",
            "booking-date": "edit-date",
            "start-time": "edit-start",
            "end-time": "edit-end",
            participants: "edit-participants",
          }[error.field] || error.field,
      }));
      if (errors.length) {
        showFormErrors(form, errors);
        notify("Please fix the edit form errors.", "conflict");
        return;
      }

      const updated = store.update("bookings", booking.id, { ...data, status: "pending" });
      store.createNotification({
        bookingId: booking.id,
        status: "pending",
        title: "Booking changes submitted",
        message: `${booking.id} has been updated and is pending review.`,
      });
      writeSession({ currentBookingId: updated.id, editingBookingId: "" });
      notify("Booking updated.", "pending");
      window.location.href = "confirmation.html";
    });
  };

  const initCancelBookingPage = () => {
    if (pageName() !== "cancel-booking.html") return;
    const form = document.querySelector('form[action="notifications.html"]');
    const bookingId = queryParams().get("id") || readSession().cancelBookingId || store.activeBookings()[0]?.id;
    const booking = store.bookingView(store.find("bookings", bookingId));
    const userId = window.AppAuth?.getSession().userId || "CI250058";
    if (!form || !booking || booking.userId !== userId) {
      window.location.replace("dashboard.html");
      return;
    }

    const summary = document.querySelector(".detail-list");
    if (summary) {
      summary.innerHTML = `
        <li><span>Room</span><strong>${escapeHTML(booking.roomName)}</strong></li>
        <li><span>Date</span><strong>${escapeHTML(formatDate(booking.date))}</strong></li>
        <li><span>Time</span><strong>${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</strong></li>
      `;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!window.confirm(`Cancel reservation ${booking.id}?`)) return;
      const reason = form.elements.reason.value;
      const note = form.elements["cancel-note"].value;
      store.update("bookings", booking.id, { status: "cancelled", cancellationReason: reason, cancellationNote: note });
      store.createNotification({
        bookingId: booking.id,
        status: "conflict",
        title: "Booking cancelled",
        message: `${booking.id} was cancelled. Reason: ${reason}.`,
      });
      notify("Booking cancelled.", "conflict");
      window.location.href = "notifications.html";
    });
  };

  const initAdminDashboard = () => {
    if (pageName() !== "admin-dashboard.html") return;
    const stats = store.stats();
    const statNumbers = all(".card.stat strong");
    [stats.totalBookings, stats.rooms, stats.pending, stats.conflicts].forEach((value, index) => {
      if (statNumbers[index]) statNumbers[index].textContent = value;
    });
    renderUsageChart(document.querySelector(".chart"));
  };

  const roomMatches = (room, values) =>
    matchesKeyword(room, ["name", "code", "zone", "floor", "type", "description", "equipment", "status"], values.search) &&
    (!values.status || room.status === values.status);

  const initAdminRoomsPage = () => {
    if (pageName() !== "admin-rooms.html") return;
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    const form = document.querySelector('form[action="admin-rooms.html"]');
    if (!tableWrap || !tbody || !form) return;
    const headerRow = tableWrap.querySelector("thead tr");
    if (headerRow) {
      headerRow.innerHTML = "<th>Room</th><th>Floor</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th>";
    }

    if (!byId("room-name")) {
      form.insertAdjacentHTML(
        "afterbegin",
        `
          <label for="room-name">Room name<input id="room-name" name="room-name" type="text" required></label>
          <label for="room-floor">Floor level
            <select id="room-floor" name="room-floor" required>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
          </label>
          <label for="room-description">Description<textarea id="room-description" name="room-description" required></textarea></label>
          <label for="room-equipment">Equipment<textarea id="room-equipment" name="room-equipment" required></textarea></label>
        `
      );
    }

    const toolbar = buildToolbar(tableWrap, {
      search: "Search rooms",
      status: ["available", "closed"],
      sort: [
        ["name-asc", "Name A-Z"],
        ["name-desc", "Name Z-A"],
        ["capacity-high", "Capacity high-low"],
      ],
    });
    let editingId = "";

    const render = () => {
      const values = toolbarValues(toolbar);
      const rooms = sortByMode(store.all("rooms").filter((room) => roomMatches(room, values)), values.sort);
      tbody.innerHTML = rooms.length
        ? rooms
            .map(
              (room) => `
                <tr>
                  <td><strong>${escapeHTML(room.name)}</strong><br><span class="helper-text">${escapeHTML(room.code)}</span></td>
                  <td>Level ${escapeHTML(room.floor)}</td>
                  <td>${escapeHTML(room.type)}</td>
                  <td>${escapeHTML(room.capacity)}</td>
                  <td>${statusBadge(room.status)}</td>
                  <td class="row-actions">
                    <button class="button small" type="button" data-action="edit-room" data-id="${escapeHTML(room.id)}">Edit</button>
                    <button class="button small warning" type="button" data-action="delete-room" data-id="${escapeHTML(room.id)}">Delete</button>
                  </td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="6">${emptyState("No rooms match your filters.")}</td></tr>`;
    };

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const room = store.roomById(button.dataset.id);
      if (!room) return;
      if (button.dataset.action === "edit-room") {
        editingId = room.id;
        form.elements["room-name"].value = room.name;
        form.elements["room-code"].value = room.code;
        form.elements["room-floor"].value = room.floor;
        form.elements["room-type"].value = room.type;
        form.elements["room-capacity"].value = room.capacity;
        form.elements["room-status"].value = titleCase(room.status);
        form.elements["room-description"].value = room.description;
        form.elements["room-equipment"].value = room.equipment;
        notify("Room loaded for editing.");
      }
      if (button.dataset.action === "delete-room" && window.confirm(`Delete ${room.name}?`)) {
        store.remove("rooms", room.id);
        notify("Room deleted.", "conflict");
        render();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const room = {
        name: form.elements["room-name"].value.trim(),
        code: form.elements["room-code"].value.trim().toUpperCase(),
        floor: Number(form.elements["room-floor"].value),
        zone: `Level ${form.elements["room-floor"].value}`,
        type: form.elements["room-type"].value.trim(),
        capacity: Number(form.elements["room-capacity"].value),
        status: form.elements["room-status"].value.toLowerCase().replaceAll(" ", "-"),
        description: form.elements["room-description"].value.trim(),
        equipment: form.elements["room-equipment"].value.trim(),
      };
      const errors = [];
      if (!room.name) errors.push({ field: "room-name", message: "Room name is required." });
      if (!room.code) errors.push({ field: "room-code", message: "Room code is required." });
      if (![1, 2, 3, 4].includes(room.floor)) errors.push({ field: "room-floor", message: "Choose a valid PTTA floor." });
      if (!room.type) errors.push({ field: "room-type", message: "Room type is required." });
      if (!room.description) errors.push({ field: "room-description", message: "Room description is required." });
      if (!Number.isInteger(room.capacity) || room.capacity < 1) errors.push({ field: "room-capacity", message: "Capacity must be at least 1." });
      const duplicate = store.all("rooms").find((item) => item.code === room.code && item.id !== editingId);
      if (duplicate) errors.push({ field: "room-code", message: "A room with this code already exists." });
      if (errors.length) {
        showFormErrors(form, errors);
        notify("Please fix the room form errors.", "conflict");
        return;
      }
      editingId ? store.update("rooms", editingId, room) : store.create("rooms", { ...room, id: `room-${room.code.toLowerCase().replaceAll(" ", "-")}` });
      clearFormErrors(form);
      form.reset();
      editingId = "";
      notify("Room saved successfully.");
      render();
    });

    bindToolbar(toolbar, render);
    render();
  };

  const initAdminBookingsPage = () => {
    if (pageName() !== "admin-bookings.html") return;
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    if (!tableWrap || !tbody) return;
    const toolbar = buildToolbar(tableWrap, {
      search: "Search ID, user, room, or status",
      status: ["confirmed", "pending", "conflict", "cancelled", "completed"],
      sort: [
        ["date-new", "Newest first"],
        ["date-old", "Oldest first"],
        ["name-asc", "Room A-Z"],
      ],
    });

    const render = () => {
      const values = toolbarValues(toolbar);
      const bookings = sortByMode(
        store
          .all("bookings")
          .map((booking) => store.bookingView(booking))
          .filter((booking) => matchesKeyword(booking, ["id", "userName", "roomName", "status", "purpose"], values.search))
          .filter((booking) => !values.status || booking.status === values.status),
        values.sort
      );
      tbody.innerHTML = bookings.length
        ? bookings
            .map(
              (booking) => `
                <tr>
                  <td>${escapeHTML(booking.id)}</td>
                  <td>${escapeHTML(booking.userName)}</td>
                  <td>${escapeHTML(booking.roomName)}</td>
                  <td>${escapeHTML(formatDate(booking.date))}</td>
                  <td>${statusBadge(booking.status)}</td>
                  <td class="row-actions">
                    <select data-action="booking-status" data-id="${escapeHTML(booking.id)}" aria-label="Status for ${escapeHTML(booking.id)}">
                      ${["confirmed", "pending", "conflict", "cancelled", "completed"]
                        .map((status) => `<option value="${status}" ${booking.status === status ? "selected" : ""}>${titleCase(status)}</option>`)
                        .join("")}
                    </select>
                    <button class="button small warning" type="button" data-action="delete-booking" data-id="${escapeHTML(booking.id)}">Delete</button>
                  </td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="6">${emptyState("No bookings match your filters.")}</td></tr>`;
    };

    tbody.addEventListener("change", (event) => {
      const select = event.target.closest('[data-action="booking-status"]');
      if (!select) return;
      const booking = store.update("bookings", select.dataset.id, { status: select.value });
      store.createNotification({
        bookingId: booking.id,
        status: booking.status,
        title: `Booking ${booking.status}`,
        message: `${booking.id} is now ${booking.status}.`,
      });
      notify("Booking status updated.", booking.status);
      render();
    });

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="delete-booking"]');
      if (!button || !window.confirm("Delete this booking permanently?")) return;
      store.remove("bookings", button.dataset.id);
      notify("Booking deleted.", "conflict");
      render();
    });

    bindToolbar(toolbar, render);
    render();
  };

  const initAdminUsersPage = () => {
    if (pageName() !== "admin-users.html") return;
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    const form = document.querySelector('form[action="admin-users.html"]');
    if (!tableWrap || !tbody || !form) return;
    const headerRow = tableWrap.querySelector("thead tr");
    if (headerRow) {
      headerRow.innerHTML = "<th>Name</th><th>ID</th><th>Role</th><th>Status</th><th>Actions</th>";
    }

    if (!byId("user-name")) {
      form.insertAdjacentHTML(
        "afterbegin",
        `
          <label for="user-name">Full name<input id="user-name" name="user-name" type="text" required></label>
          <label for="user-email">Email<input id="user-email" name="user-email" type="email" required></label>
          <label for="user-status">Status<select id="user-status" name="user-status"><option>Active</option><option>Review</option><option>Suspended</option></select></label>
        `
      );
    }

    const toolbar = buildToolbar(tableWrap, {
      search: "Search users",
      status: ["active", "review", "suspended"],
      sort: [
        ["name-asc", "Name A-Z"],
        ["name-desc", "Name Z-A"],
      ],
    });
    let editingId = "";

    const render = () => {
      const values = toolbarValues(toolbar);
      const users = sortByMode(
        store
          .all("users")
          .filter((user) => matchesKeyword(user, ["name", "id", "email", "role", "status"], values.search))
          .filter((user) => !values.status || user.status === values.status),
        values.sort
      );
      tbody.innerHTML = users.length
        ? users
            .map(
              (user) => `
                <tr>
                  <td>${escapeHTML(user.name)}</td>
                  <td>${escapeHTML(user.id)}</td>
                  <td>${escapeHTML(user.role)}</td>
                  <td>${statusBadge(user.status)}</td>
                  <td class="row-actions">
                    <button class="button small" type="button" data-action="edit-user" data-id="${escapeHTML(user.id)}">Edit</button>
                    <button class="button small warning" type="button" data-action="delete-user" data-id="${escapeHTML(user.id)}">Delete</button>
                  </td>
                </tr>
              `
            )
            .join("")
        : `<tr><td colspan="5">${emptyState("No users match your filters.")}</td></tr>`;
    };

    tbody.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const user = store.userById(button.dataset.id);
      if (!user) return;
      if (button.dataset.action === "edit-user") {
        editingId = user.id;
        form.elements["user-name"].value = user.name;
        form.elements["user-email"].value = user.email;
        form.elements["user-id"].value = user.id;
        form.elements.role.value = user.role;
        form.elements["user-status"].value = titleCase(user.status);
        notify("User loaded for editing.");
      }
      if (button.dataset.action === "delete-user" && window.confirm(`Delete user ${user.name}?`)) {
        store.remove("users", user.id);
        notify("User deleted.", "conflict");
        render();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = {
        id: form.elements["user-id"].value.trim().toUpperCase(),
        name: form.elements["user-name"].value.trim(),
        email: form.elements["user-email"].value.trim(),
        role: form.elements.role.value,
        status: form.elements["user-status"].value.toLowerCase(),
      };
      const errors = [];
      if (!user.name) errors.push({ field: "user-name", message: "Full name is required." });
      if (!user.id) errors.push({ field: "user-id", message: "User ID is required." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) errors.push({ field: "user-email", message: "Enter a valid email address." });
      const duplicate = store.all("users").find((item) => item.id === user.id && item.id !== editingId);
      if (duplicate) errors.push({ field: "user-id", message: "A user with this ID already exists." });
      if (errors.length) {
        showFormErrors(form, errors);
        notify("Please fix the user form errors.", "conflict");
        return;
      }
      editingId ? store.update("users", editingId, user) : store.create("users", user);
      clearFormErrors(form);
      form.reset();
      editingId = "";
      notify("User saved successfully.");
      render();
    });

    bindToolbar(toolbar, render);
    render();
  };

  const renderUsageChart = (chart) => {
    if (!chart) return;
    const usage = store.stats().usageByZone;
    const entries = Object.entries(usage);
    const max = Math.max(...entries.map(([, count]) => count), 1);
    chart.innerHTML = entries
      .map(([zone, count], index) => {
        const percent = Math.round((count / max) * 100);
        const color = ["green", "yellow", "coral", ""][index % 4];
        return `
          <div class="bar-row">
            <span>${escapeHTML(zone)}</span>
            <div class="bar-track"><div class="bar ${color}" style="width: ${percent}%"></div></div>
            <strong>${escapeHTML(count)}</strong>
          </div>
        `;
      })
      .join("");
  };

  const initReportsPage = () => {
    if (pageName() !== "admin-reports.html") return;
    renderUsageChart(document.querySelector(".chart"));
    const stats = store.stats();
    const list = document.querySelector(".detail-list");
    if (list) {
      list.innerHTML = `
        <li><span>Confirmed</span><strong>${escapeHTML(stats.confirmed)} bookings</strong></li>
        <li><span>Pending</span><strong>${escapeHTML(stats.pending)} requests</strong></li>
        <li><span>Conflicts</span><strong>${escapeHTML(stats.conflicts)} detected</strong></li>
        <li><span>Cancellations</span><strong>${escapeHTML(stats.cancelled)} records</strong></li>
      `;
    }
  };

  const initLoginPage = () => {
    if (pageName() !== "login.html") return;
    const loginForm = byId("login-form");
    if (!loginForm) return;

    const params = queryParams();
    if (params.get("registered") === "1") {
      const feedback = byId("login-feedback");
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = "Account created successfully. Log in with your new credentials.";
      }
      if (params.get("matric")) loginForm.elements["login-id"].value = params.get("matric").toUpperCase();
    }

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const userId = loginForm.elements["login-id"].value.trim().toUpperCase();
      const password = loginForm.elements["login-password"].value.trim();
      const user = store.userById(userId);
      const errors = [];
      if (!userId) errors.push({ field: "login-id", message: "Enter your matric or staff ID." });
      if (!password) errors.push({ field: "login-password", message: "Enter your password." });
      if (!user) errors.push({ field: "login-id", message: "No account exists for this ID." });
      if (user?.role === "Administrator") {
        errors.push({ field: "login-id", message: "Use the dedicated administrator login page." });
      }
      if (user?.role === "Student" && user.password !== password) {
        errors.push({ field: "login-password", message: "Incorrect password." });
      }
      if (errors.length) {
        showFormErrors(loginForm, errors);
        notify("Please fix the login form errors.", "conflict");
        return;
      }
      window.AppAuth.login("student", user.id);
      writeSession({ currentUserId: user.id });
      notify("Login successful.");
      window.location.href = "dashboard.html";
    });
  };

  const initRegisterPage = () => {
    if (pageName() !== "register.html") return;
    const registerForm = byId("register-form");
    if (!registerForm) return;

    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = {
        id: registerForm.elements.matric.value.trim().toUpperCase(),
        name: registerForm.elements["full-name"].value.trim(),
        email: registerForm.elements.email.value.trim(),
        password: registerForm.elements["new-password"].value,
        role: "Student",
        status: "active",
      };
      const errors = [];
      if (!user.name) errors.push({ field: "full-name", message: "Full name is required." });
      if (!user.id) errors.push({ field: "matric", message: "Matric number is required." });
      if (store.userById(user.id)) errors.push({ field: "matric", message: "This matric number is already registered." });
      if (!/^[^\s@]+@[^\s@]*uthm\.edu\.my$/i.test(user.email)) {
        errors.push({ field: "email", message: "Enter a valid UTHM email address." });
      }
      if (user.password.length < 6) errors.push({ field: "new-password", message: "Password must be at least 6 characters." });
      if (registerForm.elements["new-password"].value !== registerForm.elements["confirm-password"].value) {
        errors.push({ field: "confirm-password", message: "Passwords must match." });
      }
      if (errors.length) {
        showFormErrors(registerForm, errors);
        notify("Please fix the registration form errors.", "conflict");
        return;
      }
      store.create("users", user);
      window.location.href = `login.html?registered=1&matric=${encodeURIComponent(user.id)}`;
    });
  };

  const initProfilePage = () => {
    if (pageName() !== "profile.html") return;
    const userId = window.AppAuth?.getSession().userId || "";
    const user = store.userById(userId);
    const panel = byId("profile-summary");
    if (!user || !panel) return;
    const bookingCount = store.all("bookings").filter((booking) => booking.userId === user.id).length;
    panel.innerHTML = `
      <h2>Profile details</h2>
      <ul class="detail-list">
        <li><span>Full name</span><strong>${escapeHTML(user.name)}</strong></li>
        <li><span>Matric number</span><strong>${escapeHTML(user.id)}</strong></li>
        <li><span>Email</span><strong>${escapeHTML(user.email)}</strong></li>
        <li><span>Role</span><strong>${escapeHTML(user.role)}</strong></li>
        <li><span>Total bookings</span><strong>${escapeHTML(bookingCount)}</strong></li>
      </ul>
      <div class="actions">
        <a class="button" href="dashboard.html">Dashboard</a>
        <a class="button secondary" href="history.html">Booking History</a>
      </div>
    `;
  };

  document.addEventListener("DOMContentLoaded", () => {
    initFloorPlanTabs();
    renderAvailabilityPage();
    renderRoomDetailsPage();
    initConfirmationPage();
    initDashboardPage();
    initHistoryPage();
    initNotificationsPage();
    initManageBookingsPage();
    initEditBookingPage();
    initCancelBookingPage();
    initAdminDashboard();
    initAdminRoomsPage();
    initAdminBookingsPage();
    initAdminUsersPage();
    initReportsPage();
    initLoginPage();
    initRegisterPage();
    initProfilePage();
  });

  window.LibraryBookingApp = {
    store,
    resetDemoData() {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    },
  };
})();
