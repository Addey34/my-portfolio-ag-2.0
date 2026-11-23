import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry,
  type Texture,
} from 'three';

/** Un écrin de lumière et de métal, limité au premier état du prologue. */
export class HeroStage {
  readonly group = new Group();
  private readonly arcs: Mesh[] = [];
  private readonly orbit = new Group();
  private readonly metal: MeshStandardMaterial;
  private readonly atmosphere = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uPresence: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uPresence; uniform float uTime;
      void main() {
        vec2 p = (vUv - .5) * 2.;
        float warm = exp(-dot((p - vec2(-.15, .22)) * vec2(1., 1.15), (p - vec2(-.15, .22)) * vec2(1., 1.15)) * 3.2);
        float cool = exp(-dot((p - vec2(.28, -.10)) * vec2(1.3, 1.2), (p - vec2(.28, -.10)) * vec2(1.3, 1.2)) * 3.8);
        // Un fin faisceau laiton balaie lentement le halo, comme un reflet de lampe.
        float sweep = pow(max(0., sin(atan(p.y, p.x) * 2. - uTime * .35)), 18.) * exp(-length(p) * 1.4);
        vec3 col = mix(vec3(.19, .25, .30), vec3(.34, .24, .13), warm) + vec3(.35, .27, .14) * sweep * .5;
        gl_FragColor = vec4(col, (warm * .31 + cool * .14 + sweep * .09) * uPresence);
      }`,
  });

  constructor(envMap: Texture | null) {
    this.metal = new MeshStandardMaterial({
      color: '#ad9064',
      metalness: 0.88,
      roughness: 0.36,
      envMap,
      envMapIntensity: 0.8,
      transparent: true,
      depthWrite: false,
    });
    // Deux segments et des index sans valeur chiffrée prolongent la lunette usinée.
    for (const angle of [0, Math.PI]) {
      const arc = new Mesh(
        new TorusGeometry(1.45, 0.014, 6, 72, Math.PI * 0.58),
        this.metal
      );
      arc.rotation.z = angle + Math.PI * 0.21;
      arc.position.z = -0.12;
      this.arcs.push(arc);
      this.group.add(arc);
    }
    // Un second anneau, plus large et contre-rotatif, donne de la profondeur au
    // cadran : ses repères portent des étincelles de laiton qui dérivent.
    const outer = new InstancedMesh(
      new BoxGeometry(0.03, 0.03, 0.03),
      this.metal,
      48
    );
    const spark = new Object3D();
    for (let i = 0; i < 48; i += 1) {
      const a = (i / 48) * Math.PI * 2 + (i % 5) * 0.09;
      const r = 1.78 + (i % 7) * 0.045;
      spark.position.set(
        Math.cos(a) * r,
        Math.sin(a) * r,
        -0.3 - (i % 4) * 0.12
      );
      spark.rotation.set(a, a * 0.5, a);
      spark.scale.setScalar(i % 6 === 0 ? 1.8 : 0.8);
      spark.updateMatrix();
      outer.setMatrixAt(i, spark.matrix);
    }
    outer.instanceMatrix.needsUpdate = true;
    this.orbit.add(outer);
    this.group.add(this.orbit);
    const ticks = new InstancedMesh(
      new BoxGeometry(0.055, 0.009, 0.012),
      this.metal,
      36
    );
    const pose = new Object3D();
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * Math.PI * 2;
      pose.position.set(Math.cos(a) * 1.405, Math.sin(a) * 1.405, -0.1);
      pose.rotation.z = a;
      pose.scale.set(i % 3 === 0 ? 1.5 : 0.7, 1, 1);
      pose.updateMatrix();
      ticks.setMatrixAt(i, pose.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
    this.group.add(ticks);
    const backdrop = new Mesh(new PlaneGeometry(6.8, 6.8), this.atmosphere);
    backdrop.position.z = -2.3;
    this.group.add(backdrop);
    this.group.traverse((object) => {
      if (object instanceof Mesh) object.layers.set(2);
    });
    this.group.visible = false;
  }

  /** `time` en secondes (0 en mouvement réduit) ; `pointerX` dans [0, 1]. */
  update(presence: number, time = 0, pointerX = 0.5): void {
    this.group.visible = presence > 0.002;
    this.metal.opacity = presence * 0.8;
    this.atmosphere.uniforms.uPresence.value = presence;
    this.atmosphere.uniforms.uTime.value = time;
    // Lunette et anneau tournent lentement en sens opposés ; le pointeur
    // ajoute un léger balayage, jamais un mouvement autonome rapide.
    this.arcs.forEach((arc, i) => {
      arc.rotation.z =
        (i === 0 ? 0 : Math.PI) +
        Math.PI * 0.21 +
        time * 0.045 +
        (pointerX - 0.5) * 0.12;
    });
    this.orbit.rotation.z = -time * 0.03 - (pointerX - 0.5) * 0.08;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
      if (object instanceof InstancedMesh) object.dispose();
    });
    this.group.removeFromParent();
    this.metal.dispose();
    this.atmosphere.dispose();
  }
}
