# 📋 Changelog - Restaurant Management System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-01-15

### 🎉 Open Source Release

This version marks the transformation of the project into an open source template.

### Changed
- Renamed project to "Restaurant Management System"
- Made all configuration values generic and customizable via environment variables
- Updated documentation to English
- Added MIT license

### Removed
- Removed hardcoded production URLs
- Removed company-specific branding

---

## [1.5.0] - 2026-01-13

### Security
- **Input Sanitization** - Added DOMPurify middleware to prevent XSS attacks
- **Rate Limiting** - Login endpoint limited to 5 attempts per 15 minutes

### Performance
- **Database Indexes** - Added optimized indexes for frequently queried tables:
  - `orders`: status, created_at, waiter_id, table_id
  - `menu_items`: category_id, available
  - `ingredients`: stock levels, active status
  - `alerts`: type, read status

### Monitoring
- **Sentry Integration** - Added optional APM for error tracking

---

## [1.4.0] - 2026-01-12

### Added
- **Web Push Notifications** - Real background notifications using VAPID
- Works with app closed or phone screen off
- Per-user subscription management
- Notifications when orders change status

---

## [1.3.0] - 2026-01-11

### Added
- **PWA Support** - Full Progressive Web App with offline capabilities
- Install prompt for mobile devices
- Service Worker for caching
- Update prompt when new version available

---

## [1.2.0] - 2026-01-10

### Added
- **Real-time Dashboard** - Analytics for managers
- Daily sales KPIs
- Hourly sales chart
- 14-day sales trend
- Category distribution pie chart
- Top 5 best sellers

---

## [1.1.0] - 2026-01-09

### Added
- **Inventory Management** - Full ingredient tracking
- Stock movement history
- Low stock alerts
- Automatic availability updates

---

## [1.0.0] - 2026-01-08

### Added
- Initial release
- User authentication with JWT
- Menu management with categories
- Order system with real-time updates via Socket.IO
- Table management
- Role-based access control (Manager, Employee, Kitchen)

---

## Contributing

When adding to this changelog, please follow the format above and include:
- The version number
- The date of release
- Categories: Added, Changed, Fixed, Removed, Security, Performance
- Brief description of each change

