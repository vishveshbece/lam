// App.jsx
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

/* ---------- UUIDs (final) ---------- */
const BASE_SERVICE = "0000aaaa-0000-1000-8000-00805f9b34fb";
const BASE_CHAR    = "0000aaab-0000-1000-8000-00805f9b34fb";
const ARM_SERVICE     = "0000bbbb-0000-1000-8000-00805f9b34fb";
const ARM_ANGLES_CHAR = "0000bbbc-0000-1000-8000-00805f9b34fb";

/* ---------- Limits ---------- */
const ARM_LIMITS = [
  { min: 0,   max: 180, label: "Base Rot" }, // M1
  { min: 100, max: 180, label: "Shoulder" }, // M2
  { min: 0,   max: 90,  label: "Elbow" },    // M3
  { min: 0,   max: 180, label: "Wrist V" },  // M4
  { min: 0,   max: 180, label: "Wrist R" },  // M5
];
const DEFAULT_ARM_ANGLES = [90, 120, 45, 90, 90];

/* ---------- ICONS (SVG) ---------- */
const Icons = {
  Arm: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="7" y2="18"/><line x1="12" y1="13" x2="17" y2="18"/></svg>,
  Base: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 12h-8"/><path d="M12 8v8"/></svg>,
  Link: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
};

/* ---------- BLE hook ---------- */
function useBleState() {
  const [armCharAngles, setArmCharAngles] = useState(null);
  const [baseChar, setBaseChar] = useState(null);

  const connectArm = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ services: [ARM_SERVICE] }] 
      });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(ARM_SERVICE);
      const char = await svc.getCharacteristic(ARM_ANGLES_CHAR);
      setArmCharAngles(char);
      return char;
    } catch (e) {
      console.error("connectArm:", e);
      throw e;
    }
  };

  const connectBase = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ 
        filters: [{ services: [BASE_SERVICE] }] 
      });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(BASE_SERVICE);
      const char = await svc.getCharacteristic(BASE_CHAR);
      setBaseChar(char);
      return char;
    } catch (e) {
      console.error("connectBase:", e);
      throw e;
    }
  };

  return { armCharAngles, baseChar, connectArm, connectBase };
}

/* ---------- COMPONENTS ---------- */

function StatusBadge({ connected, label }) {
  return (
    <div className={`status-badge ${connected ? 'active' : ''}`}>
      <div className="dot"></div>
      <span className="badge-label">{label}</span>
    </div>
  );
}

function ConnectionPage({ ble }) {
  const navigate = useNavigate();
  
  const handleConnect = async (type) => {
    try {
      if(type === 'arm') await ble.connectArm();
      if(type === 'base') await ble.connectBase();
    } catch (e) {
      alert(`${type.toUpperCase()} connection failed or cancelled`);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="hero-section">
        <h1 className="glitch-text" data-text="SYSTEM LINK">SYSTEM LINK</h1>
        <p className="subtitle">Initialize Bluetooth Protocols</p>
      </div>

      <div className="card-grid">
        {/* Arm Card */}
        <div className={`tech-card ${ble.armCharAngles ? 'connected' : ''}`}>
          <div className="card-header">
            <Icons.Arm />
            <h3>Manipulator Arm</h3>
          </div>
          <div className="card-body">
            <p>5-Axis control for precision handling.</p>
            <div className="status-indicator">
              Status: <span className={ble.armCharAngles ? "text-success" : "text-dim"}>
                {ble.armCharAngles ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="card-actions">
            {!ble.armCharAngles ? (
              <button className="btn btn-primary" onClick={() => handleConnect('arm')}>
                <Icons.Link /> Connect
              </button>
            ) : (
               <button className="btn btn-secondary" onClick={() => navigate("/arm")}>
                Open Controls &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Base Card */}
        <div className={`tech-card ${ble.baseChar ? 'connected' : ''}`}>
          <div className="card-header">
            <Icons.Base />
            <h3>Rover Base</h3>
          </div>
          <div className="card-body">
            <p>Omnidirectional movement & rotation.</p>
            <div className="status-indicator">
              Status: <span className={ble.baseChar ? "text-success" : "text-dim"}>
                {ble.baseChar ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <div className="card-actions">
            {!ble.baseChar ? (
              <button className="btn btn-primary" onClick={() => handleConnect('base')}>
                <Icons.Link /> Connect
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => navigate("/base")}>
                Open Controls &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArmPage({ ble }) {
  const [angles, setAngles] = useState(DEFAULT_ARM_ANGLES.slice());

  const clamp = (val, idx) => {
    const l = ARM_LIMITS[idx];
    let v = Math.round(Number(val));
    if (v < l.min) v = l.min;
    if (v > l.max) v = l.max;
    return v;
  };

  const sendArmAngles = async (arr) => {
    if (!ble.armCharAngles) return;
    try {
      const u8 = new Uint8Array(5);
      for (let i = 0; i < 5; ++i) u8[i] = clamp(arr[i], i);
      await ble.armCharAngles.writeValue(u8);
    } catch (e) {
      console.error("sendArmAngles:", e);
    }
  };

  const onAngleChange = (index, value) => {
    const v = clamp(value, index);
    const next = angles.slice();
    next[index] = v;
    setAngles(next);
    sendArmAngles(next);
  };

  // Sync on mount
  useEffect(() => { 
    if (ble.armCharAngles) sendArmAngles(angles); 
  }, [ble.armCharAngles]);

  return (
    <div className="page-container fade-in">
      <div className="header-row">
        <h2>Manual Override</h2>
        {!ble.armCharAngles && <div className="badge-error">DISCONNECTED</div>}
      </div>

      <div className="sliders-container">
        {angles.map((a, i) => {
          const { min, max, label } = ARM_LIMITS[i];
          const percent = ((a - min) / (max - min)) * 100;
          
          return (
            <div key={i} className="slider-card">
              <div className="slider-info">
                <span className="slider-label">M{i + 1} // {label}</span>
                <span className="slider-value">{a}°</span>
              </div>
              <div className="range-wrapper">
                <input 
                  type="range" 
                  min={min} 
                  max={max} 
                  value={a} 
                  onChange={(e) => onAngleChange(i, e.target.value)} 
                  className="cyber-range"
                  style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #334155 ${percent}%, #334155 100%)` }}
                />
              </div>
              <div className="slider-meta">
                <span>{min}°</span>
                <span>{max}°</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {!ble.armCharAngles && (
        <div className="overlay-warning">
          <p>Connection Lost</p>
          <button className="btn btn-primary" onClick={() => ble.connectArm()}>Reconnect</button>
        </div>
      )}
    </div>
  );
}

function BasePage({ ble }) {
  const joystickRef = useRef(null);
  const pointerIdRef = useRef(null);
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });
  
  // Command throttling
  const lastSentCmdRef = useRef(null);
  const lastSendTimeRef = useRef(0);

  const sendCmd = async (cmd) => {
    // Don't send the same command repeatedly
    if (lastSentCmdRef.current === cmd) return;
    
    // Throttle sending frequency
    const now = Date.now();
    if (now - lastSendTimeRef.current < 50) return;
    
    if (!ble.baseChar) return;
    
    try {
      await ble.baseChar.writeValue(new Uint8Array([cmd]));
      lastSentCmdRef.current = cmd;
      lastSendTimeRef.current = now;
    } catch (e) { 
      console.error("Send command error:", e);
      lastSentCmdRef.current = null;
    }
  };

  const determineCmdFromVector = (nx, ny) => {
    const deadzone = 0.2;
    
    // Apply deadzone
    if (Math.abs(nx) < deadzone && Math.abs(ny) < deadzone) return 0;
    
    // Normalize after deadzone
    let effectiveNx = nx;
    let effectiveNy = ny;
    if (Math.abs(nx) > deadzone) {
      effectiveNx = (Math.abs(nx) - deadzone) / (1 - deadzone) * Math.sign(nx);
    }
    if (Math.abs(ny) > deadzone) {
      effectiveNy = (Math.abs(ny) - deadzone) / (1 - deadzone) * Math.sign(ny);
    }

    // Determine primary direction
    if (Math.abs(effectiveNy) > Math.abs(effectiveNx)) {
      return effectiveNy > 0 ? 1 : 2; // Forward/Backward
    } else {
      return effectiveNx > 0 ? 4 : 3; // Right/Left
    }
  };

  const handleMove = (ev) => {
    ev.preventDefault();
    const el = joystickRef.current;
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const maxR = rect.width / 2;
    const cx = rect.left + maxR;
    const cy = rect.top + maxR;
    
    let clientX, clientY;
    
    if (ev.touches) {
      clientX = ev.touches[0].clientX;
      clientY = ev.touches[0].clientY;
    } else {
      clientX = ev.clientX;
      clientY = ev.clientY;
    }
    
    let dx = clientX - cx;
    let dy = cy - clientY;
    let nx = dx / maxR;
    let ny = dy / maxR;
    
    const mag = Math.sqrt(nx*nx + ny*ny);
    if (mag > 1) { nx /= mag; ny /= mag; }
    
    setJoystick({ x: nx, y: ny });
    sendCmd(determineCmdFromVector(nx, ny));
  };

  const startDrag = (ev) => {
    if (ev.cancelable) ev.preventDefault();
    
    pointerIdRef.current = ev.pointerId ?? 1;
    joystickRef.current.setPointerCapture?.(pointerIdRef.current);
    handleMove(ev);
  };

  const endDrag = (ev) => {
    if (ev.cancelable) ev.preventDefault();
    if (pointerIdRef.current && joystickRef.current.releasePointerCapture) {
      try { joystickRef.current.releasePointerCapture(pointerIdRef.current); } catch (e) {}
    }
    pointerIdRef.current = null;
    setJoystick({ x: 0, y: 0 });
    sendCmd(0);
  };

  return (
    <div className="page-container fade-in">
      <div className="header-row">
        <h2>Teleoperation</h2>
        {!ble.baseChar && <div className="badge-error">DISCONNECTED</div>}
      </div>

      <div className="base-layout">
        <div className="joystick-container">
          <div 
            className={`joystick-base ${joystick.x !== 0 || joystick.y !== 0 ? 'active' : ''}`}
            ref={joystickRef}
            onPointerDown={startDrag}
            onPointerMove={handleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onTouchStart={startDrag}
            onTouchMove={handleMove}
            onTouchEnd={endDrag}
          >
            <div className="crosshair-v"></div>
            <div className="crosshair-h"></div>
            <div 
              className="joystick-handle"
              style={{ 
                transform: `translate(${joystick.x * 50}%, ${-joystick.y * 50}%)` 
              }}
            >
              <div className="handle-glow"></div>
            </div>
          </div>
          <div className="instruction">Drag to move</div>
        </div>

        <div className="control-panel-bottom">
           <h3>Rotation</h3>
           <div className="rotate-group">
             <button 
               className="btn-circle" 
               onPointerDown={() => sendCmd(6)} 
               onPointerUp={() => sendCmd(0)}
             >↺</button>
             <button 
               className="btn-circle" 
               onPointerDown={() => sendCmd(5)} 
               onPointerUp={() => sendCmd(0)}
             >↻</button>
           </div>
           <div className="instruction">Hold to rotate</div>
        </div>
      </div>
      
      {!ble.baseChar && (
        <div className="overlay-warning">
          <p>Uplink Lost</p>
          <button className="btn btn-primary" onClick={() => ble.connectBase()}>Reconnect</button>
        </div>
      )}
    </div>
  );
}

/* ---------- MAIN LAYOUT ---------- */
function Layout({ ble, children }) {
  const location = useLocation();
  
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">🤖</div>
          <span className="brand-text">ROBO<span className="text-primary">CORE</span></span>
        </div>
        <nav className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>HUB</Link>
          <Link to="/arm" className={location.pathname === '/arm' ? 'active' : ''}>ARM</Link>
          <Link to="/base" className={location.pathname === '/base' ? 'active' : ''}>BASE</Link>
        </nav>
        <div className="connection-status">
          <StatusBadge connected={ble.armCharAngles} label="ARM" />
          <StatusBadge connected={ble.baseChar} label="BASE" />
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      
      <style>{`
        :root {
          --bg: #0f172a;
          --surface: #1e293b;
          --surface-light: #334155;
          --primary: #3b82f6;
          --primary-glow: rgba(59, 130, 246, 0.5);
          --accent: #06b6d4;
          --success: #10b981;
          --danger: #ef4444;
          --text: #f8fafc;
          --text-dim: #94a3b8;
          --font-main: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        * { box-sizing: border-box; }
        
        body {
          margin: 0;
          background-color: var(--bg);
          color: var(--text);
          font-family: var(--font-main);
          overflow-x: hidden;
          -webkit-tap-highlight-color: transparent;
        }

        .app-shell { display: flex; flex-direction: column; min-height: 100vh; background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%); }
        
        .app-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 70px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: sticky; top: 0; z-index: 50;
        }
        
        .main-content { flex: 1; padding: 20px; max-width: 1000px; margin: 0 auto; width: 100%; position: relative; }
        
        h1, h2, h3 { margin: 0; letter-spacing: -0.02em; }
        .glitch-text { font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; color: transparent; }
        .subtitle { color: var(--text-dim); margin-top: 8px; font-size: 1.1rem; }
        .text-primary { color: var(--primary); }
        .text-success { color: var(--success); text-shadow: 0 0 10px rgba(16,185,129,0.4); }
        .text-dim { color: var(--text-dim); }

        .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.2rem; }
        .nav-links { display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 20px; }
        .nav-links a {
          text-decoration: none; color: var(--text-dim); font-weight: 600; font-size: 0.9rem;
          padding: 8px 16px; border-radius: 16px; transition: all 0.2s;
        }
        .nav-links a.active { background: var(--surface-light); color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        
        .connection-status { display: flex; gap: 8px; }

        .status-badge { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; background: var(--surface); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .status-badge .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--danger); transition: 0.3s; }
        .status-badge.active { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.1); }
        .status-badge.active .dot { background: var(--success); box-shadow: 0 0 8px var(--success); }

        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 40px; }
        .tech-card {
          background: var(--surface); border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .tech-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .tech-card.connected { border-color: var(--primary); box-shadow: 0 0 20px rgba(59,130,246,0.1); }
        .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--primary); }
        .card-header h3 { color: #fff; font-size: 1.2rem; }
        .card-body p { color: var(--text-dim); font-size: 0.9rem; line-height: 1.5; margin-bottom: 20px; }
        .status-indicator { font-size: 0.85rem; font-weight: 600; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; display: inline-block; }

        .btn { border: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; font-size: 1rem; }
        .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .btn-primary:active { transform: translateY(1px); }
        .btn-secondary { background: var(--surface-light); color: #fff; }
        .btn-circle { width: 70px; height: 70px; border-radius: 50%; border: none; background: var(--surface-light); color: #fff; font-size: 1.8rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.2); -webkit-user-select: none; user-select: none; }
        .btn-circle:active { transform: scale(0.95); background: var(--primary); }

        .sliders-container { margin-top: 30px; display: grid; gap: 16px; }
        .slider-card { background: var(--surface); padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .slider-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 600; font-size: 0.9rem; }
        .slider-value { color: var(--primary); font-family: monospace; font-size: 1.1rem; }
        .range-wrapper { height: 30px; display: flex; align-items: center; }
        .cyber-range {
          -webkit-appearance: none; width: 100%; height: 8px; border-radius: 4px; outline: none; transition: 0.2s;
        }
        .cyber-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; 
          background: #fff; border: 2px solid var(--primary); cursor: pointer; box-shadow: 0 0 10px var(--primary); transition: 0.2s;
        }
        .slider-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 8px; }

        .base-layout { display: flex; flex-direction: column; gap: 40px; align-items: center; margin-top: 20px; }
        .control-panel-bottom { text-align: center; order: 2; }
        .control-panel-bottom h3 { margin-bottom: 15px; color: var(--text-dim); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
        .rotate-group { display: flex; gap: 30px; }
        .joystick-container { display: flex; flex-direction: column; align-items: center; gap: 16px; order: 1; }
        
        .joystick-base {
          width: 260px; height: 260px; 
          border-radius: 50%;
          background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
          border: 4px solid #334155; position: relative; touch-action: none;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3);
          transition: border-color 0.3s;
        }
        .joystick-base.active { border-color: var(--primary); box-shadow: 0 0 20px rgba(59,130,246,0.2); }
        .crosshair-v { position: absolute; left: 50%; top: 20px; bottom: 20px; width: 1px; background: rgba(255,255,255,0.1); }
        .crosshair-h { position: absolute; top: 50%; left: 20px; right: 20px; height: 1px; background: rgba(255,255,255,0.1); }
        .joystick-handle {
          width: 25%; height: 25%;
          border-radius: 50%;
          background: linear-gradient(145deg, #475569, #334155);
          position: absolute; top: 37.5%; left: 37.5%;
          border: 2px solid rgba(255,255,255,0.1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
        }
        .handle-glow { width: 30%; height: 30%; border-radius: 50%; background: var(--danger); box-shadow: 0 0 10px var(--danger); transition: 0.3s; }
        .joystick-base.active .handle-glow { background: var(--primary); box-shadow: 0 0 15px var(--primary); }
        .instruction { font-size: 0.8rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .overlay-warning {
          position: absolute; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px);
          display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10;
        }
        .overlay-warning p { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; color: var(--danger); }
        .badge-error { background: var(--danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 10px; }
        .header-row { display: flex; align-items: center; margin-bottom: 20px; }

        @media (max-width: 768px) {
          .app-header { padding: 0 16px; height: 60px; }
          .brand-text { display: none; }
          .brand-icon { font-size: 1.5rem; }
          
          .nav-links { gap: 4px; }
          .nav-links a { font-size: 0.8rem; padding: 6px 12px; }
          
          .status-badge .badge-label { display: none; }
          .status-badge { padding: 6px; border-radius: 50%; }
          .status-badge .dot { width: 10px; height: 10px; }
          
          .glitch-text { font-size: 1.8rem; }
          .card-grid { grid-template-columns: 1fr; margin-top: 20px; }
          
          .joystick-base { width: 70vw; height: 70vw; max-width: 300px; max-height: 300px; }
          
          .btn-circle { width: 60px; height: 60px; font-size: 1.5rem; }
          .rotate-group { gap: 20px; }
          
          .tech-card { padding: 20px; }
        }
        
        @media (max-width: 380px) {
          .nav-links a { padding: 6px 8px; font-size: 0.75rem; }
        }
      `}</style>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const ble = useBleState();
  return (
    <BrowserRouter>
      <Layout ble={ble}>
        <Routes>
          <Route path="/" element={<ConnectionPage ble={ble} />} />
          <Route path="/arm" element={<ArmPage ble={ble} />} />
          <Route path="/base" element={<BasePage ble={ble} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}