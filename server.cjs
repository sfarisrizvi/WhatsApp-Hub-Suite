import('./dist/index.js').catch(err => {
  console.error("Failed to load server:", err);
});
