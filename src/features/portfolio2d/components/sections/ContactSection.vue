<template>
  <section
    id="contact"
    ref="sectionRef"
    class="py-24 px-4 md:px-12 transition-colors duration-300 relative overflow-hidden bg-grid-pattern">
    <div class="max-w-7xl mx-auto relative z-10">
      <!-- Section Header -->
      <div class="mb-12 text-center lg:text-left">
        <h2
          v-title-reveal
          class="font-display text-4xl md:text-6xl font-bold uppercase tracking-tight leading-none text-black dark:text-white">
          Get in
          <span
            class="bg-black text-white px-3 py-1 dark:bg-primary dark:text-black inline-block -rotate-1 shadow-neo-sm"
            >Touch</span
          >
        </h2>
      </div>

      <div
        class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-12 lg:gap-14 items-start">
        <!-- Postcard -->
        <div class="postcard-stage relative pt-12 pb-10">
          <!-- Envelope the card arrives in (intro only): back panel sits behind the card,
               the front pocket and the flap sit in front of it -->
          <template v-if="showEnvelope">
            <div ref="envelopeBackRef" class="envelope-part envelope-back" aria-hidden="true"></div>
          </template>
          <form
            ref="postcardRef"
            class="postcard relative z-10 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] min-h-[400px] bg-[#fffdf5] text-[#1a1714] border-[2.5px] border-black shadow-[8px_8px_0_#000]"
            :class="{ ready: introDone, sent: status === 'sent', shake: status === 'error' }"
            novalidate
            @submit.prevent="submitForm">
            <!-- Message side -->
            <div
              class="flex flex-col p-6 md:p-7 border-b-2 md:border-b-0 md:border-r-2 border-black/25">
              <label
                for="contact-message"
                class="font-display font-bold text-lg uppercase mb-3"
                >Hi Oka,</label
              >
              <textarea
                id="contact-message"
                v-model="form.message"
                class="lined flex-1 min-h-[200px] w-full bg-transparent border-0 outline-none resize-none font-medium text-lg text-[#1a1714] placeholder:text-black/40"
                placeholder="Tell me about your project..."
                :aria-invalid="!!errors.message"
                aria-describedby="contact-message-error"></textarea>
              <p
                v-if="errors.message"
                id="contact-message-error"
                class="mt-2 text-sm font-bold text-red-600">
                {{ errors.message }}
              </p>
            </div>

            <!-- Address side -->
            <div class="relative flex flex-col gap-5 p-6 md:p-7">
              <div ref="stampRef" class="stamp self-end" aria-hidden="true">
                <div>
                  <i class="fas fa-mobile-alt text-3xl block mb-1"></i>
                  PONTIANAK<br />2026
                </div>
              </div>
              <div class="postmark" aria-hidden="true">
                SENT FROM<br />OKASP.DEV<br />✦
              </div>

              <p class="font-display font-bold text-sm md:text-base break-words">To: Oka Sutarto Putra</p>

              <div>
                <label class="addr block" for="contact-name">
                  <span class="addr-label">From (your name)</span>
                  <input
                    id="contact-name"
                    v-model="form.name"
                    type="text"
                    autocomplete="name"
                    placeholder="Jane Doe"
                    :aria-invalid="!!errors.name" />
                </label>
                <p v-if="errors.name" class="mt-1 text-sm font-bold text-red-600">
                  {{ errors.name }}
                </p>
              </div>

              <div>
                <label class="addr block" for="contact-email">
                  <span class="addr-label">Reply to (email)</span>
                  <input
                    id="contact-email"
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    placeholder="jane@company.com"
                    :aria-invalid="!!errors.email" />
                </label>
                <p v-if="errors.email" class="mt-1 text-sm font-bold text-red-600">
                  {{ errors.email }}
                </p>
              </div>

              <button
                type="submit"
                :disabled="status === 'sending'"
                class="mt-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 font-display font-bold uppercase text-black bg-primary border-2 border-black shadow-[5px_5px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[1px_1px_0_#000] transition-all disabled:opacity-60 disabled:cursor-wait">
                <template v-if="status === 'sending'">
                  <i class="fas fa-circle-notch animate-spin"></i> Sending...
                </template>
                <template v-else>
                  Send postcard <i class="fas fa-paper-plane"></i>
                </template>
              </button>

              <p
                v-if="status === 'error'"
                class="text-sm font-bold text-red-600"
                role="alert">
                Couldn't send it. Try again, or email me directly.
              </p>
            </div>
          </form>

          <template v-if="showEnvelope">
            <div ref="envelopeFrontRef" class="envelope-part envelope-front-wrap" aria-hidden="true">
              <div class="envelope-front">
                <span class="par-avion">Par avion ✈</span>
              </div>
            </div>
            <div ref="flapRef" class="envelope-part envelope-flap-wrap" aria-hidden="true">
              <div class="envelope-flap"></div>
            </div>
          </template>

          <!-- Delivered stamp shown after the card flies off -->
          <div
            class="delivered absolute inset-0 grid place-items-center pointer-events-none"
            :class="{ show: status === 'sent' }"
            role="status"
            aria-live="polite">
            <span v-if="status === 'sent'">DELIVERED ✓</span>
          </div>
        </div>

        <!-- Side -->
        <div ref="sideRef" class="flex flex-col gap-4 text-center lg:text-left">
          <h3
            class="font-display font-bold uppercase tracking-tighter leading-none text-4xl md:text-5xl text-black dark:text-white">
            Let's<br class="hidden lg:block" />
            connect<span class="text-primary">.</span>
          </h3>
          <p
            class="font-medium leading-relaxed text-gray-700 dark:text-gray-300 mb-2">
            New project, an opportunity, or just want to say hello? Write it on
            the card and it lands straight in my inbox.
          </p>
          <a
            v-for="channel in channels"
            :key="channel.label"
            :href="channel.href"
            :target="channel.external ? '_blank' : undefined"
            :rel="channel.external ? 'noopener noreferrer' : undefined"
            class="flex items-center gap-3 px-4 py-3 font-bold text-black border-2 border-black shadow-[4px_4px_0_#000] hover:-rotate-1 hover:-translate-y-0.5 transition-transform"
            :class="channel.class"
            @click="channel.event && posthog.capture(channel.event)">
            <i :class="[channel.icon, 'text-xl w-6 text-center']"></i>
            <span class="flex flex-col text-left">
              <span class="text-[10px] uppercase tracking-[0.2em] opacity-70">{{
                channel.label
              }}</span>
              <span class="text-base md:text-lg">{{ channel.value }}</span>
            </span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { titleReveal as vTitleReveal } from "../../directives/titleReveal";
import { ref, reactive, onMounted, onBeforeUnmount } from "vue";
import gsap from "gsap";
import { sfx } from "@/shared/composables/useSfx";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import emailjs from "@emailjs/browser";
import { EMAILJS_CONFIG } from "@/shared/config/emailjs";
import { usePostHog } from "@/features/portfolio2d/composables/usePostHog";

gsap.registerPlugin(ScrollTrigger);

const { posthog } = usePostHog();

const channels = [
  {
    label: "Email",
    value: "okasputra@gmail.com",
    href: "mailto:okasputra@gmail.com",
    icon: "fas fa-envelope",
    class: "bg-secondary",
    event: "email_link_clicked",
  },
  {
    label: "WhatsApp",
    value: "+62 822 1641 8397",
    href: "https://wa.me/6282216418397",
    icon: "fab fa-whatsapp",
    class: "bg-primary",
    event: "whatsapp_link_clicked",
    external: true,
  },
  {
    label: "Location",
    value: "Pontianak, Indonesia",
    href: "https://maps.google.com/?q=Pontianak,Indonesia",
    icon: "fas fa-location-dot",
    class: "bg-[#c4b5fd]",
    external: true,
  },
];

const sectionRef = ref(null);
const postcardRef = ref(null);
const stampRef = ref(null);
const sideRef = ref(null);

const form = reactive({ name: "", email: "", message: "" });
const errors = reactive({ name: "", email: "", message: "" });
// idle | sending | sent | error
const status = ref("idle");
// The fly-away transition is only switched on after the intro, otherwise it would
// also delay every value GSAP sets while tossing the card in
const introDone = ref(false);
// The envelope remains visible as a background wrapper for the postcard
const showEnvelope = ref(true);
const envelopeBackRef = ref(null);
const envelopeFrontRef = ref(null);
const flapRef = ref(null);
let resetTimer = null;
let ctx = null;

const validateForm = () => {
  errors.name = !form.name.trim() ? "Tell me your name" : "";
  errors.email = !form.email.trim()
    ? "I need an email to reply to"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ? "That email doesn't look right"
    : "";
  errors.message = !form.message.trim()
    ? "The card is still empty"
    : form.message.trim().length < 10
    ? "A little more, please (min 10 characters)"
    : "";
  return !errors.name && !errors.email && !errors.message;
};

const submitForm = async () => {
  if (!validateForm()) {
    sfx.buzz();
    return;
  }
  status.value = "sending";

  try {
    await emailjs.send(
      EMAILJS_CONFIG.SERVICE_ID,
      EMAILJS_CONFIG.TEMPLATE_ID,
      {
        name: form.name,
        email: form.email,
        subject: "Portfolio Contact Form",
        message: form.message,
        to_name: "Oka Sutarto Putra",
      },
      EMAILJS_CONFIG.PUBLIC_KEY,
    );
    posthog.capture("contact_form_sent");
    status.value = "sent";
    // The card flies off to the mailbox, then gets its "delivered" stamp
    sfx.whoosh({ duration: 0.6 });
    sfx.stamp({ delay: 0.7 });

    // Card flies off, "delivered" stamp shows, then a fresh card comes back
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      form.name = "";
      form.email = "";
      form.message = "";
      status.value = "idle";
    }, 3600);
  } catch (error) {
    console.error("EmailJS Error:", error);
    status.value = "error";
    sfx.buzz();
  }
};

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    introDone.value = true;
    gsap.set(postcardRef.value, { zIndex: 35, y: -6 });
    gsap.set([envelopeBackRef.value, envelopeFrontRef.value], { y: 32, rotate: 1.5, opacity: 1 });
    gsap.set(flapRef.value, { y: 32, rotate: 1.5, rotateX: 180, zIndex: 5, opacity: 1 });
    return;
  }

  ctx = gsap.context(() => {
    const card = postcardRef.value;
    const envelope = [envelopeBackRef.value, envelopeFrontRef.value, flapRef.value];
    const side = sideRef.value.children;

    // Waiting state: envelope off to the left, card hidden inside it, side column hidden
    gsap.set(envelope, { x: -180, rotate: -10, opacity: 0 });
    gsap.set(card, { opacity: 0, yPercent: 4, scale: 0.95 });
    gsap.set(side, { y: 24, opacity: 0 });

    // The postcard arrives in an envelope, slides out, and settles on top of it;
    // only then does the "Let's connect" column follow.
    gsap
      .timeline({
        scrollTrigger: { trigger: card, start: "top 80%" },
        onComplete: () => {
          introDone.value = true;
        },
      })
      // 1. Envelope slides in
      .to(envelope, { x: 0, rotate: 0, opacity: 1, duration: 0.6, ease: "power3.out" })
      .call(() => sfx.whoosh({ duration: 0.5 }), null, "<")
      .set(card, { opacity: 1 })
      // 2. Flap opens; halfway through it passes behind the card
      .to(flapRef.value, { rotateX: 180, duration: 0.45, ease: "power2.inOut" }, "+=0.05")
      .call(() => sfx.slide({ duration: 0.4 }), null, "<")
      .set(flapRef.value, { zIndex: 5 }, "-=0.22")
      // 3. Card slides all the way up, until its bottom edge has cleared the pocket's top
      //    corners: only then can it pass in front of the envelope without cutting through it
      .addLabel("out")
      .to(card, { yPercent: -106, scale: 1, duration: 0.95, ease: "power2.inOut" }, "out")
      .call(() => sfx.slide({ duration: 0.8 }), null, "out")
      // 4. Clear of the envelope, the card moves in front of it
      .set(card, { zIndex: 35 }, "out+=0.95")
      // Envelope settles into resting background position under the card
      .to(envelope, { y: 32, rotate: 1.5, duration: 0.6, ease: "power2.inOut" }, "out+=0.7")
      // Card comes down to rest on top of the envelope
      .to(card, { yPercent: 0, y: -6, duration: 0.75, ease: "power2.inOut" }, "out+=0.95")
      .to(card, { keyframes: { scaleY: [1, 0.98, 1], scaleX: [1, 1.01, 1] }, duration: 0.28, transformOrigin: "50% 100%" }, "out+=1.7")
      .call(() => sfx.cardDown({ strength: 0.6 }), null, "out+=1.7")
      // 5. Stamp slapped on, then the side column
      .from(stampRef.value, { scale: 2.2, rotate: -20, opacity: 0, duration: 0.45, ease: "back.out(2)" })
      .call(() => sfx.stamp(), null, "<+0.08")
      .to(side, { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: "power3.out", clearProps: "transform,opacity" }, ">+0.1");
  }, sectionRef.value);
});

onBeforeUnmount(() => {
  clearTimeout(resetTimer);
  if (ctx) ctx.revert();
});
</script>

<style scoped>
/* ---------- Envelope (intro) ---------- */
.envelope-part {
  position: absolute;
  inset: 0;
  pointer-events: none;
  will-change: transform;
}
.envelope-back {
  z-index: 0;
  background: #e8d3a7;
  border: 2.5px solid #000;
  box-shadow: 8px 8px 0 #000;
}
/* Clip-path drops borders, so the outline comes from drop-shadows on the wrapper */
.envelope-front-wrap,
.envelope-flap-wrap {
  filter: drop-shadow(2.5px 0 0 #000) drop-shadow(-2.5px 0 0 #000)
    drop-shadow(0 2.5px 0 #000) drop-shadow(0 -2.5px 0 #000);
}
.envelope-front-wrap {
  z-index: 20;
}
.envelope-front {
  position: absolute;
  inset: 0;
  background: #dcc391;
  /* Side and bottom flaps meet in a V; its depth is capped on tall (mobile) cards */
  clip-path: polygon(0 0, 50% min(52%, 210px), 100% 0, 100% 100%, 0 100%);
}
.par-avion {
  position: absolute;
  left: 20px;
  bottom: 8px;
  padding: 3px 8px;
  background: #fff;
  border: 2px solid #1d4ed8;
  box-shadow: 2px 2px 0 #1d4ed8;
  color: #1d4ed8;
  font: 800 0.72rem "Lexend Mega", sans-serif;
  text-transform: uppercase;
  transform: rotate(-3deg);
}
.envelope-flap-wrap {
  z-index: 30;
  height: min(52%, 210px);
  transform-origin: top center;
}
.envelope-flap {
  position: absolute;
  inset: 0;
  background: #e2cb9c;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

/* Faint dashed border inside the card edge */
.postcard::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 2px dashed rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

/* Ruled lines that scroll with the text */
.lined {
  line-height: 2.1rem;
  background-image: repeating-linear-gradient(
    transparent 0 2.05rem,
    rgba(0, 0, 0, 0.18) 2.05rem 2.1rem
  );
  background-attachment: local;
}

.stamp {
  width: 96px;
  height: 116px;
  display: grid;
  place-items: center;
  text-align: center;
  background: var(--color-primary);
  color: #000;
  border: 3px solid #000;
  outline: 3px dotted #fffdf5;
  outline-offset: -9px;
  transform: rotate(4deg);
  font: 800 0.62rem "Lexend Mega", sans-serif;
}

.postmark {
  position: absolute;
  right: 120px;
  top: 30px;
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  text-align: center;
  line-height: 1.2;
  border: 3px solid rgba(217, 70, 239, 0.7);
  border-radius: 50%;
  color: rgba(217, 70, 239, 0.85);
  transform: rotate(-14deg);
  font: 800 0.6rem "Lexend Mega", sans-serif;
  pointer-events: none;
}

.addr {
  border-bottom: 2px solid rgba(0, 0, 0, 0.35);
  padding: 6px 0;
}
.addr:focus-within {
  border-bottom-color: #000;
}
.addr-label {
  display: block;
  font-weight: 700;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.6;
}
.addr input {
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  font-weight: 600;
  font-size: 1.05rem;
  color: #1a1714;
}
.addr input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

/* Sent: the card folds back and flies off */
.postcard {
  transform-origin: center;
}
.postcard.ready {
  z-index: 35;
  transition:
    transform 0.8s cubic-bezier(0.6, -0.2, 0.4, 1.2),
    opacity 0.4s 0.5s;
}
.postcard.sent {
  transform: rotateX(70deg) rotateZ(-8deg) scale(0.4) translateY(-640px);
  opacity: 0;
}
.postcard-stage {
  perspective: 1400px;
}

/* Error: a quick shake */
.postcard.shake {
  animation: shake 0.45s;
}
@keyframes shake {
  20%,
  60% {
    transform: translateX(-8px) rotate(-0.5deg);
  }
  40%,
  80% {
    transform: translateX(8px) rotate(0.5deg);
  }
}

.delivered {
  z-index: 40;
}
.delivered span {
  font: 800 2rem "Lexend Mega", sans-serif;
  color: #22a34a;
  border: 5px solid #22a34a;
  padding: 10px 22px;
  background: rgba(255, 255, 255, 0.75);
  transform: rotate(-8deg);
  animation: stamp-in 0.4s 0.6s cubic-bezier(0.34, 1.8, 0.64, 1) both;
}
@keyframes stamp-in {
  from {
    transform: rotate(-8deg) scale(2.2);
    opacity: 0;
  }
}

@media (max-width: 767px) {
  .postmark {
    right: auto;
    left: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .postcard,
  .postcard.sent {
    transition: none;
  }
  .postcard.sent {
    transform: none;
    opacity: 0.25;
  }
  .postcard.shake {
    animation: none;
  }
}
</style>
