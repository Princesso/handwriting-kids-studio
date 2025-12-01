window.App = window.App || {};

(function() {
  const UI = {
    engine: null,
    score: 0,
    streak: 0,
    words: ['Cat', 'Dog', 'Sun', 'Moon', 'Tree', 'Star', 'Love', 'Smile', 'Blue', 'Red', 'Play', 'Fun', 'Bird', 'Fish', 'Ball'],
    
    init() {
      this.engine = new App.HandwritingEngine('drawCanvas', 'canvasContainer');
      this.loadState();
      this.bindControls();
      this.updateStreakDisplay();
      
      // Default startup
      this.engine.drawGuide('Start', true);
    },

    loadState() {
      const state = App.Storage.get('app.state', { streak: 0, score: 0 });
      this.streak = state.streak;
      this.score = state.score;
    },

    saveState() {
      App.Storage.set('app.state', { streak: this.streak, score: this.score });
    },

    bindControls() {
      // Tools
      $('.tool-btn').on('click', function() {
        $('.tool-btn').removeClass('active ring-4 ring-offset-2 ring-indigo-300');
        $(this).addClass('active ring-4 ring-offset-2 ring-indigo-300');
        
        const tool = $(this).data('tool');
        const color = $(this).data('color');
        
        if (tool === 'eraser') {
          UI.engine.setTool('eraser');
        } else {
          UI.engine.setTool('color', color);
        }
      });

      // Actions
      $('#btnClear').on('click', () => {
        UI.engine.clear();
        // Play a swoosh sound effect placeholder or animation
        $('#drawCanvas').addClass('animate-shake');
        setTimeout(() => $('#drawCanvas').removeClass('animate-shake'), 500);
      });

      $('#btnCheck').on('click', () => UI.handleCheck());
      $('#btnSpeak').off('click').on('click', () => UI.speakText(UI.engine.targetText));
      $('#btnNew').on('click', () => UI.openAIModal());
      
      // AI Modal
      $('#modalGenerate').on('click', () => UI.generateChallenge());
      $('.modal-close').on('click', () => $('#aiModal').fadeOut());
    },

    handleCheck() {
      const coverage = this.engine.checkWork();
      
      // Heuristic thresholds
      if (coverage > 0.5) {
        this.showFeedback('success', 'Great Job! 🌟');
        this.streak++;
        setTimeout(() => this.loadNextWord(), 2000);
        this.confetti();
      } else if (coverage > 0.1) {
        this.showFeedback('warning', 'Keep Going! ✏️');
      } else {
        this.showFeedback('error', 'Try drawing something! 🎨');
      }
      
      this.updateStreakDisplay();
      this.saveState();
    },

    loadNextWord() {
      const word = this.words[Math.floor(Math.random() * this.words.length)];
      this.engine.drawGuide(word);
      this.speakText(word);
    },

    updateStreakDisplay() {
      $('#streakCount').text(this.streak);
    },

    showFeedback(type, message) {
      const $toast = $(`<div class="fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl font-bold text-white z-50 animate-bounce-in">
        ${message}
      </div>`);

      if (type === 'success') $toast.addClass('bg-green-500');
      else if (type === 'warning') $toast.addClass('bg-yellow-500');
      else $toast.addClass('bg-red-500');

      $('body').append($toast);
      setTimeout(() => $toast.fadeOut(() => $toast.remove()), 3000);
    },

    speakText(text) {
      // Visual feedback
      const $btn = $('#btnSpeak');
      $btn.addClass('ring-4 ring-indigo-200 transform scale-110');
      setTimeout(() => $btn.removeClass('ring-4 ring-indigo-200 transform scale-110'), 200);

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const txt = text || 'Nothing to read yet';
        const utterance = new SpeechSynthesisUtterance(txt);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    },

    openAIModal() {
      $('#aiModal').css('display', 'flex').hide().fadeIn();
      // Check if AI is ready
      if (!window.AppLLM.ready) {
        $('#aiStatus').show();
        $('#aiInputArea').hide();
        this.initAI();
      } else {
        $('#aiStatus').hide();
        $('#aiInputArea').show();
      }
    },

    async initAI() {
      try {
        await window.AppLLM.load(null, (pct) => {
          $('#aiProgress').css('width', pct + '%');
          $('#aiProgressText').text(`Loading Magic Brain... ${pct}%`);
        });
        $('#aiStatus').fadeOut(() => {
          $('#aiInputArea').fadeIn();
        });
      } catch (err) {
        $('#aiProgressText').text('Oops! AI needs a better browser (Chrome/Edge).');
        console.error(err);
      }
    },

    async generateChallenge() {
      const topic = $('#topicInput').val() || 'Animals';
      const $btn = $('#modalGenerate');
      const originalText = $btn.text();
      
      $btn.prop('disabled', true).html('<span class="animate-pulse">Thinking...</span>');
      
      try {
        let generatedText = '';
        const system = "You are a helpful teacher for a 5-year-old. Generate exactly ONE simple, positive 2-4 word sentence about the user's topic. Do not use punctuation marks or quotes. Keep it short. Just the words.";
        
        await window.AppLLM.generate(`Topic: ${topic}`, {
          system,
          onToken: (t) => generatedText += t
        });

        // Clean up result
        const cleanText = generatedText.replace(/["'.]/g, '').trim();
        this.engine.drawGuide(cleanText);
        $('#aiModal').fadeOut();
        this.speakText(cleanText);
        
      } catch (e) {
        console.error(e);
        this.showFeedback('error', 'Magic failed. Try again!');
      } finally {
        $btn.prop('disabled', false).text(originalText);
      }
    },

    confetti() {
      // Simple CSS/JS confetti particle effect
      for (let i = 0; i < 30; i++) {
        const $c = $(`<div class="absolute w-3 h-3 rounded-full pointer-events-none" style="top:50%; left:50%"></div>`);
        const color = ['#ef4444', '#3b82f6', '#fbbf24', '#10b981'][Math.floor(Math.random() * 4)];
        $c.css('background-color', color);
        $('body').append($c);
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 10;
        const x = Math.cos(angle) * velocity * 20;
        const y = Math.sin(angle) * velocity * 20;
        
        $c.animate({
          top: `+=${y}px`,
          left: `+=${x}px`,
          opacity: 0
        }, 1000, () => $c.remove());
      }
    }
  };

  App.init = () => UI.init();
  App.render = () => {}; // Not using a global render loop for this app type
})();