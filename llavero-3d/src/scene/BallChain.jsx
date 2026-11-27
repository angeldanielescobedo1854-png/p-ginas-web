import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Cadena de bolitas (ball chain) real: esferas + eslabones cilíndricos finos
 * entre cada par. Tiene una LONGITUD fija (como una cadena de verdad):
 *  - si sus extremos están a la distancia justa, queda tensa y recta
 *  - si se acercan, la cadena se afloja y cuelga (catenaria aproximada)
 * Se actualiza de forma imperativa con `ref.current.update(a, b)` para poder
 * moverla cada frame sin re-renders de React. Todo en 2 draw calls (InstancedMesh).
 */
const BEAD_RADIUS = 0.024
const PITCH = 0.064 // distancia entre centros de bolitas
const LINK_RADIUS = 0.007

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _s = new THREE.Vector3()
const _d = new THREE.Vector3()
const _c = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

const BallChain = forwardRef(function BallChain({ length, material }, ref) {
  const beads = useRef()
  const links = useRef()
  const count = Math.max(2, Math.round(length / PITCH))
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(), [])

  useImperativeHandle(ref, () => ({
    update(a, b) {
      const chord = a.distanceTo(b)
      curve.v0.copy(a)
      curve.v2.copy(b)
      curve.v1.copy(a).lerp(b, 0.5)
      // Holgura: con una parábola, largo ≈ cuerda + 2d²/(3·cuerda) → despejamos la caída d
      if (chord < length) curve.v1.y -= Math.sqrt(1.5 * chord * (length - chord))
      curve.needsUpdate = true

      const pts = curve.getSpacedPoints(count)
      for (let i = 0; i < pts.length; i++) {
        _m.makeTranslation(pts[i].x, pts[i].y, pts[i].z)
        beads.current.setMatrixAt(i, _m)
        if (i === 0) continue
        _d.subVectors(pts[i], pts[i - 1])
        const len = _d.length()
        _q.setFromUnitVectors(_up, _d.normalize())
        _s.set(1, len, 1)
        _c.addVectors(pts[i], pts[i - 1]).multiplyScalar(0.5)
        links.current.setMatrixAt(i - 1, _m.compose(_c, _q, _s))
      }
      beads.current.instanceMatrix.needsUpdate = true
      links.current.instanceMatrix.needsUpdate = true
    },
  }), [curve, count, length])

  return (
    <group>
      <instancedMesh ref={beads} args={[null, null, count + 1]} material={material} frustumCulled={false}>
        <sphereGeometry args={[BEAD_RADIUS, 20, 14]} />
      </instancedMesh>
      <instancedMesh ref={links} args={[null, null, count]} material={material} frustumCulled={false}>
        <cylinderGeometry args={[LINK_RADIUS, LINK_RADIUS, 1, 8, 1]} />
      </instancedMesh>
    </group>
  )
})

export default BallChain
