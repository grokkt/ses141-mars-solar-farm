import {createContext, useMemo, useContext, useEffect, useCallback, useState, useRef } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Html, OrbitControls } from "@react-three/drei";
import { Scene, Vector3, TextureLoader, Mesh, BufferGeometry, SphereGeometry, Color, Matrix4 } from "three";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import MARS_TEXTURE from "../public/Mars.jpg";

//------------- Context for panels
const SECONDS_PER_EARTH_DAY = 86400;

// solarIrradiance max = 60.0 W/sqft, min = 10W/sqft, default: 50W/sqft

interface EnergyProd {
  dailyEnergyJoules: number,
  dailyEnergyKWH: number,
  annualEnergyJoules: number,
  annualEnergyKWH: number,
}

const calcEnergyProduction = ({
  areaInSqFt,
  panelEffic,
  solarIrradiance,
}:{
  areaInSqFt: number;
  panelEffic: number;
  solarIrradiance: number;
}): EnergyProd => {
  // power per sqft per second
  const power_psqft = solarIrradiance * panelEffic;

  // energy per sqft per 24 hours in Joules
  const energy_psqft_pday = power_psqft * SECONDS_PER_EARTH_DAY;

  // energy for area per day Joules
  const energy_pday_joules = energy_psqft_pday * areaInSqFt;

  // power for area per day in kWH
  const energy_pday_kwh = energy_pday_joules / 3_600_000;

  return {
    dailyEnergyJoules: energy_pday_joules,
    dailyEnergyKWH: energy_pday_kwh,
    annualEnergyJoules: energy_pday_joules * 365.25,
    annualEnergyKWH: energy_pday_kwh * 365.25
  }
}

class SolarPanel {
  width: number;
  length: number;
  coordinates: Vector3;

  constructor(width: number, length: number, coordinates: Vector3) {
    this.width = width;
    this.length = length;
    this.coordinates = coordinates;
  }

  getSqFt(): number {
    return this.width * this.length;
  }
}

type SolarPanelsContextT = {
  panels: SolarPanel[];
  PPDJoules: number;
  PPYJoules: number;
  PPDKWH: number;
  PPYKWH: number;
  totalSqFt: number;
  addPanel: (panel: SolarPanel) => void;
};

const SolarPanelsContext = createContext<SolarPanelsContextT | undefined>(undefined);

//-----------------------------------------
//------------------ Mars 3D model

const MarsModel = ({
    xr,
    yr
}:{
    xr: number;
    yr: number;
}) => {
  const pos = new Vector3(0,0,0);
  const texture = useLoader(TextureLoader, MARS_TEXTURE);
  const marsRadius = 1;

  const panelctx = useContext(SolarPanelsContext);

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

    const cv = new Vector3(position.x, position.y, position.z);

    const p = new SolarPanel(5, 5, cv);

    panelctx?.addPanel(p);
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
        transparent={false}
      />
      {panelctx?.panels.map((panel, index) => (
        <mesh key={`panel_${index}`} position={panel.coordinates}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="blue"/>
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
      <div className="absolute top-4 right-4  !w-[35vw] !h-[40vh] flex flex-col">
        <div className="col-span-1 w-full p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Panel Area (sqft)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.totalSqFt}` : "Loading..."}
          </div>
        </div>
        <div className="col-span-1 w-full p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Energy (per 24 hours)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.PPDJoules} Joules` : "Loading..."}
          </div>
        </div>
        <div className="col-span-1 w-full  p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Energy (per Earth year)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.PPYJoules} Joules` : "Loading..."}
          </div>
        </div>

        <div className="col-span-1 w-full  p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Power (per 24 hours)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.PPDKWH} kWh` : "Loading..."}
          </div>
        </div>
        <div className="col-span-1 w-full  p-2 flex flex-row text-white">
          <div className="w-2/3">
            Total Power (per Earth year)
          </div>
          <div className="w-1/3">
            {PanelContext ? `${PanelContext.PPYKWH} kWh` : "Loading..."}
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center pr-20 w-screen h-screen bg-gray-800">
        <div className="flex flex-col items-center">
          {/* North Button */}
          <button onClick={() => setXR(rotateAmt)} className="bg-gray-700 text-white py-2 px-4 rounded mb-4">↑</button>
          <div className="flex items-center">
            {/* West Button */}
            <button onClick={() => setYR(rotateAmt * -1)} className="bg-gray-700 text-white py-2 px-4 rounded mr-4">←</button>
            {/* Canvas */}
            <Canvas
              className="!w-[30vw] !h-[60vh] bg-black relative"
              camera={{position: [0,0,2]}}
              scene={ms}
            >
              <ambientLight intensity={10} />
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

  const [panels, setPanels] = useState<SolarPanel[]>([]);
  const [totalSqFt, setTotalSqFt] = useState(0);

  const [ppdJoules, setPPDJoules] = useState(0);
  const [ppyJoules, setPPYJoules] = useState(0);
  const [ppdKWH, setPPDKWH] = useState(0);
  const [ppyKWH, setPPYKWH] = useState(0);

  const [efficPercent, setEfficPercent] = useState(20);
  const [solarIrr, setSolarIrr] = useState(50);

  const addPanel = useCallback((panel: SolarPanel) => {
    setPanels((prevPanels) => {
      const updatedPanels = [...prevPanels, panel];
      var totalSqFt = 0;
      updatedPanels.forEach((panel) => {
        totalSqFt += panel.getSqFt();
      });

      const power = calcEnergyProduction({
        areaInSqFt: totalSqFt,
        panelEffic: efficPercent,
        solarIrradiance: solarIrr
      });

      setPPDJoules(power.dailyEnergyJoules);
      setPPYJoules(power.annualEnergyJoules);
      setPPDKWH(power.dailyEnergyKWH);
      setPPYKWH(power.annualEnergyKWH);
      setTotalSqFt(totalSqFt);

      return updatedPanels;
    });
  }, []);

  const value: SolarPanelsContextT = useMemo(() => {
    return {
      panels,
      PPDJoules: ppdJoules,
      PPYJoules: ppyJoules,
      PPDKWH: ppdKWH,
      PPYKWH: ppyKWH,
      totalSqFt,
      addPanel
    };
  }, [panels.length, totalSqFt])

  return (
    <SolarPanelsContext.Provider value={value}>
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
