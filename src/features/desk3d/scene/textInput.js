export function createTextInput(runtime) {
  // ---------- typing into props (postcard fields, the phone's chat box) ----------
  // A visually hidden textarea holds the text, so phones raise their keyboard and every input
  // method works; the prop only draws the value. A field is { id, get, set, redraw, ... }.
  const typer = document.createElement("textarea");
  typer.setAttribute("aria-label", "Type here");
  Object.assign(typer.style, {
    position: "absolute",
    left: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    border: "0",
    padding: "0",
    resize: "none",
    fontSize: "16px", // below 16px iOS zooms the page on focus
    pointerEvents: "none",
  });
  runtime.options.container.appendChild(typer);
  let typing = null;
  let caretOn = true;
  function startTyping(field) {
    typing = field;
    typer.maxLength = field.maxLength || 500;
    typer.value = field.get();
    typer.focus({ preventScroll: true });
    typer.setSelectionRange(typer.value.length, typer.value.length);
    caretOn = true;
    field.redraw();
  }
  function stopTyping() {
    if (!typing) return;
    const field = typing;
    typing = null;
    typer.blur();
    field.onStop?.();
    field.redraw();
  }
  const onTyperInput = () => {
    if (!typing) return;
    typing.set(typer.value);
    typing.redraw();
  };
  const onTyperKey = (e) => {
    if (!typing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      stopTyping();
      return runtime.camera.back();
    }
    if (e.key === "Tab" && typing.onTab) {
      e.preventDefault();
      return typing.onTab(e.shiftKey ? -1 : 1);
    }
    // Multi-line fields take Enter as a new line; Cmd/Ctrl+Enter submits
    if (e.key === "Enter" && (!typing.multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      return typing.onEnter?.();
    }
    if (!e.repeat && (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter"))
      runtime.keyboard.pressKey(e.code);
  };
  typer.addEventListener("input", onTyperInput);
  typer.addEventListener("keydown", onTyperKey);

  // Public state used by the other scene parts.
  return {
    get caretOn() { return caretOn; },
    set caretOn(value) { caretOn = value; },
    startTyping,
    typer,
    stopTyping,
    get typing() { return typing; },
    onTyperInput,
    onTyperKey,
  };
}
