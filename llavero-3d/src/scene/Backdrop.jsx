import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Fondo físico detrás del llavero. No es sólo decoración:
 * el vidrio refracta lo que tiene detrás, así que un degradado suave
 * con un "halo" de luz le da al cristal gradientes ricos en lugar de un gris plano.
 */
export default function Backdrop() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024
    c.height = 1024
    const g = c.getContext('2d')

    const lin = g.createLinearGradient(0, 0, 0, 1024)
    lin.addColorStop(0, '#7fa6cc')
    lin.addColorStop(0.55, '#cbdbea')
    lin.addColorStop(1, '#eef1f4')
    g.fillStyle = lin
    g.fillRect(0, 0, 1024, 1024)

    // Halo luminoso detrás del objeto (centro óptico de la composición)
    const rad = g.createRadialGradient(560, 470, 40, 560, 470, 520)
    rad.addColorStop(0, 'rgba(255,255,255,0.85)')
    rad.addColorStop(0.45, 'rgba(255,255,255,0.25)')
    rad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = rad
    g.fillRect(0, 0, 1024, 1024)

    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [])

  return (
    <mesh position={[0, 0.3, -9]}>
      <planeGeometry args={[34, 24]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
