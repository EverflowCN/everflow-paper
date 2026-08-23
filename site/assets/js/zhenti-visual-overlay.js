(()=>{
  // Legacy compatibility shim.
  // Question figures and subject metadata are now handled by zhenti-media.js.
  // Keeping this file intentionally side-effect free prevents older cached
  // HTML from starting the previous body-wide MutationObserver loop.
})();
