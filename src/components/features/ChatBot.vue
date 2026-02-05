<template>
  <div class="fixed bottom-8 right-8 z-50">
    <!-- Tooltip/Popper -->
    <Transition name="tooltip">
      <div
        v-if="showTooltip && !isOpen"
        class="absolute bottom-[20px] mb-20 right-0 bg-white dark:bg-surface-dark p-4 border-2 border-black dark:border-primary shadow-neo w-64 z-10 transition-colors">
        <div class="relative z-10">
          <p
            class="text-xs font-display font-bold text-black dark:text-white uppercase tracking-tight leading-tight">
            Hey! Need help? <span class="waving-hand">👋</span>
          </p>
          <p
            class="text-[10px] font-bold text-primary dark:text-secondary mt-2 uppercase tracking-widest">
            Chat with my assistant
          </p>
        </div>
        <!-- Decorative arrow bit -->
        <div
          class="absolute -bottom-2 right-6 w-4 h-4 bg-white dark:bg-surface-dark border-r-2 border-b-2 border-black dark:border-primary transform rotate-45 z-0"></div>
        <button
          @click="dismissTooltip"
          aria-label="Close tooltip"
          class="absolute -top-2 -right-2 w-6 h-6 bg-black text-white border border-white flex items-center justify-center hover:bg-primary hover:text-black transition-all transform hover:rotate-12">
          <span class="material-icons text-[10px] font-bold">close</span>
        </button>
      </div>
    </Transition>

    <!-- Floating Chat Toggle Button -->
    <div class="relative">
      <button
        @click="toggleChat"
        class="relative w-16 h-16 bg-primary hover:bg-white dark:bg-primary dark:hover:bg-secondary border-2 border-black dark:border-primary flex items-center justify-center shadow-neo-sm dark:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all z-20 group"
        :aria-label="isOpen ? 'Close chat' : 'Open chat'">
        <span
          class="material-icons text-black text-3xl font-bold transition-transform duration-500"
          :class="{ 'rotate-[360deg]': isOpen }">
          {{ isOpen ? "close" : "smart_toy" }}
        </span>

        <!-- Notification indicator -->
        <span
          v-if="hasNewMessages && !isOpen"
          class="absolute -top-1 -right-1 flex h-6 w-6">
          <span
            class="animate-ping absolute inline-flex h-full w-full bg-secondary opacity-75 rounded-full border border-black"></span>
          <span
            class="relative inline-flex h-6 w-6 bg-secondary border-2 border-black items-center justify-center">
            <span class="text-[10px] font-bold text-white px-1">!</span>
          </span>
        </span>
      </button>
    </div>

    <!-- Chat Window -->
    <Transition name="chat-window">
      <div
        v-if="isOpen"
        class="fixed sm:absolute bottom-0 sm:bottom-20 right-0 left-0 sm:left-auto w-full sm:w-[400px] h-[85vh] sm:h-[600px] bg-white dark:bg-background-dark border-2 border-black dark:border-primary shadow-neo-sm dark:shadow-neo-dark flex flex-col overflow-hidden transition-colors">
        <!-- Header -->
        <div
          class="bg-secondary dark:bg-secondary p-4 border-b-2 border-black dark:border-primary flex items-center justify-between relative z-10">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-primary border-2 border-black flex items-center justify-center shrink-0 shadow-neo-sm transform rotate-6">
              <span class="material-icons text-black text-2xl font-bold"
                >smart_toy</span
              >
            </div>
            <div class="flex flex-col">
              <h2
                class="text-white dark:text-black font-display font-bold text-lg uppercase tracking-tight">
                Oka's Assistant
              </h2>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  class="block w-2 h-2 bg-primary border border-black rounded-none animate-pulse"></span>
                <span
                  class="text-[9px] font-bold text-primary dark:text-black uppercase tracking-wider"
                  >Online • Ready</span
                >
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="clearChat"
              class="w-8 h-8 flex items-center justify-center border border-transparent hover:border-white dark:hover:border-black hover:bg-white/10 dark:hover:bg-black/10 transition-all group"
              title="Clear chat">
              <span
                class="material-icons text-white dark:text-black group-hover:scale-110 transition-transform text-lg"
                >delete</span
              >
            </button>
            <button
              @click="toggleChat"
              class="w-8 h-8 flex items-center justify-center border border-transparent hover:border-white dark:hover:border-black hover:bg-white/10 dark:hover:bg-black/10 transition-all group"
              title="Close chat">
              <span
                class="material-icons text-white dark:text-black group-hover:scale-110 transition-transform text-lg"
                >close</span
              >
            </button>
          </div>
        </div>

        <!-- Messages Area -->
        <div
          class="flex-1 overflow-y-auto p-4 space-y-6 bg-background-light dark:bg-background-dark relative no-scrollbar transition-colors"
          ref="chatMessages"
          @scroll="handleScroll">
          <!-- Quick Actions (Only shown if no user messages yet) -->
          <div v-if="messages.length <= 1" class="space-y-3 mb-6 relative z-10">
            <p
              class="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">
              Quick questions:
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="question in quickQuestions"
                :key="question"
                @click="askQuickQuestion(question)"
                class="bg-white dark:bg-surface-dark text-black dark:text-white border-2 border-black dark:border-primary px-3 py-1.5 text-[10px] font-bold uppercase shadow-neo-sm hover:bg-primary dark:hover:bg-primary hover:text-black dark:hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
                {{ question }}
              </button>
            </div>
          </div>

          <!-- Message Bubbles -->
          <TransitionGroup name="message">
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="flex w-full"
              :class="
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              ">
              <div
                class="max-w-[90%] border-2 border-black dark:border-primary p-4 shadow-neo-sm transform transition-all"
                :class="[
                  message.sender === 'user'
                    ? 'bg-secondary text-white rotate-1'
                    : 'bg-white dark:bg-surface-dark text-black dark:text-white -rotate-1',
                  message.sender === 'bot'
                    ? 'dark:shadow-neo'
                    : 'shadow-neo-sm',
                ]">
                <div
                  v-html="formatMessageWithLinks(message.text)"
                  class="message-content font-bold text-sm leading-relaxed"></div>
                <span v-if="message.isTyping" class="typing-cursor"></span>

                <!-- Contact Action Button -->
                <button
                  v-if="message.showContactButton"
                  @click="navigateToContact"
                  class="mt-4 w-full bg-primary text-black font-bold uppercase tracking-wider py-2 border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-xs">
                  <span class="material-icons text-lg">alternate_email</span>
                  Go to Contact Page
                </button>
              </div>
            </div>
          </TransitionGroup>

          <!-- Typing Indicator -->
          <div
            v-if="isTyping || isWaitingForResponse"
            class="flex justify-start">
            <div
              class="bg-white dark:bg-zinc-800 border-2 border-black dark:border-primary p-4 shadow-neo-sm -rotate-1">
              <div class="flex space-x-1.5">
                <div
                  class="w-2 h-2 bg-black dark:bg-white animate-bounce"
                  style="animation-delay: 0ms"></div>
                <div
                  class="w-2 h-2 bg-black dark:bg-white animate-bounce"
                  style="animation-delay: 150ms"></div>
                <div
                  class="w-2 h-2 bg-black dark:bg-white animate-bounce"
                  style="animation-delay: 300ms"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div
          class="p-4 bg-secondary dark:bg-secondary border-t-4 border-black dark:border-primary relative z-10">
          <form @submit.prevent="sendMessage" class="flex gap-3">
            <div class="relative flex-1">
              <input
                v-model="userInput"
                type="text"
                placeholder="TYPE YOUR MESSAGE..."
                class="w-full h-12 bg-white dark:bg-zinc-900 border-2 border-black dark:border-primary px-4 font-bold text-base text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary dark:focus:border-primary transition-all uppercase"
                :disabled="isTyping || isWaitingForResponse || isStreaming" />
            </div>
            <button
              type="submit"
              aria-label="Send message"
              class="h-12 w-14 bg-primary hover:bg-secondary dark:hover:bg-secondary border-2 border-black dark:border-primary flex items-center justify-center shadow-neo-sm dark:shadow-neo active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all group disabled:opacity-50 disabled:grayscale"
              :disabled="
                !userInput.trim() ||
                isTyping ||
                isWaitingForResponse ||
                isStreaming
              ">
              <span
                class="material-icons text-black group-hover:translate-x-1 transition-all font-bold text-2xl"
                >send</span
              >
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getStreamingResponse } from "../../services/openai";
import { usePostHog } from "@/composables/usePostHog";

export default {
  name: "ChatBot",
  setup() {
    const { posthog } = usePostHog();
    const router = useRouter();
    const isOpen = ref(false);
    const messages = ref([]);
    const userInput = ref("");
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const initialMessage =
      "Hi there! 👋\nI'm Oka's AI assistant. I can tell you about his skills, experience, and projects. What would you like to know?";
    const hasInitialMessageShown = ref(false);

    const isStreaming = ref(false);
    const isWaitingForResponse = ref(false);

    // Visibility states
    const showTooltip = ref(false);
    const hasNewMessages = ref(false);
    const isUserAtBottom = ref(true);

    // Quick questions
    const quickQuestions = ref(["Experience?", "Tech stack?", "Projects?"]);

    const scrollToBottom = (force = false) => {
      setTimeout(() => {
        if ((isUserAtBottom.value || force) && chatMessages.value) {
          chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
          isUserAtBottom.value = true;
        }
      }, 50);
    };

    const toggleChat = () => {
      isOpen.value = !isOpen.value;
      if (isOpen.value) {
        showTooltip.value = false;
        posthog.capture("chatbot_opened");
      }
    };

    const clearChat = () => {
      messages.value = [];
      hasInitialMessageShown.value = false;
      isTyping.value = true;
      setTimeout(() => {
        isTyping.value = false;
        streamInitialMessage();
      }, 500);
    };

    const askQuickQuestion = (question) => {
      userInput.value = question;
      sendMessage();
    };

    watch(isOpen, (newVal) => {
      if (newVal && !hasInitialMessageShown.value) {
        isTyping.value = true;
        setTimeout(() => {
          isTyping.value = false;
          streamInitialMessage();
        }, 1000);
      } else if (newVal) {
        hasNewMessages.value = false;
      }

      if (newVal) {
        setTimeout(() => scrollToBottom(true), 150);
      }
    });

    const streamInitialMessage = () => {
      isStreaming.value = true;
      const messageIndex =
        messages.value.push({
          sender: "bot",
          text: "",
        }) - 1;

      let i = 0;
      const interval = setInterval(() => {
        if (i < initialMessage.length) {
          messages.value[messageIndex].text += initialMessage[i];
          i++;
        } else {
          clearInterval(interval);
          isStreaming.value = false;
          hasInitialMessageShown.value = true;
        }
      }, 10);
    };

    const handleScroll = () => {
      if (chatMessages.value) {
        const { scrollTop, scrollHeight, clientHeight } = chatMessages.value;
        isUserAtBottom.value = scrollHeight - scrollTop - clientHeight < 50;
      }
    };

    const sendMessage = async () => {
      const messageText = userInput.value.trim();
      if (!messageText || isTyping.value || isStreaming.value) return;

      messages.value.push({
        sender: "user",
        text: messageText,
      });

      posthog.capture("chatbot_message_sent");
      isWaitingForResponse.value = true;
      userInput.value = "";

      setTimeout(async () => {
        try {
          let tokenBuffer = "";
          let isProcessingBuffer = false;
          let hasStartedTyping = false;
          let messageIndex;
          let isStreamComplete = false;

          const checkIntent = () => {
            const botMessage = messages.value[messageIndex].text.toLowerCase();
            const userMessageLower = messageText.toLowerCase();

            if (
              botMessage.includes("reach him") ||
              botMessage.includes("via email") ||
              botMessage.includes("linkedin") ||
              botMessage.includes("contact") ||
              botMessage.includes("contact page") ||
              userMessageLower.includes("hire") ||
              userMessageLower.includes("contact")
            ) {
              messages.value[messageIndex].showContactButton = true;
              scrollToBottom();
            }

            isStreaming.value = false;
            if (!isOpen.value) {
              hasNewMessages.value = true;
            }
          };

          const typeToken = () => {
            if (!tokenBuffer) {
              isProcessingBuffer = false;
              if (isStreamComplete) checkIntent();
              return;
            }

            if (!hasStartedTyping) {
              hasStartedTyping = true;
              isWaitingForResponse.value = false;
              messageIndex =
                messages.value.push({
                  sender: "bot",
                  text: "",
                  showContactButton: false,
                }) - 1;
            }

            isProcessingBuffer = true;
            const char = tokenBuffer.charAt(0);
            tokenBuffer = tokenBuffer.substring(1);
            messages.value[messageIndex].text += char;

            if (messages.value[messageIndex].text.length % 5 === 0) {
              scrollToBottom();
            }

            setTimeout(typeToken, 5);
          };

          await getStreamingResponse(messageText, (token) => {
            tokenBuffer += token;
            if (!isProcessingBuffer) typeToken();
          });

          isStreamComplete = true;
          if (!isProcessingBuffer) typeToken();
        } catch (error) {
          isWaitingForResponse.value = false;
          isStreaming.value = false;
          messages.value.push({
            sender: "bot",
            text: "Sorry, I encountered an error. Please try again later.",
          });
        }
      }, 100);
    };

    const formatMessageWithLinks = (text) => {
      if (!text) return "";
      let formattedText = text;

      // Bold markdown
      formattedText = formattedText.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="font-black text-black dark:text-white">$1</strong>',
      );
      // Markdown links
      formattedText = formattedText.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" class="text-primary dark:text-secondary font-black underline decoration-4">$1</a>',
      );
      // Line breaks
      formattedText = formattedText.replace(/\n/g, "<br>");
      // Bullet points
      formattedText = formattedText.replace(
        /^[-•]\s+(.+?)(?=<br>|$)/gm,
        '<div class="flex gap-2 my-1"><span class="text-primary font-black">•</span><span>$1</span></div>',
      );

      return formattedText;
    };

    onMounted(() => {
      setTimeout(() => {
        showTooltip.value = true;
      }, 5000);
    });

    const dismissTooltip = () => {
      showTooltip.value = false;
    };

    const navigateToContact = () => {
      router.push("/contact");
      isOpen.value = false;
    };

    return {
      isOpen,
      messages,
      userInput,
      isTyping,
      chatMessages,
      sendMessage,
      formatMessageWithLinks,
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
      navigateToContact,
    };
  },
};
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
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
    transform: translateY(10px) scale(0.9);
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
    transform: translateY(10px) scale(0.9);
  }
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
    transform: translateY(20px) scale(0.9) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}
@keyframes slide-down {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(20px) scale(0.9) rotate(2deg);
  }
}

/* Message animation */
.message-enter-active {
  transition: all 0.3s ease;
}
.message-enter-from {
  opacity: 0;
  transform: translateY(15px) rotate(1deg);
}

@keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(15deg);
  }
  75% {
    transform: rotate(-10deg);
  }
}
.waving-hand {
  display: inline-block;
  animation: wave 2s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
.animate-bounce {
  animation: bounce 0.6s infinite;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: currentColor;
  margin-left: 2px;
  animation: blink 0.8s infinite;
  vertical-align: middle;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.message-content {
  word-break: break-word;
}
</style>
