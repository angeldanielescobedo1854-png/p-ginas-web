import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'

/**
 * Refracción entre cristales superpuestos, sin artefactos.
 *
 * MeshTransmissionMaterial, por defecto, renderiza la escena una vez por globo
 * y los globos que se solapan se ven entre sí con buffers vacíos (manchas oscuras).
 * Aquí agrupamos los globos en capas de profundidad (0 = fondo, N = frente) y
 * renderizamos UN buffer por capa, de atrás hacia delante:
 *   capa L ve la escena + los cristales de capas < L (ya resueltos en este frame).
 * Resultado: el globo frontal refracta a los de atrás con su vidrio correcto,
 * y el coste baja de 2 pases por globo a 1 pase por capa.
 */
export const LAYERS = 3

export function useTransmissionLayers() {
  // número de hooks fijo (LAYERS = 3); tamaño = canvas * dpr, nítido a cualquier resolución
  const targets = [useFBO(), useFBO(), useFBO()]
  const glass = useRef([]) // [{ mesh, layer }]

  const register = (layer) => (mesh) => {
    glass.current = glass.current.filter((g) => g.layer !== layer || g.mesh !== mesh)
    if (mesh) glass.current.push({ mesh, layer })
  }

  useFrame(({ gl, scene, camera }) => {
    const prev = gl.getRenderTarget()
    for (let L = 0; L < LAYERS; L++) {
      for (const g of glass.current) g.mesh.visible = g.layer < L
      gl.setRenderTarget(targets[L])
      gl.render(scene, camera)
    }
    for (const g of glass.current) g.mesh.visible = true
    gl.setRenderTarget(prev)
  })

  return { buffers: targets.map((t) => t.texture), register }
}
