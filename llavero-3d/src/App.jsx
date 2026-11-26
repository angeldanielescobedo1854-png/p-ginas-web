import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Studio from './scene/Studio.jsx'
import Backdrop from './scene/Backdrop.jsx'
import Keychain from './scene/Keychain.jsx'

export default function App() {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 0.3, 11], fov: 30, near: 0.1, far: 100 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
    >
      <color attach="background" args={['#dfe8f1']} />
      <Backdrop />
      <Studio />
      <Keychain />
    </Canvas>
  )
}
