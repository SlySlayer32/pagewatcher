# Web Page Watcher 🔍

A professional web application that monitors social media pages (Facebook, Twitter/X, Instagram, etc.) for new posts and keyword matches. Perfect for businesses that need to track opportunities in local community groups and social media pages.

## Features

- **Visual Inspection**: View pages directly in an iframe for manual monitoring
- **Playwright Integration**: Automated browser-based monitoring with Playwright MCP
- **Keyword Detection**: Set up keyword alerts to catch relevant posts (e.g., "cleaning", "house", "residential")
- **Multi-Platform Support**: Monitor Facebook, Twitter/X, Instagram, and other websites
- **Automated Checking**: Configure check intervals for each monitored page
- **Real-time Alerts**: Get notified when keywords are found in new content
- **Responsive Design**: Access from desktop or mobile devices

## Perfect for Cleaning Businesses

This tool was designed to help cleaning businesses monitor local Facebook groups and pages for new job opportunities. Set up keywords like:
- "cleaning"
- "house cleaning" 
- "carpet cleaning"
- "maid service"
- "residential cleaning"

Never miss a potential job opportunity again!

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SlySlayer32/pagewatcher.git
   cd pagewatcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

### Adding a Monitor

1. Enter the URL of the page you want to monitor (e.g., a Facebook group or page)
2. Select the platform type
3. Add keywords separated by commas
4. Set the check interval (in minutes)
5. Click "Add Monitor"

### Quick Page Check

Use the "Quick Page Check" feature to immediately check a page with Playwright:
1. Enter the page URL
2. Add keywords to search for
3. Click "Check Now"

The system will use Playwright to load the page and search for your keywords.

### Page Preview

Try viewing pages directly in the iframe preview:
1. Enter a URL in the preview section
2. Click "Load Preview"

Note: Some websites block iframe embedding. For these sites, use the Playwright-based "Quick Page Check" instead.

### Managing Alerts

- New alerts appear when keywords are found during automated checks
- Click "Mark Read" to mark an alert as read
- Click "Delete" to remove an alert
- Alerts show a preview of the content and highlight which keywords were found

## How It Works

### Automated Monitoring

The application runs background checks every minute and evaluates each monitor based on its configured check interval. When it's time to check a monitor:

1. Playwright launches a headless browser
2. The page is loaded and allowed to render
3. Page content is extracted and analyzed
4. Keywords are searched in the content
5. If keywords are found, an alert is created
6. The last checked timestamp is updated

### Data Storage

All monitors and alerts are stored in JSON files in the `data/` directory:
- `monitors.json` - Active monitors and their configurations
- `alerts.json` - Generated alerts from keyword matches

## API Endpoints

- `GET /api/monitors` - Get all monitors
- `POST /api/monitors` - Create a new monitor
- `PUT /api/monitors/:id` - Update a monitor
- `DELETE /api/monitors/:id` - Delete a monitor
- `GET /api/alerts` - Get all alerts
- `PUT /api/alerts/:id/read` - Mark alert as read
- `DELETE /api/alerts/:id` - Delete an alert
- `POST /api/check-page` - Check a page immediately with Playwright

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Start production server
npm start
```

## Requirements

- Node.js 14+ 
- npm or yarn
- Playwright browsers (automatically installed)

## Limitations

- Some websites may block automated access or iframe embedding
- Facebook, Instagram, and other social platforms may require login for full content access
- Rate limiting may apply for frequent checks
- Headless browser checks consume more resources than simple HTTP requests

## Tips

1. **For Facebook groups**: You may need to be logged in to see full content. Consider using the manual iframe preview for authenticated browsing.

2. **Check intervals**: Set reasonable intervals (15-30 minutes) to avoid overloading the server and target websites.

3. **Keywords**: Use specific, relevant keywords to reduce false positives.

4. **Multiple monitors**: You can monitor multiple pages simultaneously with different keyword sets.

5. **Mobile access**: The responsive design allows you to check alerts on your phone.

## Troubleshooting

**Page won't load in iframe?**
- Some sites block iframe embedding. Use the "Quick Page Check" with Playwright instead.

**Playwright check fails?**
- The page may require login or block automated access
- The page may take too long to load (30 second timeout)
- Check your internet connection

**No alerts appearing?**
- Verify your keywords match content on the page
- Check the monitor is active (not paused)
- Ensure the check interval has passed

## License

MIT License - Feel free to use and modify for your business needs.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
