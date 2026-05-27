// Forum JavaScript Functionality

let currentCategory = 0;
let currentThread = null;
let forumData = null;

// Initialize forum on page load
document.addEventListener('DOMContentLoaded', function() {
    loadForumData();
    setupEventListeners();
    displayThreads(0);
});

// Load forum data
function loadForumData() {
    fetch('data/forum-data.json')
        .then(response => response.json())
        .then(data => {
            forumData = data;
            populateCategories();
        })
        .catch(error => console.error('Error loading forum data:', error));
}

// Populate categories sidebar
function populateCategories() {
    const categoriesList = document.getElementById('categories-list');
    categoriesList.innerHTML = '';
    
    forumData.categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#cat-${category.id}" data-category="${category.id}" onclick="selectCategory(${category.id})">${category.emoji} ${category.name}</a>`;
        categoriesList.appendChild(li);
    });
}

// Select category
function selectCategory(categoryId) {
    currentCategory = categoryId;
    displayThreads(categoryId);
}

// Display threads for category
function displayThreads(categoryId) {
    const category = forumData.categories.find(c => c.id === categoryId);
    document.getElementById('category-title').textContent = category.name;
    
    const threadsContainer = document.getElementById('threads-container');
    threadsContainer.innerHTML = '';
    
    const categoryThreads = forumData.threads.filter(t => t.categoryId === categoryId);
    
    if (categoryThreads.length === 0) {
        threadsContainer.innerHTML = '<p style="text-align: center; color: #999;">No threads yet. Be the first to post!</p>';
        return;
    }
    
    categoryThreads.forEach(thread => {
        const threadCard = document.createElement('div');
        threadCard.className = 'thread-card';
        threadCard.onclick = () => viewThread(thread.id);
        
        const preview = thread.content.substring(0, 150) + (thread.content.length > 150 ? '...' : '');
        
        threadCard.innerHTML = `
            <h3>${escapeHtml(thread.title)}</h3>
            <div class="thread-meta">by <strong>${escapeHtml(thread.author)}</strong> • ${formatDate(thread.timestamp)}</div>
            <p class="thread-preview">${escapeHtml(preview)}</p>
            <div class="thread-stats">
                <span>💬 ${thread.replies} replies</span>
                <span>👁️ ${thread.views} views</span>
            </div>
        `;
        
        threadsContainer.appendChild(threadCard);
    });
}

// View thread details
function viewThread(threadId) {
    currentThread = forumData.threads.find(t => t.id === threadId);
    const modal = document.getElementById('threadDetailModal');
    const detailDiv = document.getElementById('threadDetail');
    
    let repliesHtml = '<div style="margin-top: 20px;">';
    if (currentThread.replies_data && currentThread.replies_data.length > 0) {
        repliesHtml += '<h4>Replies:</h4>';
        currentThread.replies_data.forEach(reply => {
            repliesHtml += `
                <div style="background: rgba(0, 212, 255, 0.05); padding: 15px; margin: 10px 0; border-left: 3px solid #e94560; border-radius: 4px;">
                    <strong style="color: #00d4ff;">${escapeHtml(reply.author)}</strong> • ${formatDate(reply.timestamp)}
                    <p style="margin-top: 10px;">${escapeHtml(reply.content)}</p>
                </div>
            `;
        });
    } else {
        repliesHtml += '<p style="color: #999;">No replies yet.</p>';
    }
    repliesHtml += '</div>';
    
    detailDiv.innerHTML = `
        <h3 style="color: #00d4ff;">${escapeHtml(currentThread.title)}</h3>
        <div style="color: #999; margin-bottom: 15px;">
            by <strong>${escapeHtml(currentThread.author)}</strong> • ${formatDate(currentThread.timestamp)}
        </div>
        <div style="background: rgba(0, 212, 255, 0.1); padding: 20px; border-radius: 4px; margin-bottom: 20px;">
            <p>${escapeHtml(currentThread.content)}</p>
        </div>
        ${repliesHtml}
    `;
    
    document.getElementById('newReplyForm').onsubmit = function(e) {
        e.preventDefault();
        addReply();
    };
    
    modal.style.display = 'block';
}

// Add reply to thread
function addReply() {
    const content = document.getElementById('replyContent').value;
    const author = document.getElementById('replyAuthor').value;
    
    if (!content || !author) {
        alert('Please fill in all fields');
        return;
    }
    
    const newReply = {
        id: (currentThread.replies_data?.length || 0) + 1,
        author: author,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    if (!currentThread.replies_data) {
        currentThread.replies_data = [];
    }
    currentThread.replies_data.push(newReply);
    currentThread.replies++;
    
    // Refresh thread view
    viewThread(currentThread.id);
    
    // Clear form
    document.getElementById('replyContent').value = '';
    document.getElementById('replyAuthor').value = '';
    
    alert('Reply posted successfully!');
}

// Modal functions
function openNewThreadModal() {
    document.getElementById('newThreadModal').style.display = 'block';
}

function closeNewThreadModal() {
    document.getElementById('newThreadModal').style.display = 'none';
}

function closeThreadDetail() {
    document.getElementById('threadDetailModal').style.display = 'none';
}

// Form submission
document.addEventListener('DOMContentLoaded', function() {
    const newThreadForm = document.getElementById('newThreadForm');
    if (newThreadForm) {
        newThreadForm.onsubmit = function(e) {
            e.preventDefault();
            addNewThread();
        };
    }
});

function addNewThread() {
    const title = document.getElementById('threadTitle').value;
    const content = document.getElementById('threadContent').value;
    const author = document.getElementById('threadAuthor').value;
    
    if (!title || !content || !author) {
        alert('Please fill in all fields');
        return;
    }
    
    const newThread = {
        id: Math.max(...forumData.threads.map(t => t.id)) + 1,
        categoryId: currentCategory,
        title: title,
        author: author,
        content: content,
        timestamp: new Date().toISOString(),
        replies: 0,
        views: 0,
        replies_data: []
    };
    
    forumData.threads.push(newThread);
    
    closeNewThreadModal();
    displayThreads(currentCategory);
    
    // Clear form
    document.getElementById('threadTitle').value = '';
    document.getElementById('threadContent').value = '';
    document.getElementById('threadAuthor').value = '';
    
    alert('Thread created successfully!');
}

// Setup event listeners
function setupEventListeners() {
    // Close modals when clicking outside
    window.onclick = function(event) {
        const newThreadModal = document.getElementById('newThreadModal');
        const threadDetailModal = document.getElementById('threadDetailModal');
        
        if (event.target === newThreadModal) {
            newThreadModal.style.display = 'none';
        }
        if (event.target === threadDetailModal) {
            threadDetailModal.style.display = 'none';
        }
    };
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
