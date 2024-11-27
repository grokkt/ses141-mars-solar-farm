import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import { Html, OrbitControls } from "@react-three/drei";
import { Scene, Vector3, TextureLoader, BufferGeometry, SphereGeometry, Color } from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import MARS_TEXTURE from "../public/Mars.jpg";


const MarsModel = () => {
  const pos = new Vector3(0,0,0);
  const texture = useLoader(TextureLoader, MARS_TEXTURE);
  return (
    <mesh key={`mars`} position={pos}>
      {/* [Radius, Width segments, height segments] | more segments = smoother */}
      <sphereGeometry args={[1, 256, 256]} />
      <meshStandardMaterial
        map={texture}
        
        transparent={true}
        opacity={0.8}
      />
    </mesh>

  )
}


const MainScene = () => {
  return (
    <>
      <ambientLight intensity={10} />
      <Html position={[0,0,0]} className="flexxxx">
      </Html>
      <MarsModel/>
      <OrbitControls/>
    </>
  )
}

const App = () => {

  const ms = new Scene();

  return (
    <div className="flex bg-gray-800 h-screen w-screen">
      <Canvas
        className="w-screen h-screen absolute block top-0 left-0 overflow-hidden"
        style={{ width: "100vw", height: "100vh" }}
        scene={ms}
      >
        <MainScene />
      </Canvas>
    </div>
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
