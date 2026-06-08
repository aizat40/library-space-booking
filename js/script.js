(() => {
  "use strict";

  const STORAGE_KEY = "tta-library-booking-state-v1";
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

  const seedState = () => ({
    rooms: [
      {
        id: "room-a204",
        code: "A-204",
        name: "Discussion Room A-204",
        zone: "Discussion Zone A",
        type: "Discussion",
        capacity: 8,
        status: "available",
        equipment: "Display, whiteboard, power outlets",
      },
      {
        id: "room-b112",
        code: "B-112",
        name: "Learning Space B-112",
        zone: "Learning Space B",
        type: "Learning Space",
        capacity: 6,
        status: "pending",
        equipment: "Whiteboard, discussion table, power outlets",
      },
      {
        id: "room-c301",
        code: "C-301",
        name: "Media Room C-301",
        zone: "Media Room C",
        type: "Media Room",
        capacity: 10,
        status: "conflict",
        equipment: "Display wall, audio system, presentation table",
      },
      {
        id: "room-d018",
        code: "D-018",
        name: "Room D-018",
        zone: "Quiet Study Area",
        type: "Quiet Study",
        capacity: 4,
        status: "available",
        equipment: "Individual desks, power outlets",
      },
    ],
    users: [
      {
        id: "CI250058",
        name: "Nuraizat bin Mohd Azhar",
        email: "nuraizat@siswa.uthm.edu.my",
        password: "student123",
        role: "Student",
        status: "active",
      },
      {
        id: "CI250003",
        name: "Muhammad Syahmi bin Azhan",
        email: "syahmi@siswa.uthm.edu.my",
        password: "student123",
        role: "Student",
        status: "active",
      },
      {
        id: "CI250023",
        name: "Muhammad Ilham Hazim bin Rosdi",
        email: "ilham@siswa.uthm.edu.my",
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
        id: "LB-204-0626",
        userId: "CI250058",
        roomId: "room-a204",
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
        id: "LB-112-0626",
        userId: "CI250003",
        roomId: "room-b112",
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
        id: "LB-301-0626",
        userId: "CI250023",
        roomId: "room-c301",
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
        id: "LB-086-0526",
        userId: "CI250058",
        roomId: "room-d018",
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
        id: "LB-052-0426",
        userId: "CI250003",
        roomId: "room-b112",
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
        id: "note-confirmed-a204",
        bookingId: "LB-204-0626",
        title: "Room A-204 approved",
        message: "Your booking for 10 June 2026 from 10:00 AM to 12:00 PM has been confirmed.",
        status: "confirmed",
        read: false,
        createdAt: "2026-06-01T08:31:00.000Z",
      },
      {
        id: "note-pending-b112",
        bookingId: "LB-112-0626",
        title: "Room B-112 request",
        message: "Your request is waiting for administrator review.",
        status: "pending",
        read: false,
        createdAt: "2026-06-02T06:22:00.000Z",
      },
      {
        id: "note-conflict-c301",
        bookingId: "LB-301-0626",
        title: "Media Room C-301 conflict",
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
        const state = stored ? { ...fallback, ...stored } : fallback;
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

  const imageForRoom = (room) => {
    const type = String(room.type || "").toLowerCase();
    if (type.includes("media")) return "images/room-media.svg";
    if (type.includes("study") || type.includes("learning")) return "images/room-study.svg";
    return "images/room-discussion.svg";
  };

  const availabilityFor = (room, filters = {}) => {
    if (!filters.date || !filters.start || !filters.end) return room.status;
    const conflict = store.bookingConflict({
      roomId: room.id,
      date: filters.date,
      start: filters.start,
      end: filters.end,
    });
    return conflict ? conflict.status : room.status === "closed" ? "closed" : "available";
  };

  const slotStatusFor = (room, date, start, end) => {
    if (room.status === "closed") return "conflict";
    const overlapsSlot = store
      .activeBookings()
      .filter(
        (booking) =>
          booking.roomId === room.id &&
          booking.date === date &&
          overlaps(start, end, booking.start, booking.end)
      );
    if (overlapsSlot.some((booking) => booking.status === "conflict")) return "conflict";
    if (overlapsSlot.length) return "booked";
    return "available";
  };

  const populateRoomSelect = (select, selectedRoomId = "") => {
    if (!select) return;
    const selected = selectedRoomId || select.value;
    select.innerHTML = store
      .all("rooms")
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
    if (room?.status === "closed") {
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

    const bookingDialog = byId("booking-dialog");
    const bookingForm = byId("availability-booking-form");
    const bookingSuccess = byId("booking-success");
    const bookingDate = byId("booking-date");
    const params = queryParams();
    let selectedRoom = null;

    if (bookingDate) {
      bookingDate.min = localDateValue();
    }

    const searchToolbar = buildToolbar(roomSection, {
      search: "Search by room, zone, or equipment",
      status: ["available", "pending", "conflict", "closed"],
      sort: [
        ["name-asc", "Name A-Z"],
        ["name-desc", "Name Z-A"],
        ["capacity-high", "Capacity high-low"],
        ["capacity-low", "Capacity low-high"],
      ],
    });
    const statusFilter = searchToolbar?.querySelector('[data-control="status"]');
    if (statusFilter) statusFilter.value = "available";

    const filterForm = document.querySelector('form[action="availability.html"]');
    if (isDateValue(params.get("date"))) byId("date").value = params.get("date");
    if (params.get("start")) byId("start").value = params.get("start");
    if (params.get("end")) byId("end").value = params.get("end");
    const capacity = byId("capacity");
    if (capacity && !capacity.dataset.enhanced) {
      capacity.dataset.enhanced = "true";
      capacity.innerHTML = `
        <option value="">Any capacity</option>
        <option value="4">At least 4 people</option>
        <option value="6">At least 6 people</option>
        <option value="8">At least 8 people</option>
        <option value="10">At least 10 people</option>
      `;
    }

    const currentFilters = () => ({
      date: byId("date")?.value || "",
      start: byId("start")?.value || "",
      end: byId("end")?.value || "",
      capacity: Number(byId("capacity")?.value || 0),
    });

    const updateSelectedRoomSummary = () => {
      if (!selectedRoom || !bookingForm) return;
      const data = bookingFromForm(bookingForm);
      const status = availabilityFor(selectedRoom, data);
      byId("selected-room-name").textContent = selectedRoom.name;
      byId("selected-room-capacity").textContent = `${selectedRoom.capacity} users`;
      byId("selected-room-status").textContent = titleCase(status);
    };

    const closeBookingDialog = () => {
      if (!bookingDialog) return;
      if (typeof bookingDialog.close === "function") {
        bookingDialog.close();
      } else {
        bookingDialog.removeAttribute("open");
      }
    };

    const openBookingDialog = (roomId, defaults = {}) => {
      selectedRoom = store.roomById(roomId);
      if (!selectedRoom || !bookingDialog || !bookingForm) return;
      if (availabilityFor(selectedRoom, defaults) !== "available") {
        notify("This room is not currently available for booking.", "conflict");
        return;
      }

      clearFormErrors(bookingForm);
      bookingForm.reset();
      bookingForm.hidden = false;
      bookingSuccess.hidden = true;
      bookingSuccess.innerHTML = "";

      bookingForm.elements.room.value = selectedRoom.id;
      bookingForm.elements["booking-date"].value = defaults.date || "";
      bookingForm.elements["start-time"].value = defaults.start || "";
      bookingForm.elements["end-time"].value = defaults.end || "";
      bookingForm.elements.participants.max = selectedRoom.capacity;
      bookingForm.elements.participants.value = Math.min(4, selectedRoom.capacity);
      updateSelectedRoomSummary();

      if (typeof bookingDialog.showModal === "function") {
        bookingDialog.showModal();
      } else {
        bookingDialog.setAttribute("open", "");
      }
      bookingForm.elements["booking-date"].focus();
    };

    const render = () => {
      const toolbar = toolbarValues(searchToolbar);
      const filters = currentFilters();
      const rooms = sortByMode(
        store
          .all("rooms")
          .map((room) => ({ ...room, computedStatus: availabilityFor(room, filters) }))
          .filter((room) => matchesKeyword(room, ["name", "code", "zone", "type", "equipment"], toolbar.search))
          .filter((room) => !toolbar.status || room.computedStatus === toolbar.status)
          .filter((room) => !filters.capacity || Number(room.capacity) >= filters.capacity),
        toolbar.sort
      );

      roomSection.innerHTML = rooms.length
        ? rooms
            .map(
              (room) => {
                const detailsParameters = new URLSearchParams({ room: room.id });
                if (filters.date) detailsParameters.set("date", filters.date);
                return `
                <article class="card">
                  <div class="room-image"><img src="${escapeHTML(imageForRoom(room))}" alt="${escapeHTML(room.name)} preview"></div>
                  ${statusBadge(room.computedStatus)}
                  <h2>${escapeHTML(room.name)}</h2>
                  <ul class="room-meta">
                    <li><span>Zone</span><strong>${escapeHTML(room.zone)}</strong></li>
                    <li><span>Capacity</span><strong>${escapeHTML(room.capacity)} users</strong></li>
                    <li><span>Equipment</span><strong>${escapeHTML(room.equipment)}</strong></li>
                  </ul>
                  <div class="actions">
                    <a class="button small" href="room-details.html?${escapeHTML(detailsParameters.toString())}">View Details</a>
                    ${
                      room.computedStatus === "available"
                        ? `<button class="button small secondary" type="button" data-book-room="${escapeHTML(room.id)}">Book</button>`
                        : ""
                    }
                  </div>
                </article>
              `;
              }
            )
            .join("")
        : emptyState("No rooms match the current search or filter.");
    };

    filterForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    filterForm?.addEventListener("input", debounce(render));
    filterForm?.addEventListener("change", render);
    bindToolbar(searchToolbar, render);

    roomSection.addEventListener("click", (event) => {
      const button = event.target.closest("[data-book-room]");
      if (!button) return;
      openBookingDialog(button.dataset.bookRoom, currentFilters());
    });

    all("[data-close-booking]").forEach((button) => {
      button.addEventListener("click", closeBookingDialog);
    });

    bookingDialog?.addEventListener("click", (event) => {
      if (event.target === bookingDialog) closeBookingDialog();
    });

    bookingForm?.addEventListener("input", debounce(updateSelectedRoomSummary));
    bookingForm?.addEventListener("change", updateSelectedRoomSummary);
    bookingForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selectedRoom) return;

      const data = bookingFromForm(bookingForm);
      const errors = validateBooking(data);
      if (errors.length) {
        showFormErrors(bookingForm, errors);
        notify("Please fix the booking details.", "conflict");
        return;
      }

      const status = availabilityFor(selectedRoom, data) === "available" ? "confirmed" : "pending";
      const booking = store.create("bookings", { ...data, status });
      store.createNotification({
        bookingId: booking.id,
        status,
        title: `${selectedRoom.name} ${status === "confirmed" ? "confirmed" : "request received"}`,
        message: `Your booking for ${formatDate(booking.date)} from ${formatTime(booking.start)} to ${formatTime(booking.end)} is ${status}.`,
      });
      writeSession({ currentBookingId: booking.id, editingBookingId: "", cancelBookingId: "" });

      bookingForm.hidden = true;
      bookingSuccess.hidden = false;
      bookingSuccess.className = `alert ${statusClass(status)}`;
      bookingSuccess.innerHTML = `
        ${statusBadge(status)}
        <h3>Booking saved successfully</h3>
        <p><strong>${escapeHTML(selectedRoom.name)}</strong><br>${escapeHTML(formatDate(booking.date))}, ${escapeHTML(formatTime(booking.start))} - ${escapeHTML(formatTime(booking.end))}</p>
        <p>Reservation ID: <strong>${escapeHTML(booking.id)}</strong></p>
        <div class="actions">
          <a class="button" href="dashboard.html">View Dashboard</a>
          <button class="button secondary" type="button" data-book-another>Book Another Room</button>
        </div>
      `;
      bookingSuccess.querySelector("[data-book-another]")?.addEventListener("click", closeBookingDialog);
      notify("Booking saved successfully.", status);
      render();
    });

    render();

    if (params.get("book") === "1" && params.get("room")) {
      openBookingDialog(params.get("room"), {
        date: params.get("date") || "",
        start: params.get("start") || "",
        end: params.get("end") || "",
      });
    }
  };

  const renderRoomDetailsPage = () => {
    if (pageName() !== "room-details.html") return;
    const params = queryParams();
    const room = store.roomById(params.get("room")) || store.all("rooms")[0];
    const selectedDate = isDateValue(params.get("date")) ? params.get("date") : localDateValue();
    if (!room) return;

    document.querySelector(".page-title h1").textContent = room.name;
    const pageDescription = document.querySelector(".page-title .section > p:last-child");
    if (pageDescription) {
      pageDescription.textContent = `Availability for ${formatDate(selectedDate)}. Review room facilities and reservation slots before booking.`;
    }
    const roomImage = document.querySelector(".grid.two .panel img");
    if (roomImage) {
      roomImage.src = imageForRoom(room);
      roomImage.alt = `${room.name} preview`;
    }
    const infoPanel = all(".grid.two .panel")[1];
    if (infoPanel) {
      infoPanel.innerHTML = `
        ${statusBadge(room.status)}
        <h2>Room information</h2>
        <ul class="detail-list">
          <li><span>Zone</span><strong>${escapeHTML(room.zone)}</strong></li>
          <li><span>Capacity</span><strong>${escapeHTML(room.capacity)} users</strong></li>
          <li><span>Equipment</span><strong>${escapeHTML(room.equipment)}</strong></li>
          <li><span>Recommended use</span><strong>${escapeHTML(room.type)}</strong></li>
        </ul>
        <div class="actions">
          ${room.status === "available" ? `<a class="button" href="availability.html?room=${encodeURIComponent(room.id)}&book=1&date=${encodeURIComponent(selectedDate)}">Book This Room</a>` : ""}
          <a class="button secondary" href="availability.html?date=${encodeURIComponent(selectedDate)}">Back to Availability</a>
        </div>
      `;
    }

    const tbody = document.querySelector("tbody");
    if (!tbody) return;
    const caption = document.querySelector("table caption");
    if (caption) caption.textContent = `Time slots for ${room.name} on ${formatDate(selectedDate)}`;
    const slots = generateTimeSlots();
    tbody.innerHTML = slots
      .map(([start, end]) => {
        const slotStatus = slotStatusFor(room, selectedDate, start, end);
        return `
          <tr>
            <td>${escapeHTML(formatDate(selectedDate))}</td>
            <td>${escapeHTML(formatTime(start))} - ${escapeHTML(formatTime(end))}</td>
            <td>${statusBadge(slotStatus)}</td>
            <td>${
              slotStatus === "available"
                ? `<a class="button small" href="availability.html?room=${encodeURIComponent(room.id)}&book=1&date=${encodeURIComponent(selectedDate)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}">Book</a>`
                : `<a class="button small ghost" href="availability.html?date=${encodeURIComponent(selectedDate)}">Find Other</a>`
            }</td>
          </tr>
        `;
      })
      .join("");
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
    matchesKeyword(room, ["name", "code", "zone", "type", "equipment", "status"], values.search) &&
    (!values.status || room.status === values.status);

  const initAdminRoomsPage = () => {
    if (pageName() !== "admin-rooms.html") return;
    const tableWrap = document.querySelector(".table-wrap");
    const tbody = document.querySelector("tbody");
    const form = document.querySelector('form[action="admin-rooms.html"]');
    if (!tableWrap || !tbody || !form) return;
    const headerRow = tableWrap.querySelector("thead tr");
    if (headerRow) {
      headerRow.innerHTML = "<th>Room</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th>";
    }

    if (!byId("room-name")) {
      form.insertAdjacentHTML(
        "afterbegin",
        `
          <label for="room-name">Room name<input id="room-name" name="room-name" type="text" required></label>
          <label for="room-zone">Zone<input id="room-zone" name="room-zone" type="text" required></label>
          <label for="room-equipment">Equipment<textarea id="room-equipment" name="room-equipment" required></textarea></label>
        `
      );
    }

    const toolbar = buildToolbar(tableWrap, {
      search: "Search rooms",
      status: ["available", "pending", "conflict", "closed"],
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
                  <td>${escapeHTML(room.code)}</td>
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
        : `<tr><td colspan="5">${emptyState("No rooms match your filters.")}</td></tr>`;
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
        form.elements["room-zone"].value = room.zone;
        form.elements["room-type"].value = room.type;
        form.elements["room-capacity"].value = room.capacity;
        form.elements["room-status"].value = titleCase(room.status);
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
        zone: form.elements["room-zone"].value.trim(),
        type: form.elements["room-type"].value.trim(),
        capacity: Number(form.elements["room-capacity"].value),
        status: form.elements["room-status"].value.toLowerCase(),
        equipment: form.elements["room-equipment"].value.trim(),
      };
      const errors = [];
      if (!room.name) errors.push({ field: "room-name", message: "Room name is required." });
      if (!room.code) errors.push({ field: "room-code", message: "Room code is required." });
      if (!room.type) errors.push({ field: "room-type", message: "Room type is required." });
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
    const loginForm = all("form")[0];
    const registerForm = all("form")[1];
    if (!loginForm || !registerForm) return;

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
      window.AppAuth.login("student", user.id);
      writeSession({ currentUserId: user.id });
      notify("Account registered successfully.");
      window.location.href = "dashboard.html";
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
