// The loader painted by public/index.html for the desk. Fades out once, then leaves the page.
export function hideBootLoader() {
  const loader = document.getElementById("boot-loader");
  if (!loader || loader.classList.contains("is-done")) return;
  loader.classList.add("is-done");
  setTimeout(() => loader.remove(), 600);
}
