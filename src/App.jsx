import { useState, useEffect } from "react";

const DIRECTION_UUID = {
  service: "0000aaaa-0000-1000-8000-00805f9b34fb",
  characteristic: "0000aaab-0000-1000-8000-00805f9b34fb",
};

const SERVO_UUID = {
  service: "0000bbbb-0000-1000-8000-00805f9b34fb",
  characteristic: "0000bbbc-0000-1000-8000-00805f9b34fb",
};

const christmasQuotes = [
  "🎄 Joy to the World!",
  "⛄ Let it Snow!",
  "🎅 Ho Ho Ho!",
  "🎁 Merry Christmas!",
  "❄️ Warm wishes to you",
  "🕯️ Peace on Earth",
  "✨ Magic is in the air",
  "🔔 Season's Greetings",
];

export default function App() {
  const [dirDev, setDirDev] = useState(null);
  const [servoDev, setServoDev] = useState(null);
  const [angles, setAngles] = useState([90, 90, 90, 90, 90]);
  const [quote, setQuote] = useState(christmasQuotes[0]);

  useEffect(() => {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {
        console.log("Orientation lock not supported");
      });
    }
    
    // Rotate quotes every 5 seconds
    const interval = setInterval(() => {
      setQuote(christmasQuotes[Math.floor(Math.random() * christmasQuotes.length)]);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function connectDirection() {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [DIRECTION_UUID.service] }],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(DIRECTION_UUID.service);
      const char = await service.getCharacteristic(DIRECTION_UUID.characteristic);
      setDirDev(char);
      alert("🎅 Direction ESP Connected!");
    } catch (e) {
      console.error(e);
    }
  }

  async function connectServo() {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVO_UUID.service] }],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVO_UUID.service);
      const char = await service.getCharacteristic(SERVO_UUID.characteristic);
      setServoDev(char);
      alert("🎄 Servo ESP Connected!");
    } catch (e) {
      console.error(e);
    }
  }

  async function sendDirection(cmd) {
    if (!dirDev) return alert("Direction ESP not connected!");
    await dirDev.writeValue(new Uint8Array([cmd]));
  }

  async function sendAngles(a) {
    if (!servoDev) return alert("Servo ESP not connected!");
    await servoDev.writeValue(new Uint8Array(a));
  }

  function updateAngle(i, val) {
    const newA = [...angles];
    newA[i] = parseInt(val);
    setAngles(newA);
    sendAngles(newA);
  }

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0f3d1a 0%, #c41e3a 50%, #0f3d1a 100%)",
        fontFamily: "'Arial', sans-serif",
      }}
    >
      {/* TOP FESTIVE HEADER */}
      <div style={{
        background: "linear-gradient(90deg, #c41e3a 0%, #ffd700 50%, #c41e3a 100%)",
        padding: "3px 8px",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        borderBottom: "2px solid #0f3d1a",
      }}>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#0f3d1a", letterSpacing: 0.5 }}>
          🎄 ✨ 🎅 CHRISTMAS REMOTE ✨ 🎄
        </div>
        <div style={{
          fontSize: 10,
          color: "#fff",
          marginTop: 1,
          fontStyle: "italic",
          fontWeight: "bold",
          animation: "pulse 2s infinite",
        }}>
          {quote}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          padding: "4px",
          gap: "4px",
          overflow: "hidden",
        }}
      >
        {/* LEFT: SERVO SLIDERS */}
        <div style={{ 
          flex: 1,
          background: "rgba(255, 255, 255, 0.96)", 
          borderRadius: 12,
          padding: "8px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          display: "flex",
          flexDirection: "column",
          border: "2px solid #c41e3a",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative corner ornaments */}
          <div style={{
            position: "absolute",
            top: -5,
            left: -5,
            fontSize: 20,
            opacity: 0.3,
          }}>🎄</div>
          <div style={{
            position: "absolute",
            bottom: -5,
            right: -5,
            fontSize: 20,
            opacity: 0.3,
          }}>⛄</div>

          <h2 style={{ 
            margin: "0 0 6px 0", 
            color: "#0f3d1a", 
            fontSize: 14,
            fontWeight: "bold",
            textAlign: "center",
          }}>🎄 Motor Magic 🎁</h2>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: 3 }}>
            {angles.map((a, i) => (
              <div key={i} style={{ 
                marginBottom: 6,
                padding: "6px",
                background: "linear-gradient(135deg, #f0fdf4 0%, #fef2f2 100%)",
                borderRadius: "8px",
                border: "1.5px solid #c41e3a",
                boxShadow: "0 2px 8px rgba(196, 30, 58, 0.1)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, alignItems: "center" }}>
                  <strong style={{ color: "#0f3d1a", fontSize: 11 }}>
                    {i === 0 ? "🎅" : i === 1 ? "❄️" : i === 2 ? "🎄" : i === 3 ? "⛄" : "🎁"} M{i + 1}
                  </strong>
                  <span style={{ 
                    background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: 15,
                    fontSize: 10,
                    fontWeight: "bold",
                    boxShadow: "0 2px 6px rgba(196, 30, 58, 0.3)",
                  }}>{a}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={a}
                  style={{ 
                    width: "100%",
                    height: 4,
                    borderRadius: 3,
                    outline: "none",
                    background: `linear-gradient(to right, #c41e3a 0%, #c41e3a ${(a/180)*100}%, #e0e0e0 ${(a/180)*100}%, #e0e0e0 100%)`,
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                  }}
                  onChange={(e) => updateAngle(i, e.target.value)}
                />
              </div>
            ))}
          </div>

          <button onClick={connectServo} style={{
            padding: "6px 12px",
            border: "1.5px solid #0f3d1a",
            borderRadius: "8px",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
            color: "white",
            background: "linear-gradient(135deg, #0f3d1a 0%, #1a3d2a 100%)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
            marginTop: 4,
          }}
          onMouseDown={(e) => e.target.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.target.style.transform = "scale(1)"}
          >
            🔌 Servos 🔌
          </button>
        </div>

        {/* RIGHT: DIRECTION PAD */}
        <div style={{ 
          width: "48%",
          background: "rgba(255, 255, 255, 0.96)",
          borderRadius: 12,
          padding: "8px",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          border: "2px solid #0f3d1a",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative corner ornaments */}
          <div style={{
            position: "absolute",
            top: -5,
            right: -5,
            fontSize: 20,
            opacity: 0.3,
          }}>🎁</div>
          <div style={{
            position: "absolute",
            bottom: -5,
            left: -5,
            fontSize: 20,
            opacity: 0.3,
          }}>🔔</div>

          <h2 style={{ 
            margin: "0 0 4px 0", 
            color: "#c41e3a", 
            fontSize: 14,
            fontWeight: "bold",
            textAlign: "center",
          }}>🎮 Merry Control 🎅</h2>

          <div style={{ 
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            flex: 1,
            justifyContent: "center",
          }}>
            {/* UP */}
            <button
              onClick={() => sendDirection(1)}
              style={{
                width: 56,
                height: 56,
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #0f3d1a 0%, #1a5d2a 100%)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 22,
                fontWeight: "bold",
              }}
              onMouseDown={(e) => e.target.style.transform = "scale(0.95)"}
              onMouseUp={(e) => e.target.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
              title="Up"
            >
              ⬆️
            </button>

            {/* CENTER ROW */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {/* LEFT */}
              <button 
                onClick={() => sendDirection(2)} 
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #0f3d1a 0%, #1a5d2a 100%)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: "bold",
                }}
                onMouseDown={(e) => e.target.style.transform = "scale(0.95)"}
                onMouseUp={(e) => e.target.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                title="Left"
              >
                ⬅️
              </button>
              
              {/* CENTER STOP */}
              <button 
                onClick={() => sendDirection(0)} 
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "12px",
                  border: "2px solid white",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
                  boxShadow: "0 6px 20px rgba(196, 30, 58, 0.4)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: 26,
                }}
                onMouseDown={(e) => e.target.style.transform = "scale(0.93)"}
                onMouseUp={(e) => e.target.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                title="Stop"
              >
                ⏹️
              </button>
              
              {/* RIGHT */}
              <button 
                onClick={() => sendDirection(3)} 
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #0f3d1a 0%, #1a5d2a 100%)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: "bold",
                }}
                onMouseDown={(e) => e.target.style.transform = "scale(0.95)"}
                onMouseUp={(e) => e.target.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                title="Right"
              >
                ➡️
              </button>
            </div>

            {/* DOWN */}
            <button
              onClick={() => sendDirection(4)}
              style={{
                width: 56,
                height: 56,
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #0f3d1a 0%, #1a5d2a 100%)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 22,
                fontWeight: "bold",
              }}
              onMouseDown={(e) => e.target.style.transform = "scale(0.95)"}
              onMouseUp={(e) => e.target.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
              title="Down"
            >
              ⬇️
            </button>
          </div>

          <button onClick={connectDirection} style={{
            padding: "6px 12px",
            border: "1.5px solid #c41e3a",
            borderRadius: "8px",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
            color: "white",
            background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
            width: "100%",
          }}
          onMouseDown={(e) => e.target.style.transform = "scale(0.98)"}
          onMouseUp={(e) => e.target.style.transform = "scale(1)"}
          >
            🔌 Direction 🔌
          </button>
        </div>
      </div>

      {/* FESTIVE FOOTER */}
      <div style={{
        background: "linear-gradient(90deg, #0f3d1a 0%, #ffd700 50%, #0f3d1a 100%)",
        padding: "3px 8px",
        textAlign: "center",
        borderTop: "2px solid #c41e3a",
      }}>
        <div style={{ fontSize: 10, fontWeight: "bold", color: "white", letterSpacing: 0.5 }}>
          🔔 Happy Holidays! 🎁 Merry Christmas 2025 🎄 Ho Ho Ho! 🔔
        </div>
      </div>
    </div>
  );
}