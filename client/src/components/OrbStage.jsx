import React, { useRef, useEffect } from 'react';

export default function OrbStage({ isSpeaking = false, isListening = false, size = 380, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.28;

    let time = 0;
    let mouseX = centerX;
    let mouseY = centerY;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Particle field
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: baseRadius * (0.8 + Math.random() * 0.5),
      speed: 0.005 + Math.random() * 0.012,
      size: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.7,
      color: Math.random() > 0.4 ? '#00f0ff' : '#60a5fa'
    }));

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, size, size);

      // Audio pulse modulation
      let pulseMod = 1.0;
      if (isSpeaking) {
        pulseMod = 1.0 + Math.sin(time * 8) * 0.12 + Math.cos(time * 12) * 0.08;
      } else if (isListening) {
        pulseMod = 1.0 + Math.sin(time * 14) * 0.15;
      }

      // Mouse influence
      const dx = (mouseX - centerX) * 0.08;
      const dy = (mouseY - centerY) * 0.08;
      const targetX = centerX + dx;
      const targetY = centerY + dy;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1. Atmospheric Deep Radial Core Glow
      const ambientGlow = ctx.createRadialGradient(
        targetX, targetY, 10,
        targetX, targetY, baseRadius * 1.8 * pulseMod
      );
      ambientGlow.addColorStop(0, 'rgba(0, 240, 255, 0.45)');
      ambientGlow.addColorStop(0.3, 'rgba(37, 99, 235, 0.35)');
      ambientGlow.addColorStop(0.7, 'rgba(29, 43, 86, 0.15)');
      ambientGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');

      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(targetX, targetY, baseRadius * 1.8 * pulseMod, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swirling Multidimensional Plasma Ribbons
      const rings = [
        { tilt: 0.45, speed: 0.9, color1: '#00f0ff', color2: '#1d4ed8', width: 4 },
        { tilt: -0.55, speed: -0.7, color1: '#38bdf8', color2: '#2563eb', width: 5 },
        { tilt: 1.15, speed: 1.2, color1: '#ffffff', color2: '#00f0ff', width: 2.5 },
        { tilt: -1.35, speed: -1.1, color1: '#60a5fa', color2: '#3b82f6', width: 3.5 },
        { tilt: 0.15, speed: 0.5, color1: '#00f0ff', color2: '#1e3a8a', width: 4.5 }
      ];

      rings.forEach((ring, index) => {
        const ringRadiusX = (baseRadius * 0.95 + Math.sin(time * 2 + index) * 6) * pulseMod;
        const ringRadiusY = (baseRadius * 0.42 + Math.cos(time * 1.5 + index) * 4) * pulseMod;
        const currentRot = ring.tilt + time * ring.speed * 0.5;

        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(currentRot);

        const grad = ctx.createLinearGradient(-ringRadiusX, -ringRadiusY, ringRadiusX, ringRadiusY);
        grad.addColorStop(0, ring.color1);
        grad.addColorStop(0.5, ring.color2);
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.lineWidth = ring.width;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Central Solid Energy Sphere with Internal Fluid Gradient
      const innerCore = ctx.createRadialGradient(
        targetX - 15, targetY - 15, 5,
        targetX, targetY, baseRadius * 0.75 * pulseMod
      );
      innerCore.addColorStop(0, '#ffffff');
      innerCore.addColorStop(0.2, '#00f0ff');
      innerCore.addColorStop(0.6, '#1d4ed8');
      innerCore.addColorStop(1, '#050b18');

      ctx.fillStyle = innerCore;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(targetX, targetY, baseRadius * 0.72 * pulseMod, 0, Math.PI * 2);
      ctx.fill();

      // 4. Floating Swirling Energy Particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = targetX + Math.cos(p.angle) * p.dist * pulseMod;
        const py = targetY + Math.sin(p.angle) * p.dist * 0.75 * pulseMod;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity * (0.6 + Math.sin(time * 4 + p.angle) * 0.4);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, isSpeaking, isListening]);

  return (
    <div className="orb-stage-wrapper" onClick={onClick}>
      <div className="orb-ambient-aura" />
      <div className="orb-outer-ring" />
      <canvas
        ref={canvasRef}
        id="orb-canvas"
        style={{ width: `${size}px`, height: `${size}px` }}
        title="Gatepost AI Neural Core"
      />
    </div>
  );
}
