# ONYX

Project Codename **ONYX** is a modern, real-time Queue Management System (QMS) that digitizes the manual queuing process. This project allows users to conveniently secure their place in line and aims to reduce waiting time and confusion by organizing the flow of customers through a ticket-based system.

| Internal Release Code | Date Released |
| :-------------------- | :------------ |
| ON.010.003            | 2026-04-25    |
| ON.010.002            | 2026-04-12    |
| ON.010.001            | 2026-02-27    |

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
