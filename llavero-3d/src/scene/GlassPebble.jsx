import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshTransmissionMaterial } from '@react-three/drei'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Geometría del "globo" de cristal: un guijarro tipo lente.
 * Partimos de una esfera muy subdividida y la deformamos:
 *  - alargada en Y y ligeramente más estrecha arriba (forma de huevo/gota)
 *  - aplanada en Z con una curva potencia → caras casi planas y canto redondo (look "pillow")
 * Luego se sueldan vértices y se recalculan normales para que no quede costura.
 */
export const PEBBLE_HEIGHT = 1.12 // semialto relativo al radio

export function usePebbleGeometry() {
  return useMemo(() => {
    let g = new THREE.SphereGeometry(1, 160, 120)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      const taper = 1 - 0.09 * v.y // más estrecho arriba
      const z = Math.sign(v.z) * Math.pow(Math.abs(v.z), 0.72) * 0.3
      p.setXYZ(i, v.x * taper, v.y * PEBBLE_HEIGHT, z)
    }
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    g = mergeVertices(g, 1e-5)
    g.computeVertexNormals()
    return g
  }, [])
}

const GLASS = {
  clear: { roughness: 0.03, color: '#ffffff', attenuationColor: '#f1f7ff', anisotropicBlur: 0.08 },
  frosted: { roughness: 0.22, color: '#fbfdff', attenuationColor: '#e9f1fb', anisotropicBlur: 0.45 },
  tinted: { roughness: 0.05, color: '#eef5ff', attenuationColor: '#bcd6f5', anisotropicBlur: 0.1 },
}

/**
 * `buffer`: textura de lo que hay DETRÁS del globo (la genera TransmissionLayers).
 * `glassRef`: registra la malla para que el sistema de capas pueda ocultarla en sus pases.
 */
export default function GlassPebble({ geometry, variant = 'clear', buffer, glassRef, groupRef, children, ...props }) {
  const v = GLASS[variant]
  return (
    <group ref={groupRef} {...props}>
      <mesh ref={glassRef} geometry={geometry} renderOrder={1}>
        <MeshTransmissionMaterial
          buffer={buffer}
          samples={12}
          // óptica
          transmission={1}
          thickness={0.5}
          ior={1.5}
          chromaticAberration={0.05}
          distortion={0.04}
          distortionScale={0.25}
          temporalDistortion={0}
          attenuationDistance={2.2}
          // superficie
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={1.15}
          {...v}
        />
      </mesh>
      {/* Objeto atrapado dentro del cristal */}
      {children}
    </group>
  )
}
