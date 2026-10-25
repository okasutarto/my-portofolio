import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { sfx } from "@/composables/useSfx";

gsap.registerPlugin(ScrollTrigger);

// v-title-reveal: section-title entrance, played once when the title scrolls in.
// - plain words slide up from behind a mask, one by one
// - highlighted "chips" (child elements, e.g. the black "Me" box) get slapped on
// - v-title-reveal="'box'": the title itself is the chip (e.g. "My Projects")
export const titleReveal = {
  mounted(el, binding) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const box = binding.value === "box";
    const words = [];
    const wrapWords = (parent) => {
      [...parent.childNodes].forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const mask = document.createElement("span");
          mask.className = "title-reveal-mask";
          const word = document.createElement("span");
          word.className = "title-reveal-word";
          word.textContent = part;
          mask.appendChild(word);
          frag.appendChild(mask);
          words.push(word);
        });
        node.replaceWith(frag);
      });
    };
    wrapWords(el);
    const chips = box ? [el] : [...el.children].filter((c) => !c.classList.contains("title-reveal-mask"));
    // Words inside chips slide up too
    chips.forEach((chip) => chip !== el && wrapWords(chip));

    el._titleReveal = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
      if (box) {
        tl.from(el, { scale: 0.6, rotate: -8, opacity: 0, duration: 0.5, ease: "back.out(2.2)", clearProps: "transform,opacity" });
        // the box is thrown down and slapped onto the page
        tl.call(() => sfx.whoosh({ duration: 0.3, up: false }), null, 0);
        tl.call(() => sfx.slap(), null, 0.22);
      }
      tl.from(
        words,
        { yPercent: 115, duration: 0.6, stagger: 0.06, ease: "power3.out" },
        box ? "-=0.25" : 0,
      );
      if (!box && chips.length) {
        tl.from(
          chips,
          { scale: 0, rotate: -14, duration: 0.5, ease: "back.out(2.2)", clearProps: "transform" },
          "-=0.35",
        );
      }
    });
  },
  unmounted(el) {
    if (el._titleReveal) el._titleReveal.revert();
  },
};
