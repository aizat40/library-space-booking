# Library Space Booking System

## Project overview

This static HTML/CSS prototype is based on the attached BIW20303 Web Design report. The website supports a Library Space Booking System for Tunku Tun Aminah Library at UTHM. Its goal is to replace manual counter-based room booking with an online flow where students can view availability, reserve rooms, manage bookings, receive notifications, and review history. Administrators have separate access for booking oversight, room configuration, user management, and reporting.

## Extracted requirements

- Login/Register page for secure access.
- Home page with system purpose and visual library/location representation.
- Room Availability page with floor plan, available spaces, and responsive layouts.
- Room Details page connected to availability.
- Booking page for room number, date, time, participants, purpose, and status.
- Confirmation page after booking.
- User Dashboard for upcoming reservations, notifications, history, and booking management.
- Booking History page.
- Notifications page with confirmed, pending, and conflict alert states.
- Booking Management, Edit Booking, and Cancel Booking pages.
- Admin Dashboard with separate access.
- Admin pages for rooms, bookings, users, and reports.
- Persistent top navigation with Home, Book a Space, Dashboard, and Help.
- Responsive Flexbox/Grid layouts.
- Status color coding: green confirmed/available, yellow pending, red conflict.
- Resource inventory: floor plan, room images, icons/visual cues, text content, notification messages, and charts.

## Sitemap

Homepage
- Login/Register
- Room Availability
  - Room Details
- Booking
  - Confirmation
- User Dashboard
  - Booking History
  - Notifications
  - Booking Management
    - Edit Booking
    - Cancel Booking
- Admin Dashboard
  - Rooms Management
  - Bookings Management
  - Users Management
  - Reports
- Help

## Wireframe descriptions

- Home: fixed navigation, hero with system goal and primary actions, library visual, feature cards, floor-plan preview, and location map placeholder.
- Login/Register: two-column authentication layout with login and registration forms.
- Availability: floor plan and filter panel, followed by responsive room cards with status badges.
- Room Details: room visual and information panel, slot table, rules panel.
- Booking: reservation form beside a summary card.
- Confirmation: success alert with reservation details and notification schedule.
- Dashboard: metric cards, next reservation, quick actions, and active booking table.
- History: full-width table of previous reservations.
- Notifications: three alert cards for confirmed, pending, and conflict messages.
- Booking Management: active reservations table with edit and cancel actions.
- Edit Booking: editable reservation form and availability review notice.
- Cancel Booking: selected reservation summary and cancellation reason form.
- Help: guide cards, FAQ, and contact details.
- Admin Dashboard: summary metrics, admin tool links, and usage chart.
- Admin Rooms: room configuration table and edit form.
- Admin Bookings: transaction table with static status controls.
- Admin Users: user role table and role update form.
- Reports: CSS chart bars, status totals, and usage insights.

## Folder structure

```text
library-space-booking/
  index.html
  login.html
  availability.html
  room-details.html
  booking.html
  confirmation.html
  dashboard.html
  history.html
  notifications.html
  manage-bookings.html
  edit-booking.html
  cancel-booking.html
  help.html
  admin.html
  admin-rooms.html
  admin-bookings.html
  admin-users.html
  reports.html
  css/
    style.css
  images/
    floor-plan.svg
    library-illustration.svg
    room-discussion.svg
    room-study.svg
    room-media.svg
```

## Assumptions

- The report requires HTML and CSS only, so all forms and controls are static prototypes.
- Help was added because the report explicitly requires the persistent navigation bar to include Help.
- Exact UTHM branding guidelines were not included in the report, so the design uses a professional library theme with teal, cyan, green, yellow, red, and neutral colors.
- Placeholder visual assets are local SVG files so the site works offline without external dependencies.

## Requirement mapping

- Secure access: `login.html`.
- System purpose and location: `index.html`.
- Room availability and floor plan: `availability.html`.
- Room details: `room-details.html`.
- Reservation creation: `booking.html`.
- Booking confirmation and notification: `confirmation.html`.
- User dashboard, history, notifications, booking management: `dashboard.html`, `history.html`, `notifications.html`, `manage-bookings.html`, `edit-booking.html`, `cancel-booking.html`.
- Admin management: `admin.html`, `admin-rooms.html`, `admin-bookings.html`, `admin-users.html`, `reports.html`.
- Consistent navigation: all pages use the same fixed top navigation.
- Responsiveness: `css/style.css` uses grid/flex layouts and mobile breakpoints.
- Accessibility: semantic landmarks, skip link, labels, alt text, visible focus states, and readable color contrast.
