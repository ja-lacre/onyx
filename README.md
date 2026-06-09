# ONYX

Project Codename **ONYX** is a modern, real-time Queue Management System (QMS) that digitizes the manual queuing process. This project allows users to conveniently secure their place in line and aims to reduce waiting time and confusion by organizing the flow of customers through a ticket-based system.

| Internal Release Code | Date Released |
| :-------------------- | :------------ |
| ON.010.004            | 2026-06-09    |
| ON.010.003            | 2026-04-25    |
| ON.010.002            | 2026-04-12    |
| ON.010.001            | 2026-02-27    |

## ON.010.004 Release Notes

- Integrated multi-queue support (e.g., University Registrar, Infirmary, Canteen) with independent, per-queue ticketing counters powered by PostgreSQL triggers.
- Upgraded the UI/UX with smooth modal animations, sliding tab transitions, pulsing skeleton loading screens (`loading.tsx`), and `react-easy-crop` for dynamic profile picture uploads.
- Implemented global toast notifications using `sonner` to improve user feedback across profile updates, queue changes, and settings modifications.
- Added Priority Routing to the admin dashboard, allowing admins to elevate tickets (P-XX format) with instant Supabase Realtime syncing across all user screens.
- Configured 30-minute session persistence across browser closures using Next.js Middleware and updated Supabase client configurations.
- Enhanced authentication security by enforcing an 8-character password minimum and preventing duplicate-email signups via `identities` array verification.
- Integrated custom SMTP via Resend to bypass default email limits, complete with customized HTML email templates and DMARC configuration for improved deliverability.
- Established comprehensive Storage and RLS permissions allowing admins to manage queues and users to update profiles/avatars securely.

**Known Issues/Bugs:**
- Custom SMTP domain reputation may initially cause automated emails (such as password resets) to land in spam folders depending on DMARC propagation and receiving provider policies.

## ON.010.003 Release Notes

- Resolved known layout inconsistencies across the dashboard and sidebar to ensure a fully responsive design.
- Configured the Supabase browser client utilizing `@supabase/ssr` to handle client-side database interactions and authentication state.
- Developed the primary administrative interface for creating, configuring, and managing active queues.

**Known Issues/Bugs:**

- Queue statuses, current serving numbers, and estimated waiting times do not broadcast instantly; the interface may require manual refreshing until Supabase real-time subscriptions are fully wired.

## ON.010.002 Release Notes

- Initialized the core application framework using Next.js.
- Integrated Supabase for backend services, database management, and authentication.
- Set up styling and UI architecture using Tailwind CSS and shadcn/ui components.
- Developed foundational frontend pages and routing, including the Authentication page (Login) and Dashboard layouts (Overview, Settings).

**Known Issues/Bugs:**

- No proper middleware implemented yet for route protection and session handling.
- Inconsistent layout bugs present across certain dashboard views and viewport sizes.

## ON.010.001 Release Notes

- Initialize the main project GitHub repository
- Configure initial project structure and baseline settings
- Set up README.md with standard release tracking and documentation links
- NOTES: No known bugs or issues were found for this release

## ON.010.000 Release Notes

- Add functional descriptions and use case scenarios for Main Modules and Queue Management
- Initialize documentation for Authentication, Priority Queues, History Management, Real-Time Queue Tracking, Estimated Waiting Time, Queue Joining, and Queue Cancelling
- Establish site map and project homepage

Important Links:

- Design Specs: https://github.com/Cabales-VSU/onyx-docportal
