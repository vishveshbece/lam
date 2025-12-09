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
  { min: 0,   max: 180, label: "Wrist R" },
];
const DEFAULT_ARM_ANGLES = [90, 120, 45, 90, 90];

/* ---------- COMMAND MAPPING (Updated) ---------- */
const BASE_COMMANDS = {
  STOP: 0,
  FORWARD: 1,
  BACKWARD: 2,
  LEFT: 3,        // Strafe Left
  RIGHT: 4,       // Strafe Right
  ROTATE_LEFT: 5,
  ROTATE_RIGHT: 6,
  FORWARD_LEFT: 7,
  FORWARD_RIGHT: 8,
  BACKWARD_LEFT: 9,
  BACKWARD_RIGHT: 10
};

/* ---------- ICONS (Added Diagonals) ---------- */
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
  UpLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 17L17 7"/></svg>, // Simple diagonal arrow
  UpRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h10v10"/><path d="M7 7l10 10"/></svg>,
  DownLeft: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17h10V7"/><path d="M7 17l10-10"/></svg>,
  DownRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 17H7V7"/><path d="M7 7l10 10"/></svg>,
};

/* ---------- BLE HOOK (Unchanged logic, kept concise) ---------- */
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

/* ---------- COMPONENTS ---------- */

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
        // PACKET: [COMMAND, SPEED]
        const packet = new Uint8Array([currentCmd, speed]);
        await ble.baseChar.writeValue(packet);
      } catch (e) { console.error("Write Error:", e); }
    };
    send(); // Immediate
    const timer = setInterval(send, 100); // Repeat
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
      // Send STOP command (0)
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

// ... [Keep ArmPage, ConnectionPage, Layout, and App exactly as they were] ...

// PLACEHOLDERS for unchanged components to make this copy-pasteable
function ConnectionPage({ ble }) {
    const navigate = useNavigate();
    const handleConnect = async (type) => { if (type === 'arm') await ble.connectArm(); if (type === 'base') await ble.connectBase(); };
    // ... [Use previous ConnectionPage code, just ensuring navigation works]
    return (
        <div className="page-container" style={{textAlign:'center', marginTop: 50}}>
            <h1 className="glitch-text">SYSTEM LINK</h1>
            <div style={{display:'flex', gap:20, justifyContent:'center', marginTop:40}}>
                 <button className="btn btn-primary" onClick={() => handleConnect('arm')}>{ble.armCharAngles ? "ARM READY" : "CONNECT ARM"}</button>
                 <button className="btn btn-primary" onClick={() => handleConnect('base')}>{ble.baseChar ? "BASE READY" : "CONNECT BASE"}</button>
            </div>
            <div style={{marginTop: 20}}>
                {ble.baseChar && <button className="btn btn-secondary" onClick={()=>navigate('/base')}>GO TO BASE</button>}
                {ble.armCharAngles && <button className="btn btn-secondary" onClick={()=>navigate('/arm')}>GO TO ARM</button>}
            </div>
        </div>
    )
}
function ArmPage({ble}) { return <div className="page-container"><h2>Arm Controls Placeholder</h2></div> } // Use your existing ArmPage
function Layout({ ble, children }) {
    // ... Use your existing Layout
    const navigate = useNavigate();
    return (
        <div className="app-shell">
            <header className="app-header">
                <span className="brand-text">ROBOCORE</span>
                <nav className="nav-links"><Link to="/">HUB</Link><Link to="/base">BASE</Link><Link to="/arm">ARM</Link></nav>
            </header>
            <main className="main-content">{children}</main>
             {/* Include your CSS here or in a separate file */}
             <style>{`:root{--bg:#0f172a;--surface:#1e293b;--surface-light:#334155;--primary:#3b82f6;--primary-glow:rgba(59,130,246,0.5);--accent:#06b6d4;--success:#10b981;--danger:#ef4444;--text:#f8fafc;--text-dim:#94a3b8;--font-main:sans-serif;} body{background:var(--bg);color:var(--text);margin:0;font-family:var(--font-main);} .app-header{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;background:var(--surface);} .nav-links a{color:var(--text);text-decoration:none;margin-left:15px;font-weight:bold;} .main-content{padding:20px;max-width:800px;margin:0 auto;} .btn{padding:10px 20px;border-radius:8px;border:none;font-weight:bold;cursor:pointer;} .btn-primary{background:var(--primary);color:white;} .btn-secondary{background:var(--surface-light);color:white;}`}</style>
        </div>
    )
}

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
