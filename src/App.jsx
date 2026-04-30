import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

// ─── Particle Engine ────────────────────────────────────────────────────────

class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.decay = 0.012 + Math.random() * 0.008;
  }
  update(gravity, wind, turbulence) {
    this.vx += (Math.random() - 0.5) * turbulence;
    this.vy += (Math.random() - 0.5) * turbulence;
    this.vy += gravity * 0.04;
    this.vx += wind * 0.02;
    this.vx *= 0.97;
    this.vy *= 0.97;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }
  get alive() { return this.life > 0; }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
}

const PALETTES = {
  "Aurora":    ["#00FFB2","#00D4FF","#7B2FFF","#FF2F7B","#FFD700"],
  "Inferno":   ["#FF4500","#FF6A00","#FFB800","#FF0055","#FFF0A0"],
  "Ocean":     ["#006FFF","#00C8FF","#00FFD0","#0040FF","#80FFFF"],
  "Rose Gold": ["#FF6B9D","#FFB347","#C9A96E","#FF8C69","#FFD700"],
  "Void":      ["#9D00FF","#FF00FF","#00FFFF","#FF007F","#FFFFFF"],
  "Emerald":   ["#00FF87","#00E5A0","#60EFFF","#00B4D8","#A8FF3E"],
};

const MODES = ["Stream", "Explosion", "Spiral", "Rain", "Magnetic"];

function spawnParticles(x, y, mode, palette, size, speed, count) {
  const colors = PALETTES[palette];
  const particles = [];
  const n = Math.floor(count);

  for (let i = 0; i < n; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const s = (size * 0.5) + Math.random() * size;
    let vx, vy, life;

    if (mode === "Stream") {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const spd = (speed * 0.5 + Math.random() * speed);
      vx = Math.cos(angle) * spd;
      vy = Math.sin(angle) * spd;
      life = 0.6 + Math.random() * 0.8;
    } else if (mode === "Explosion") {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * 0.3 + Math.random() * speed * 1.2;
      vx = Math.cos(angle) * spd;
      vy = Math.sin(angle) * spd;
      life = 0.5 + Math.random() * 0.6;
    } else if (mode === "Spiral") {
      const angle = (i / n) * Math.PI * 4 + Date.now() * 0.002;
      const spd = speed * 0.4 + Math.random() * speed * 0.6;
      vx = Math.cos(angle) * spd;
      vy = Math.sin(angle) * spd;
      life = 0.7 + Math.random() * 0.6;
    } else if (mode === "Rain") {
      vx = (Math.random() - 0.5) * speed * 0.3;
      vy = speed * 0.5 + Math.random() * speed;
      life = 0.8 + Math.random() * 0.5;
    } else if (mode === "Magnetic") {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * 0.1 + Math.random() * speed * 0.4;
      vx = Math.cos(angle) * spd;
      vy = Math.sin(angle) * spd;
      life = 1.0 + Math.random() * 1.0;
    }

    particles.push(new Particle(
      x + (Math.random() - 0.5) * 10,
      y + (Math.random() - 0.5) * 10,
      vx, vy, color, life, s
    ));
  }
  return particles;
}

// ─── Main App ───────────────────────────────────────────────────────────────

export default function App() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, down: false, last: null });
  const settingsRef = useRef({
    palette: "Aurora", mode: "Stream",
    size: 3, speed: 4, count: 18,
    gravity: 0, wind: 0, turbulence: 0.5,
    trail: 0.15,
  });
  const rafRef = useRef();
  const [settings, setSettings] = useState(settingsRef.current);
  const [particleCount, setParticleCount] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [saved, setSaved] = useState(false);

  const updateSetting = useCallback((key, val) => {
    settingsRef.current[key] = val;
    setSettings(s => ({ ...s, [key]: val }));
  }, []);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W, H;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const { trail, gravity, wind, turbulence } = settingsRef.current;
      ctx.fillStyle = `rgba(8,8,8,${trail})`;
      ctx.fillRect(0, 0, W, H);

      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.update(gravity, wind, turbulence);
        if (!p.alive) { ps.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (ps.length % 30 === 0) setParticleCount(ps.length);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Mouse/touch events
  const emit = useCallback((x, y) => {
    const s = settingsRef.current;
    const last = mouseRef.current.last;
    let dx = 0, dy = 0;
    if (last) { dx = x - last.x; dy = y - last.y; }
    mouseRef.current.last = { x, y };

    const extra = Math.min(Math.sqrt(dx*dx + dy*dy) * 0.5, 20);
    const newPs = spawnParticles(x, y, s.mode, s.palette, s.size, s.speed, s.count + extra);
    particlesRef.current.push(...newPs);
    if (particlesRef.current.length > 8000) {
      particlesRef.current.splice(0, particlesRef.current.length - 8000);
    }
  }, []);

  const onMouseMove = useCallback(e => {
    if (!mouseRef.current.down) return;
    emit(e.clientX, e.clientY);
  }, [emit]);

  const onMouseDown = useCallback(e => {
    mouseRef.current.down = true;
    mouseRef.current.last = null;
    emit(e.clientX, e.clientY);
  }, [emit]);

  const onMouseUp = useCallback(() => {
    mouseRef.current.down = false;
    mouseRef.current.last = null;
  }, []);

  const onTouchMove = useCallback(e => {
    e.preventDefault();
    const t = e.touches[0];
    emit(t.clientX, t.clientY);
  }, [emit]);

  const onTouchStart = useCallback(e => {
    e.preventDefault();
    mouseRef.current.last = null;
    const t = e.touches[0];
    emit(t.clientX, t.clientY);
  }, [emit]);

  const clearCanvas = () => { particlesRef.current = []; };

  const saveImage = () => {
    const link = document.createElement("a");
    link.download = `particle-art-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app">
      <canvas
        ref={canvasRef}
        className="canvas"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchStart={onTouchStart}
        onTouchEnd={onMouseUp}
      />

      {/* Top bar */}
      <div className="topbar">
        <div className="logo">
          <span className="logo-mark">✦</span>
          <div>
            <span className="logo-title">PARTICLE</span>
            <span className="logo-sub">STUDIO</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="stat">{particleCount.toLocaleString()} particles</span>
          <button className="tb-btn" onClick={clearCanvas}>Clear</button>
          <button className={`tb-btn save-btn ${saved ? "saved" : ""}`} onClick={saveImage}>
            {saved ? "✓ Saved!" : "↓ Save PNG"}
          </button>
          <button className="tb-btn panel-toggle" onClick={() => setShowPanel(p => !p)}>
            {showPanel ? "Hide Controls" : "Show Controls"}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="hint-text">Hold & drag to paint</div>

      {/* Control Panel */}
      <div className={`panel ${showPanel ? "open" : ""}`}>
        <Section label="Palette">
          <div className="palette-grid">
            {Object.entries(PALETTES).map(([name, colors]) => (
              <button
                key={name}
                className={`palette-btn ${settings.palette === name ? "active" : ""}`}
                onClick={() => updateSetting("palette", name)}
              >
                <div className="palette-swatches">
                  {colors.slice(0,4).map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </div>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Emission Mode">
          <div className="mode-grid">
            {MODES.map(m => (
              <button
                key={m}
                className={`mode-btn ${settings.mode === m ? "active" : ""}`}
                onClick={() => updateSetting("mode", m)}
              >{m}</button>
            ))}
          </div>
        </Section>

        <Section label="Physics">
          <Slider label="Gravity" val={settings.gravity} min={-5} max={5} step={0.1}
            onChange={v => updateSetting("gravity", v)} />
          <Slider label="Wind" val={settings.wind} min={-5} max={5} step={0.1}
            onChange={v => updateSetting("wind", v)} />
          <Slider label="Turbulence" val={settings.turbulence} min={0} max={3} step={0.05}
            onChange={v => updateSetting("turbulence", v)} />
        </Section>

        <Section label="Brush">
          <Slider label="Size" val={settings.size} min={1} max={12} step={0.5}
            onChange={v => updateSetting("size", v)} />
          <Slider label="Speed" val={settings.speed} min={1} max={12} step={0.5}
            onChange={v => updateSetting("speed", v)} />
          <Slider label="Density" val={settings.count} min={3} max={50} step={1}
            onChange={v => updateSetting("count", v)} />
          <Slider label="Trail" val={settings.trail} min={0.02} max={0.5} step={0.01}
            onChange={v => updateSetting("trail", v)} />
        </Section>

        <button className="reset-btn" onClick={() => {
          const defaults = { gravity:0, wind:0, turbulence:0.5, size:3, speed:4, count:18, trail:0.15 };
          Object.entries(defaults).forEach(([k,v]) => updateSetting(k,v));
        }}>Reset Physics</button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div className="section">
      <div className="section-label">{label}</div>
      {children}
    </div>
  );
}

function Slider({ label, val, min, max, step, onChange }) {
  const pct = ((val - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <span className="slider-label">{label}</span>
      <div className="slider-wrap">
        <input type="range" min={min} max={max} step={step} value={val}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ "--pct": `${pct}%` }}
        />
      </div>
      <span className="slider-val">{typeof val === "number" && val % 1 !== 0 ? val.toFixed(1) : val}</span>
    </div>
  );
}
