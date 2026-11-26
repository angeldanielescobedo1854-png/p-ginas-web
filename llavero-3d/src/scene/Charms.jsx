import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

/**
 * Objetos miniatura dentro de cada globo.
 * Formas simples, bordes biselados y materiales "de juguete premium":
 * cerámica satinada, laca brillante, oro pulido. Nada de texturas ruidosas.
 */

// ---------- materiales compartidos ----------
export const materials = {
  ceramicWhite: new THREE.MeshPhysicalMaterial({
    color: '#f6f3ee', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.3,
  }),
  ceramicInk: new THREE.MeshPhysicalMaterial({
    color: '#16181d', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15,
  }),
  lacquerRed: new THREE.MeshPhysicalMaterial({
    color: '#e3343c', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06,
  }),
  softCoral: new THREE.MeshPhysicalMaterial({
    color: '#ff8a6b', roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: '#ffd2c2',
  }),
  cobalt: new THREE.MeshPhysicalMaterial({
    color: '#2f5bd8', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08,
  }),
  gold: new THREE.MeshPhysicalMaterial({
    color: '#f0c46a', metalness: 1, roughness: 0.3,
  }),
}

// ---------- 1. Planeta con anillo ----------
export function Planet(props) {
  return (
    <group {...props}>
      <mesh material={materials.softCoral}>
        <sphereGeometry args={[0.26, 96, 64]} />
      </mesh>
      <mesh material={materials.gold} rotation={[-0.5, 0.4, 0.3]} scale={[1, 1, 0.18]}>
        <torusGeometry args={[0.42, 0.035, 32, 160]} />
      </mesh>
    </group>
  )
}

// ---------- 2. Corazón biselado ----------
function useHeartGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, -0.42)
    s.bezierCurveTo(-0.1, -0.3, -0.5, -0.05, -0.5, 0.18)
    s.bezierCurveTo(-0.5, 0.4, -0.32, 0.5, -0.2, 0.5)
    s.bezierCurveTo(-0.08, 0.5, 0, 0.42, 0, 0.32)
    s.bezierCurveTo(0, 0.42, 0.08, 0.5, 0.2, 0.5)
    s.bezierCurveTo(0.32, 0.5, 0.5, 0.4, 0.5, 0.18)
    s.bezierCurveTo(0.5, -0.05, 0.1, -0.3, 0, -0.42)
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.06, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.07,
      bevelSegments: 16, curveSegments: 64,
    })
    g.center()
    g.computeVertexNormals()
    return g
  }, [])
}

export function Heart(props) {
  const geometry = useHeartGeometry()
  return <mesh geometry={geometry} material={materials.lacquerRed} {...props} />
}

// ---------- 3. Estrella de oro ----------
function useStarGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape()
    const spikes = 5
    for (let i = 0; i <= spikes * 2; i++) {
      const r = i % 2 === 0 ? 0.5 : 0.22
      const a = (i / (spikes * 2)) * Math.PI * 2 + Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)
    }
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.04, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.05,
      bevelSegments: 12, curveSegments: 1,
    })
    g.center()
    g.computeVertexNormals()
    return g
  }, [])
}

export function Star(props) {
  const geometry = useStarGeometry()
  return <mesh geometry={geometry} material={materials.gold} {...props} />
}

// ---------- 4. Dado de cerámica ----------
const PIP = 0.052
const pipFaces = [
  // cara frontal (+z): 3
  ...[[-0.12, 0.12], [0, 0], [0.12, -0.12]].map(([x, y]) => [[x, y, 0.25], [0, 0, 0]]),
  // cara superior (+y): 1
  [[0, 0.25, 0], [Math.PI / 2, 0, 0]],
  // cara derecha (+x): 2
  ...[[-0.11, 0.11], [0.11, -0.11]].map(([z, y]) => [[0.25, y, z], [0, Math.PI / 2, 0]]),
]

export function Die(props) {
  return (
    <group {...props}>
      <RoundedBox args={[0.5, 0.5, 0.5]} radius={0.09} smoothness={8} material={materials.ceramicWhite} />
      {pipFaces.map(([pos, rot], i) => (
        <mesh key={i} position={pos} rotation={rot} scale={[1, 1, 0.35]} material={materials.ceramicInk}>
          <sphereGeometry args={[PIP, 32, 16]} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- 5. Hongo ----------
function useMushroomStem() {
  return useMemo(() => {
    const pts = [
      [0.0, -0.32], [0.13, -0.32], [0.15, -0.29], [0.135, -0.15],
      [0.11, 0.0], [0.1, 0.06], [0.0, 0.06],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const g = new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(48), 96)
    g.computeVertexNormals()
    return g
  }, [])
}

// puntos blancos distribuidos sobre la cúpula (coordenadas esféricas)
const dots = [
  [0.0, 0.0], [0.62, 0.0], [0.62, 2.1], [0.62, 4.2], [1.05, 1.05], [1.05, 3.15], [1.05, 5.25],
]

export function Mushroom(props) {
  const stem = useMushroomStem()
  return (
    <group {...props}>
      <mesh geometry={stem} material={materials.ceramicWhite} />
      <group position={[0, 0.02, 0]} scale={[1, 0.72, 1]}>
        <mesh material={materials.lacquerRed}>
          <sphereGeometry args={[0.36, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {/* base de la cúpula */}
        <mesh rotation-x={Math.PI / 2} material={materials.ceramicWhite}>
          <circleGeometry args={[0.36, 96]} />
        </mesh>
        {dots.map(([theta, phi], i) => {
          const n = new THREE.Vector3().setFromSphericalCoords(1, theta, phi)
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
          return (
            <mesh key={i} position={n.clone().multiplyScalar(0.355)} quaternion={q}
              scale={[1, 1, 0.3]} material={materials.ceramicWhite}>
              <sphereGeometry args={[i === 0 ? 0.075 : 0.058, 32, 16]} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
