// Blog JavaScript Functionality

let blogData = null;
let currentArticle = null;
let currentFilter = null;

// Initialize blog on page load
document.addEventListener('DOMContentLoaded', function() {
    loadBlogData();
    setupBlogEventListeners();
    displayArticles();
});

// Load blog data
function loadBlogData() {
    fetch('data/blog-data.json')
        .then(response => response.json())
        .then(data => {
            blogData = data;
            displayArticles();
        })
        .catch(error => console.error('Error loading blog data:', error));
}

// Display all articles
function displayArticles(filterTag = null) {
    if (!blogData) return;
    
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';
    
    let articles = blogData.articles;
    
    if (filterTag) {
        articles = articles.filter(article => article.tags.includes(filterTag));
        currentFilter = filterTag;
    }
    
    if (articles.length === 0) {
        articlesContainer.innerHTML = '<p style="text-align: center; color: #999;">No articles found.</p>';
        return;
    }
    
    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        articleCard.onclick = () => viewArticle(article.id);
        
        const preview = article.content.substring(0, 150) + (article.content.length > 150 ? '...' : '');
        const tagsHtml = article.tags.map(tag => `<span style="background: #e94560; padding: 2px 8px; border-radius: 3px; font-size: 0.8em; margin-right: 5px;">${escapeHtml(tag)}</span>`).join('');
        
        articleCard.innerHTML = `
            <h3>${escapeHtml(article.title)}</h3>
            <div class="article-meta">by <strong>${escapeHtml(article.author)}</strong> • ${formatDate(article.date)}</div>
            <div style="margin-bottom: 10px;">${tagsHtml}</div>
            <p class="article-preview">${escapeHtml(preview)}</p>
            <div class="thread-stats" style="border-top: none;">
                <span>💬 ${article.comments} comments</span>
                <span>📖 Read more →</span>
            </div>
        `;
        
        articlesContainer.appendChild(articleCard);
    });
}

// View article details
function viewArticle(articleId) {
    currentArticle = blogData.articles.find(a => a.id === articleId);
    const modal = document.getElementById('articleDetailModal');
    const detailDiv = document.getElementById('articleDetail');
    
    const tagsHtml = currentArticle.tags.map(tag => 
        `<a href="#" onclick="filterByTag('${tag}')" style="background: #e94560; padding: 4px 10px; border-radius: 3px; margin-right: 5px; text-decoration: none; color: white;">#${escapeHtml(tag)}</a>`
    ).join('');
    
    detailDiv.innerHTML = `
        <h2 style="color: #00d4ff; margin-bottom: 10px;">${escapeHtml(currentArticle.title)}</h2>
        <div style="color: #999; margin-bottom: 15px;">
            by <strong>${escapeHtml(currentArticle.author)}</strong> • ${formatDate(currentArticle.date)}
        </div>
        <div style="margin-bottom: 15px;">${tagsHtml}</div>
        <div style="background: rgba(0, 212, 255, 0.1); padding: 20px; border-radius: 4px; line-height: 1.8;">
            ${markdownToHtml(currentArticle.content)}
        </div>
    `;
    
    // Load comments
    loadComments();
    
    document.getElementById('newCommentForm').onsubmit = function(e) {
        e.preventDefault();
        addComment();
    };
    
    modal.style.display = 'block';
}

// Load and display comments
function loadComments() {
    const commentsContainer = document.getElementById('commentsContainer');
    commentsContainer.innerHTML = '';
    
    if (currentArticle.comments > 0) {
        // Mock comments for demo
        const mockComments = [
            { author: 'SecurityFan', text: 'Great article! Very informative.' },
            { author: 'DevSecOps', text: 'Thanks for the detailed explanation.' }
        ];
        
        mockComments.slice(0, currentArticle.comments).forEach((comment, index) => {
            const commentDiv = document.createElement('div');
            commentDiv.style.cssText = 'background: rgba(0, 212, 255, 0.05); padding: 15px; margin: 10px 0; border-left: 3px solid #e94560; border-radius: 4px;';
            commentDiv.innerHTML = `
                <strong style="color: #00d4ff;">${escapeHtml(comment.author)}</strong>
                <p style="margin-top: 8px; color: #ccc;">${escapeHtml(comment.text)}</p>
            `;
            commentsContainer.appendChild(commentDiv);
        });
    }
}

// Add comment
function addComment() {
    const content = document.getElementById('commentContent').value;
    const author = document.getElementById('commentAuthor').value;
    
    if (!content || !author) {
        alert('Please fill in all fields');
        return;
    }
    
    currentArticle.comments++;
    
    // Clear form
    document.getElementById('commentContent').value = '';
    document.getElementById('commentAuthor').value = '';
    
    // Reload comments
    loadComments();
    
    alert('Comment posted successfully!');
}

// Filter by tag
function filterByTag(tag) {
    displayArticles(tag);
    return false;
}

// Modal functions
function openNewArticleModal() {
    document.getElementById('newArticleModal').style.display = 'block';
}

function closeNewArticleModal() {
    document.getElementById('newArticleModal').style.display = 'none';
}

function closeArticleDetail() {
    document.getElementById('articleDetailModal').style.display = 'none';
}

// Form submission
function setupBlogEventListeners() {
    const newArticleForm = document.getElementById('newArticleForm');
    if (newArticleForm) {
        newArticleForm.onsubmit = function(e) {
            e.preventDefault();
            addNewArticle();
        };
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        const newArticleModal = document.getElementById('newArticleModal');
        const articleDetailModal = document.getElementById('articleDetailModal');
        
        if (event.target === newArticleModal) {
            newArticleModal.style.display = 'none';
        }
        if (event.target === articleDetailModal) {
            articleDetailModal.style.display = 'none';
        }
    };
}

function addNewArticle() {
    const title = document.getElementById('articleTitle').value;
    const author = document.getElementById('articleAuthor').value;
    const tagsInput = document.getElementById('articleTags').value;
    const content = document.getElementById('articleContent').value;
    
    if (!title || !author || !tagsInput || !content) {
        alert('Please fill in all fields');
        return;
    }
    
    const tags = tagsInput.split(',').map(tag => tag.trim());
    
    const newArticle = {
        id: Math.max(...blogData.articles.map(a => a.id)) + 1,
        title: title,
        author: author,
        date: new Date().toISOString(),
        tags: tags,
        content: content,
        comments: 0
    };
    
    blogData.articles.push(newArticle);
    
    closeNewArticleModal();
    displayArticles();
    
    // Clear form
    document.getElementById('articleTitle').value = '';
    document.getElementById('articleAuthor').value = '';
    document.getElementById('articleTags').value = '';
    document.getElementById('articleContent').value = '';
    
    alert('Article published successfully!');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function markdownToHtml(markdown) {
    let html = markdown
        .replace(/^### (.*?)$/gm, '<h3 style="color: #00d4ff; margin-top: 15px; margin-bottom: 10px;">$1</h3>')
        .replace(/^## (.*?)$/gm, '<h2 style="color: #00d4ff; margin-top: 20px; margin-bottom: 15px;">$1</h2>')
        .replace(/^- (.*?)$/gm, '<li>$1</li>')
        .replace(/(<li>.*?<\/li>)/s, '<ul style="margin: 10px 0; margin-left: 20px;">$1</ul>')
        .replace(/\n\n/g, '</p><p>');
    
    return '<p>' + html + '</p>';
}
