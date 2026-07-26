// Forum JavaScript Functionality

let currentCategory = 0;
let currentThread = null;
let forumData = null;
const subscriptionStorageKey = 'forum-subscription-chain';
let subscriptionChain = [];

// Initialize forum on page load
document.addEventListener('DOMContentLoaded', function() {
    loadForumData();
    loadSubscriptionChain();
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
    const subscriptionForm = document.getElementById('subscriptionForm');
    if (subscriptionForm) {
        subscriptionForm.onsubmit = async function(e) {
            e.preventDefault();
            await addSubscriptionToChain();
        };
    }

    // Close modals when clicking outside
    window.onclick = function(event) {
        const newThreadModal = document.getElementById('newThreadModal');
        const threadDetailModal = document.getElementById('threadDetailModal');
        const subscriptionModal = document.getElementById('subscriptionModal');
        
        if (event.target === newThreadModal) {
            newThreadModal.style.display = 'none';
        }
        if (event.target === threadDetailModal) {
            threadDetailModal.style.display = 'none';
        }
        if (event.target === subscriptionModal) {
            subscriptionModal.style.display = 'none';
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

function openSubscriptionModal() {
    document.getElementById('subscriptionModal').style.display = 'block';
}

function closeSubscriptionModal() {
    document.getElementById('subscriptionModal').style.display = 'none';
}

function loadSubscriptionChain() {
    const storedChain = localStorage.getItem(subscriptionStorageKey);
    if (storedChain) {
        try {
            subscriptionChain = JSON.parse(storedChain);
        } catch (error) {
            subscriptionChain = [];
        }
    }
    renderSubscriptionChain();
}

async function addSubscriptionToChain() {
    const name = document.getElementById('subscriptionName').value.trim();
    const emailInput = document.getElementById('subscriptionEmail');
    const email = emailInput.value.trim();
    const bio = document.getElementById('subscriptionBio').value.trim();
    const normalizedEmail = normalizeEmail(email);

    if (!name || !email || !bio) {
        alert('Please fill in all required fields: name, email, and bio.');
        return;
    }

    if (!emailInput.checkValidity() || !normalizedEmail) {
        alert('Please enter a valid email address.');
        return;
    }

    const duplicate = subscriptionChain.find(subscriber => subscriber.normalizedEmail === normalizedEmail);
    if (duplicate) {
        alert('This email is already subscribed to the forum chain.');
        return;
    }

    const timestamp = new Date().toISOString();
    const previousHash = subscriptionChain.length ? subscriptionChain[subscriptionChain.length - 1].hash : 'GENESIS';
    const hash = await createChainHash(`${name}|${normalizedEmail}|${bio}|${timestamp}|${previousHash}`);

    subscriptionChain.push({
        id: generateSubscriptionId(),
        name,
        email: email.trim(),
        normalizedEmail,
        bio,
        timestamp,
        previousHash,
        hash
    });

    localStorage.setItem(subscriptionStorageKey, JSON.stringify(subscriptionChain));
    renderSubscriptionChain();
    closeSubscriptionModal();
    document.getElementById('subscriptionForm').reset();
    alert('Subscription added to forum chain.');
}

async function createChainHash(value) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const encoded = new TextEncoder().encode(value);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        return `CH-${hashHex}`;
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0;
    }
    return `CH-${Math.abs(hash).toString(16)}`;
}

function normalizeEmail(email) {
    const trimmedEmail = email.trim().toLowerCase();
    const emailParts = trimmedEmail.split('@');
    if (emailParts.length !== 2) return null;

    let localPart = emailParts[0];
    let domain = emailParts[1];
    const hasValidLocalPart = Boolean(localPart);
    const hasValidDomainFormat = isValidEmailDomain(domain);
    if (!hasValidLocalPart || !hasValidDomainFormat) {
        return null;
    }

    // Googlemail.com addresses are aliases for gmail.com and follow the same dot/plus behavior.
    if (domain === 'googlemail.com' || domain === 'gmail.com') {
        domain = 'gmail.com';
        localPart = localPart.split('+')[0].replace(/\./g, '');
    }

    return `${localPart}@${domain}`;
}

function isValidEmailDomain(domain) {
    return Boolean(
        domain &&
        !domain.startsWith('.') &&
        !domain.endsWith('.') &&
        domain.includes('.') &&
        !domain.includes('..')
    );
}

function generateSubscriptionId() {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        const token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        return `sub-${token}`;
    }
    return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderSubscriptionChain() {
    const summary = document.getElementById('subscriptionChainSummary');
    if (!summary) return;

    if (!subscriptionChain.length) {
        summary.innerHTML = '<p class="subscription-chain-empty">No subscribers in chain yet.</p>';
        return;
    }

    const latestSubscriber = subscriptionChain[subscriptionChain.length - 1];
    summary.innerHTML = `
        <p class="subscription-chain-count">Subscribers in chain: <strong>${subscriptionChain.length}</strong></p>
        <p class="subscription-chain-latest">Latest: ${escapeHtml(latestSubscriber.name)} (${escapeHtml(latestSubscriber.bio)})</p>
    `;
}
