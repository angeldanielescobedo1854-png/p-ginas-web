import { Environment, Lightformer } from '@react-three/drei'

/**
 * Iluminación de estudio 100 % procedural (sin HDR externo):
 * un Environment construido con Lightformers que actúan como softboxes.
 * El vidrio y el metal "viven" de lo que reflejan, así que aquí está el 80 % del look.
 */
export default function Studio() {
  return (
    <>
      <Environment resolution={1024} frames={1}>
        {/* Ambiente base: gris medio neutro (ni blanco plano ni negro) */}
        <color attach="background" args={['#9aa8b8']} />

        {/* Softbox cenital grande: brillo superior suave en cada globo */}
        <Lightformer form="rect" intensity={3} color="#ffffff"
          position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[10, 6, 1]} />

        {/* Strips verticales laterales: los reflejos alargados tipo product shot */}
        <Lightformer form="rect" intensity={5} color="#ffffff"
          position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[0.7, 9, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#f4f8ff"
          position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[0.5, 9, 1]} />

        {/* Ring light frontal: el brillo curvo que define el canto del vidrio */}
        <Lightformer form="ring" intensity={3} color="#ffffff"
          position={[4, 5, 7]} scale={0.9} onUpdate={(s) => s.lookAt(0, 0, 0)} />

        {/* Banderas negras (black flags): definen el contorno del vidrio con reflejos oscuros */}
        <Lightformer form="rect" intensity={1} color="#141922"
          position={[-4, 0, -3]} rotation-y={Math.PI / 3} scale={[3, 10, 1]} />
        <Lightformer form="rect" intensity={1} color="#141922"
          position={[4, 0, -3]} rotation-y={-Math.PI / 3} scale={[3, 10, 1]} />

        {/* Fill trasero cálido muy tenue + rebote frío de suelo */}
        <Lightformer form="rect" intensity={0.9} color="#ffe9d2"
          position={[0, 0, -7]} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#bcd2ea"
          position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>

      {/* Luces directas mínimas: sólo para dar forma a los charms opacos */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[3, 5, 6]} intensity={1.1} color="#fffaf2" />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} color="#d8e6ff" />
    </>
  )
}
