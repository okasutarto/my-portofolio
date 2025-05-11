<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Tooltip/Popper -->
    <Transition name="tooltip">
      <div v-if="showTooltip" class="absolute bottom-20 right-0 bg-white dark:bg-gray-800 pt-6 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-52 text-center">
        <p class="text-sm font-medium">👋 Hi there! Need help?</p>
        <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">Ask me anything about Oka!</p>
        <div class="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-gray-800 rotate-45 border-b border-r border-gray-200 dark:border-gray-700"></div>
        <button @click="dismissTooltip" class="absolute top-1 right-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Transition>

    <button 
      @click="isOpen = !isOpen"
      class="w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white shadow-lg flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary relative animate-pulse-subtle"
      :aria-label="isOpen ? 'Close chat' : 'Open chat'"
    >
      <svg v-if="!isOpen" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
      
      <!-- Notification indicator -->
      <span v-if="hasNewMessages" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
    </button>
    
    <Transition name="chat-window">
      <div 
        v-if="isOpen" 
        class="absolute bottom-20 right-0 w-80 sm:w-96 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700"
      >
        <div class="bg-primary text-white p-4 flex items-center">
          <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
          </div>
          <div>
            <h3 class="font-medium">Portfolio Assistant</h3>
            <p class="text-xs opacity-75">Ask me anything about Oka!</p>
          </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-3 smooth-scroll overscroll-contain" ref="chatMessages">
          <TransitionGroup name="message">
            <div 
              v-for="(message, index) in messages" 
              :key="index"
              :class="{ 
                'flex justify-end': message.sender === 'user',
                'flex justify-start': message.sender === 'bot'
              }"
            >
              <div 
                :class="{
                  'bg-primary text-white rounded-t-lg rounded-bl-lg': message.sender === 'user',
                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-t-lg rounded-br-lg': message.sender === 'bot'
                }"
                class="max-w-[80%] p-3 text-sm break-words whitespace-pre-wrap"
              >
                <span v-html="formatMessageWithLinks(message.text)"></span>
                <span v-if="message.isTyping" class="typing-cursor">|</span>
              </div>
            </div>
          </TransitionGroup>
          
          <!-- Keep the loading indicator for initial connection -->
          <Transition name="message">
            <div v-if="isTyping" class="flex justify-start">
              <div class="bg-gray-100 dark:bg-gray-700 rounded-t-lg rounded-br-lg p-3 text-sm max-w-[80%]">
                <div class="flex space-x-1">
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" style="animation-delay: 0.2s"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" style="animation-delay: 0.4s"></div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- AI typing indicator when streaming is about to start -->
          <Transition name="message">
            <div v-if="isWaitingForResponse" class="flex justify-start">
              <div class="bg-gray-100 dark:bg-gray-700 rounded-t-lg rounded-br-lg p-3 text-sm max-w-[80%]">
                <div class="flex space-x-1">
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" style="animation-delay: 0.2s"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" style="animation-delay: 0.4s"></div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
        
        <div class="p-3 border-t border-gray-200 dark:border-gray-700">
          <form @submit.prevent="sendMessage" class="flex space-x-2">
            <input 
              v-model="userInput"
              type="text"
              placeholder="Ask something..."
              class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              :disabled="isTyping"
            />
            <button 
              type="submit"
              class="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!userInput.trim() || isTyping"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { getStreamingResponse } from '../services/openai';

export default {
  name: 'ChatBot',
  setup() {
    const isOpen = ref(false);
    const messages = ref([]);
    const userInput = ref('');
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const initialMessage = 'Hi there! I\'m Oka\'s portfolio assistant. How can I help you today?';
    const hasInitialMessageShown = ref(false);
    
    const isStreaming = ref(false);
    const isWaitingForResponse = ref(false);
    
    // New reactive states
    const showTooltip = ref(false);
    const hasNewMessages = ref(false);

    const scrollToBottom = () => {
      setTimeout(() => {
        // Add extra null check inside the timeout
        if (chatMessages.value) {
          chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
        }
      }, 50); // Small delay to ensure DOM is updated
    };

    // Show typing animation when chat is opened
    watch(isOpen, (newVal) => {
      if (newVal && !hasInitialMessageShown.value) {
        // Show the typing indicator
        isTyping.value = true;
        
        // After a delay, start streaming the welcome message
        setTimeout(() => {
          isTyping.value = false;
          
          // Simulate streaming for the initial message (or use a real API call)
          streamInitialMessage();
        }, 1000);
      } else if (newVal) {
        // Clear notification badge when chat is opened
        hasNewMessages.value = false;
      }
      
      // Scroll to bottom when chat is opened - add a longer delay to allow rendering
      if (newVal) {  // Only scroll when opening, not when closing
        setTimeout(() => scrollToBottom(), 100);  // Increased delay
      }
    });
    
    // Stream the initial welcome message with slower typing
    const streamInitialMessage = () => {
      isStreaming.value = true;
      
      // Add an empty message first
      const messageIndex = messages.value.push({
        sender: 'bot',
        text: ''
      }) - 1;
      
      let i = 0;
      const interval = setInterval(() => {
        if (i < initialMessage.length) {
          // Update the existing message instead of using separate streaming state
          messages.value[messageIndex].text += initialMessage[i];
          i++;
          
          // Scroll to bottom for every few characters
          if (i % 5 === 0) {
            scrollToBottom();
          }
        } else {
          clearInterval(interval);
          isStreaming.value = false;
          hasInitialMessageShown.value = true;
          scrollToBottom(); // Final scroll when complete
        }
      }, 10); // Increased from 20ms to 60ms for slower typing
    };

    watch(isTyping, (newVal) => {
      if (newVal) {
        // scrollToBottom();
      }
    });

    // Add watchers to detect when messages change
    watch(
      () => messages.value.length,
      () => scrollToBottom()
    );

    // Check if user has seen tooltip before
    onMounted(() => {
      // Show tooltip after a brief delay
      setTimeout(() => {
        showTooltip.value = true;
      }, 1000);
    });
    
    // Dismiss tooltip
    const dismissTooltip = () => {
      showTooltip.value = false;
      localStorage.setItem('hasSeenChatTooltip', 'true');
    };

    const sendMessage = async () => {
      const messageText = userInput.value.trim();
      if (!messageText || isTyping.value || isStreaming.value) return;
      
      // Add user message immediately
      messages.value.push({
        sender: 'user',
        text: messageText
      });
      
      
      // Show loading indicator
      isWaitingForResponse.value = true;

      userInput.value = ''; // Clear input field
      
      // Scroll to bottom after user message
      setTimeout(async () => {
        try {
          // Process tokens with natural typing rhythm
          let tokenBuffer = '';
          let isProcessingBuffer = false;
          let hasStartedTyping = false;
          let messageIndex;

          const typeToken = () => {
            if (!tokenBuffer) {
              isProcessingBuffer = false;
              return;
            }
            
            // If this is the first token, create message bubble only now
            if (!hasStartedTyping) {
              hasStartedTyping = true;
              isWaitingForResponse.value = false; // Hide loading indicator only now
              
              // Create the message bubble with first content 
              messageIndex = messages.value.push({
                sender: 'bot',
                text: ''
              }) - 1;
            }
            
            isProcessingBuffer = true;
            const char = tokenBuffer.charAt(0);
            tokenBuffer = tokenBuffer.substring(1);
            
            messages.value[messageIndex].text += char;
            
            // Scroll periodically to improve performance
            if (messages.value[messageIndex].text.length % 5 === 0) {
              scrollToBottom();
            }
            
            setTimeout(typeToken, 10);
          };

          await getStreamingResponse(messageText, (token) => {
            tokenBuffer += token;
            if (!isProcessingBuffer) {
              typeToken();
            }
          });

          // When complete
          isStreaming.value = false;
          scrollToBottom();
          
          // Set notification if chat isn't open
          if (!isOpen.value) {
            hasNewMessages.value = true;
          }
        } catch (error) {
          isWaitingForResponse.value = false;
          isStreaming.value = false;
          console.error('Error sending message:', error);
          messages.value.push({
            sender: 'bot',
            text: 'Sorry, I encountered an error while processing your request.'
          });
        }
      }, 100);
    };

    const formatMessageWithLinks = (text) => {
      if (!text) return '';
      
      // Updated regex that excludes trailing punctuation
      const urlRegex = /(https?:\/\/[^\s]+?)([.,;:!?])?(?=\s|$)/g;
      
      // Replace URLs with anchor tags while preserving punctuation
      const formattedText = text.replace(
        urlRegex,
        (match, url, punctuation = '') => {
          // Clean the URL (remove any trailing punctuation captured by mistake)
          const cleanUrl = url.replace(/[.,;:!?]$/, '');
          
          return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline hover:text-blue-700">${cleanUrl}</a>${punctuation}`;
        }
      );
      
      return formattedText;
    };

    return {
      isOpen,
      messages,
      userInput,
      isTyping,
      chatMessages,
      sendMessage,
      formatMessageWithLinks,
      // New properties
      showTooltip,
      dismissTooltip,
      hasNewMessages,
      isWaitingForResponse,
      isStreaming,
      scrollToBottom
    };
  }
}
</script>

<style scoped>
/* Message styling */
[class~="max-w-[80%]"] {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  transform: translateZ(0);
  will-change: transform, opacity;
}

/* Animation for new messages */
.message-enter-active, .message-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
  position: relative;
  z-index: 1;
}
.message-enter-from, .message-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Link styling */
:deep(a) {
  color: #3b82f6; /* blue-500 */
  text-decoration: underline;
  word-break: break-all;
}

:deep(a:hover) {
  color: #1d4ed8; /* blue-700 */
}

/* Dark mode link styling */
.dark :deep(a) {
  color: #60a5fa; /* blue-400 */
}

.dark :deep(a:hover) {
  color: #93c5fd; /* blue-300 */
}

/* Scroll to bottom button animation */
.scroll-btn-enter-active, .scroll-btn-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.scroll-btn-enter-from, .scroll-btn-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* New tooltip animations */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Pulse animation for the button */
@keyframes pulse-subtle {
  0% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(79, 70, 229, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
  }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s infinite;
}

/* Remove smooth-scroll behavior that causes flickering */
.smooth-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Add this to improve rendering performance */
.flex-1 {
  min-height: 0;
  contain: content;
}

/* Add typing cursor animation */
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  margin-left: 1px;
  animation: blink 0.9s infinite;
  vertical-align: middle;
  transform: translateY(-1px);
}

/* For dark mode */
.dark .typing-cursor {
  opacity: 0.8;
}

/* ChatBot window animation */
.chat-window-enter-active {
  animation: bounce-in 0.5s ease-out;
  transform-origin: bottom right;
}

.chat-window-leave-active {
  animation: bounce-out 0.3s ease-in;
  transform-origin: bottom right;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  60% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

@keyframes bounce-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8) translateY(20px);
    opacity: 0;
  }
}
</style>