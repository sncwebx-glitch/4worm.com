# 4worm.com - Security Update & White Hat Pen Testing Forum

A comprehensive forum board system for security updates, white hat penetration testing insights, and malware/vulnerability disclosure with blog functionality and RSS syndication.

## Features

- **Forum System**: Multi-category discussion boards with threading
- **Blog Module**: Security articles with comments and archives
- **RSS Syndication**: Feed generation for updates
- **User Management**: Authentication and role-based access
- **Security-First**: Input validation, CSRF protection, sanitization

## Directory Structure

```
/
├── index.html                 # Main forum interface
├── blog.html                  # Blog listing page
├── rss/
│   ├── forum-feed.xml        # Forum RSS feed
│   └── blog-feed.xml         # Blog RSS feed
├── css/
│   └── style.css             # Responsive styling
├── js/
│   ├── forum.js              # Forum functionality
│   ├── blog.js               # Blog functionality
│   └── rss-generator.js      # RSS feed generation
├── data/
│   ├── forum-data.json       # Forum structure and posts
│   ├── blog-data.json        # Blog articles
│   └── users.json            # User management
├── api/
│   ├── forum-api.js          # Forum endpoints
│   ├── blog-api.js           # Blog endpoints
│   └── rss-api.js            # RSS generation endpoints
└── docs/
    ├── SETUP.md              # Installation guide
    ├── API.md                # API documentation
    └── SECURITY.md           # Security guidelines
```

## Quick Start

1. Clone the repository
2. Open `index.html` in a web browser
3. Subscribe to RSS feeds in `/rss/`
4. Create an account and start posting

## Technology Stack

- HTML5 / CSS3 / JavaScript (Frontend)
- JSON (Data storage)
- RSS 2.0 (Syndication)
- Node.js (Optional backend)

## License

MIT License - See LICENSE file