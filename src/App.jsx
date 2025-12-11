import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

/* ---------- UUIDs ---------- */
const BASE_SERVICE = "0000aaaa-0000-1000-8000-00805f9b34fb";
const BASE_CHAR    = "0000aaab-0000-1000-8000-00805f9b34fb";

const ARM_SERVICE     = "0000bbbb-0000-1000-8000-00805f9b34fb";
const ARM_ANGLES_CHAR = "0000bbbc-0000-1000-8000-00805f9b34fb";

/* ---------- LIMITS ---------- */
const ARM_LIMITS = [
  { min: 0,   max: 180, label: "Base Rot" },
  { min: 100, max: 180, label: "Shoulder" },
  { min: 0,   max: 90,  label: "Elbow" },
  { min: 0,   max: 180, label: "Wrist V" },
  { min: 37,   max: 120, label: "Wrist R" },
];
const DEFAULT_ARM_ANGLES = [90, 120, 45, 90, 45];

/* ---------- COMMAND MAPPING (Updated) ---------- */
const BASE_COMMANDS = {
  STOP: 0,
  FORWARD: 2,
  BACKWARD: 1,
  LEFT: 4,        // Strafe Left
  RIGHT: 3,       // Strafe Right
  ROTATE_LEFT: 5,
  ROTATE_RIGHT: 6,
  FORWARD_LEFT: 9,
  FORWARD_RIGHT: 10,
  BACKWARD_LEFT: 8,
  BACKWARD_RIGHT: 7
};

/* ---------- ICONS ---------- */
const Icons = {
  Arm: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="7" y2="18"/><line x1="12" y1="13" x2="17" y2="18"/></svg>,
  Base: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 12h-8"/><path d="M12 8v8"/></svg>,
  Link: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  
  // Directions
  Up: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>,
  Down: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>,
  Left: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Right: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  
  // Diagonals
  UpLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 17L17 7"/></svg>, 
  UpRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 7l10 10"/></svg>,
  DownLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17h10V7"/><path d="M7 17l10-10"/></svg>,
  DownRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17H7V7"/><path d="M7 7l10 10"/></svg>,
};

/* ---------- BLE HOOK ---------- */
function useBleState() {
  const [armCharAngles, setArmCharAngles] = useState(null);
  const [baseChar, setBaseChar] = useState(null);
  const [connectedDevice, setConnectedDevice] = useState({ arm: null, base: null });

  const handleError = (e) => { console.error(e); alert("Conn Error: " + e.message); };

  const connectArm = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [ARM_SERVICE, BASE_SERVICE] });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(ARM_SERVICE);
      const char = await svc.getCharacteristic(ARM_ANGLES_CHAR);
      setArmCharAngles(char);
      setConnectedDevice(prev => ({ ...prev, arm: device }));
      device.addEventListener('gattserverdisconnected', () => { setArmCharAngles(null); setConnectedDevice(prev => ({ ...prev, arm: null })); });
    } catch (e) { handleError(e); }
  };

  const connectBase = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [BASE_SERVICE, ARM_SERVICE] });
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(BASE_SERVICE);
      const char = await svc.getCharacteristic(BASE_CHAR);
      setBaseChar(char);
      setConnectedDevice(prev => ({ ...prev, base: device }));
      device.addEventListener('gattserverdisconnected', () => { setBaseChar(null); setConnectedDevice(prev => ({ ...prev, base: null })); });
    } catch (e) { handleError(e); }
  };

  const disconnectAll = () => {
    if (connectedDevice.arm?.gatt?.connected) connectedDevice.arm.gatt.disconnect();
    if (connectedDevice.base?.gatt?.connected) connectedDevice.base.gatt.disconnect();
    setArmCharAngles(null); setBaseChar(null); setConnectedDevice({ arm: null, base: null });
  };

  return { armCharAngles, baseChar, connectArm, connectBase, disconnectAll };
}

/* ---------- BASE PAGE (With Speed & Grid) ---------- */
function BasePage({ ble }) {
  const [activeButton, setActiveButton] = useState(null);
  const [currentCmd, setCurrentCmd] = useState(null);
  const [speed, setSpeed] = useState(200); // 0-255

  // Heartbeat loop: sends command + speed
  useEffect(() => {
    if (currentCmd === null) return;
    const send = async () => {
      if (!ble.baseChar) return;
      try {
        const packet = new Uint8Array([currentCmd, speed]);
        await ble.baseChar.writeValue(packet);
      } catch (e) { console.error("Write Error:", e); }
    };
    send(); 
    const timer = setInterval(send, 100); 
    return () => clearInterval(timer);
  }, [currentCmd, speed, ble.baseChar]);

  const startCommand = (cmd, btnName) => {
    if (currentCmd === cmd) return;
    setActiveButton(btnName);
    setCurrentCmd(cmd);
  };

  const stopCommand = () => {
    setActiveButton(null);
    setCurrentCmd(null);
    if (ble.baseChar) {
      ble.baseChar.writeValue(new Uint8Array([BASE_COMMANDS.STOP, 0])).catch(console.error);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="header-row">
        <h2>Omni Control</h2>
        {!ble.baseChar && <div className="badge-error">DISCONNECTED</div>}
      </div>

      <div className="controls-grid-layout">
        
        {/* SPEED CONTROL */}
        <div className="control-panel speed-panel">
          <h3>Velocity: {Math.round((speed / 255) * 100)}%</h3>
          <input 
            type="range" 
            min="50" max="255" 
            value={speed} 
            onChange={(e) => setSpeed(parseInt(e.target.value))}
            className="cyber-range"
            style={{width: '100%'}}
          />
        </div>

        {/* 3x3 DIRECTION GRID */}
        <div className="control-panel movement-panel">
          <h3>Translation</h3>
          <div className="grid-3x3">
            {/* Top Row */}
            <button className={`grid-btn ${activeButton === 'fl'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.FORWARD_LEFT, 'fl')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              ↖
            </button>
            <button className={`grid-btn ${activeButton === 'f'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.FORWARD, 'f')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              <Icons.Up />
            </button>
            <button className={`grid-btn ${activeButton === 'fr'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.FORWARD_RIGHT, 'fr')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              ↗
            </button>

            {/* Middle Row */}
            <button className={`grid-btn ${activeButton === 'l'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.LEFT, 'l')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              <Icons.Left />
            </button>
            <div className="grid-center">
               <div className="dot"></div>
            </div>
            <button className={`grid-btn ${activeButton === 'r'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.RIGHT, 'r')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              <Icons.Right />
            </button>

            {/* Bottom Row */}
            <button className={`grid-btn ${activeButton === 'bl'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.BACKWARD_LEFT, 'bl')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              ↙
            </button>
            <button className={`grid-btn ${activeButton === 'b'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.BACKWARD, 'b')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              <Icons.Down />
            </button>
            <button className={`grid-btn ${activeButton === 'br'?'active':''}`} 
              onPointerDown={() => startCommand(BASE_COMMANDS.BACKWARD_RIGHT, 'br')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
              ↘
            </button>
          </div>
        </div>

        {/* ROTATION & STOP */}
        <div className="control-panel action-panel">
          <h3>Rotation</h3>
          <div className="rotate-row">
            <button className={`rotate-btn ${activeButton === 'rotL'?'active':''}`} 
               onPointerDown={() => startCommand(BASE_COMMANDS.ROTATE_LEFT, 'rotL')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
               ↺
            </button>
            <button className={`rotate-btn ${activeButton === 'rotR'?'active':''}`} 
               onPointerDown={() => startCommand(BASE_COMMANDS.ROTATE_RIGHT, 'rotR')} onPointerUp={stopCommand} onPointerLeave={stopCommand}>
               ↻
            </button>
          </div>
          
          <button className="stop-bar" onPointerDown={stopCommand}>
            EMERGENCY STOP
          </button>
        </div>

      </div>

      <style>{`
        .controls-grid-layout { display: flex; flex-direction: column; gap: 20px; align-items: center; }
        .control-panel { background: var(--surface); padding: 20px; border-radius: 16px; width: 100%; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
        .control-panel h3 { margin-bottom: 15px; color: var(--text-dim); font-size: 0.9rem; letter-spacing: 1px; text-transform: uppercase; }
        
        .grid-3x3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; aspect-ratio: 1; }
        .grid-btn { 
          background: var(--surface-light); border: none; border-radius: 12px; color: var(--text);
          font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;
        }
        .grid-btn:active, .grid-btn.active { background: var(--primary); color: white; transform: scale(0.95); box-shadow: 0 0 15px var(--primary-glow); }
        .grid-center { display: flex; align-items: center; justify-content: center; }
        .grid-center .dot { width: 12px; height: 12px; background: var(--text-dim); border-radius: 50%; }

        .rotate-row { display: flex; gap: 15px; justify-content: center; margin-bottom: 20px; }
        .rotate-btn { width: 70px; height: 70px; border-radius: 50%; background: var(--surface-light); border: none; color: white; font-size: 1.8rem; cursor: pointer; }
        .rotate-btn:active, .rotate-btn.active { background: var(--accent); transform: rotate(-10deg) scale(0.95); }
        
        .stop-bar { width: 100%; padding: 15px; background: var(--danger); color: white; border: none; border-radius: 8px; font-weight: 800; letter-spacing: 2px; }
        .stop-bar:active { background: #dc2626; transform: translateY(2px); }
      `}</style>
    </div>
  );
}

/* ---------- ARM PAGE (Restored) ---------- */
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
      
      <style>{`
        .sliders-container { margin-top: 30px; display: grid; gap: 16px; }
        .slider-card { background: var(--surface); padding: 16px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
        .slider-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 600; font-size: 0.9rem; }
        .slider-value { color: var(--primary); font-family: monospace; font-size: 1.1rem; }
        .range-wrapper { height: 30px; display: flex; align-items: center; }
        .cyber-range { -webkit-appearance: none; width: 100%; height: 8px; border-radius: 4px; outline: none; transition: 0.2s; }
        .cyber-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fff; border: 2px solid var(--primary); cursor: pointer; box-shadow: 0 0 10px var(--primary); transition: 0.2s; }
        .slider-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 8px; }
      `}</style>
    </div>
  );
}

/* ---------- CONNECTION PAGE ---------- */
function ConnectionPage({ ble }) {
  const navigate = useNavigate();

  const handleConnect = async (type) => {
    if (type === 'arm') await ble.connectArm();
    if (type === 'base') await ble.connectBase();
  };

  return (
    <div className="page-container fade-in">
      <div className="hero-section">
        <h1 className="glitch-text" data-text="SYSTEM LINK">SYSTEM LINK</h1>
        <p className="subtitle">Initialize Bluetooth Protocols</p>
      </div>

      <div className="card-grid">
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
      
      <style>{`
        .hero-section { text-align: center; margin-bottom: 40px; margin-top: 20px; }
        .glitch-text { font-size: 2.5rem; font-weight: 800; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; color: transparent; margin: 0; }
        .subtitle { color: var(--text-dim); margin-top: 8px; font-size: 1.1rem; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .tech-card { background: var(--surface); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.05); transition: transform 0.3s, box-shadow 0.3s; }
        .tech-card:hover { transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .tech-card.connected { border-color: var(--primary); box-shadow: 0 0 20px rgba(59,130,246,0.1); }
        .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--primary); }
        .card-header h3 { color: #fff; font-size: 1.2rem; margin: 0; }
        .status-indicator { font-size: 0.85rem; font-weight: 600; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; display: inline-block; margin-top: 10px; }
        .card-actions { margin-top: 20px; }
      `}</style>
    </div>
  );
}

/* ---------- MAIN LAYOUT ---------- */
function Layout({ ble, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
          <div className="brand-icon">🤖</div>
          <span className="brand-text">ROBO<span className="text-primary">CORE</span></span>
        </div>
        <nav className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>HUB</Link>
          <Link to="/arm" className={location.pathname === '/arm' ? 'active' : ''}>ARM</Link>
          <Link to="/base" className={location.pathname === '/base' ? 'active' : ''}>BASE</Link>
        </nav>
        <div className="header-actions">
           {/* Simple Status Dots */}
           <div style={{display:'flex', gap:5}}>
             <div style={{width:8, height:8, borderRadius:'50%', background: ble.armCharAngles ? '#10b981' : '#334155'}} title="Arm"></div>
             <div style={{width:8, height:8, borderRadius:'50%', background: ble.baseChar ? '#10b981' : '#334155'}} title="Base"></div>
           </div>
           {(ble.armCharAngles || ble.baseChar) && (
            <button className="btn-mini-danger" onClick={ble.disconnectAll}>Disc</button>
           )}
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
      
      <style>{`
        :root { --bg: #0f172a; --surface: #1e293b; --surface-light: #334155; --primary: #3b82f6; --primary-glow: rgba(59, 130, 246, 0.5); --accent: #06b6d4; --success: #10b981; --danger: #ef4444; --text: #f8fafc; --text-dim: #94a3b8; --font-main: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        * { box-sizing: border-box; }
        body { margin: 0; background-color: var(--bg); color: var(--text); font-family: var(--font-main); overflow-x: hidden; -webkit-tap-highlight-color: transparent; user-select: none; }
        .app-shell { display: flex; flex-direction: column; min-height: 100vh; background-image: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%); }
        .app-header { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 70px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 50; }
        .main-content { flex: 1; padding: 20px; max-width: 1000px; margin: 0 auto; width: 100%; position: relative; }
        .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.2rem; }
        .nav-links { display: flex; gap: 10px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 20px; }
        .nav-links a { text-decoration: none; color: var(--text-dim); font-weight: 600; font-size: 0.9rem; padding: 8px 16px; border-radius: 16px; transition: all 0.2s; }
        .nav-links a.active { background: var(--surface-light); color: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
        .text-primary { color: var(--primary); }
        .text-success { color: var(--success); text-shadow: 0 0 10px rgba(16,185,129,0.4); }
        .text-dim { color: var(--text-dim); }
        .btn { border: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; font-size: 1rem; }
        .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
        .btn-secondary { background: var(--surface-light); color: #fff; }
        .btn-mini-danger { background: var(--danger); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.75rem; margin-left: 10px; }
        .badge-error { background: var(--danger); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 10px; }
        .header-row { display: flex; align-items: center; margin-bottom: 20px; justify-content: center; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .overlay-warning { position: absolute; inset: 0; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }
        .overlay-warning p { font-size: 1.5rem; font-weight: 700; margin-bottom: 20px; color: var(--danger); }
        
        @media (max-width: 600px) {
           .app-header { padding: 0 16px; height: 60px; }
           .brand-text { display: none; }
           .nav-links a { font-size: 0.8rem; padding: 6px 12px; }
        }
      `}</style>
    </div>
  );
}

/* ---------- APP ---------- */
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
