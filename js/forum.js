// Forum JavaScript Functionality

let currentCategory = 0;
let currentThread = null;
let forumData = null;
let searchQuery = '';
let sortBy = 'latest';
let threadType = 'all';

// Initialize forum on page load
document.addEventListener('DOMContentLoaded', function () {
    loadForumData();
    setupEventListeners();
});

// Load forum data
function loadForumData() {
    fetch('data/forum-data.json')
        .then(response => response.json())
        .then(data => {
            forumData = data;
            populateCategories();
            displayThreads(currentCategory);
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

function normalizeThread(thread) {
    return {
        ...thread,
        pinned: !!thread.pinned,
        locked: !!thread.locked,
        flair: thread.flair || 'discussion',
        upvotes: Number(thread.upvotes || 0),
        downvotes: Number(thread.downvotes || 0),
        lastActivity: thread.lastActivity || thread.timestamp
    };
}

function threadScore(thread) {
    return Number(thread.upvotes || 0) - Number(thread.downvotes || 0);
}

function getFilteredThreads(categoryId) {
    return forumData.threads
        .map(normalizeThread)
        .filter(thread => thread.categoryId === categoryId)
        .filter(thread => {
            if (threadType === 'pinned') return thread.pinned;
            if (threadType === 'open') return !thread.locked;
            return true;
        })
        .filter(thread => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return thread.title.toLowerCase().includes(q) || thread.content.toLowerCase().includes(q) || thread.author.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            if (sortBy === 'popular') return Number(b.views || 0) - Number(a.views || 0);
            if (sortBy === 'score') return threadScore(b) - threadScore(a);
            return new Date(b.lastActivity || b.timestamp) - new Date(a.lastActivity || a.timestamp);
        });
}

function updateBoardStats(threads) {
    const statsNode = document.getElementById('board-stats');
    const totalReplies = threads.reduce((sum, thread) => sum + Number(thread.replies || 0), 0);
    const lockedCount = threads.filter(thread => thread.locked).length;
    const pinnedCount = threads.filter(thread => thread.pinned).length;
    statsNode.innerHTML = `
        <span>${threads.length} threads</span>
        <span>${totalReplies} replies</span>
        <span>${pinnedCount} pinned</span>
        <span>${lockedCount} locked</span>
    `;
}

function threadBadgesHtml(thread) {
    const badges = [`<span class="thread-badge flair">${escapeHtml(thread.flair)}</span>`];
    if (thread.pinned) badges.push('<span class="thread-badge pinned">Pinned</span>');
    if (thread.locked) badges.push('<span class="thread-badge locked">Locked</span>');
    return badges.join('');
}

// Display threads for category
function displayThreads(categoryId) {
    if (!forumData) return;

    const category = forumData.categories.find(c => c.id === categoryId);
    document.getElementById('category-title').textContent = category ? category.name : 'Forum';

    const threadsContainer = document.getElementById('threads-container');
    threadsContainer.innerHTML = '';

    const categoryThreads = getFilteredThreads(categoryId);
    updateBoardStats(categoryThreads);

    if (categoryThreads.length === 0) {
        threadsContainer.innerHTML = '<p style="text-align: center; color: #999;">No matching threads yet.</p>';
        return;
    }

    categoryThreads.forEach(thread => {
        const threadCard = document.createElement('div');
        threadCard.className = 'thread-card';
        threadCard.onclick = () => viewThread(thread.id);

        const preview = thread.content.substring(0, 150) + (thread.content.length > 150 ? '...' : '');

        threadCard.innerHTML = `
            <div class="thread-topline">${threadBadgesHtml(thread)}</div>
            <h3>${escapeHtml(thread.title)}</h3>
            <div class="thread-meta">by <strong>${escapeHtml(thread.author)}</strong> • ${formatDate(thread.timestamp)} • last active ${formatDate(thread.lastActivity)}</div>
            <p class="thread-preview">${escapeHtml(preview)}</p>
            <div class="thread-stats">
                <span>💬 ${thread.replies} replies</span>
                <span>👁️ ${thread.views} views</span>
                <span>⬆️ ${threadScore(thread)} score</span>
            </div>
        `;

        threadsContainer.appendChild(threadCard);
    });
}

function quoteReply(author, content) {
    const replyContent = document.getElementById('replyContent');
    if (!replyContent) return;
    replyContent.value = `> ${author} wrote:\n> ${content.replace(/\n/g, '\n> ')}\n\n`;
    replyContent.focus();
}

// View thread details
function viewThread(threadId) {
    currentThread = forumData.threads.map(normalizeThread).find(t => t.id === threadId);
    const modal = document.getElementById('threadDetailModal');
    const detailDiv = document.getElementById('threadDetail');
    const replyForm = document.getElementById('newReplyForm');

    if (!currentThread) return;

    let repliesHtml = '<div style="margin-top: 20px;">';
    if (currentThread.replies_data && currentThread.replies_data.length > 0) {
        repliesHtml += '<h4>Replies:</h4>';
        currentThread.replies_data.forEach(reply => {
            const rawAuthor = String(reply.author || '');
            const rawContent = String(reply.content || '');
            const safeAuthor = escapeHtml(reply.author);
            const safeContent = escapeHtml(reply.content);
            const encodedAuthor = encodeURIComponent(rawAuthor);
            const encodedContent = encodeURIComponent(rawContent);
            repliesHtml += `
                <div style="background: rgba(0, 212, 255, 0.05); padding: 15px; margin: 10px 0; border-left: 3px solid #e94560; border-radius: 4px;">
                    <strong style="color: #00d4ff;">${safeAuthor}</strong> • ${formatDate(reply.timestamp)}
                    <p style="margin-top: 10px;">${safeContent}</p>
                    <button class="quote-btn" data-author="${encodedAuthor}" data-content="${encodedContent}">Quote</button>
                </div>
            `;
        });
    } else {
        repliesHtml += '<p style="color: #999;">No replies yet.</p>';
    }
    repliesHtml += '</div>';

    detailDiv.innerHTML = `
        <div class="thread-topline">${threadBadgesHtml(currentThread)}</div>
        <h3 style="color: #00d4ff;">${escapeHtml(currentThread.title)}</h3>
        <div style="color: #999; margin-bottom: 15px;">
            by <strong>${escapeHtml(currentThread.author)}</strong> • ${formatDate(currentThread.timestamp)}
        </div>
        <div style="background: rgba(0, 212, 255, 0.1); padding: 20px; border-radius: 4px; margin-bottom: 20px;">
            <p>${escapeHtml(currentThread.content)}</p>
        </div>
        ${repliesHtml}
    `;

    if (currentThread.locked) {
        replyForm.innerHTML = '<p class="locked-message">🔒 This thread is locked. New replies are disabled.</p>';
    } else {
        replyForm.innerHTML = `
            <textarea placeholder="Write your reply..." id="replyContent" rows="4" required></textarea>
            <input type="text" id="replyAuthor" placeholder="Your Name" required>
            <button type="submit" class="btn-primary">Post Reply</button>
        `;
        replyForm.onsubmit = function (e) {
            e.preventDefault();
            addReply();
        };
    }

    detailDiv.querySelectorAll('.quote-btn').forEach(button => {
        button.addEventListener('click', function () {
            quoteReply(
                decodeURIComponent(this.dataset.author || ''),
                decodeURIComponent(this.dataset.content || '')
            );
        });
    });

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

    const sourceThread = forumData.threads.find(thread => thread.id === currentThread.id);
    if (!sourceThread || sourceThread.locked) {
        alert('This thread is locked.');
        return;
    }

    const newReply = {
        id: (sourceThread.replies_data?.length || 0) + 1,
        author: author,
        content: content,
        timestamp: new Date().toISOString()
    };

    if (!sourceThread.replies_data) {
        sourceThread.replies_data = [];
    }
    sourceThread.replies_data.push(newReply);
    sourceThread.replies = Number(sourceThread.replies || 0) + 1;
    sourceThread.lastActivity = newReply.timestamp;

    // Refresh thread view
    viewThread(sourceThread.id);
    displayThreads(currentCategory);

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

function addNewThread() {
    const title = document.getElementById('threadTitle').value;
    const content = document.getElementById('threadContent').value;
    const author = document.getElementById('threadAuthor').value;

    if (!title || !content || !author) {
        alert('Please fill in all fields');
        return;
    }

    const now = new Date().toISOString();
    const newThread = {
        id: Math.max(...forumData.threads.map(t => t.id), 0) + 1,
        categoryId: currentCategory,
        title: title,
        author: author,
        content: content,
        timestamp: now,
        lastActivity: now,
        replies: 0,
        views: 0,
        flair: 'discussion',
        pinned: false,
        locked: false,
        upvotes: 1,
        downvotes: 0,
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
    const newThreadForm = document.getElementById('newThreadForm');
    const searchInput = document.getElementById('threadSearch');
    const sortSelect = document.getElementById('threadSort');
    const typeSelect = document.getElementById('threadType');

    if (newThreadForm) {
        newThreadForm.onsubmit = function (e) {
            e.preventDefault();
            addNewThread();
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', function (event) {
            searchQuery = event.target.value.trim();
            displayThreads(currentCategory);
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function (event) {
            sortBy = event.target.value;
            displayThreads(currentCategory);
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener('change', function (event) {
            threadType = event.target.value;
            displayThreads(currentCategory);
        });
    }

    // Close modals when clicking outside
    window.onclick = function (event) {
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
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
