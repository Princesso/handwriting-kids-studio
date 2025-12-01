$(function() {
  try {
    if (window.App && window.App.init) {
      window.App.init();
      console.log('App initialized successfully');
    } else {
      console.error('App structure missing. Check scripts/ui.js and scripts/helpers.js');
    }
  } catch (e) {
    console.error('Critical initialization error:', e);
  }
});