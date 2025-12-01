window.App = window.App || {};

(function() {
  // --- Storage Helper ---
  App.Storage = {
    get(key, defaultVal) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
      } catch (e) { return defaultVal; }
    },
    set(key, val) {
      localStorage.setItem(key, JSON.stringify(val));
    }
  };

  // --- Handwriting Engine ---
  class HandwritingEngine {
    constructor(canvasId, containerId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.container = document.getElementById(containerId);
      
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.color = '#3b82f6'; // Default blue
      this.lineWidth = 12;
      this.erasing = false;
      
      this.targetText = '';
      this.fontFamily = 'Patrick Hand';
      
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.bindEvents();
    }

    resize() {
      const rect = this.container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      // Redraw guide if exists
      if (this.targetText) this.drawGuide(this.targetText, false);
    }

    bindEvents() {
      const start = (e) => {
        e.preventDefault();
        this.isDrawing = true;
        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      const move = (e) => {
        if (!this.isDrawing) return;
        e.preventDefault();
        const pos = this.getPos(e);
        this.draw(pos.x, pos.y);
        this.lastX = pos.x;
        this.lastY = pos.y;
      };

      const end = () => this.isDrawing = false;

      this.canvas.addEventListener('mousedown', start);
      this.canvas.addEventListener('mousemove', move);
      this.canvas.addEventListener('mouseup', end);
      this.canvas.addEventListener('mouseout', end);

      this.canvas.addEventListener('touchstart', start, { passive: false });
      this.canvas.addEventListener('touchmove', move, { passive: false });
      this.canvas.addEventListener('touchend', end);
    }

    getPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    draw(x, y) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.erasing ? '#ffffff' : this.color;
      this.ctx.lineWidth = this.erasing ? 40 : this.lineWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.targetText) this.drawGuide(this.targetText, false);
    }

    setTool(type, value) {
      if (type === 'color') {
        this.color = value;
        this.erasing = false;
      } else if (type === 'eraser') {
        this.erasing = true;
      }
    }

    drawGuide(text, clear = true) {
      this.targetText = text;
      if (clear) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.save();

      // Calculate Font Size
      let fontSize = Math.min(this.canvas.height / 2, 150);
      this.ctx.font = `bold ${fontSize}px "${this.fontFamily}"`;
      
      // Scale to fit width
      const maxW = this.canvas.width * 0.9;
      const textW = this.ctx.measureText(text).width;
      if (textW > maxW) {
        fontSize = Math.floor(fontSize * (maxW / textW));
        this.ctx.font = `bold ${fontSize}px "${this.fontFamily}"`;
      }

      // Draw Guidelines (scaled to font)
      const spacing = fontSize / 2.5;
      this.drawPaperLines(spacing);

      // Draw Text Guide
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
      
      const x = this.canvas.width / 2;
      const y = this.canvas.height / 2;
      
      this.ctx.fillText(text, x, y);
      this.ctx.strokeText(text, x, y);
      this.ctx.restore();
    }

    drawPaperLines(customSpacing) {
      const mid = this.canvas.height / 2;
      const spacing = customSpacing || Math.min(this.canvas.height / 4, 60);
      
      this.ctx.beginPath();
      this.ctx.strokeStyle = '#e2e8f0'; // Light slate
      // Base line (Solid)
      this.ctx.moveTo(0, mid + spacing/2);
      this.ctx.lineTo(this.canvas.width, mid + spacing/2);
      
      // Top line (Solid)
      this.ctx.moveTo(0, mid - spacing * 1.5);
      this.ctx.lineTo(this.canvas.width, mid - spacing * 1.5);
      this.ctx.stroke();

      // Middle line (Dashed)
      this.ctx.beginPath();
      this.ctx.setLineDash([10, 10]);
      this.ctx.strokeStyle = '#94a3b8';
      this.ctx.moveTo(0, mid - spacing/2);
      this.ctx.lineTo(this.canvas.width, mid - spacing/2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Simple heuristic check: How much ink is on the screen?
    // In a real production app we'd rasterize the target text to an offscreen canvas 
    // and compare pixel overlap. For this demo, we assume effort if > 5% pixels are non-white.
    checkWork() {
      const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      let coloredPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Check if not white (simple check)
        if (data[i] < 250 || data[i+1] < 250 || data[i+2] < 250) {
          coloredPixels++;
        }
      }
      const totalPixels = this.canvas.width * this.canvas.height;
      return (coloredPixels / totalPixels) * 100;
    }
  }

  App.HandwritingEngine = HandwritingEngine;
})();