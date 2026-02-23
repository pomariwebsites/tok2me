// Store message IDs for reactions
let messageReactions = {};
let pendingMessages = new Map(); // Store pending messages for instant display
let messageQueue = []; // Queue for offline messages

// Browser-based smart features
const browserInfo = {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    connection: navigator.connection?.effectiveType || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
};

// Get time-based greeting
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 20) return 'Good evening';
    return 'Good night';
}

// Get current time formatted
function getCurrentTime() {
    return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

// Get current date
function getCurrentDate() {
    return new Date().toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Smart suggestions based on time and context
const suggestionCategories = {
    morning: [
        { icon: 'sun', text: 'Plan my day', prompt: 'Help me plan my day effectively' },
        { icon: 'coffee', text: 'Morning routine', prompt: 'Suggest a productive morning routine' },
        { icon: 'tasks', text: 'Daily goals', prompt: 'Help me set daily goals' },
        { icon: 'brain', text: 'Morning mindset', prompt: 'Give me a positive morning mindset tip' }
    ],
    afternoon: [
        { icon: 'chart-line', text: 'Business strategy', prompt: 'Analyze my business strategy' },
        { icon: 'rocket', text: 'Productivity', prompt: 'How to boost afternoon productivity' },
        { icon: 'users', text: 'Team meeting', prompt: 'Tips for effective team meetings' },
        { icon: 'clock', text: 'Time management', prompt: 'Help with time management' }
    ],
    evening: [
        { icon: 'book', text: 'Learning', prompt: 'Recommend learning resources' },
        { icon: 'meditate', text: 'Reflection', prompt: 'Guide me through evening reflection' },
        { icon: 'moon', text: 'Wind down', prompt: 'Suggest relaxing activities' },
        { icon: 'journal', text: 'Journaling', prompt: 'Evening journaling prompts' }
    ],
    business: [
        { icon: 'chart-pie', text: 'Market analysis', prompt: 'Analyze current market trends' },
        { icon: 'bullseye', text: 'Marketing plan', prompt: 'Create a marketing plan' },
        { icon: 'handshake', text: 'Networking', prompt: 'Networking tips' },
        { icon: 'lightbulb', text: 'Innovation', prompt: 'Innovation strategies' }
    ],
    personal: [
        { icon: 'heart', text: 'Wellness', prompt: 'Personal wellness tips' },
        { icon: 'dumbbell', text: 'Fitness', prompt: 'Fitness routine suggestions' },
        { icon: 'book-open', text: 'Reading', prompt: 'Book recommendations' },
        { icon: 'compass', text: 'Life goals', prompt: 'Help define life goals' }
    ]
};

// Get smart suggestions based on time
function getSmartSuggestions() {
    const hour = new Date().getHours();
    let timeCategory = 'afternoon';
    
    if (hour < 12) timeCategory = 'morning';
    else if (hour >= 17) timeCategory = 'evening';
    
    return {
        timeBased: suggestionCategories[timeCategory],
        quickActions: suggestionCategories.business.slice(0, 2),
        personalGrowth: suggestionCategories.personal.slice(0, 2)
    };
}

// Update suggestion chips with smart suggestions
function updateSmartSuggestions() {
    const suggestions = getSmartSuggestions();
    const suggestionsRow = document.querySelector('.suggestions-row');
    if (!suggestionsRow) return;
    
    suggestionsRow.innerHTML = `
        <div class="suggestions-container">
            <div class="suggestion-group">
                <span class="suggestion-group-label">
                    <i class="fas fa-clock text-green-500 mr-1"></i>Based on time
                </span>
                <div class="flex flex-wrap gap-2">
                    ${suggestions.timeBased.map(s => `
                        <button class="suggestion-chip" onclick="useSuggestion('${s.prompt}')">
                            <i class="fas fa-${s.icon} mr-2"></i>${s.text}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="suggestion-group">
                <span class="suggestion-group-label">
                    <i class="fas fa-briefcase text-green-500 mr-1"></i>Business
                </span>
                <div class="flex flex-wrap gap-2">
                    ${suggestions.quickActions.map(s => `
                        <button class="suggestion-chip" onclick="useSuggestion('${s.prompt}')">
                            <i class="fas fa-${s.icon} mr-2"></i>${s.text}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="suggestion-group">
                <span class="suggestion-group-label">
                    <i class="fas fa-user text-green-500 mr-1"></i>Personal
                </span>
                <div class="flex flex-wrap gap-2">
                    ${suggestions.personalGrowth.map(s => `
                        <button class="suggestion-chip" onclick="useSuggestion('${s.prompt}')">
                            <i class="fas fa-${s.icon} mr-2"></i>${s.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Instant message display function
function displayMessageInstantly(message, role = 'user') {
    const messageId = 'msg-' + Date.now() + '-' + role + '-' + Math.random().toString(36).substr(2, 9);
    
    if (role === 'user') {
        // Display user message instantly
        appendUserMessage(message, messageId, { instant: true });
    } else {
        // Display assistant message with streaming effect
        const assistantMessageDiv = createEnhancedAssistantMessage(messageId, true);
        messagesArea.appendChild(assistantMessageDiv);
        
        const streamingMessage = document.getElementById(`streaming-${messageId}`);
        if (streamingMessage) {
            streamingMessage.innerHTML = formatSmartMessage(message);
        }
        
        const actionsDiv = document.getElementById(`actions-${messageId}`);
        addSmartHoverEffects(assistantMessageDiv, actionsDiv, messageId);
        
        // Store message
        messageReactions[messageId] = {
            content: message,
            reactions: [],
            timestamp: new Date().toISOString(),
            instant: true
        };
    }
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
    return messageId;
}

// Enhanced sendMessage with instant display
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Clear input instantly
    messageInput.value = '';
    
    // Track message metadata
    const messageMetadata = {
        timestamp: new Date().toISOString(),
        timeZone: browserInfo.timeZone,
        language: browserInfo.language,
        connectionType: browserInfo.connection,
        instant: true
    };
    
    // Display user message instantly
    const userMessageId = displayMessageInstantly(message, 'user');
    
    // Store in pending messages
    pendingMessages.set(userMessageId, {
        message,
        timestamp: Date.now(),
        retryCount: 0
    });
    
    // Show instant typing indicator
    const typingIndicatorId = showInstantTypingIndicator();
    
    try {
        // Check online status
        if (!navigator.onLine) {
            // Queue message for later
            queueOfflineMessage(message, userMessageId);
            removeTypingIndicator(typingIndicatorId);
            showOfflineNotification();
            return;
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Timezone': browserInfo.timeZone,
                'X-Language': browserInfo.language,
                'X-Instant-Message': 'true'
            },
            body: JSON.stringify({
                message: message,
                chat_id: currentChatId,
                metadata: messageMetadata,
                context: {
                    timeOfDay: getTimeBasedGreeting(),
                    browserInfo: browserInfo
                }
            })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        // Remove from pending
        pendingMessages.delete(userMessageId);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        const assistantMessageId = 'msg-' + Date.now() + '-assistant-' + Math.random().toString(36).substr(2, 9);
        
        // Remove typing indicator
        removeTypingIndicator(typingIndicatorId);
        
        // Create and display assistant message instantly
        const assistantMessageDiv = createEnhancedAssistantMessage(assistantMessageId, true);
        messagesArea.appendChild(assistantMessageDiv);
        
        const streamingMessage = document.getElementById(`streaming-${assistantMessageId}`);
        const actionsDiv = document.getElementById(`actions-${assistantMessageId}`);
        
        addSmartHoverEffects(assistantMessageDiv, actionsDiv, assistantMessageId);
        
        // Stream the response
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            assistantMessage += parsed.content;
                            streamingMessage.innerHTML = formatSmartMessage(assistantMessage);
                            messagesArea.scrollTop = messagesArea.scrollHeight;
                        }
                    } catch (e) {
                        console.log('Parse error:', e);
                    }
                }
            }
        }
        
        // Store complete message
        messageReactions[assistantMessageId] = {
            content: assistantMessage,
            reactions: [],
            timestamp: new Date().toISOString(),
            metadata: messageMetadata
        };
        
        // Update chat history if new chat
        if (!currentChatId) {
            // Get new chat ID from response headers or body
            const newChatId = response.headers.get('X-Chat-Id');
            if (newChatId) {
                currentChatId = newChatId;
            }
            loadChatHistory();
        }
        
        // Update suggestions
        updateSmartSuggestions();
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator(typingIndicatorId);
        
        // Mark message as failed but keep it visible
        markMessageAsFailed(userMessageId);
        
        // Show retry option
        showRetryOption(message, userMessageId);
    }
}

// Show instant typing indicator
function showInstantTypingIndicator() {
    const indicatorId = 'typing-' + Date.now();
    const indicator = document.createElement('div');
    indicator.id = indicatorId;
    indicator.className = 'flex mb-4 message-enter typing-indicator-container';
    indicator.innerHTML = `
        <div class="flex items-start">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white mr-3 shadow-md">
                <i class="fas fa-robot text-sm"></i>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 py-4 px-5">
                <div class="flex items-center space-x-2">
                    <div class="typing-dot bg-green-500"></div>
                    <div class="typing-dot bg-green-500"></div>
                    <div class="typing-dot bg-green-500"></div>
                    <span class="text-sm text-gray-500 ml-2">AI is thinking...</span>
                </div>
                <div class="text-xs text-gray-400 mt-2 instant-badge">
                    <i class="fas fa-bolt mr-1"></i>Instant response
                </div>
            </div>
        </div>
    `;
    messagesArea.appendChild(indicator);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    return indicatorId;
}

// Remove typing indicator
function removeTypingIndicator(indicatorId) {
    const indicator = document.getElementById(indicatorId);
    if (indicator) {
        indicator.remove();
    }
}

// Queue offline message
function queueOfflineMessage(message, messageId) {
    messageQueue.push({
        id: messageId,
        message: message,
        timestamp: Date.now(),
        chatId: currentChatId
    });
    
    // Store in localStorage for persistence
    localStorage.setItem('messageQueue', JSON.stringify(messageQueue));
}

// Show offline notification
function showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-slide-down flex items-center space-x-3';
    notification.innerHTML = `
        <i class="fas fa-wifi-slash"></i>
        <span>You're offline. Message saved for later.</span>
        <button onclick="this.parentElement.remove()" class="ml-4 hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
}

// Mark message as failed
function markMessageAsFailed(messageId) {
    const messageDiv = document.getElementById(messageId);
    if (messageDiv) {
        messageDiv.classList.add('message-failed');
        const actionsDiv = document.getElementById(`actions-${messageId}`);
        if (actionsDiv) {
            actionsDiv.innerHTML += `
                <button onclick="retryMessage('${messageId}')" class="text-xs text-red-500 hover:text-red-600 transition-colors" title="Retry">
                    <i class="fas fa-redo-alt mr-1"></i>Retry
                </button>
            `;
        }
    }
}

// Show retry option
function showRetryOption(message, messageId) {
    const retryDiv = document.createElement('div');
    retryDiv.id = `retry-${messageId}`;
    retryDiv.className = 'flex justify-center mb-4';
    retryDiv.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl px-4 py-2 flex items-center space-x-3">
            <i class="fas fa-exclamation-circle text-red-500"></i>
            <span class="text-sm text-red-600">Message failed to send</span>
            <button onclick="retryMessage('${messageId}')" class="text-sm bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition">
                <i class="fas fa-redo-alt mr-1"></i>Retry
            </button>
        </div>
    `;
    messagesArea.appendChild(retryDiv);
}

// Retry failed message
async function retryMessage(messageId) {
    const messageDiv = document.getElementById(messageId);
    const retryDiv = document.getElementById(`retry-${messageId}`);
    
    if (retryDiv) retryDiv.remove();
    
    if (messageDiv) {
        messageDiv.classList.remove('message-failed');
        const pendingMessage = pendingMessages.get(messageId);
        
        if (pendingMessage) {
            messageInput.value = pendingMessage.message;
            pendingMessages.delete(messageId);
            sendMessage();
        }
    }
}

// Process offline queue when back online
window.addEventListener('online', () => {
    const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]');
    if (queue.length > 0) {
        showToast(`Sending ${queue.length} queued messages...`, 'info');
        
        queue.forEach(async (item) => {
            try {
                messageInput.value = item.message;
                currentChatId = item.chatId;
                await sendMessage();
                
                // Remove from queue
                const updatedQueue = JSON.parse(localStorage.getItem('messageQueue') || '[]');
                const newQueue = updatedQueue.filter(q => q.id !== item.id);
                localStorage.setItem('messageQueue', JSON.stringify(newQueue));
            } catch (error) {
                console.error('Failed to send queued message:', error);
            }
        });
    }
});

// Create enhanced assistant message with instant flag
function createEnhancedAssistantMessage(messageId, instant = false) {
    const div = document.createElement('div');
    div.id = messageId;
    div.className = 'flex mb-4 message-enter assistant-message-container';
    div.innerHTML = `
        <div class="flex items-start group w-full">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center justify-center mr-3 flex-shrink-0 shadow-md">
                <i class="fas fa-robot text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center mb-1">
                    <span class="text-sm font-semibold text-gray-700">TOK2ME AI</span>
                    <span class="text-xs text-gray-400 ml-2" id="time-${messageId}">${getCurrentTime()}</span>
                    ${instant ? '<span class="text-xs text-green-500 ml-2"><i class="fas fa-bolt"></i> Instant</span>' : ''}
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 py-3 px-4 inline-block max-w-[85%] relative"
                     id="streaming-${messageId}">
                </div>
                <div class="message-actions hidden mt-2 space-x-3" id="actions-${messageId}">
                    <button onclick="copyMessage('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="Copy">
                        <i class="far fa-copy mr-1"></i>Copy
                    </button>
                    <button onclick="shareMessage('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="Share">
                        <i class="fas fa-share-alt mr-1"></i>Share
                    </button>
                    <button onclick="regenerateResponse('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="Regenerate">
                        <i class="fas fa-redo-alt mr-1"></i>Regenerate
                    </button>
                    <div class="relative inline-block">
                        <button onclick="toggleReactions('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="React">
                            <i class="far fa-smile mr-1"></i>React
                        </button>
                        <div id="reactions-${messageId}" class="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl p-2 hidden reaction-panel border border-gray-100" style="z-index: 50; min-width: 200px;">
                            <div class="text-xs text-gray-500 mb-2">React to this message</div>
                            <div class="flex flex-wrap gap-1">
                                <button onclick="addReaction('${messageId}', '👍')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">👍</button>
                                <button onclick="addReaction('${messageId}', '❤️')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">❤️</button>
                                <button onclick="addReaction('${messageId}', '😂')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">😂</button>
                                <button onclick="addReaction('${messageId}', '🎯')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">🎯</button>
                                <button onclick="addReaction('${messageId}', '💡')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">💡</button>
                                <button onclick="addReaction('${messageId}', '🤔')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">🤔</button>
                                <button onclick="addReaction('${messageId}', '👏')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">👏</button>
                                <button onclick="addReaction('${messageId}', '🔥')" class="hover:bg-gray-50 p-2 rounded-lg text-xl transition-transform hover:scale-125">🔥</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="reactions-display-${messageId}" class="flex flex-wrap gap-1 mt-2"></div>
            </div>
        </div>
    `;
    return div;
}

// Enhanced user message with instant display
function appendUserMessage(message, messageId, metadata = {}) {
    const messageDiv = document.createElement('div');
    messageDiv.id = messageId;
    messageDiv.className = 'flex mb-4 message-enter user-message-container justify-end';
    messageDiv.innerHTML = `
        <div class="flex items-start group flex-row-reverse max-w-[85%]">
            <div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl py-3 px-4 shadow-md"
                 id="content-${messageId}">
                <div class="flex items-center justify-end mb-1">
                    <span class="text-xs text-green-100">${getCurrentTime()}</span>
                    <span class="text-xs text-green-100 ml-2">You</span>
                    ${metadata.instant ? '<span class="text-xs text-green-200 ml-2"><i class="fas fa-bolt"></i> Sent</span>' : ''}
                </div>
                ${formatSmartMessage(message)}
            </div>
            <div class="message-actions hidden mt-2 space-x-3 mr-2" id="actions-${messageId}">
                <button onclick="copyMessage('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="Copy">
                    <i class="far fa-copy mr-1"></i>Copy
                </button>
                <button onclick="editMessage('${messageId}')" class="text-xs text-gray-500 hover:text-green-600 transition-colors" title="Edit">
                    <i class="far fa-edit mr-1"></i>Edit
                </button>
            </div>
        </div>
    `;
    
    messagesArea.appendChild(messageDiv);
    
    // Store message metadata
    if (!messageReactions[messageId]) {
        messageReactions[messageId] = {
            content: message,
            reactions: [],
            metadata: metadata
        };
    }
    
    // Add hover effects
    const actionsDiv = document.getElementById(`actions-${messageId}`);
    messageDiv.addEventListener('mouseenter', () => {
        actionsDiv.classList.remove('hidden');
    });
    
    messageDiv.addEventListener('mouseleave', () => {
        actionsDiv.classList.add('hidden');
    });
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Format message with smart features
function formatSmartMessage(text) {
    // Detect and format links
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-500 hover:underline break-all">$1</a>');
    
    // Detect and format email addresses
    text = text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g, 
        '<a href="mailto:$1" class="text-blue-500 hover:underline">$1</a>');
    
    // Format lists
    text = text.replace(/^[-*]\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Format numbered lists
    text = text.replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    
    // Format code blocks
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, 
        '<pre class="bg-gray-800 text-white p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">$2</code></pre>');
    
    // Format inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-500 px-1 rounded text-sm">$1</code>');
    
    // Format bold and italic
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Format line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Add smart hover effects
function addSmartHoverEffects(container, actionsDiv, messageId) {
    let hideTimeout;
    
    container.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        actionsDiv.classList.remove('hidden');
        
        // Update time display
        const timeSpan = document.getElementById(`time-${messageId}`);
        if (timeSpan) {
            timeSpan.innerHTML = getCurrentTime();
        }
    });
    
    container.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
            actionsDiv.classList.add('hidden');
            
            // Hide reactions panel if open
            const reactionsPanel = document.getElementById(`reactions-${messageId}`);
            if (reactionsPanel) {
                reactionsPanel.classList.add('hidden');
            }
        }, 300);
    });
    
    // Prevent hiding when interacting with actions
    actionsDiv.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });
    
    actionsDiv.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
            actionsDiv.classList.add('hidden');
        }, 300);
    });
}

// Copy message to clipboard
async function copyMessage(messageId) {
    const contentElement = document.getElementById(`content-${messageId}`) || 
                          document.getElementById(`streaming-${messageId}`);
    
    if (contentElement) {
        const text = contentElement.innerText || contentElement.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            showToast('Message copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy message', 'error');
        }
    }
}

// Share message
async function shareMessage(messageId) {
    const contentElement = document.getElementById(`streaming-${messageId}`);
    
    if (contentElement && navigator.share) {
        const text = contentElement.innerText || contentElement.textContent;
        
        try {
            await navigator.share({
                title: 'TOK2ME AI Response',
                text: text,
                url: window.location.href
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed: ', err);
                fallbackShare(text);
            }
        }
    } else {
        const contentElement = document.getElementById(`streaming-${messageId}`);
        const text = contentElement.innerText || contentElement.textContent;
        fallbackShare(text);
    }
}

// Fallback share method
function fallbackShare(text) {
    copyMessage(messageId);
    showToast('Message copied! You can now share it manually.', 'info');
}

// Edit user message
function editMessage(messageId) {
    const contentElement = document.getElementById(`content-${messageId}`);
    const originalText = contentElement.innerText || contentElement.textContent;
    
    const editDiv = document.createElement('div');
    editDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    editDiv.id = 'edit-overlay';
    editDiv.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 class="text-lg font-bold mb-4">Edit Message</h3>
            <textarea id="edit-textarea" class="w-full border rounded-lg p-3 mb-4" rows="4">${originalText}</textarea>
            <div class="flex justify-end space-x-2">
                <button onclick="cancelEdit()" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button onclick="saveEdit('${messageId}')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(editDiv);
}

// Cancel edit
function cancelEdit() {
    const overlay = document.getElementById('edit-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Save edited message
function saveEdit(messageId) {
    const newText = document.getElementById('edit-textarea').value;
    const contentElement = document.getElementById(`content-${messageId}`);
    
    if (contentElement && newText.trim()) {
        contentElement.innerHTML = formatSmartMessage(newText);
        cancelEdit();
        showToast('Message updated', 'success');
    }
}

// Toggle reactions panel
function toggleReactions(messageId) {
    const panel = document.getElementById(`reactions-${messageId}`);
    if (panel) {
        panel.classList.toggle('hidden');
        
        document.querySelectorAll('.reaction-panel').forEach(p => {
            if (p.id !== `reactions-${messageId}`) {
                p.classList.add('hidden');
            }
        });
    }
}

// Add reaction to message
function addReaction(messageId, reaction) {
    if (!messageReactions[messageId]) {
        messageReactions[messageId] = { reactions: [] };
    }
    
    const index = messageReactions[messageId].reactions.indexOf(reaction);
    if (index > -1) {
        messageReactions[messageId].reactions.splice(index, 1);
    } else {
        messageReactions[messageId].reactions.push(reaction);
    }
    
    updateReactionsDisplay(messageId);
    
    const panel = document.getElementById(`reactions-${messageId}`);
    if (panel) {
        panel.classList.add('hidden');
    }
}

// Update reactions display
function updateReactionsDisplay(messageId) {
    const displayDiv = document.getElementById(`reactions-display-${messageId}`);
    if (displayDiv && messageReactions[messageId]) {
        const reactions = messageReactions[messageId].reactions;
        
        if (reactions.length > 0) {
            const reactionCounts = reactions.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
            }, {});
            
            displayDiv.innerHTML = Object.entries(reactionCounts)
                .map(([reaction, count]) => `
                    <span class="inline-flex items-center bg-gray-100 rounded-full px-2 py-1 text-xs">
                        ${reaction} ${count}
                    </span>
                `).join('');
            
            displayDiv.classList.remove('hidden');
        } else {
            displayDiv.innerHTML = '';
            displayDiv.classList.add('hidden');
        }
    }
}

// Use suggestion
function useSuggestion(suggestion) {
    messageInput.value = suggestion;
    sendMessage();
}

// Regenerate response
function regenerateResponse(messageId) {
    // Find the last user message and resend it
    const userMessages = document.querySelectorAll('.user-message-container');
    if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        const contentElement = lastUserMessage.querySelector('[id^="content-"]');
        if (contentElement) {
            const text = contentElement.innerText || contentElement.textContent;
            messageInput.value = text;
            sendMessage();
        }
    }
}

// Handle key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Load chat history
async function loadChatHistory() {
    try {
        const response = await fetch('/api/chats');
        const chats = await response.json();
        
        const historySidebar = document.getElementById('history-sidebar');
        if (historySidebar) {
            if (chats.length === 0) {
                historySidebar.innerHTML = '<div class="text-gray-500 text-center py-4">No chat history</div>';
            } else {
                historySidebar.innerHTML = '';
                chats.slice(0, 10).forEach(chat => {
                    const chatItem = document.createElement('div');
                    chatItem.className = 'px-4 py-3 hover:bg-gray-100 cursor-pointer truncate border-b border-gray-100 last:border-0 transition-colors';
                    chatItem.innerHTML = `
                        <div class="font-medium text-gray-800">${chat.title || 'New Conversation'}</div>
                        <div class="text-xs text-gray-500">${new Date(chat.created_at).toLocaleDateString()}</div>
                    `;
                    chatItem.onclick = () => loadChat(chat.id);
                    historySidebar.appendChild(chatItem);
                });
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Load specific chat
async function loadChat(chatId) {
    try {
        const response = await fetch(`/api/chat/${chatId}`);
        const messages = await response.json();
        
        currentChatId = chatId;
        messagesArea.innerHTML = '';
        
        if (messages && messages.length > 0) {
            messages.forEach(msg => {
                if (msg.role === 'user') {
                    appendUserMessage(msg.content, 'history-' + Date.now() + '-' + Math.random());
                } else {
                    const messageId = 'history-' + Date.now() + '-' + Math.random();
                    const assistantDiv = createEnhancedAssistantMessage(messageId);
                    messagesArea.appendChild(assistantDiv);
                    const streamingMsg = document.getElementById(`streaming-${messageId}`);
                    if (streamingMsg) {
                        streamingMsg.innerHTML = formatSmartMessage(msg.content);
                    }
                }
            });
        }
        
        showChatInterface();
    } catch (error) {
        console.error('Error loading chat:', error);
        showToast('Failed to load chat', 'error');
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: 'bg-gradient-to-r from-green-500 to-emerald-600',
        error: 'bg-gradient-to-r from-red-500 to-pink-600',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-500',
        info: 'bg-gradient-to-r from-blue-500 to-indigo-600'
    };
    
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-5 py-3 rounded-xl shadow-xl z-50 animate-slide-up flex items-center space-x-3`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} text-lg"></i>
        <span class="font-medium">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .animate-slide-up {
        animation: slideUp 0.3s ease-out;
    }
    
    .animate-slide-down {
        animation: slideDown 0.3s ease-out;
    }
    
    .animate-slide-in {
        animation: slideIn 0.3s ease-out;
    }
    
    .message-enter {
        animation: slideUp 0.3s ease-out;
    }
    
    .message-actions {
        transition: opacity 0.2s;
    }
    
    .typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: typingBounce 1.4s infinite ease-in-out;
    }
    
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
    .typing-dot:nth-child(3) { animation-delay: 0; }
    
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
    }
    
    .reaction-panel {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.2s ease-out;
    }
    
    .suggestions-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 0.5rem;
    }
    
    .suggestion-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .suggestion-group-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #6b7280;
        letter-spacing: 0.05em;
    }
    
    .suggestion-chip {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        color: #374151;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
    }
    
    .suggestion-chip:hover {
        background: #10a37f;
        border-color: #10a37f;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(16, 163, 127, 0.2);
    }
    
    .message-failed {
        opacity: 0.7;
        filter: grayscale(0.5);
    }
    
    .instant-badge {
        display: inline-flex;
        align-items: center;
        background: #10a37f20;
        padding: 2px 8px;
        border-radius: 12px;
    }
    
    #edit-overlay {
        animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @media (max-width: 768px) {
        .suggestions-container {
            overflow-x: auto;
            flex-direction: row;
            padding: 0.5rem 0;
        }
        
        .suggestion-group {
            min-width: 250px;
        }
        
        .suggestion-chip {
            white-space: nowrap;
        }
    }
`;

document.head.appendChild(style);

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeSmartFeatures();
    
    window.addEventListener('online', () => {
        showToast('You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('You are offline. Messages will be queued.', 'warning');
    });
    
    // Process any queued messages
    const queue = JSON.parse(localStorage.getItem('messageQueue') || '[]');
    if (queue.length > 0 && navigator.onLine) {
        showToast(`Sending ${queue.length} queued messages...`, 'info');
        queue.forEach(item => {
            messageInput.value = item.message;
            currentChatId = item.chatId;
            sendMessage();
        });
        localStorage.removeItem('messageQueue');
    }
});

// Initialize smart features
function initializeSmartFeatures() {
    const greetingElement = document.querySelector('.time-based-greeting');
    if (greetingElement) {
        greetingElement.textContent = getTimeBasedGreeting();
    }
    
    const dateElement = document.querySelector('.current-date');
    if (dateElement) {
        dateElement.textContent = getCurrentDate();
    }
    
    updateSmartSuggestions();
    
    setInterval(() => {
        document.querySelectorAll('.message-time').forEach(el => {
            el.textContent = getCurrentTime();
        });
        
        const hour = new Date().getHours();
        if (hour !== lastHour) {
            updateSmartSuggestions();
            lastHour = hour;
        }
    }, 60000);
}

let lastHour = new Date().getHours();

// Export functions for global use
window.sendMessage = sendMessage;
window.copyMessage = copyMessage;
window.shareMessage = shareMessage;
window.editMessage = editMessage;
window.toggleReactions = toggleReactions;
window.addReaction = addReaction;
window.useSuggestion = useSuggestion;
window.regenerateResponse = regenerateResponse;
window.retryMessage = retryMessage;
window.handleKeyPress = handleKeyPress;
window.loadChat = loadChat;
window.cancelEdit = cancelEdit;
window.saveEdit = saveEdit;
