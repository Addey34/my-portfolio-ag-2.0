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
  private readonly metal: MeshStandardMaterial;
  private readonly atmosphere = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uPresence: { value: 0 } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uPresence;
      void main() {
        vec2 p = (vUv - .5) * 2.;
        float warm = exp(-dot((p - vec2(-.15, .22)) * vec2(1., 1.15), (p - vec2(-.15, .22)) * vec2(1., 1.15)) * 3.2);
        float cool = exp(-dot((p - vec2(.28, -.10)) * vec2(1.3, 1.2), (p - vec2(.28, -.10)) * vec2(1.3, 1.2)) * 3.8);
        gl_FragColor = vec4(mix(vec3(.19, .25, .30), vec3(.34, .24, .13), warm), (warm * .31 + cool * .14) * uPresence);
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
      this.group.add(arc);
    }
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

  update(presence: number): void {
    this.group.visible = presence > 0.002;
    this.metal.opacity = presence * 0.8;
    this.atmosphere.uniforms.uPresence.value = presence;
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
