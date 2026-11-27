import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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
const ROOT_Y = 0.05
const RING_CENTER = new THREE.Vector3(0, 1.95, 0)
const RING_RADIUS = 0.3
const RING_TUBE = 0.03
const RING_YAW = 0.35 // el aro gira un poco para mostrar volumen
const TOP_CHAIN_START = new THREE.Vector3(0.05, 7.5, -0.3)

// argolla de cada globo: distancias desde el borde superior del cristal
const CAP_OFFSET = -0.012
const JUMP_OFFSET = 0.075
const CHAIN_OFFSET = 0.123

// física del balanceo (muelle subamortiguado → se mece y se detiene)
const STIFFNESS = 38
const DAMPING = 4.2
const DRAG_FOLLOW = 22

/** Punto sobre el eje del aro principal para un ángulo dado (0 = derecha, -90° = abajo). */
function ringPoint(deg) {
  const a = THREE.MathUtils.degToRad(deg)
  const p = new THREE.Vector3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0)
  p.applyAxisAngle(new THREE.Vector3(0, 1, 0), RING_YAW)
  return p.add(RING_CENTER)
}

/**
 * Cada globo: posición de reposo, tamaño, giro propio (yaw), capa de profundidad
 * (0 fondo → 2 frente, debe seguir el orden en Z), tipo de vidrio,
 * ángulo de enganche en el aro y el objeto que lleva dentro.
 * Cada uno se arrastra en su propio plano Z, así nunca atraviesa a otro.
 */
const PEBBLES = [
  { pos: [-0.86, 0.32, -0.62], size: 0.7, yaw: 0.55, layer: 0, variant: 'clear', anchor: -128, Charm: Planet, charm: { rotation: [0.2, 0.25, 0.15], scale: [1.18, 1.18, 1] } },
  { pos: [0.8, 0.52, -0.9], size: 0.6, yaw: -0.6, layer: 0, variant: 'frosted', anchor: -52, Charm: Star, charm: { rotation: [0.1, -0.25, 0.2], scale: 1.22 } },
  { pos: [0.78, -0.62, -0.12], size: 0.66, yaw: -0.45, layer: 1, variant: 'clear', anchor: -72, Charm: Mushroom, charm: { rotation: [0.25, 0.5, -0.1], scale: [0.95, 0.95, 0.68] } },
  { pos: [-0.52, -0.8, 0.36], size: 0.64, yaw: 0.35, layer: 1, variant: 'tinted', anchor: -110, Charm: Die, charm: { rotation: [0.45, 0.6, 0.1], scale: [0.74, 0.74, 0.6] } },
  { pos: [0.02, -0.2, 1.0], size: 0.74, yaw: 0.12, layer: 2, variant: 'clear', anchor: -92, Charm: Heart, charm: { rotation: [0.05, 0.25, -0.12], scale: 1.05 } },
]

const Y = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()
const _yawQ = new THREE.Quaternion()
const _tmp = new THREE.Vector3()
const _prev = new THREE.Vector3()

/** Orienta el globo para que cuelgue hacia su punto de enganche. */
function orient(out, center, anchor, yaw) {
  _dir.subVectors(anchor, center).normalize()
  out.setFromUnitVectors(Y, _dir)
  return out.multiply(_yawQ.setFromAxisAngle(Y, yaw))
}

/** Punto sobre el eje vertical local del globo. */
function along(out, center, q, y) {
  return out.set(0, y, 0).applyQuaternion(q).add(center)
}

function createState(p) {
  const rest = new THREE.Vector3(...p.pos)
  const anchor = ringPoint(p.anchor)
  const top = PEBBLE_HEIGHT * p.size
  const q = orient(new THREE.Quaternion(), rest, anchor, p.yaw)
  const chainEnd = along(new THREE.Vector3(), rest, q, top + CHAIN_OFFSET)
  const dz = rest.z - anchor.z
  const maxDist = rest.distanceTo(anchor)
  return {
    rest,
    anchor,
    top,
    yaw: p.yaw,
    pos: rest.clone(),
    vel: new THREE.Vector3(),
    target: new THREE.Vector3(),
    grab: new THREE.Vector3(),
    dragging: false,
    q,
    chainLength: chainEnd.distanceTo(anchor),
    // radio máximo en el plano XY: la cadena no se estira
    maxXY: Math.sqrt(Math.max(maxDist * maxDist - dz * dz, 0.01)),
  }
}

export default function Keychain() {
  const geometry = usePebbleGeometry()
  const states = useMemo(() => PEBBLES.map(createState), [])
  const invalidate = useThree((s) => s.invalidate)

  const root = useRef()
  const topChain = useRef()
  const pebbles = useRef([])
  const caps = useRef([])
  const jumps = useRef([])
  const chains = useRef([])

  /** Coloca globo, argolla y cadena a partir del estado físico. */
  const place = (i) => {
    const s = states[i]
    const yaw = s.yaw + THREE.MathUtils.clamp(s.vel.x * 0.07, -0.5, 0.5)
    orient(s.q, s.pos, s.anchor, yaw)
    const g = pebbles.current[i]
    g.position.copy(s.pos)
    g.quaternion.copy(s.q)
    along(caps.current[i].position, s.pos, s.q, s.top + CAP_OFFSET)
    caps.current[i].quaternion.copy(s.q)
    along(jumps.current[i].position, s.pos, s.q, s.top + JUMP_OFFSET)
    jumps.current[i].quaternion.copy(s.q)
    chains.current[i].update(s.anchor, along(_tmp, s.pos, s.q, s.top + CHAIN_OFFSET))
  }

  useLayoutEffect(() => {
    topChain.current.update(TOP_CHAIN_START, ringPoint(90))
    states.forEach((_, i) => place(i))
  }, [])

  // Física. Se registra ANTES que las capas de transmisión para que el vidrio
  // refracte la posición de este mismo frame (sin retraso al arrastrar).
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30)
    let active = false
    states.forEach((s, i) => {
      _prev.copy(s.pos)
      if (s.dragging) {
        s.pos.lerp(s.target, 1 - Math.exp(-DRAG_FOLLOW * dt))
      } else {
        s.vel.addScaledVector(_tmp.subVectors(s.rest, s.pos), STIFFNESS * dt)
        s.vel.multiplyScalar(Math.exp(-DAMPING * dt))
        s.pos.addScaledVector(s.vel, dt)
      }
      s.pos.z = s.rest.z

      // la cadena tiene largo fijo: no se puede alejar más del aro
      _tmp.set(s.pos.x - s.anchor.x, s.pos.y - s.anchor.y, 0)
      const r = _tmp.length()
      if (r > s.maxXY) {
        _tmp.multiplyScalar(1 / r)
        s.pos.x = s.anchor.x + _tmp.x * s.maxXY
        s.pos.y = s.anchor.y + _tmp.y * s.maxXY
        const outward = s.vel.dot(_tmp)
        if (outward > 0) s.vel.addScaledVector(_tmp, -outward)
      }
      if (s.dragging && dt > 0) s.vel.subVectors(s.pos, _prev).divideScalar(dt)

      const moving = s.dragging || s.vel.lengthSq() > 1e-7 || s.pos.distanceToSquared(s.rest) > 1e-8
      if (moving) {
        active = true
        place(i)
      } else if (!s.pos.equals(s.rest)) {
        s.pos.copy(s.rest)
        s.vel.set(0, 0, 0)
        place(i)
      }
    })
    if (active) invalidate()
  })

  const { buffers, register } = useTransmissionLayers()

  // ---------- arrastre ----------
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hit = useMemo(() => new THREE.Vector3(), [])

  const pointerOnPlane = (e, s) => {
    plane.constant = -(s.rest.z + root.current.position.z)
    if (!e.ray.intersectPlane(plane, hit)) return null
    return root.current.worldToLocal(hit)
  }

  const release = (i) => (e) => {
    const s = states[i]
    if (!s.dragging) return
    e.target.releasePointerCapture?.(e.pointerId)
    s.dragging = false
    document.body.style.cursor = 'grab'
    invalidate()
  }

  const handlers = (i) => ({
    onPointerOver: (e) => {
      e.stopPropagation()
      if (!states.some((s) => s.dragging)) document.body.style.cursor = 'grab'
    },
    onPointerOut: () => {
      if (!states.some((s) => s.dragging)) document.body.style.cursor = ''
    },
    onPointerDown: (e) => {
      e.stopPropagation()
      const s = states[i]
      const p = pointerOnPlane(e, s)
      if (!p) return
      e.target.setPointerCapture(e.pointerId)
      s.dragging = true
      s.grab.subVectors(s.pos, p)
      s.target.copy(s.pos)
      document.body.style.cursor = 'grabbing'
      invalidate()
    },
    onPointerMove: (e) => {
      const s = states[i]
      if (!s.dragging) return
      const p = pointerOnPlane(e, s)
      if (p) s.target.addVectors(p, s.grab)
      invalidate()
    },
    onPointerUp: release(i),
    onPointerCancel: release(i),
  })

  return (
    <group ref={root} position={[0, ROOT_Y, 0]}>
      {/* Cadena principal que sale por arriba del encuadre */}
      <BallChain ref={topChain} length={TOP_CHAIN_START.distanceTo(ringPoint(90))} material={silver} />

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
        const { Charm } = p
        return (
          <group key={i}>
            <BallChain ref={(r) => (chains.current[i] = r)} length={states[i].chainLength} material={silver} />

            {/* casquillo metálico pegado al vidrio + argolla pequeña */}
            <mesh ref={(r) => (caps.current[i] = r)} material={silver}>
              <cylinderGeometry args={[0.058, 0.07, 0.06, 48]} />
            </mesh>
            <group ref={(r) => (jumps.current[i] = r)}>
              <mesh rotation-y={Math.PI / 2} material={silver}>
                <torusGeometry args={[0.046, 0.011, 24, 64]} />
              </mesh>
            </group>

            <GlassPebble
              groupRef={(r) => (pebbles.current[i] = r)}
              glassRef={register(p.layer)}
              geometry={geometry}
              variant={p.variant}
              buffer={buffers[p.layer]}
              scale={p.size}
              {...handlers(i)}
            >
              <Charm {...p.charm} />
            </GlassPebble>
          </group>
        )
      })}
    </group>
  )
}
