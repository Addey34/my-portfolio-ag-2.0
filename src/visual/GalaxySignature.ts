import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  TorusGeometry,
} from 'three';

/** Habillage d'instrument : les graduations sont décoratives, non scientifiques. */
export class GalaxySignature {
  private readonly group = new Group();
  private readonly materials: MeshStandardMaterial[] = [];
  private readonly time = { value: 0 };
  private readonly warm = new PointLight('#ffd296', 0, 12, 2);
  private readonly cool = new PointLight('#a5c8ef', 0, 12, 2);
  private readonly atmosphere = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uAlpha;
      void main() {
        vec2 p = (vUv - .5) * 2.;
        float core = exp(-dot(p * vec2(1., 1.28), p * vec2(1., 1.28)) * 3.4);
        float wash = exp(-dot((p - vec2(-.22, .2)) * 1.5, (p - vec2(-.22, .2)) * 1.5) * 3.);
        gl_FragColor = vec4(mix(vec3(.10, .17, .23), vec3(.31, .16, .055), core), (core * .22 + wash * .08) * uAlpha);
      }`,
  });

  install(root: Object3D): void {
    let sun: MeshStandardMaterial | undefined;
    let envMap: MeshStandardMaterial['envMap'] = null;
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return;
        if (material.envMap) envMap = material.envMap;
        if (material.name.toLowerCase().includes('sun')) sun = material;
        if (material.name.toLowerCase().includes('aged brass')) {
          material.color.set('#a88750');
          material.metalness = 0.93;
          material.roughness = 0.34;
          material.envMapIntensity = 1.15;
        }
      });
    });
    if (sun) this.finishSun(sun);
    const brass = this.metal('#9b7847', 0.34, envMap);
    const graphite = this.metal('#202934', 0.53, envMap);
    const titanium = this.metal('#9baebc', 0.28, envMap);
    const brassEdge = this.metal('#d3af70', 0.25, envMap);

    // Deux arcs massifs et leurs supports forment un même châssis mécanique.
    for (const angle of [0, Math.PI]) {
      const arc = new Mesh(
        new TorusGeometry(1.37, 0.065, 8, 80, Math.PI * 0.74),
        graphite
      );
      arc.rotation.z = angle + Math.PI * 0.13;
      arc.position.z = -0.14;
      this.group.add(arc);
      const inlay = new Mesh(
        new TorusGeometry(1.37, 0.013, 6, 80, Math.PI * 0.74),
        brassEdge
      );
      inlay.rotation.z = arc.rotation.z;
      inlay.position.z = -0.065;
      this.group.add(inlay);
    }
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const mount = new Group();
      mount.rotation.z = a;
      mount.position.set(Math.cos(a) * 1.34, Math.sin(a) * 1.34, -0.08);
      const bridge = new Mesh(new BoxGeometry(0.43, 0.14, 0.18), brass);
      const inset = new Mesh(new BoxGeometry(0.23, 0.055, 0.195), graphite);
      const bolt = new Mesh(
        new CylinderGeometry(0.065, 0.065, 0.09, 16),
        titanium
      );
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(0.12, 0, 0.12);
      mount.add(bridge, inset, bolt);
      this.group.add(mount);
    }
    // Les petits index sont usinés sur le châssis et ne représentent aucune mesure réelle.
    const ticks = new InstancedMesh(
      new BoxGeometry(0.045, 0.012, 0.012),
      brassEdge,
      48
    );
    const tickPose = new Object3D();
    for (let i = 0; i < 48; i += 1) {
      const a = (i / 48) * Math.PI * 2;
      tickPose.position.set(Math.cos(a) * 1.27, Math.sin(a) * 1.27, -0.04);
      tickPose.rotation.z = a;
      tickPose.scale.set(i % 4 === 0 ? 2.1 : 1, 1, 1);
      tickPose.updateMatrix();
      ticks.setMatrixAt(i, tickPose.matrix);
    }
    ticks.instanceMatrix.needsUpdate = true;
    this.group.add(ticks);
    const plate = new Mesh(new PlaneGeometry(5.2, 5.2), this.atmosphere);
    plate.position.z = -1.25;
    this.group.add(plate);
    this.warm.position.set(-2, 2.7, 3.6);
    this.cool.position.set(2.8, 0.7, -2);
    this.warm.layers.set(2);
    this.cool.layers.set(2);
    this.group.add(this.warm, this.cool);
    this.group.traverse((object) => {
      if (object instanceof Mesh) object.layers.set(2);
    });
    root.add(this.group);
  }

  private metal(
    color: string,
    roughness: number,
    envMap: MeshStandardMaterial['envMap']
  ): MeshStandardMaterial {
    const material = new MeshStandardMaterial({
      color,
      metalness: 0.88,
      roughness,
      envMap,
      envMapIntensity: 0.95,
      transparent: true,
    });
    this.materials.push(material);
    return material;
  }

  private finishSun(material: MeshStandardMaterial): void {
    material.color.set('#c47828');
    material.emissive.set('#f09d32');
    material.emissiveIntensity = 0.8;
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.uSolarTime = this.time;
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'varying vec3 vSolarPosition;\nvoid main() {\n vSolarPosition = position;'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `varying vec3 vSolarPosition;
        uniform float uSolarTime;
        float solarNoise(vec3 p) {
          return sin(p.x * 19. + sin(p.y * 13. + uSolarTime * .26)) *
                 sin(p.y * 21. - p.z * 9. + uSolarTime * .19) *
                 cos(p.z * 17. + p.x * 7. - uSolarTime * .23);
        }
        void main() {`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float grains = solarNoise(normalize(vSolarPosition)) * .5 + .5;
        float veins = sin(vSolarPosition.y * 34. + solarNoise(normalize(vSolarPosition) * .8) * 3. + uSolarTime * .18) * .5 + .5;
        totalEmissiveRadiance = mix(vec3(.52, .105, .012), vec3(1.0, .59, .15), grains * .7 + veins * .15) * .95;`
      );
    };
    material.needsUpdate = true;
  }

  update(
    presence: number,
    time: number,
    reduced: boolean,
    lite: boolean
  ): void {
    this.group.visible = presence > 0.002;
    this.materials.forEach((material) => {
      material.opacity = presence;
      material.depthWrite = presence >= 0.999;
    });
    this.atmosphere.uniforms.uAlpha.value = presence;
    this.warm.intensity = 24 * presence;
    this.cool.intensity = 16 * presence;
    this.time.value = reduced || lite ? 0 : time;
  }

  dispose(): void {
    // Les géométries restent libérées par le parcours global des scènes.
    this.group.traverse((object) => {
      if (object instanceof InstancedMesh) object.dispose();
    });
    this.warm.dispose();
    this.cool.dispose();
    this.group.removeFromParent();
    this.materials.forEach((material) => material.dispose());
    this.atmosphere.dispose();
  }
}
