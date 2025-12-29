<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Tooltip/Popper -->
    <Transition name="tooltip">
      <div v-if="showTooltip && !isOpen" class="absolute bottom-24 right-0 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-2xl border-none w-60 backdrop-blur-sm">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 animate-bounce-slow">
            <span class="text-xl">🤖</span>
          </div>
          <div>
            <p class="text-sm font-bold text-gray-900 dark:text-white">Hey! Need help? <span class="waving-hand">👋</span></p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Chat with my AI assistant!</p>
          </div>
        </div>
        <div class="absolute -bottom-2 right-10 w-4 h-4 bg-white dark:bg-gray-800 rotate-45"></div>
        <button @click="dismissTooltip" class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Floating Chat Toggle Button with Effects -->
    <div class="relative">
      <!-- Animated gradient ring -->
      <div v-if="!isOpen" class="absolute inset-0 w-16 h-16 -m-1 rounded-full bg-gradient-conic animate-spin-slow opacity-70 blur-sm"></div>
      
      <!-- Glow effect -->
      <div v-if="!isOpen" class="absolute inset-0 w-14 h-14 rounded-full bg-primary/50 blur-xl animate-glow"></div>
      
      <!-- Main Button -->
      <button 
        @click="toggleChat"
        class="chat-toggle-btn relative group w-14 h-14 rounded-full bg-gradient-to-br from-primary via-secondary to-primary bg-size-200 animate-gradient text-white shadow-2xl flex items-center justify-center transition-all duration-300 focus:outline-none hover:shadow-primary/50 hover:shadow-2xl"
        :class="{ 'animate-float': !isOpen }"
        :aria-label="isOpen ? 'Close chat' : 'Open chat'"
      >
        <Transition name="icon-switch" mode="out-in">
          <svg v-if="!isOpen" key="chat" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 drop-shadow-lg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          <svg v-else key="close" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </Transition>
        
        <!-- Notification indicator with pulse -->
        <span v-if="hasNewMessages && !isOpen" class="absolute -top-1 -right-1 flex h-5 w-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white items-center justify-center">
            <span class="text-[10px] font-bold text-white">1</span>
          </span>
        </span>
      </button>
    </div>
    
    <!-- Chat Window -->
    <Transition name="chat-window">
      <div 
        v-if="isOpen" 
        class="fixed sm:absolute bottom-0 sm:bottom-20 right-0 left-0 sm:left-auto w-full sm:w-[380px] h-[85vh] sm:h-[500px] bg-white dark:bg-gray-900 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col border-none"
      >
        <!-- Header -->
        <div class="bg-gradient-to-r from-primary to-secondary text-white p-4 flex items-center justify-between">
          <div class="flex items-center">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mr-3">
                <span class="text-xl">🤖</span>
              </div>
              <span class="absolute bottom-0 right-2 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h3 class="font-semibold">Oka's Assistant</h3>
              <!-- <h3 class="font-semibold">AI Assistant</h3> -->
              <p class="text-xs text-white/70 flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                Online • Ready to help
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button 
              @click="clearChat" 
              class="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Clear chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button 
              @click="toggleChat" 
              class="sm:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Close chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div v-if="!isVoiceMode && messages.length <= 1" class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</p>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="question in quickQuestions" 
              :key="question"
              @click="askQuickQuestion(question)"
              class="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 rounded-full text-gray-600 dark:text-gray-300 transition-colors"
            >
              {{ question }}
            </button>
          </div>
        </div>
        
        <!-- Messages Area -->
        <div v-if="!isVoiceMode" class="flex-1 overflow-y-auto p-4 space-y-4 smooth-scroll overscroll-contain bg-gray-50 dark:bg-gray-900/50" 
             ref="chatMessages"
             @scroll="handleScroll">
          <TransitionGroup name="message">
            <div 
              v-for="(message, index) in messages" 
              :key="index"
              :class="{ 
                'flex justify-end': message.sender === 'user',
                'flex justify-start': message.sender === 'bot'
              }"
            >
              <!-- Bot Message -->
              <div v-if="message.sender === 'bot'" class="flex items-end gap-2 max-w-[85%]">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 text-xs">
                  🤖
                </div>
                <div class="bot-message bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md p-3 text-sm shadow-sm">
                  <div v-html="formatMessageWithLinks(message.text)" class="message-content"></div>
                  <span v-if="message.isTyping" class="typing-cursor"></span>
                </div>
              </div>
              
              <!-- User Message -->
              <div v-else class="max-w-[85%]">
                <div class="bg-gradient-to-br from-primary to-secondary text-white rounded-2xl rounded-br-md p-3 text-sm shadow-sm">
                  {{ message.text }}
                </div>
              </div>
            </div>
          </TransitionGroup>
          
          <!-- Typing Indicator -->
          <Transition name="message">
            <div v-if="isTyping || isWaitingForResponse" class="flex items-end gap-2">
              <div class="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 text-xs">
                🤖
              </div>
              <div class="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md p-3 shadow-sm">
                <div class="flex space-x-1.5">
                  <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style="animation-delay: 300ms"></div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
        
        <!-- Input Area -->
        <div v-if="!isVoiceMode" class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-bottom">
          <form @submit.prevent="sendMessage" class="flex items-center gap-2">
            <input 
              v-model="userInput"
              type="text"
              placeholder="Type your message..."
              class="flex-1 min-w-0 rounded-xl border-0 bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:text-white placeholder-gray-400"
              :disabled="isTyping || isWaitingForResponse"
            />
            <button 
              type="submit"
              class="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-primary to-secondary hover:from-primary-dark hover:to-secondary text-white rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              :disabled="!userInput.trim() || isTyping || isWaitingForResponse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
            <!-- Voice Mode Toggle Button -->
            <!-- <button 
              type="button"
              @click="toggleVoiceMode"
              class="w-11 h-11 flex-shrink-0 bg-gray-100 dark:bg-gray-800 hover:bg-primary/10 dark:hover:bg-primary/20 text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              :title="'Switch to voice mode'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button> -->
          </form>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
            Powered by AI • Responses may vary
          </p>
        </div>
        
        <!-- Voice Mode Interface -->
        <div v-if="isVoiceMode" class="flex flex-col h-full">
          <div class="flex-1 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <div class="text-center mb-6">
              <div class="relative inline-block">
                <div v-if="isSpeaking" class="absolute inset-0 w-32 h-32 rounded-full bg-primary/20 animate-ping"></div>
                <div class="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-5xl">
                  🎤
                </div>
              </div>
            </div>
            
            <p class="text-lg font-semibold mb-2" :class="{ 'text-primary': isConnected, 'text-gray-400': !isConnected }">
              {{ isSpeaking ? 'Speaking...' : isConnected ? 'Listening...' : 'Connecting...' }}
            </p>
            
            <!-- <p v-if="transcript" class="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-xs text-center italic">
              "{{ transcript }}"
            </p> -->
            
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {{ isConnected ? 'Start talking - I\'m always listening!' : 'Initializing voice chat...' }}
            </p>
            
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-4">
              <p>Voice mode is active</p>
              <p class="mt-1">Microphone and audio are automatically managed</p>
            </div>
          </div>
          
          <!-- Back to Text Mode Button -->
          <div class="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 safe-area-bottom">
            <button 
              @click="toggleVoiceMode"
              class="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Text Chat
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { getStreamingResponse } from '../services/openai';
import { useVoiceChat } from '../composables/useVoiceChat';

export default {
  name: 'ChatBot',
  setup() {
    const isOpen = ref(false);
    const messages = ref([]);
    const userInput = ref('');
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const initialMessage = 'Hi there! 👋 I\'m Oka\'s AI assistant. I can tell you about his skills, experience, and projects. What would you like to know?';
    // const initialMessage = 'Hi there! 👋 I\'m John Doe\'s AI assistant. I can tell you about his skills, experience, and projects. What would you like to know?';
    const hasInitialMessageShown = ref(false);
    
    const isStreaming = ref(false);
    const isWaitingForResponse = ref(false);
    
    // New reactive states
    const showTooltip = ref(false);
    const hasNewMessages = ref(false);
    const isUserAtBottom = ref(true);
    
    // Quick questions
    const quickQuestions = ref([
      "What's his experience?",
      "Tech stack?",
      "Recent projects?"
    ]);

    const scrollToBottom = (force = false) => {
      setTimeout(() => {
        // Only auto-scroll if user is already at bottom or if forced
        if ((isUserAtBottom.value || force) && chatMessages.value) {
          chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
          isUserAtBottom.value = true;
        }
      }, 50);
    };
    
    // Toggle chat
    const toggleChat = () => {
      isOpen.value = !isOpen.value;
      if (isOpen.value) {
        showTooltip.value = false;
      }
    };
    
    // Clear chat
    const clearChat = () => {
      messages.value = [];
      hasInitialMessageShown.value = false;
      // Re-trigger initial message
      isTyping.value = true;
      setTimeout(() => {
        isTyping.value = false;
        streamInitialMessage();
      }, 500);
    };
    
    // Ask quick question
    const askQuickQuestion = (question) => {
      userInput.value = question;
      sendMessage();
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
          
        } else {
          clearInterval(interval);
          isStreaming.value = false;
          hasInitialMessageShown.value = true;
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

    const handleScroll = () => {
      if (chatMessages.value) {
        const { scrollTop, scrollHeight, clientHeight } = chatMessages.value;
        // Consider "at bottom" if within 30px of the bottom
        isUserAtBottom.value = scrollHeight - scrollTop - clientHeight < 30;
      }
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
              scrollToBottom(); // No forced scroll during typing
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
      
      let formattedText = text;
      
      // Convert markdown bold **text** to <strong>
      formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');
      
      // Convert markdown italic *text* to <em> (but not if it's part of bold)
      formattedText = formattedText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
      
      // Convert markdown links [text](url) to anchor tags FIRST
      formattedText = formattedText.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary-dark underline">$1</a>'
      );
      
      // Convert plain URLs to anchor tags (only if not already inside an href)
      // Use a negative lookbehind to avoid matching URLs already in href=""
      formattedText = formattedText.replace(
        /(?<!href="|">)(https?:\/\/[^\s<>"]+?)([.,;:!?])?(?=\s|$|<)/g,
        (match, url, punctuation = '') => {
          const cleanUrl = url.replace(/[.,;:!?]$/, '');
          return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary-dark underline">${cleanUrl}</a>${punctuation}`;
        }
      );
      
      // Convert line breaks to <br> FIRST for proper spacing
      formattedText = formattedText.replace(/\n/g, '<br>');
      
      // Convert numbered lists (1. item) to proper list items
      formattedText = formattedText.replace(/(\d+)\.\s*<br>\s*(.+?)(?=<br>|$)/g, '<div class="flex gap-2 my-1"><span class="text-primary font-semibold">$1.</span><span>$2</span></div>');
      formattedText = formattedText.replace(/^(\d+)\.\s+(.+?)(?=<br>|$)/gm, '<div class="flex gap-2 my-1"><span class="text-primary font-semibold">$1.</span><span>$2</span></div>');
      
      // Convert bullet points (- item) to proper list items
      formattedText = formattedText.replace(/^[-•]\s+(.+?)(?=<br>|$)/gm, '<div class="flex gap-2 my-1"><span class="text-primary">•</span><span>$1</span></div>');
      
      return formattedText;
    };

    // Voice chat
    const { 
      isConnected, 
      isSpeaking,
      transcript,
      connect, 
      disconnect
    } = useVoiceChat();
    
    const isVoiceMode = ref(false);

    const toggleVoiceMode = async () => {
      isVoiceMode.value = !isVoiceMode.value;
      
      if (isVoiceMode.value) {
        await connect();
      } else {
        await disconnect();
      }
    };

    // Watch transcript and add to messages
    watch(transcript, (newTranscript) => {
      if (newTranscript && isVoiceMode.value) {
        // Optionally show transcript in chat
        // console.log('Transcript:', newTranscript);
      }
    });

    onUnmounted(() => {
      disconnect();
    });

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
      scrollToBottom,
      isUserAtBottom,
      handleScroll,
      toggleChat,
      clearChat,
      askQuickQuestion,
      quickQuestions,
      isVoiceMode,
      isConnected,
      isSpeaking,
      transcript,
      toggleVoiceMode,
    };
  }
}
</script>

<style scoped>
/* Message styling */
[class~="max-w-[85%]"] {
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
  color: #3b82f6;
  text-decoration: underline;
  word-break: break-all;
}

:deep(a:hover) {
  color: #1d4ed8;
}

.dark :deep(a) {
  color: #60a5fa;
}

.dark :deep(a:hover) {
  color: #93c5fd;
}

/* Tooltip animations */
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* Icon switch animation */
.icon-switch-enter-active,
.icon-switch-leave-active {
  transition: all 0.2s ease;
}
.icon-switch-enter-from {
  opacity: 0;
  transform: scale(0.5) rotate(-90deg);
}
.icon-switch-leave-to {
  opacity: 0;
  transform: scale(0.5) rotate(90deg);
}

/* Slow ping animation */
@keyframes ping-slow {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Smooth scroll */
.smooth-scroll {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}

.flex-1 {
  min-height: 0;
  contain: content;
}

/* Typing cursor */
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: currentColor;
  margin-left: 2px;
  animation: blink 0.8s infinite;
  vertical-align: middle;
}

/* Chat window animation */
.chat-window-enter-active {
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}

.chat-window-leave-active {
  animation: slide-down 0.3s ease-in forwards;
  transform-origin: bottom right;
}

@keyframes slide-up {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slide-down {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* Waving hand */
@keyframes wave {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
  60% { transform: rotate(0deg); }
  100% { transform: rotate(0deg); }
}

.waving-hand {
  display: inline-block;
  animation: wave 2.5s infinite;
  transform-origin: 70% 70%;
}

/* Bounce animation for typing dots */
@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Floating animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

/* Slow bounce for tooltip avatar */
@keyframes bounce-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}

/* Glow pulse effect */
@keyframes glow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Conic gradient background for spinning ring */
.bg-gradient-conic {
  background: conic-gradient(
    from 0deg,
    #6366f1,
    #8b5cf6,
    #a855f7,
    #ec4899,
    #f43f5e,
    #f97316,
    #eab308,
    #22c55e,
    #14b8a6,
    #06b6d4,
    #3b82f6,
    #6366f1
  );
}

/* Animated gradient background */
.bg-size-200 {
  background-size: 200% 200%;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.animate-gradient {
  animation: gradient 3s ease infinite;
}

/* Slow spin for ring */
.animate-spin-slow {
  animation: spin-slower 8s linear infinite;
}

/* Chat toggle button */
.chat-toggle-btn {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.chat-toggle-btn:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.5);
  animation-play-state: paused;
}

.chat-toggle-btn:active {
  transform: scale(0.95) !important;
}

/* Tooltip animations */
.tooltip-enter-active {
  animation: tooltip-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.tooltip-leave-active {
  animation: tooltip-out 0.3s ease forwards;
}

@keyframes tooltip-in {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes tooltip-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
  }
}

/* Safe area for devices with notches/home indicators */
.safe-area-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

/* Message content formatting */
.message-content {
  line-height: 1.6;
  word-break: break-word;
}

.message-content br + br {
  display: block;
  content: '';
  margin-top: 0.5rem;
}

.bot-message a {
  word-break: break-all;
}
</style>