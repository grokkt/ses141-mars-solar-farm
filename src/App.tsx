import {createContext, useContext, useEffect, useCallback, useState, useRef } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Html, OrbitControls } from "@react-three/drei";
import { Scene, Vector3, TextureLoader, Mesh, BufferGeometry, SphereGeometry, Color, Matrix4 } from "three";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import MARS_TEXTURE from "../public/Mars.jpg";

//------------- Context for panels
class SolarPanel {
  width: number;
  length: number;
  powerPerDay: number;
  coordinates: Vector3;

  constructor(width: number, length: number, coordinates: Vector3) {
    this.width = width;
    this.length = length;
    this.coordinates = coordinates;
    const ppd = (width * length) + 15;
    this.powerPerDay = ppd;
  }

  getPowerPerDay(): number {
    return this.powerPerDay;
  }

  getSqFt(): number {
    return this.width * this.length;
  }
}

class SolarPanelsContextT {
  panels: SolarPanel[] = [];
  currentPPD: number = 0;
  currentPPY: number = 0;
  totalSqFt: number = 0;

  // every time a new panel is added, update PPD/PPY/Square Feet
  addPanel(panel: SolarPanel): void {

    this.panels.push(panel);

    var totalPPD = 0;
    var sqft = 0;
    for (let i = 0; i < this.panels.length; i++) {
      const p = this.panels[i];
      totalPPD += p.getPowerPerDay();
      sqft += p.getSqFt();
    }

    this.currentPPD = totalPPD;
    this.currentPPY = totalPPD * 365;
    this.totalSqFt = sqft;
  }
}

const SolarPanelsContext = createContext<SolarPanelsContextT | undefined>(undefined);


const MarsModel = ({
    // setxr,
    // setyr,
    xr,
    yr
}:{
    // setxr: (amt: number) => void;
    // setyr: (amt: number) => void;
    xr: number;
    yr: number;
}) => {
  const pos = new Vector3(0,0,0);
  const texture = useLoader(TextureLoader, MARS_TEXTURE);
  const marsRadius = 1;

  const [panels, setPanels] = useState<{ position: [number, number, number] }[]>([]);

  const handlePointerDown = (event: any) => {
    // get intersect point
    const point = event.point;
    // normalize clicked pos to Mars surface
    const position = new Vector3().copy(point).normalize().multiplyScalar(marsRadius);

    // must account for current rotation of model
    if (planetRef.current) {
      // must invert
      const planetRotationMatrix = new Matrix4().makeRotationFromEuler(planetRef.current.rotation).invert();
      position.applyMatrix4(planetRotationMatrix);
    }

    setPanels((prev) => [...prev, { position: [position.x, position.y, position.z] } ]);
  }

  const planetRef = useRef<Mesh>(null);

  useEffect(() => {
    if (planetRef.current) {
      planetRef.current.rotation.y = yr;
      planetRef.current.rotation.x = xr;
    }
  }, [planetRef.current, yr, xr])

  // useFrame(() => {
  //   if (planetRef.current) {
  //     planetRef.current.rotation.y += 0.001;
  //   }
  // });

  return (
    <mesh ref={planetRef} key={`mars`} position={pos} onPointerDown={handlePointerDown}>
      {/* [Radius, Width segments, height segments] | more segments = smoother */}
      <sphereGeometry args={[marsRadius, 256, 256]} />
      <meshStandardMaterial
        map={texture}
        transparent={true}
        opacity={0.8}
      />
      {panels.map((panel, index) => (
        <mesh key={`panel_${index}`} position={panel.position}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="black"/>
        </mesh>
      ))}
    </mesh>

  )
}

const MainScene = () => {

  const ms = new Scene();

  const PanelContext = useContext(SolarPanelsContext);

  const rotateAmt = 0.1;

  const [xr, setxr] = useState<number>(0.0);
  const [yr, setyr] = useState<number>(0.0);

  const setXR = useCallback((amt: number) => {
    setxr((prev) => prev + amt);
  }, [xr]);

  const setYR = useCallback((amt: number) => {
    setyr((prev) => prev + amt);
  }, [yr]);


  return (
    <>
      <div className="absolute top-4 right-12 !w-[25vw] !h-[40vh] flex flex-col border-2">
        <div className="col-span-1 w-full border p-2 flex flex-row text-white">
          <div className="w-2/3">
            Watts per 24 hours
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.currentPPD}` : "Loading..."}
          </div>
        </div>
        <div className="col-span-1 w-full border p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Power (per Earth year)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.currentPPY}` : "Loading..."}
          </div>
        </div>
        <div className="col-span-1 w-full border p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Panel Area (ft^2)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.totalSqFt}` : "Loading..."}
          </div>
        </div>

      </div>
      <div className="flex justify-center items-center w-screen h-screen bg-gray-800">
        <div className="flex flex-col items-center">
          {/* North Button */}
          <button onClick={() => setXR(rotateAmt)} className="bg-gray-700 text-white py-2 px-4 rounded mb-4">↑</button>
          <div className="flex items-center">
            {/* West Button */}
            <button onClick={() => setYR(rotateAmt * -1)} className="bg-gray-700 text-white py-2 px-4 rounded mr-4">←</button>

            {/* Canvas */}
            <Canvas
              className="!w-[30vw] !h-[60vh] bg-black"
              scene={ms}
            >
              <ambientLight intensity={10} />
              <Html position={[0,0,0]} className="flexxxx">
              </Html>
              <MarsModel xr={xr} yr={yr} />
              <OrbitControls enablePan={false} enableRotate={false}/>
            </Canvas>

            {/* East Button */}
            <button onClick={() => setYR(rotateAmt)} className="bg-gray-700 text-white py-2 px-4 rounded ml-4">→</button>
          </div>
          {/* South Button */}
          <button onClick={() => setXR(rotateAmt * -1)} className="bg-gray-700 text-white py-2 px-4 rounded mt-4">↓</button>
        </div>
      </div>
    </>
  );
}

const App = () => {

  const panelContext = new SolarPanelsContextT();

  return (
    <SolarPanelsContext.Provider value={panelContext}>
      <MainScene/>
    </SolarPanelsContext.Provider>
  )
}

export default App;

// function App() {
//   const [count, setCount] = useState(0)
//
//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }
//
// export default App
