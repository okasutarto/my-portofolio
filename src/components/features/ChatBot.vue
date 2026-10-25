<template>
  <div class="chatbot fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
    <!-- Comic speech bubble, same style as the hero greeting -->
    <Transition name="tooltip">
      <div
        v-if="showTooltip && !isOpen"
        class="tip absolute bottom-[88px] right-0 w-60 bg-white dark:bg-surface-dark text-black dark:text-white border-[3px] border-black dark:border-[#f4ead5] shadow-neo px-4 py-3">
        <p class="font-display font-bold text-sm leading-tight">
          Got questions? <span class="waving-hand">👋</span>
        </p>
        <p class="text-xs font-medium mt-1 opacity-75">Ask my AI assistant anything about me.</p>
        <button
          @click="dismissTooltip"
          aria-label="Close tooltip"
          class="absolute -top-3 -right-3 w-7 h-7 bg-black text-white dark:bg-[#f4ead5] dark:text-black border-2 border-black flex items-center justify-center hover:rotate-90 transition-transform">
          <span class="material-icons text-sm">close</span>
        </button>
      </div>
    </Transition>

    <!-- Launcher: a little robot face that blinks and looks around -->
    <button
      @click="toggleChat"
      class="launcher relative w-16 h-16 bg-primary border-[3px] border-black dark:border-[#f4ead5] flex items-center justify-center shadow-neo transition-all z-20"
      :class="{ 'is-open': isOpen, hop: hopping }"
      :aria-label="isOpen ? 'Close chat' : 'Open chat'">
      <span v-if="isOpen" class="material-icons text-black text-3xl font-bold">close</span>
      <BotFace v-else class="w-10 h-10" />

      <!-- Unread reply while the window was closed -->
      <span
        v-if="hasNewMessages && !isOpen"
        class="absolute -top-2.5 -right-2.5 w-6 h-6 bg-[#ff5c8a] border-2 border-black flex items-center justify-center text-xs font-bold text-black">
        1
      </span>
    </button>

    <!-- Chat window -->
    <Transition name="chat-window">
      <div
        v-if="isOpen"
        class="chat-window fixed inset-x-0 bottom-0 h-[88dvh] sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-[88px] sm:w-[400px] sm:h-[min(620px,calc(100vh-140px))] bg-white dark:bg-background-dark text-black dark:text-white border-[3px] border-black dark:border-[#f4ead5] flex flex-col overflow-hidden z-30">
        <!-- Header -->
        <div
          class="flex items-center justify-between gap-3 px-4 py-3 bg-primary text-black border-b-[3px] border-black dark:border-[#f4ead5]">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-11 h-11 shrink-0 bg-white border-[2.5px] border-black flex items-center justify-center -rotate-6 shadow-[3px_3px_0_#000]">
              <BotFace class="w-8 h-8" :talking="isStreaming" />
            </div>
            <div class="min-w-0">
              <h2 class="font-display font-bold text-base uppercase tracking-tight leading-none truncate">
                Oka's Assistant
              </h2>
              <p class="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold uppercase tracking-wider">
                <span class="status-dot w-2 h-2 rounded-full bg-[#16a34a] border border-black"></span>
                {{ isWaitingForResponse || isStreaming ? "Typing…" : "Online" }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="clearChat" class="head-btn" title="New chat" aria-label="Start a new chat">
              <span class="material-icons text-lg">refresh</span>
            </button>
            <button @click="toggleChat" class="head-btn" title="Close chat" aria-label="Close chat">
              <span class="material-icons text-lg">close</span>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div
          class="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-dot-grid no-scrollbar"
          ref="chatMessages"
          @scroll="handleScroll">
          <!-- Welcome card fills the empty window until the first question -->
          <div v-if="messages.length === 0" class="min-h-full flex flex-col justify-center">
            <div
              class="welcome relative bg-white dark:bg-surface-dark border-[3px] border-black dark:border-[#f4ead5] shadow-neo px-5 pt-12 pb-5 mt-10 text-center">
              <div
                class="welcome-bot absolute left-1/2 -top-10 w-20 h-20 bg-primary border-[3px] border-black dark:border-[#f4ead5] flex items-center justify-center shadow-neo-sm">
                <BotFace wave class="w-[68px] h-14 ml-2" />
              </div>
              <h3 class="font-display font-bold text-lg uppercase tracking-tight leading-tight">
                Hi! I'm Oka's assistant
              </h3>
              <p class="text-sm font-medium opacity-75 mt-2 mb-5">
                Ask me anything about his skills, experience or projects. I usually reply in a few seconds.
              </p>
              <div class="flex flex-wrap justify-center gap-2">
                <button
                  v-for="question in quickQuestions"
                  :key="question.label"
                  @click="askQuickQuestion(question)"
                  class="chip inline-flex items-center gap-1.5 bg-white dark:bg-surface-dark border-2 border-black dark:border-[#f4ead5] px-3 py-1.5 text-xs font-bold shadow-neo-sm hover:bg-primary hover:text-black dark:hover:bg-primary transition-all">
                  <span aria-hidden="true">{{ question.emoji }}</span>{{ question.label }}
                </button>
              </div>
            </div>
          </div>

          <TransitionGroup name="message">
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="flex items-end gap-2"
              :class="message.sender === 'user' ? 'justify-end' : 'justify-start'">
              <span
                v-if="message.sender === 'bot'"
                class="avatar w-8 h-8 shrink-0 bg-primary border-2 border-black dark:border-[#f4ead5] flex items-center justify-center">
                <BotFace class="w-6 h-6" :talking="isStreaming && index === messages.length - 1" />
              </span>
              <div
                class="bubble max-w-[82%] px-3.5 py-2.5 border-2 border-black dark:border-[#f4ead5]"
                :class="
                  message.sender === 'user'
                    ? 'bubble-user bg-secondary text-black'
                    : 'bubble-bot bg-white dark:bg-surface-dark'
                ">
                <div
                  v-html="formatMessageWithLinks(message.text)"
                  class="message-content text-sm font-medium leading-relaxed"></div>
                <span v-if="message.isTyping" class="typing-cursor"></span>

                <button
                  v-if="message.showContactButton"
                  @click="navigateToContact"
                  class="mt-3 w-full bg-primary text-black font-bold uppercase tracking-wider py-2 border-2 border-black shadow-[3px_3px_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2 text-xs">
                  <span class="material-icons text-base">mail</span>
                  Send Oka a postcard
                </button>
              </div>
            </div>
          </TransitionGroup>

          <!-- Typing indicator -->
          <div v-if="isTyping || isWaitingForResponse" class="flex items-end gap-2">
            <span
              class="avatar w-8 h-8 shrink-0 bg-primary border-2 border-black dark:border-[#f4ead5] flex items-center justify-center">
              <BotFace class="w-6 h-6" />
            </span>
            <div
              class="bubble bubble-bot bg-white dark:bg-surface-dark border-2 border-black dark:border-[#f4ead5] px-4 py-3.5">
              <div class="flex gap-1.5">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Follow-up suggestions after each answer -->
        <Transition name="followups">
          <div
            v-if="followUps.length"
            class="followups flex gap-2 overflow-x-auto no-scrollbar px-3 pt-3 pb-0.5 bg-white dark:bg-surface-dark border-t-[3px] border-black dark:border-[#f4ead5]">
            <button
              v-for="question in followUps"
              :key="question.label"
              @click="askQuickQuestion(question)"
              class="chip shrink-0 inline-flex items-center gap-1.5 bg-[#f6f3ea] dark:bg-[#0d0b09] border-2 border-black dark:border-[#f4ead5] px-2.5 py-1 text-xs font-bold hover:bg-primary hover:text-black dark:hover:bg-primary transition-colors">
              <span aria-hidden="true">{{ question.emoji }}</span>{{ question.label }}
            </button>
          </div>
        </Transition>

        <!-- Input -->
        <form
          @submit.prevent="sendMessage"
          class="flex items-center gap-2 p-3 bg-white dark:bg-surface-dark"
          :class="{ 'border-t-[3px] border-black dark:border-[#f4ead5]': !followUps.length }">
          <input
            v-model="userInput"
            type="text"
            placeholder="Ask me anything about Oka…"
            aria-label="Message"
            class="flex-1 min-w-0 h-11 bg-[#f6f3ea] dark:bg-[#0d0b09] border-2 border-black dark:border-[#f4ead5] px-3.5 text-base sm:text-sm font-medium text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:shadow-[3px_3px_0_var(--color-primary)] transition-shadow"
            :disabled="isTyping || isWaitingForResponse || isStreaming" />
          <button
            type="submit"
            aria-label="Send message"
            class="send h-11 w-12 shrink-0 bg-primary border-2 border-black dark:border-[#f4ead5] flex items-center justify-center shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            :disabled="!userInput.trim() || isTyping || isWaitingForResponse || isStreaming">
            <span class="material-icons text-black text-xl">arrow_upward</span>
          </button>
        </form>
        <p class="px-3 pb-2 -mt-1 bg-white dark:bg-surface-dark text-[10px] font-medium opacity-50 text-center">
          AI answers can be imperfect. For anything important, contact Oka directly.
        </p>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from "vue";
import BotFace from "./BotFace.vue";
import { useRouter } from "vue-router";
import { getStreamingResponse } from "../../services/openai";
import { usePostHog } from "@/composables/usePostHog";

export default {
  name: "ChatBot",
  components: { BotFace },
  setup() {
    const { posthog } = usePostHog();
    const router = useRouter();
    const isOpen = ref(false);
    const messages = ref([]);
    const userInput = ref("");
    const isTyping = ref(false);
    const chatMessages = ref(null);
    const isStreaming = ref(false);
    const isWaitingForResponse = ref(false);

    // Visibility states
    const showTooltip = ref(false);
    const hasNewMessages = ref(false);
    const isUserAtBottom = ref(true);

    // Quick questions
    const quickQuestions = [
      { emoji: "💼", label: "Experience", text: "What is Oka's work experience?" },
      { emoji: "🛠", label: "Tech stack", text: "What is Oka's tech stack?" },
      { emoji: "🚀", label: "Projects", text: "What projects has Oka built?" },
      { emoji: "🤝", label: "Hire Oka", text: "How can I contact Oka to hire him?" },
    ];

    // Suggestions shown above the input after an answer, skipping what was already asked
    const askedQuestions = ref([]);
    const followUps = computed(() => {
      if (!messages.value.length || isWaitingForResponse.value || isStreaming.value) return [];
      return quickQuestions.filter((q) => !askedQuestions.value.includes(q.label)).slice(0, 3);
    });

    // The launcher hops before the window pops out of it
    const hopping = ref(false);

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
        hopping.value = true;
        setTimeout(() => (hopping.value = false), 500);
        showTooltip.value = false;
        posthog.capture("chatbot_opened");
      }
    };

    const clearChat = () => {
      if (isWaitingForResponse.value || isStreaming.value) return;
      messages.value = [];
      askedQuestions.value = [];
    };

    const askQuickQuestion = (question) => {
      if (!askedQuestions.value.includes(question.label)) askedQuestions.value.push(question.label);
      userInput.value = question.text;
      sendMessage();
    };

    watch(isOpen, (newVal) => {
      if (newVal) hasNewMessages.value = false;

      if (newVal) {
        setTimeout(() => scrollToBottom(true), 150);
      }
    });

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

      try {
        let tokenBuffer = "";
        let isProcessingBuffer = false;
        let hasStartedTyping = false;
        let messageIndex;
        let isStreamComplete = false;

        const checkIntent = () => {
          // The stream ended without any text
          if (messageIndex === undefined) {
            isWaitingForResponse.value = false;
            isStreaming.value = false;
            return;
          }
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
            isStreaming.value = true;
            messageIndex =
              messages.value.push({
                sender: "bot",
                text: "",
                showContactButton: false,
              }) - 1;
          }

          isProcessingBuffer = true;
          // Reveal a few characters per frame, more when the buffer backs up, so the
          // typing effect keeps pace with the stream instead of trailing seconds behind it
          const step = Math.max(2, Math.ceil(tokenBuffer.length / 8));
          messages.value[messageIndex].text += tokenBuffer.slice(0, step);
          tokenBuffer = tokenBuffer.slice(step);
          scrollToBottom();

          requestAnimationFrame(typeToken);
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
    };

    const formatMessageWithLinks = (text) => {
      if (!text) return "";
      let formattedText = text;

      // Bold markdown
      formattedText = formattedText.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="font-bold">$1</strong>',
      );
      // Markdown links
      formattedText = formattedText.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="font-bold underline decoration-[3px] decoration-primary underline-offset-2">$1</a>',
      );
      // Line breaks
      formattedText = formattedText.replace(/\n/g, "<br>");
      // Bullet points
      formattedText = formattedText.replace(
        /^[-•]\s+(.+?)(?=<br>|$)/gm,
        '<div class="flex gap-2 my-1"><span class="font-bold">•</span><span>$1</span></div>',
      );

      return formattedText;
    };

    // Show the tooltip once, then get out of the way so it doesn't cover content
    onMounted(() => {
      setTimeout(() => {
        showTooltip.value = true;
        setTimeout(() => {
          showTooltip.value = false;
        }, 6000);
      }, 5000);
    });

    const dismissTooltip = () => {
      showTooltip.value = false;
    };

    const navigateToContact = () => {
      // The contact form lives on the home page, not on its own route
      router.push({ path: "/", hash: "#contact" });
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
      followUps,
      hopping,
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

/* ---------- Launcher ---------- */
.launcher {
  transform: rotate(-4deg);
  animation: bob 3.2s ease-in-out infinite;
}
.launcher:hover {
  transform: rotate(3deg) scale(1.06);
  animation-play-state: paused;
}
.launcher:active {
  transform: translate(3px, 3px);
  box-shadow: none;
}
.launcher.is-open {
  animation: none;
  transform: rotate(0deg);
}
/* Squash, jump and land as the window opens */
.launcher.hop {
  animation: hop 0.5s cubic-bezier(0.3, 1.4, 0.5, 1);
}
@keyframes hop {
  0% {
    transform: scale(1, 1);
  }
  20% {
    transform: scale(1.15, 0.8);
  }
  50% {
    transform: translateY(-22px) rotate(-8deg) scale(0.92, 1.1);
  }
  80% {
    transform: translateY(0) scale(1.08, 0.92);
  }
  100% {
    transform: scale(1, 1);
  }
}
@keyframes bob {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -5px;
  }
}

/* ---------- Tooltip bubble ---------- */
.tip {
  transform: rotate(-3deg);
  transform-origin: 85% 120%;
}
.tip::after {
  content: "";
  position: absolute;
  right: 22px;
  bottom: -17px;
  width: 22px;
  height: 22px;
  background: inherit;
  border-right: inherit;
  border-bottom: inherit;
  transform: skewX(-25deg) rotate(45deg);
}
.tooltip-enter-active {
  animation: tip-pop 0.5s cubic-bezier(0.34, 1.8, 0.64, 1);
}
.tooltip-leave-active {
  animation: tip-pop 0.25s ease-in reverse;
}
@keyframes tip-pop {
  from {
    opacity: 0;
    transform: rotate(-3deg) scale(0);
  }
  to {
    opacity: 1;
    transform: rotate(-3deg) scale(1);
  }
}
.waving-hand {
  display: inline-block;
  transform-origin: 70% 70%;
  animation: wave 2s infinite;
}
@keyframes wave {
  0%,
  60%,
  100% {
    transform: rotate(0deg);
  }
  10%,
  30% {
    transform: rotate(16deg);
  }
  20%,
  40% {
    transform: rotate(-10deg);
  }
}

/* ---------- Window ---------- */
.chat-window {
  box-shadow: 8px 8px 0 var(--color-shadow);
  transform-origin: bottom right;
}
@media (max-width: 639px) {
  .chat-window {
    box-shadow: none;
    border-left-width: 0;
    border-right-width: 0;
    border-bottom-width: 0;
    transform-origin: bottom center;
  }
}
/* The window is pulled out of the launcher: it grows from that corner and settles */
.chat-window-enter-active {
  animation: window-in 0.55s 0.12s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}
.chat-window-leave-active {
  animation: window-out 0.25s ease-in both;
}
@keyframes window-in {
  0% {
    clip-path: inset(calc(100% - 64px) 0 0 calc(100% - 64px));
    transform: translate(10px, 30px) rotate(4deg);
  }
  60% {
    /* Negative insets keep the hard shadow visible */
    clip-path: inset(-4px -14px -14px -4px);
  }
  100% {
    clip-path: inset(-4px -14px -14px -4px);
    transform: none;
  }
}
@keyframes window-out {
  to {
    clip-path: inset(calc(100% - 64px) 0 0 calc(100% - 64px));
    transform: translate(10px, 30px) rotate(4deg);
    opacity: 0;
  }
}
@media (max-width: 639px) {
  .chat-window-enter-active {
    animation: sheet-in 0.45s cubic-bezier(0.34, 1.3, 0.64, 1) both;
  }
  .chat-window-leave-active {
    animation: sheet-in 0.25s ease-in reverse both;
  }
}
@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: none;
  }
}

/* ---------- Welcome card ---------- */
.welcome-bot {
  transform: translateX(-50%) rotate(-6deg);
  animation: welcome-bot 0.6s 0.45s cubic-bezier(0.34, 1.8, 0.64, 1) both;
}
@keyframes welcome-bot {
  from {
    transform: translateX(-50%) translateY(30px) rotate(10deg) scale(0.4);
    opacity: 0;
  }
}

.followups-enter-active {
  transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34, 1.6, 0.64, 1);
}
.followups-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.head-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #000;
  border: 2px solid #000;
  box-shadow: 2px 2px 0 #000;
  transition: transform 0.15s, box-shadow 0.15s;
}
.head-btn:hover {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.status-dot {
  animation: status 1.8s ease-in-out infinite;
}
@keyframes status {
  50% {
    opacity: 0.35;
  }
}

/* ---------- Messages ---------- */
.bubble {
  position: relative;
  box-shadow: 3px 3px 0 var(--color-shadow);
}
.bubble-bot {
  border-bottom-left-radius: 0;
}
.bubble-user {
  box-shadow: 3px 3px 0 #000;
}

.message-enter-active {
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.6, 0.64, 1);
}
.message-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.92);
}

.dot {
  width: 7px;
  height: 7px;
  background: currentColor;
  animation: dot 0.9s ease-in-out infinite;
}
.dot:nth-child(2) {
  animation-delay: 0.15s;
}
.dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes dot {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}

.chip:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background-color: currentColor;
  margin-left: 2px;
  animation: cursor 0.8s infinite;
  vertical-align: middle;
}
@keyframes cursor {
  50% {
    opacity: 0;
  }
}

.message-content {
  word-break: break-word;
}

@media (prefers-reduced-motion: reduce) {
  .launcher,
  .launcher.hop,
  .welcome-bot,
  .waving-hand,
  .status-dot,
  .dot {
    animation: none;
  }
}
</style>
