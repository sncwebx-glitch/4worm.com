# 4worm.com Setup Guide

## Installation & Setup

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (optional, for testing)
- Git (for cloning the repository)

### Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/sncwebx-glitch/4worm.com.git
   cd 4worm.com
   ```

2. **Open in Browser**
   - Simply open `index.html` in your web browser
   - Or use a local server:
     ```bash
     python -m http.server 8000
     # or
     npx http-server
     ```
   - Navigate to `http://localhost:8000`

3. **Access Features**
   - **Forum**: Browse categories, read threads, post replies
   - **Blog**: Read articles, filter by tags, leave comments
   - **RSS**: Subscribe to feeds in your RSS reader

### File Structure

```
4worm.com/
├── index.html              # Forum homepage
├── blog.html               # Blog page
├── css/
│   └── style.css          # Main stylesheet
├── js/
│   ├── forum.js           # Forum functionality
│   ├── blog.js            # Blog functionality
│   └── rss-generator.js   # RSS feed generation
├── data/
│   ├── forum-data.json    # Forum content
│   ├── blog-data.json     # Blog articles
│   └── users.json         # User profiles
├── rss/
│   ├── forum-feed.xml     # Forum RSS feed
│   └── blog-feed.xml      # Blog RSS feed
└── docs/
    ├── SETUP.md           # This file
    ├── API.md             # API documentation
    └── SECURITY.md        # Security guidelines
```

## Configuration

### Adding Custom Forum Categories

Edit `data/forum-data.json` and add to the `categories` array:

```json
{
  "id": 5,
  "name": "Your Category",
  "emoji": "📌",
  "description": "Category description here"
}
```

### Adding Blog Articles

Edit `data/blog-data.json` and add to the `articles` array:

```json
{
  "id": 4,
  "title": "Article Title",
  "author": "Author Name",
  "date": "2026-05-26T00:00:00Z",
  "tags": ["tag1", "tag2"],
  "content": "Article content in markdown format",
  "comments": 0
}
```

## Deploying to Production

### GitHub Pages

1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Select `main` branch as source
4. Your site will be live at `https://sncwebx-glitch.github.io/4worm.com`

### Static Hosting (Netlify, Vercel, etc.)

1. Connect your GitHub repository
2. Set build command: None (for static site)
3. Set publish directory: `/` (root)
4. Deploy!

## Troubleshooting

### Data not loading?
- Check browser console for errors (F12)
- Ensure JSON files are properly formatted
- Verify file paths are correct

### Styling issues?
- Clear browser cache (Ctrl+Shift+Del)
- Check that `css/style.css` is accessible
- Verify CSS file path in HTML

### RSS feeds not working?
- Validate XML with online validators
- Check feed URLs in RSS readers
- Ensure XML files are properly formatted

## Maintenance

### Backing up data
- Regularly commit changes to Git
- Keep backups of `data/` directory

### Updating content
- Modify JSON files directly for testing
- Consider implementing a CMS for production

## Next Steps

- Read [API Documentation](API.md) for backend integration
- Review [Security Guidelines](SECURITY.md) before production deployment
- Consider adding user authentication
- Implement database storage
