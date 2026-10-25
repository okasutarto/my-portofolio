<template>
  <!-- The chat assistant's robot: blinks, glances around, talks while replying and can wave -->
  <svg
    class="bot-face"
    :class="{ talking, waving: wave }"
    :viewBox="wave ? '0 0 50 40' : '0 0 40 40'"
    aria-hidden="true">
    <line x1="20" y1="3" x2="20" y2="9" stroke="#000" stroke-width="3" stroke-linecap="round" />
    <circle class="antenna" cx="20" cy="4" r="3" fill="#ff5c8a" stroke="#000" stroke-width="2" />
    <g v-if="wave" class="arm">
      <path d="M34 26 L42 18" stroke="#000" stroke-width="6.5" stroke-linecap="round" />
      <path d="M34 26 L42 18" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      <circle cx="43.5" cy="16.5" r="3.6" fill="#fff" stroke="#000" stroke-width="2" />
    </g>
    <rect x="5" y="9" width="30" height="25" rx="5" fill="#fff" stroke="#000" stroke-width="3" />
    <g class="eyes">
      <rect class="eye" x="12" y="16" width="5" height="7" rx="1.5" fill="#000" />
      <rect class="eye" x="23" y="16" width="5" height="7" rx="1.5" fill="#000" />
    </g>
    <path v-if="!talking" d="M15 28 Q20 31 25 28" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" />
    <ellipse v-else class="mouth" cx="20" cy="28.5" rx="4" ry="2.6" fill="#000" />
  </svg>
</template>

<script setup>
defineProps({
  talking: { type: Boolean, default: false },
  wave: { type: Boolean, default: false },
});
</script>

<style scoped>
.eyes {
  animation: glance 6s ease-in-out infinite;
}
.eye {
  transform-box: fill-box;
  transform-origin: center;
  animation: blink 4s infinite;
}
.antenna {
  animation: antenna 2s ease-in-out infinite;
}
.talking .antenna {
  animation-duration: 0.5s;
}
.mouth {
  transform-box: fill-box;
  transform-origin: center;
  animation: talk 0.22s ease-in-out infinite alternate;
}
.arm {
  transform-origin: 34px 26px;
  animation: wave-arm 1.6s ease-in-out infinite;
}

@keyframes blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  95% {
    transform: scaleY(0.1);
  }
}
@keyframes glance {
  0%,
  30%,
  100% {
    transform: translateX(0);
  }
  38%,
  55% {
    transform: translateX(-3px);
  }
  63%,
  80% {
    transform: translateX(3px);
  }
}
@keyframes antenna {
  0%,
  100% {
    fill: #ff5c8a;
  }
  50% {
    fill: #ffdd00;
  }
}
@keyframes talk {
  from {
    transform: scaleY(0.25);
  }
  to {
    transform: scaleY(1.1);
  }
}
@keyframes wave-arm {
  0%,
  50%,
  100% {
    transform: rotate(0deg);
  }
  15%,
  35% {
    transform: rotate(-28deg);
  }
  25% {
    transform: rotate(8deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .eyes,
  .eye,
  .antenna,
  .mouth,
  .arm {
    animation: none;
  }
}
</style>
