import {createContext, useMemo, useContext, useEffect, useCallback, useState, useRef } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Html, OrbitControls } from "@react-three/drei";
import { Scene, Vector3, TextureLoader, Mesh, BufferGeometry, SphereGeometry, Color, Matrix4 } from "three";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import MARS_TEXTURE from "../public/Mars.jpg";
import STAR_BG from "../public/star_galaxy.png";

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




const Slider = ({
  defaultVal,
  min,
  max,
  step,
  onChange,

}:{
    defaultVal: number;
    min: number;
    max: number;
    step: number;
    onChange?: (newVal: number) => void;
  }) => {

  const [value, setValue] = useState(defaultVal);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setValue(v);
    if (onChange !== undefined) {
      onChange(v);
    }
  };

  return (
    <fieldset className="col-span-10 flex items-center overflow-y-visible overflow-x-clip !w-[300px] dark:text-gray-100">
      <input min={min} max={max} step={step} onChange={handleChange}
        id="slider" type="range" value={value} title={`${value}`}
        className="w-full cursor-pointer accent-gray-300" />
    </fieldset>
  )
};


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
  solarIrr: number;
  panelEff: number;
  addPanel: (panel: SolarPanel) => void;
  removePanel: (position: Vector3) => boolean;
  updateSolarIrr: (newVal: number) => void;
  updatePanelEff: (newVal: number) => void;
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

    // if remove call returns true (a panel was removed) then don't add
    if (panelctx) {
      const wasRemoved = panelctx.removePanel(cv);
      if (!wasRemoved) {
        const p = new SolarPanel(5, 5, cv);
        panelctx.addPanel(p);
      }
    }

    // const p = new SolarPanel(5, 5, cv);
    // panelctx?.addPanel(p);
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
          <sphereGeometry args={[0.02, 32, 32]} />
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

  // solarIrradiance max = 60.0 W/sqft, min = 10W/sqft, default: 50W/sqft
  return (
    <>
      <div className="w-screen h-screen grid grid-cols-6 justify-center px-20 items-center bg-gray-800">
        <div className="col-span-3 flex justify-center items-center w-screenh-screen">
          <div className="flex flex-col items-center">
            {/* North Button */}
            <button onClick={() => setXR(rotateAmt)} className="bg-gray-700 text-white py-2 px-4 rounded mb-4">↑</button>
            <div className="flex items-center">
              {/* West Button */}
              <button onClick={() => setYR(rotateAmt * -1)} className="bg-gray-700 text-white py-2 px-4 rounded mr-4">←</button>
              {/* Canvas */}
              <Canvas
                className="!w-[30vw] !h-[60vh] relative rounded-xl border-2 border-gray-600"
                camera={{position: [0,0,2]}}
                scene={ms}
                style={{ backgroundImage: `url(${STAR_BG})` }}
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



        <div className="col-span-3 flex flex-col justify-center items-center gap-y-4">
          <div className=" flex flex-col justify-center items-center place-self-start  gap-y-8">
            {/* Solar irradiance level */}
            <div className="flex flex-col justify-center items-center gap-y-2">
              <div className="w-full flex justify-between items-center">
                <div className="text-gray-200 opacity-65 text-xs">
                  {`10 W/sqft`}
                </div>
                <div className="text-gray-50">
                  Solar Irradiance Level
                </div>
                <div className="text-gray-200 opacity-65 text-xs">
                  {`60 W/sqft`}
                </div>
              </div>
              <div className="grid grid-cols-12 justify-evenly items-center gap-x-1">
                <MoonSvg fill={"#0091FF"} />
                <Slider defaultVal={50} min={10} max={60} step={1} onChange={PanelContext?.updateSolarIrr}   />
                <SunSvg fill={"#FFD900"} />
              </div>
              <div className="flex justify-center items-center text-xs text-gray-200 opacity-65">
                {`${PanelContext?.solarIrr === 50 ? "Default: " : ""}${PanelContext?.solarIrr} W/sqft`}
              </div>
            </div>

            {/* Panel Efficiency */}
            <div className="flex flex-col justify-center items-center gap-y-2">
              <div className="w-full flex justify-between items-center">
                <div className="text-gray-200 opacity-65 text-xs">
                  {`0%`}
                </div>
                <div className="text-gray-50">
                  Panel Efficiency
                </div>
                <div className="text-gray-200 opacity-65 text-xs">
                  {`100%`}
                </div>
              </div>
              <div className="grid grid-cols-12 justify-evenly items-center gap-x-1">
                <BadSvg fill={"#FF0000"} />
                <Slider defaultVal={20} min={0} max={100} step={1} onChange={PanelContext?.updatePanelEff} />
                <CheckSvg fill={"#4DFF00"} />
              </div>
              <div className="flex justify-center items-center text-xs text-gray-200 opacity-65">
                {`${PanelContext?.panelEff === 20 ? "Default: " : ""}${PanelContext?.panelEff}%`}
              </div>
            </div>
          </div>
          <div className="w-full border border-white border-opacity-50 flex flex-col p-3 rounded-xl">
            <div className="col-span-1 w-full p-2 flex flex-row text-white border-b border-white border-opacity-20">
              <div className="w-2/3">
                Total Panel Area (sqft)
              </div>
              <div className="w-1/3">
                {PanelContext ? `${PanelContext.totalSqFt} (${PanelContext.panels.length} panels)` : "Loading..."}
              </div>
            </div>
            <div className="col-span-1 w-full p-2 flex flex-row text-white">
              <div className="w-2/3">
                Total Energy (per 24 hours)
              </div>
              <div className="w-1/3">
                {PanelContext ? `${PanelContext.PPDJoules.toExponential(2)} Joules` : "Loading..."}
              </div>
            </div>
            <div className="col-span-1 w-full  p-2 flex flex-row text-white border-b border-white border-opacity-20">
              <div className="w-2/3">
                Total Energy (per Earth year)
              </div>
              <div className="w-1/3">
                {PanelContext ? `${PanelContext.PPYJoules.toExponential(2)} Joules` : "Loading..."}
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
            <div className="col-span-1 w-full  p-2 flex flex-row text-white border-b border-white border-opacity-20">
              <div className="w-2/3">
                Total Power (per Earth year)
              </div>
              <div className="w-1/3">
                {PanelContext ? `${PanelContext.PPYKWH} kWh` : "Loading..."}
              </div>
            </div>

            <div className="col-span-1 w-full p-2 flex flex-row text-white">
              <div className="w-2/3">
                {`% of Phoenix household usage (per 24 hrs)`}
              </div>
              <div className="w-1/3">
                {PanelContext ? `${((PanelContext.PPDKWH * 100) / 54.6).toFixed(2)}%` : "Loading..."}
              </div>
            </div>
            <div className="col-span-1 w-full p-2 flex flex-row text-white">
              <div className="w-2/3">
                {`% of Phoenix population usage (per 24 hrs)`}
              </div>
              <div className="w-1/3">
                {PanelContext ? `${((PanelContext.PPDKWH * 100) / 32_000_000).toFixed(4)}%` : "Loading..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
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

  const updateSolarIrr = useCallback((newVal: number) => {
    const power = calcEnergyProduction({
      areaInSqFt: totalSqFt,
      panelEffic: efficPercent,
      solarIrradiance: newVal
    });
    setSolarIrr(newVal);
    setPPDJoules(power.dailyEnergyJoules);
    setPPYJoules(power.annualEnergyJoules);
    setPPDKWH(power.dailyEnergyKWH);
    setPPYKWH(power.annualEnergyKWH);
  }, [efficPercent, solarIrr, panels.length, totalSqFt]);

  const updatePanelEff = useCallback((newVal: number) => {
    const power = calcEnergyProduction({
      areaInSqFt: totalSqFt,
      panelEffic: newVal,
      solarIrradiance: solarIrr
    });

    setEfficPercent(newVal);
    setPPDJoules(power.dailyEnergyJoules);
    setPPYJoules(power.annualEnergyJoules);
    setPPDKWH(power.dailyEnergyKWH);
    setPPYKWH(power.annualEnergyKWH);
  }, [efficPercent, solarIrr, panels.length, totalSqFt]);



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

  // Sigh
  const removePanel = useCallback((position: Vector3) => {
    let wasRemoved = false;
    const oldPanels = panels;

    const updatedPanels: SolarPanel[] = [];
    let newSqFt = 0;

    for (let i = 0; i < oldPanels.length; i++) {
      const panel = oldPanels[i];
      if (!panel.coordinates.equals(position)) {
        updatedPanels.push(panel);
        newSqFt += panel.getSqFt();
      } else {
        console.log("Clicked an existing panel, should return true");
        wasRemoved = true;
      }
    }

    // update all state but only if a panel was removed
    if (wasRemoved) {
      const power = calcEnergyProduction({
        areaInSqFt: newSqFt,
        panelEffic: efficPercent,
        solarIrradiance: solarIrr
      });

      setPPDJoules(power.dailyEnergyJoules);
      setPPYJoules(power.annualEnergyJoules);
      setPPDKWH(power.dailyEnergyKWH);
      setPPYKWH(power.annualEnergyKWH);
      setTotalSqFt(newSqFt);
      setPanels(updatedPanels);
    }

    return wasRemoved;
  }, [panels.length, JSON.stringify(panels), panels, totalSqFt, solarIrr, efficPercent, ppdJoules, ppyJoules]);
  // sigh

  const value: SolarPanelsContextT = useMemo(() => {
    return {
      panels,
      PPDJoules: ppdJoules,
      PPYJoules: ppyJoules,
      PPDKWH: ppdKWH,
      PPYKWH: ppyKWH,
      totalSqFt,
      solarIrr,
      panelEff: efficPercent,
      addPanel,
      removePanel,
      updatePanelEff,
      updateSolarIrr,
    };
  }, [panels.length, totalSqFt, efficPercent, updatePanelEff, updateSolarIrr, addPanel, removePanel])

  return (
    <SolarPanelsContext.Provider value={value}>
        <MainScene/>
    </SolarPanelsContext.Provider>
  )
}

export default App;

const SunSvg = ({fill}:{fill: string;}) => {
  return (
  <svg className="col-span-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"></g><g strokeLinecap="round" strokeLinejoin="round"></g><g> <path d="M18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12Z" fill={fill}></path> <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V3C12.75 3.41421 12.4142 3.75 12 3.75C11.5858 3.75 11.25 3.41421 11.25 3V2C11.25 1.58579 11.5858 1.25 12 1.25ZM4.39861 4.39861C4.6915 4.10572 5.16638 4.10572 5.45927 4.39861L5.85211 4.79145C6.145 5.08434 6.145 5.55921 5.85211 5.85211C5.55921 6.145 5.08434 6.145 4.79145 5.85211L4.39861 5.45927C4.10572 5.16638 4.10572 4.6915 4.39861 4.39861ZM19.6011 4.39887C19.894 4.69176 19.894 5.16664 19.6011 5.45953L19.2083 5.85237C18.9154 6.14526 18.4405 6.14526 18.1476 5.85237C17.8547 5.55947 17.8547 5.0846 18.1476 4.79171L18.5405 4.39887C18.8334 4.10598 19.3082 4.10598 19.6011 4.39887ZM1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H3C3.41421 11.25 3.75 11.5858 3.75 12C3.75 12.4142 3.41421 12.75 3 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12ZM20.25 12C20.25 11.5858 20.5858 11.25 21 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 22 12.75H21C20.5858 12.75 20.25 12.4142 20.25 12ZM18.1476 18.1476C18.4405 17.8547 18.9154 17.8547 19.2083 18.1476L19.6011 18.5405C19.894 18.8334 19.894 19.3082 19.6011 19.6011C19.3082 19.894 18.8334 19.894 18.5405 19.6011L18.1476 19.2083C17.8547 18.9154 17.8547 18.4405 18.1476 18.1476ZM5.85211 18.1479C6.145 18.4408 6.145 18.9157 5.85211 19.2086L5.45927 19.6014C5.16638 19.8943 4.6915 19.8943 4.39861 19.6014C4.10572 19.3085 4.10572 18.8336 4.39861 18.5407L4.79145 18.1479C5.08434 17.855 5.55921 17.855 5.85211 18.1479ZM12 20.25C12.4142 20.25 12.75 20.5858 12.75 21V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V21C11.25 20.5858 11.5858 20.25 12 20.25Z" fill={fill}></path> </g></svg>
  )
}

const MoonSvg = ({fill}:{fill: string;}) => {
  return (
    <svg className="col-span-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"></g><g strokeLinecap="round" strokeLinejoin="round"></g><g> <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill={fill}></path> </g></svg>
  )
}

const CheckSvg = ({fill}:{fill: string;}) => {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"></g><g strokeLinecap="round" strokeLinejoin="round"></g><g> <g> <path id="Vector" d="M4 12L8.94975 16.9497L19.5572 6.34326" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g> </g></svg>
  )
}

const BadSvg = ({fill}:{fill: string;}) => {
  return (
    <svg fill={fill} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><g strokeWidth="0"></g><g strokeLinecap="round" strokeLinejoin="round"></g><g><title></title><path d="M114,100l49-49a9.9,9.9,0,0,0-14-14L100,86,51,37A9.9,9.9,0,0,0,37,51l49,49L37,149a9.9,9.9,0,0,0,14,14l49-49,49,49a9.9,9.9,0,0,0,14-14Z"></path></g></svg>
  )
}
