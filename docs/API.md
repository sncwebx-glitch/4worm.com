# 4worm.com API Documentation

## Overview

This document describes the API endpoints for the 4worm.com forum and blog system. All endpoints are client-side currently, with JSON data stored in files.

## Data Structure

### Forum Thread Object

```json
{
  "id": 1,
  "categoryId": 0,
  "title": "Thread Title",
  "author": "Username",
  "content": "Thread content",
  "timestamp": "2026-05-25T10:30:00Z",
  "replies": 5,
  "views": 234,
  "replies_data": []
}
```

### Blog Article Object

```json
{
  "id": 1,
  "title": "Article Title",
  "author": "Author Name",
  "date": "2026-05-25T08:00:00Z",
  "tags": ["tag1", "tag2"],
  "content": "Article content",
  "comments": 4
}
```

## Frontend API Functions

### Forum Functions

#### `loadForumData()`
Loads forum data from `data/forum-data.json`

**Returns:** Promise<Object>

#### `displayThreads(categoryId)`
Displays threads for a given category

**Parameters:**
- `categoryId` (number): Category ID

**Returns:** void

#### `viewThread(threadId)`
Displays detailed view of a specific thread

**Parameters:**
- `threadId` (number): Thread ID

**Returns:** void

#### `addNewThread()`
Creates a new forum thread

**Form Parameters:**
- `threadTitle`: Thread title
- `threadContent`: Thread content
- `threadAuthor`: Author name

**Returns:** void (updates data)

#### `addReply()`
Adds a reply to current thread

**Form Parameters:**
- `replyContent`: Reply content
- `replyAuthor`: Author name

**Returns:** void (updates thread)

### Blog Functions

#### `loadBlogData()`
Loads blog data from `data/blog-data.json`

**Returns:** Promise<Object>

#### `displayArticles(filterTag)`
Displays blog articles, optionally filtered by tag

**Parameters:**
- `filterTag` (string, optional): Tag to filter by

**Returns:** void

#### `viewArticle(articleId)`
Displays detailed view of a specific article

**Parameters:**
- `articleId` (number): Article ID

**Returns:** void

#### `addNewArticle()`
Publishes a new blog article

**Form Parameters:**
- `articleTitle`: Article title
- `articleAuthor`: Author name
- `articleTags`: Comma-separated tags
- `articleContent`: Article content (Markdown)

**Returns:** void (updates data)

#### `addComment()`
Adds a comment to current article

**Form Parameters:**
- `commentContent`: Comment text
- `commentAuthor`: Author name

**Returns:** void (updates article)

#### `filterByTag(tag)`
Filters articles by specific tag

**Parameters:**
- `tag` (string): Tag name

**Returns:** void

## RSS Feeds

### Forum RSS Feed
**URL:** `/rss/forum-feed.xml`

Provides latest forum threads across all categories.

**Feed Elements:**
- Title: Thread title
- Author: Thread author
- Description: Thread preview
- PubDate: Thread creation date
- Category: Forum category
- Comments: Reply count

### Blog RSS Feed
**URL:** `/rss/blog-feed.xml`

Provides latest blog articles.

**Feed Elements:**
- Title: Article title
- Author: Article author
- Description: Article preview
- PubDate: Publication date
- Category: Article tag
- Content: Full article content (HTML encoded)

## Backend Integration

For production deployment with a backend:

### Recommended Node.js/Express Endpoints

```javascript
// Forum endpoints
GET  /api/forum/categories
GET  /api/forum/threads/:categoryId
GET  /api/forum/thread/:threadId
POST /api/forum/thread (create)
POST /api/forum/reply/:threadId (add reply)

// Blog endpoints
GET  /api/blog/articles
GET  /api/blog/article/:articleId
GET  /api/blog/articles/tag/:tag
POST /api/blog/article (create)
POST /api/blog/comment/:articleId (add comment)

// User endpoints
POST /api/auth/register
POST /api/auth/login
GET  /api/user/profile
PUT  /api/user/profile
```

## Error Handling

All API functions include error handling:

```javascript
try {
  const data = await fetch('data/forum-data.json').then(r => r.json());
} catch (error) {
  console.error('Error loading data:', error);
}
```

## Data Persistence

**Current:** Data stored in JSON files (browser-based)

**Recommended for Production:**
- PostgreSQL or MongoDB database
- File uploads (for user avatars, attachments)
- Session management
- Rate limiting

## Rate Limiting

No rate limiting currently implemented.

**Recommended for Production:**
- 100 requests per hour per IP
- 50 posts per hour per user
- 5 failed login attempts = 15-minute lockout
