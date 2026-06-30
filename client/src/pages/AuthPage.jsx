import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { Shield, Eye, EyeOff, User, Lock, Zap } from 'lucide-react';

/* ── Three.js blockchain particle network ── */
function BlockchainCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    /* ── nodes ── */
    const N = 110;
    const nodeData = Array.from({ length: N }, () => ({
      x:  (Math.random() - 0.5) * 18,
      y:  (Math.random() - 0.5) * 11,
      z:  (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 0.004,
      vy: (Math.random() - 0.5) * 0.004,
    }));

    const nodePos  = new Float32Array(N * 3);
    const nodeCol  = new Float32Array(N * 3);
    const nodeGeo  = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos,  3));
    nodeGeo.setAttribute('color',    new THREE.BufferAttribute(nodeCol,  3));

    // colour palette: blue / indigo / cyan
    const palette = [
      new THREE.Color(0x60a5fa),
      new THREE.Color(0x818cf8),
      new THREE.Color(0x22d3ee),
      new THREE.Color(0xa78bfa),
    ];
    for (let i = 0; i < N; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      nodeCol[i * 3]     = c.r;
      nodeCol[i * 3 + 1] = c.g;
      nodeCol[i * 3 + 2] = c.b;
    }

    const nodeMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    const pointsMesh = new THREE.Points(nodeGeo, nodeMat);
    scene.add(pointsMesh);

    /* ── connection lines ── */
    const LINK_DIST  = 3.2;
    const MAX_PAIRS  = N * 5;
    const linePos    = new Float32Array(MAX_PAIRS * 2 * 3);
    const lineGeo    = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.12,
    });
    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);

    /* ── "special" bright nodes (blockchain anchors) ── */
    const anchorGeo = new THREE.SphereGeometry(0.06, 10, 10);
    const anchorMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const anchors   = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(anchorGeo, anchorMat.clone());
      m.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 2,
      );
      m.userData = {
        ox: m.position.x, oy: m.position.y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.4,
      };
      scene.add(m);
      anchors.push(m);
    }

    /* ── mouse parallax ── */
    const mouse = { x: 0, y: 0 };
    const onMouse = (e) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    /* ── animate ── */
    let animId;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      t += 0.01;

      // Camera gentle parallax
      camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.03;
      camera.position.y += (-mouse.y * 0.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      // Update node positions
      for (let i = 0; i < N; i++) {
        const d = nodeData[i];
        d.x += d.vx;
        d.y += d.vy;
        if (Math.abs(d.x) > 9)  d.vx *= -1;
        if (Math.abs(d.y) > 5.5) d.vy *= -1;
        nodePos[i * 3]     = d.x;
        nodePos[i * 3 + 1] = d.y;
        nodePos[i * 3 + 2] = d.z;
      }
      nodeGeo.attributes.position.needsUpdate = true;

      // Update lines
      let li = 0;
      outer: for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          if (li >= MAX_PAIRS) break outer;
          const dx = nodeData[i].x - nodeData[j].x;
          const dy = nodeData[i].y - nodeData[j].y;
          if (dx * dx + dy * dy < LINK_DIST * LINK_DIST) {
            const b = li * 6;
            linePos[b]     = nodeData[i].x; linePos[b+1] = nodeData[i].y; linePos[b+2] = nodeData[i].z;
            linePos[b+3]   = nodeData[j].x; linePos[b+4] = nodeData[j].y; linePos[b+5] = nodeData[j].z;
            li++;
          }
        }
      }
      lineGeo.setDrawRange(0, li * 2);
      lineGeo.attributes.position.needsUpdate = true;

      // Animate anchors (floating)
      anchors.forEach((a) => {
        a.position.y = a.userData.oy + Math.sin(t * a.userData.speed + a.userData.phase) * 0.25;
        const scale = 1 + Math.sin(t * a.userData.speed * 1.5 + a.userData.phase) * 0.15;
        a.scale.setScalar(scale);
      });

      renderer.render(scene, camera);
    };
    animate();

    /* ── resize ── */
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      nodeGeo.dispose(); nodeMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      anchorGeo.dispose();
      anchors.forEach((a) => a.material.dispose());
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}

/* ── Auth Page ── */
export default function AuthPage({
  view,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onToggleView,
}) {
  const cardRef   = useRef(null);
  const fieldsRef = useRef(null);
  const [showPw, setShowPw] = useState(false);

  /* GSAP entrance every time view changes */
  useEffect(() => {
    const card   = cardRef.current;
    const fields = fieldsRef.current?.querySelectorAll('.auth-field') ?? [];

    gsap.fromTo(card,
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0,  scale: 1, duration: 0.7, ease: 'power3.out' }
    );
    gsap.fromTo(fields,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
    );
  }, [view]);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
         style={{ background: 'var(--bg-0)' }}>

      {/* Three.js background */}
      <BlockchainCanvas />

      {/* Radial glow spots */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100
                        bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-125 h-75
                        bg-violet-600/10 blur-[100px] rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-75 h-50
                        bg-cyan-500/8 blur-[80px] rounded-full" />
      </div>

      {/* Card */}
      <div ref={cardRef}
           className="glass-card relative w-full max-w-md rounded-2xl p-8 z-10">

        {/* Shimmer sweep */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="animate-shimmer absolute inset-0" />
        </div>

        {/* Logo */}
        <div className="auth-field flex flex-col items-center mb-8" ref={fieldsRef}>
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse-glow" />
            <div className="relative h-16 w-16 rounded-2xl flex items-center justify-center
                            gradient-bg shadow-lg shadow-blue-500/30">
              <Shield className="h-8 w-8 text-white drop-shadow" />
            </div>
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-tight">HealthChain</h1>
          <p className="text-xs mt-1 text-slate-400 flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-cyan-400" />
            Blockchain-Secured Medical Records
          </p>
        </div>

        <div className="auth-field text-center mb-6">
          <h2 className="text-lg font-semibold text-slate-100">
            {view === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {view === 'login'
              ? 'Sign in to access your dashboard'
              : 'Join the secure health network'}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Username */}
          <div className="auth-field">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                className="input-premium w-full rounded-xl pl-10 pr-4 py-3 text-sm"
                placeholder="Enter your username"
                value={username}
                onChange={onUsernameChange}
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                className="input-premium w-full rounded-xl pl-10 pr-11 py-3 text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={onPasswordChange}
                required
                autoComplete={view === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500
                           hover:text-slate-300 transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Register notice */}
          {view === 'register' && (
            <div className="auth-field rounded-xl border border-cyan-500/20
                            bg-cyan-500/05 px-4 py-3">
              <p className="text-sm text-cyan-300/80 font-medium">Patient accounts only</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor accounts are created by Admin via Doctor Management.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="auth-field pt-1">
            <button
              type="submit"
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white
                         tracking-wide cursor-pointer"
            >
              {view === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
            </button>
          </div>
        </form>

        {/* Toggle */}
        <div className="auth-field mt-6 text-center">
          <button
            onClick={onToggleView}
            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
          >
            {view === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <span className="text-blue-400 font-medium">
              {view === 'login' ? 'Register' : 'Sign In'}
            </span>
          </button>
        </div>

        {/* Security badge */}
        <div className="auth-field mt-6 flex items-center justify-center gap-2
                        text-xs text-slate-600">
          <Shield className="h-3 w-3" />
          <span>AES-256 encrypted · SHA-256 blockchain · HIPAA audit trail</span>
        </div>
      </div>
    </div>
  );
}
