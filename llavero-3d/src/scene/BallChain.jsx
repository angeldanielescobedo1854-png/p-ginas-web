import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Cadena de bolitas (ball chain) real: esferas + eslabones cilíndricos finos
 * entre cada par, distribuidas a paso constante sobre una curva con ligera catenaria.
 * Todo con InstancedMesh: cientos de piezas en 2 draw calls.
 */
const BEAD_RADIUS = 0.026
const PITCH = 0.068 // distancia entre centros de bolitas
const LINK_RADIUS = 0.0075

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

export function makeChainCurve(start, end, sag = 0.05) {
  const a = new THREE.Vector3(...start)
  const b = new THREE.Vector3(...end)
  const mid = a.clone().lerp(b, 0.5)
  mid.y -= a.distanceTo(b) * sag // cae un poco por gravedad
  return new THREE.QuadraticBezierCurve3(a, mid, b)
}

export default function BallChain({ start, end, sag = 0.04, material }) {
  const beads = useRef()
  const links = useRef()

  const points = useMemo(() => {
    const curve = makeChainCurve(start, end, sag)
    const count = Math.max(2, Math.round(curve.getLength() / PITCH))
    return curve.getSpacedPoints(count)
  }, [start, end, sag])

  useLayoutEffect(() => {
    points.forEach((p, i) => {
      _m.makeTranslation(p.x, p.y, p.z)
      beads.current.setMatrixAt(i, _m)
    })
    beads.current.instanceMatrix.needsUpdate = true

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]
      const b = points[i + 1]
      const dir = b.clone().sub(a)
      const len = dir.length()
      _q.setFromUnitVectors(_up, dir.normalize())
      _s.set(1, len, 1)
      _m.compose(a.clone().lerp(b, 0.5), _q, _s)
      links.current.setMatrixAt(i, _m)
    }
    links.current.instanceMatrix.needsUpdate = true
  }, [points])

  return (
    <group>
      <instancedMesh ref={beads} args={[null, null, points.length]} material={material}>
        <sphereGeometry args={[BEAD_RADIUS, 20, 14]} />
      </instancedMesh>
      <instancedMesh ref={links} args={[null, null, points.length - 1]} material={material}>
        <cylinderGeometry args={[LINK_RADIUS, LINK_RADIUS, 1, 8, 1]} />
      </instancedMesh>
    </group>
  )
}
