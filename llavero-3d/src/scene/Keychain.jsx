import { useMemo } from 'react'
import * as THREE from 'three'
import BallChain from './BallChain.jsx'
import GlassPebble, { usePebbleGeometry, PEBBLE_HEIGHT } from './GlassPebble.jsx'
import { Planet, Heart, Star, Die, Mushroom } from './Charms.jsx'
import { useTransmissionLayers } from './TransmissionLayers.jsx'

// ---------- metal ----------
const silver = new THREE.MeshPhysicalMaterial({
  color: '#dfe3e8', metalness: 1, roughness: 0.14, clearcoat: 0.3,
})

// ---------- composición ----------
const RING_CENTER = new THREE.Vector3(0, 2.45, 0)
const RING_RADIUS = 0.36
const RING_TUBE = 0.034
const RING_YAW = 0.35 // el aro gira un poco para mostrar volumen

/** Punto sobre el eje del aro principal para un ángulo dado (0 = derecha, -90° = abajo). */
function ringPoint(deg) {
  const a = THREE.MathUtils.degToRad(deg)
  const p = new THREE.Vector3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0)
  p.applyAxisAngle(new THREE.Vector3(0, 1, 0), RING_YAW)
  return p.add(RING_CENTER)
}

/**
 * Cada globo: posición, tamaño, giro propio (yaw), capa de profundidad (0 fondo → 2 frente),
 * tipo de vidrio,
 * ángulo de enganche en el aro y el objeto que lleva dentro.
 */
const PEBBLES = [
  { pos: [-1.18, 0.72, -0.62], size: 0.95, yaw: 0.55, layer: 0, variant: 'clear', anchor: -132, Charm: Planet, charm: { rotation: [0.2, 0.25, 0.15], scale: [1.18, 1.18, 1] } },
  { pos: [1.08, 1.0, -0.85], size: 0.8, yaw: -0.6, layer: 0, variant: 'frosted', anchor: -48, Charm: Star, charm: { rotation: [0.1, -0.25, 0.2], scale: 1.22 } },
  { pos: [-0.78, -0.98, 0.18], size: 0.84, yaw: 0.35, layer: 1, variant: 'tinted', anchor: -112, Charm: Die, charm: { rotation: [0.45, 0.6, 0.1], scale: [0.74, 0.74, 0.6] } },
  { pos: [1.12, -0.7, 0.12], size: 0.9, yaw: -0.45, layer: 1, variant: 'clear', anchor: -70, Charm: Mushroom, charm: { rotation: [0.25, 0.5, -0.1], scale: [0.95, 0.95, 0.68] } },
  { pos: [0.02, 0.02, 1.02], size: 1.0, yaw: 0.12, layer: 2, variant: 'clear', anchor: -94, Charm: Heart, charm: { rotation: [0.05, 0.25, -0.12], scale: 1.05 } },
]

const Y = new THREE.Vector3(0, 1, 0)

/**
 * Orienta cada globo para que su eje vertical apunte al punto de enganche,
 * como si colgara de verdad. Devuelve también dónde termina su cadena.
 */
function solvePebble({ pos, size, yaw, anchor }) {
  const center = new THREE.Vector3(...pos)
  const ring = ringPoint(anchor)
  const dir = ring.clone().sub(center).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir)
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, yaw))

  const top = PEBBLE_HEIGHT * size
  const local = (y) => new THREE.Vector3(0, y, 0).applyQuaternion(q).add(center)

  return {
    quaternion: q,
    capPos: local(top - 0.015),
    jumpRingPos: local(top + 0.085),
    chainEnd: local(top + 0.085 + 0.055),
    ring,
  }
}

function Bail({ capPos, jumpRingPos, quaternion }) {
  // casquillo metálico pegado al vidrio + argolla pequeña
  return (
    <>
      <mesh position={capPos} quaternion={quaternion} material={silver}>
        <cylinderGeometry args={[0.07, 0.085, 0.07, 48]} />
      </mesh>
      <group position={jumpRingPos} quaternion={quaternion}>
        <mesh rotation-y={Math.PI / 2} material={silver}>
          <torusGeometry args={[0.055, 0.013, 24, 64]} />
        </mesh>
      </group>
    </>
  )
}

export default function Keychain() {
  const geometry = usePebbleGeometry()
  const { buffers, register } = useTransmissionLayers()
  const solved = useMemo(() => PEBBLES.map(solvePebble), [])
  const ringTop = useMemo(() => ringPoint(90).toArray(), [])

  return (
    <group position={[0, -0.25, 0]}>
      {/* Cadena principal que sale por arriba del encuadre */}
      <BallChain start={[0.05, 7.5, -0.3]} end={ringTop} sag={0} material={silver} />

      {/* Aro partido (split ring): dos vueltas de alambre ligeramente desfasadas */}
      <group position={RING_CENTER} rotation-y={RING_YAW}>
        <mesh material={silver}>
          <torusGeometry args={[RING_RADIUS, RING_TUBE, 48, 220]} />
        </mesh>
        <mesh material={silver} position-z={RING_TUBE * 1.9} rotation-z={0.6}>
          <torusGeometry args={[RING_RADIUS, RING_TUBE, 48, 220, Math.PI * 1.75]} />
        </mesh>
      </group>

      {PEBBLES.map((p, i) => {
        const s = solved[i]
        const { Charm } = p
        return (
          <group key={i}>
            <BallChain start={s.ring.toArray()} end={s.chainEnd.toArray()} sag={0.02} material={silver} />
            <Bail {...s} />
            <GlassPebble
              geometry={geometry}
              variant={p.variant}
              buffer={buffers[p.layer]}
              glassRef={register(p.layer)}
              position={p.pos}
              quaternion={s.quaternion}
              scale={p.size}
            >
              <Charm {...p.charm} />
            </GlassPebble>
          </group>
        )
      })}
    </group>
  )
}
