import { useEffect, useRef, useState, useCallback } from "react";
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sound synthesis via Web Audio API (Zero external audio files needed)
class SoundFx {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  jump() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted yet
    }
  }

  coin() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio not permitted yet
    }
  }

  crash() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio not permitted yet
    }
  }
}

const sfx = new SoundFx();

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

interface StarCoin {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  pulse: number;
}

export function MaintenanceGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  // Game internal state ref so requestAnimationFrame loop avoids stale state
  const stateRef = useRef({
    gameState: "idle" as "idle" | "playing" | "gameover",
    score: 0,
    rocketY: 150,
    rocketVY: 0,
    gravity: 0.38,
    jumpPower: -6.5,
    obstacles: [] as Obstacle[],
    coins: [] as StarCoin[],
    particles: [] as Particle[],
    speed: 3,
    lastSpawn: 0,
    frame: 0,
  });

  // Load high score
  useEffect(() => {
    try {
      const saved = localStorage.getItem("smm_maintenance_high_score");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // localStorage disabled
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      sfx.enabled = !prev;
      return !prev;
    });
  }, []);

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState === "idle") {
      // Start game
      s.gameState = "playing";
      s.score = 0;
      s.rocketY = 140;
      s.rocketVY = s.jumpPower;
      s.obstacles = [];
      s.coins = [];
      s.particles = [];
      s.speed = 3;
      s.frame = 0;
      setGameState("playing");
      setScore(0);
      sfx.jump();
    } else if (s.gameState === "playing") {
      s.rocketVY = s.jumpPower;
      sfx.jump();

      // Emit flame particles on jump
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: 60,
          y: s.rocketY + 8,
          vx: -(Math.random() * 4 + 2),
          vy: (Math.random() - 0.5) * 3,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.4 ? "#f97316" : "#fbbf24",
          alpha: 1,
          decay: 0.04,
        });
      }
    } else if (s.gameState === "gameover") {
      // Reset
      s.gameState = "playing";
      s.score = 0;
      s.rocketY = 140;
      s.rocketVY = s.jumpPower;
      s.obstacles = [];
      s.coins = [];
      s.particles = [];
      s.speed = 3;
      s.frame = 0;
      setGameState("playing");
      setScore(0);
      sfx.jump();
    }
  }, []);

  // Keyboard controls (Spacebar or ArrowUp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerJump]);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = 640;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    const render = () => {
      const s = stateRef.current;
      s.frame++;

      // 1. Clear background (deep space dark orange glow)
      ctx.fillStyle = "#0c0a09"; // Stone-950
      ctx.fillRect(0, 0, width, height);

      // Starfield background grid/stars
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let i = 0; i < 25; i++) {
        const starX = ((i * 37 + s.frame * 0.4) % width);
        const starY = (i * 29) % height;
        ctx.fillRect(width - starX, starY, (i % 2) + 1, (i % 2) + 1);
      }

      // Glowing grid line at bottom
      ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 15);
      ctx.lineTo(width, height - 15);
      ctx.stroke();

      // Ground glow
      const groundGrad = ctx.createLinearGradient(0, height - 15, 0, height);
      groundGrad.addColorStop(0, "rgba(249, 115, 22, 0.2)");
      groundGrad.addColorStop(1, "rgba(249, 115, 22, 0.0)");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, height - 15, width, 15);

      if (s.gameState === "playing") {
        // Physics update
        s.rocketVY += s.gravity;
        s.rocketY += s.rocketVY;

        // Ground / Ceiling collision
        if (s.rocketY > height - 32) {
          s.rocketY = height - 32;
          triggerGameOver();
        } else if (s.rocketY < 8) {
          s.rocketY = 8;
          s.rocketVY = 0;
        }

        // Emit continuous thruster particles
        s.particles.push({
          x: 58,
          y: s.rocketY + 8 + (Math.random() - 0.5) * 4,
          vx: -(Math.random() * 3 + 2),
          vy: (Math.random() - 0.5) * 1.5,
          size: Math.random() * 3 + 1,
          color: Math.random() > 0.3 ? "#f97316" : "#fb923c",
          alpha: 0.9,
          decay: 0.05,
        });

        // Spawn obstacles
        if (s.frame - s.lastSpawn > 95) {
          s.lastSpawn = s.frame;
          const gap = 110;
          const minH = 30;
          const maxH = height - gap - minH - 30;
          const topH = Math.floor(Math.random() * maxH) + minH;
          const bottomY = topH + gap;
          const bottomH = height - bottomY - 15;

          s.obstacles.push({
            x: width,
            y: 0,
            width: 38,
            height: topH,
            passed: false,
          });
          s.obstacles.push({
            x: width,
            y: bottomY,
            width: 38,
            height: bottomH,
            passed: false,
          });

          // Spawn collectible star coin in middle of gap
          if (Math.random() > 0.35) {
            s.coins.push({
              x: width + 19,
              y: topH + gap / 2,
              radius: 9,
              collected: false,
              pulse: 0,
            });
          }
        }

        // Increase speed slightly with score
        s.speed = 3 + Math.min(s.score * 0.03, 3.5);
      }

      // Update & Render Obstacles
      ctx.fillStyle = "#ea580c"; // Orange 600
      ctx.strokeStyle = "#fb923c"; // Orange 400
      ctx.lineWidth = 1.5;

      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        if (s.gameState === "playing") {
          obs.x -= s.speed;

          // Check score pass
          if (!obs.passed && obs.x + obs.width < 60) {
            obs.passed = true;
            s.score += 5;
            setScore(s.score);
          }
        }

        // Draw obstacle as futuristic cyber pillar
        const obsGrad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0);
        obsGrad.addColorStop(0, "#c2410c");
        obsGrad.addColorStop(0.5, "#ea580c");
        obsGrad.addColorStop(1, "#9a3412");
        ctx.fillStyle = obsGrad;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Tech accents on obstacles
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(obs.x + 8, obs.y + (obs.y === 0 ? obs.height - 8 : 4), obs.width - 16, 4);

        // Collision detection with Rocket (Rocket hitbox: x=65, y=rocketY, w=28, h=16)
        if (s.gameState === "playing") {
          const rx = 65;
          const ry = s.rocketY;
          const rw = 26;
          const rh = 16;
          if (
            rx < obs.x + obs.width &&
            rx + rw > obs.x &&
            ry < obs.y + obs.height &&
            ry + rh > obs.y
          ) {
            triggerGameOver();
          }
        }

        // Remove off-screen obstacles
        if (obs.x + obs.width < -10) {
          s.obstacles.splice(i, 1);
        }
      }

      // Update & Render Coins (Likes/Stars ⭐)
      for (let i = s.coins.length - 1; i >= 0; i--) {
        const c = s.coins[i];
        if (s.gameState === "playing") {
          c.x -= s.speed;
          c.pulse += 0.08;

          // Check collision with rocket
          const dist = Math.hypot(c.x - (65 + 13), c.y - (s.rocketY + 8));
          if (dist < c.radius + 14 && !c.collected) {
            c.collected = true;
            s.score += 25; // Bonus!
            setScore(s.score);
            sfx.coin();

            // Emit gold sparkles
            for (let k = 0; k < 8; k++) {
              s.particles.push({
                x: c.x,
                y: c.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                size: Math.random() * 3 + 2,
                color: "#fde047",
                alpha: 1,
                decay: 0.05,
              });
            }
          }
        }

        if (!c.collected) {
          // Draw spinning glowing star coin
          ctx.save();
          ctx.translate(c.x, c.y);
          const scale = 1 + Math.sin(c.pulse) * 0.12;
          ctx.scale(scale, scale);

          ctx.fillStyle = "#facc15"; // Yellow 400
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Star icon in center
          ctx.fillStyle = "#78350f";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("★", 0, 0);

          ctx.restore();
        }

        if (c.x < -20 || c.collected) {
          s.coins.splice(i, 1);
        }
      }

      // Update & Render Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          s.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw Rocket Ship
      drawRocket(ctx, 65, s.rocketY, s.rocketVY);

      // In-game score display
      if (s.gameState === "playing") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`SCORE: ${s.score}`, 20, 32);
      }

      animId = requestAnimationFrame(render);
    };

    const triggerGameOver = () => {
      const s = stateRef.current;
      s.gameState = "gameover";
      setGameState("gameover");
      sfx.crash();

      // Crash explosion particles
      for (let i = 0; i < 30; i++) {
        s.particles.push({
          x: 65 + 13,
          y: s.rocketY + 8,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          size: Math.random() * 5 + 2,
          color: Math.random() > 0.5 ? "#f97316" : Math.random() > 0.5 ? "#ef4444" : "#fef08a",
          alpha: 1,
          decay: 0.03,
        });
      }

      // Save high score
      if (s.score > highScore) {
        setHighScore(s.score);
        try {
          localStorage.setItem("smm_maintenance_high_score", String(s.score));
        } catch {
          // ignore
        }
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [highScore]);

  // Helper to draw the glowing orange rocket ship
  const drawRocket = (ctx: CanvasRenderingContext2D, x: number, y: number, vy: number) => {
    ctx.save();
    ctx.translate(x + 13, y + 8);
    const angle = Math.max(-0.45, Math.min(0.55, vy * 0.08));
    ctx.rotate(angle);

    // Rocket Body (White + Orange stripe)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();

    // Orange Cockpit / Accent
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.arc(2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-5, -7);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-11, -2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-5, 7);
    ctx.lineTo(-14, 13);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-orange-500/40 bg-stone-950/90 shadow-2xl shadow-orange-500/10 backdrop-blur-md">
      {/* Game Header Bar */}
      <div className="flex items-center justify-between border-b border-orange-500/20 bg-stone-900/80 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-bold tracking-wide text-orange-400">
          <Sparkles className="h-4 w-4 animate-spin text-orange-400" />
          <span>SMM CYBER RUNNER</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Trophy className="h-3.5 w-3.5" />
            <span>BEST: {highScore}</span>
          </div>

          <button
            onClick={toggleSound}
            className="rounded-md p-1 text-stone-400 transition hover:bg-stone-800 hover:text-white"
            title={soundOn ? "Mute sound" : "Enable sound"}
          >
            {soundOn ? <Volume2 className="h-4 w-4 text-orange-400" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="relative flex cursor-pointer select-none items-center justify-center"
        onClick={triggerJump}
        onTouchStart={(e) => {
          e.preventDefault();
          triggerJump();
        }}
      >
        <canvas
          ref={canvasRef}
          className="h-[260px] w-full object-cover sm:h-[300px]"
        />

        {/* Start Overlay */}
        {gameState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 p-4 text-center backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-stone-950 shadow-lg shadow-orange-500/40 animate-pulse">
              <Play className="h-6 w-6 ml-0.5" />
            </div>
            <h3 className="mt-3 text-lg font-black tracking-tight text-white sm:text-xl">
              BORED WHILE WAITING?
            </h3>
            <p className="mt-1 max-w-xs text-xs text-stone-300">
              Tap anywhere or press <kbd className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-orange-400">Space</kbd> to launch your rocket and dodge server glitches!
            </p>
            <Button
              size="sm"
              className="mt-4 bg-orange-500 font-bold text-stone-950 hover:bg-orange-400"
              onClick={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
            >
              Start Game
            </Button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-4 text-center backdrop-blur-sm animate-in fade-in zoom-in-95">
            <span className="text-3xl font-black tracking-wider text-orange-500">
              SYSTEM CRASHED! 💥
            </span>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className="text-stone-300">Score: <strong className="text-white text-base">{score}</strong></span>
              <span className="text-amber-400">Best: <strong className="text-amber-300 text-base">{Math.max(score, highScore)}</strong></span>
            </div>
            <Button
              size="sm"
              className="mt-4 gap-2 bg-gradient-to-r from-orange-500 to-amber-500 font-bold text-stone-950 shadow-lg shadow-orange-500/30 hover:from-orange-400 hover:to-amber-400"
              onClick={(e) => {
                e.stopPropagation();
                triggerJump();
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Play Again
            </Button>
            <p className="mt-2 text-[11px] text-stone-400">
              Tap screen or press Space to retry
            </p>
          </div>
        )}
      </div>

      {/* Footer controls hint */}
      <div className="flex items-center justify-between border-t border-orange-500/20 bg-stone-900/60 px-4 py-2 text-[11px] text-stone-400">
        <span>🎮 Controls: <strong>Space</strong> or <strong>Tap Screen</strong> to boost</span>
        <span className="text-amber-400/90 font-medium">★ Collect Star Coins for +25 pts!</span>
      </div>
    </div>
  );
}
