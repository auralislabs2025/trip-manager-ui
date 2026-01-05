# Trip Tracker

A Progressive Web App (PWA) for managing truck operations, expenses, and profit calculations. Built with HTML, CSS, and vanilla JavaScript.

## Features

- ✅ **User Authentication** - Admin and Staff roles with secure login
- ✅ **Dashboard** - Real-time metrics and charts showing profit trends
- ✅ **Trip Management** - Complete trip lifecycle (Draft → In Progress → Returned → Closed)
- ✅ **Expense Tracking** - Track food, diesel, toll, salary, GST, and other expenses
- ✅ **Profit Calculation** - Automatic profit/loss calculation for each trip
- ✅ **Reports & Analytics** - Trip-wise, driver-wise, and vehicle-wise performance reports
- ✅ **PWA Support** - Installable as a native app, works offline
- ✅ **Mobile-First Design** - Fully responsive, optimized for mobile and tablet
- ✅ **Data Export/Import** - Backup and restore functionality

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for PWA features to work properly)

### Installation

1. Clone or download this repository
2. Serve the files using a local web server:

   **Using Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Using Node.js (http-server):**
   ```bash
   npx http-server -p 8000
   ```

   **Using PHP:**
   ```bash
   php -S localhost:8000
   ```

3. Open your browser and navigate to `http://localhost:8000`

### Default Login Credentials

- **Admin:**
  - Username: `admin`
  - Password: `admin123`
  - Role: Admin

- **Staff:**
  - Username: `staff`
  - Password: `staff123`
  - Role: Staff

**⚠️ Important:** Change these passwords in production!

## PWA Installation

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will be installed and accessible from your home screen

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will be installed and accessible from your home screen

### Desktop (Chrome/Edge)
1. Look for the install icon in the address bar
2. Click "Install" when prompted
3. The app will open in a standalone window

## Project Structure

```
truckManagment/
├── index.html              # Login page
├── dashboard.html          # Main dashboard
├── trips.html              # Trip list
├── trip-detail.html        # Trip detail/edit
├── reports.html            # Reports & analytics
├── manifest.json           # PWA manifest
├── service-worker.js       # Service worker for offline support
├── css/
│   ├── styles.css          # Main styles (mobile-first)
│   ├── login.css           # Login page styles
│   ├── dashboard.css       # Dashboard styles
│   └── components.css      # Reusable components
├── js/
│   ├── utils.js            # Utility functions
│   ├── storage.js          # LocalStorage management
│   ├── auth.js             # Authentication
│   ├── calculations.js     # Business calculations
│   ├── dashboard.js        # Dashboard logic
│   ├── trips.js            # Trip management
│   ├── trip-detail.js      # Trip detail logic
│   ├── reports.js          # Reports logic
│   └── pwa.js              # PWA functionality
├── assets/
│   └── images/             # PWA icons (see README in folder)
└── docs/
    └── SYSTEM_DOCUMENTATION.md  # Complete documentation
```

## Usage

### Creating a Trip

1. Navigate to **Trips** page
2. Click **New Trip** button
3. Fill in the trip details:
   - Vehicle Number
   - Driver Name
   - Trip Start Date
   - Estimated End Date
   - Tonnage
   - Rate per Ton (default: ₹650)
   - Amount Given to Driver
   - Notes (optional)
4. Click **Save Trip**

### Managing Trip Lifecycle

1. **Start Trip**: On trip detail page, click "Start Trip" to mark it as in progress
2. **Trip Returned**: When trip returns, click "Trip Returned" and add expenses
3. **Add Expenses**: Enter all expense details (food, diesel, toll, salary, GST, other)
4. **Close Trip**: The next day after return, click "Close Trip" to finalize and calculate profit

### Viewing Reports

1. Navigate to **Reports** page
2. Select report type (Trip-wise, Driver, Vehicle, Expense)
3. Set date range (optional)
4. Click **Generate Report**
5. Export to CSV if needed

## Data Storage

All data is stored in browser LocalStorage. This means:
- ✅ Data persists between sessions
- ✅ Works offline
- ⚠️ Data is browser-specific (not synced across devices)
- ⚠️ Data can be cleared if browser cache is cleared

### Backup & Restore

- **Export**: Data can be exported to JSON file (future feature)
- **Import**: Data can be imported from JSON file (future feature)

## Browser Support

- Chrome/Edge: Latest 2 versions ✅
- Firefox: Latest 2 versions ✅
- Safari: iOS 12+ ✅
- Mobile browsers: Chrome, Safari ✅

## Development

### Adding New Features

1. Follow the existing code structure
2. Use the utility functions from `utils.js`
3. Use storage functions from `storage.js`
4. Follow the mobile-first design approach
5. Test on mobile devices

### Customization

- **Colors**: Edit CSS variables in `css/styles.css`
- **Default Rate**: Edit in `js/storage.js` (defaultRatePerTon)
- **Icons**: Replace icons in `assets/images/`

## Troubleshooting

### Service Worker Not Working
- Ensure you're accessing via HTTP/HTTPS (not file://)
- Clear browser cache and reload
- Check browser console for errors

### Data Not Persisting
- Check browser LocalStorage quota
- Ensure cookies/localStorage is enabled
- Check browser console for errors

### PWA Not Installing
- Ensure manifest.json is accessible
- Check that service worker is registered
- Verify icons are present and accessible

## Future Enhancements

- Backend API integration
- Database migration
- Multi-user sync
- Push notifications
- Receipt scanning (OCR)
- GPS tracking
- Advanced analytics

## License

This project is proprietary software. All rights reserved.

## Support

For issues or questions, refer to the complete documentation in `docs/SYSTEM_DOCUMENTATION.md`.

---

**Version:** 1.0.0  
**Last Updated:** January 2024

