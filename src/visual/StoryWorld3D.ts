import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  Box3,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DataTexture,
  DirectionalLight,
  DodecahedronGeometry,
  DoubleSide,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Object3D,
  Path,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  Shape,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  SphereGeometry,
  SpotLight,
  Texture,
  TubeGeometry,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { prefersReducedMotion } from '@/core/motion';
import { clockHandAngles } from '@/visual/clockHands';
import type { VisualScene, VisualState } from '@/visual/types';

const NODE_COUNT = 24;
const TAU = Math.PI * 2;
const PROJECT_SCENES: VisualScene[] = ['galaxy', 'ludora', 'magnotes'];
/** Centres des quatre modules du cube (x, y), dans l'ordre des familles. */
const CUBE_CENTERS: ReadonlyArray<readonly [number, number]> = [
  [-0.5, 0.5],
  [0.5, 0.5],
  [-0.5, -0.5],
  [0.5, -0.5],
];
/** Hauteur unique de l'objet sur mobile, hors prologue. */
const COMPACT_ANCHOR_Y = 2.5;
const SCENE_ORDER: readonly VisualScene[] = [
  'identity',
  'stack',
  'solutions',
  'selection',
  'galaxy',
  'ludora',
  'magnotes',
  'studies',
  'contact',
];
const STACK_BURST_OFFSETS: ReadonlyArray<
  readonly [number, number, number, number]
> = [
  [0.68, 0.25, 0.22, -0.22],
  [-0.55, 0.45, -0.13, 0.25],
  [-0.1, 0.24, 0.28, -0.38],
  [0.62, -0.46, -0.22, 0.41],
];
const CLOCK_BREAK_OFFSETS: ReadonlyArray<
  readonly [number, number, number, number]
> = [
  [-1.3, 1.12, 0.72, -0.32],
  [1.12, 1.14, 1.14, 0.36],
  [-1.22, -1.1, 0.18, 0.27],
  [1.18, -1.12, -0.48, -0.31],
];
const MAGNOTES_LOOSE_CENTERS: ReadonlyArray<readonly [number, number, number]> =
  [
    [-1.8, 0.7, -0.5],
    [-1.1, -1.15, 0.3],
    [1.85, 0.45, 0.6],
    [-0.4, 1.65, -0.15],
    [1.1, -1.3, 0.1],
    [0.85, 1.55, -0.6],
  ];
const IDENTITY_POINTS: ReadonlyArray<readonly [number, number]> = [
  [-2.25, -1.45],
  [-1.93, -0.48],
  [-1.6, 0.49],
  [-1.27, 1.45],
  [-0.94, 0.49],
  [-0.61, -0.48],
  [-0.28, -1.45],
  [-1.94, -0.35],
  [-1.61, -0.35],
  [-1.28, -0.35],
  [-0.95, -0.35],
  [-0.62, -0.35],
  [2.15, 1.18],
  [1.62, 1.5],
  [1.03, 1.4],
  [0.54, 1.03],
  [0.25, 0.42],
  [0.25, -0.42],
  [0.56, -1.08],
  [1.13, -1.45],
  [1.77, -1.43],
  [2.28, -1.08],
  [2.3, -0.31],
  [1.43, -0.31],
];
const IDENTITY_STROKES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 2, 3],
  [3, 4, 5, 6],
  [7, 8, 9, 10, 11],
  [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
];
// GLTFLoader remplace les espaces et les barres des noms Blender par des tirets bas.
const CLOCK_STROKE_MESHES: Readonly<Record<string, ReadonlyArray<number>>> = {
  Bezel__outer_polished_edge: [0, 3, 6],
  Bezel__cyan_inner_lip: IDENTITY_STROKES[3],
  Dial__circular_minute_track: IDENTITY_STROKES[2],
};
type Point = { x: number; y: number };
type Crossing =
  | 'identity-stack'
  | 'stack-solutions'
  | 'solutions-selection'
  | 'selection-galaxy'
  | 'galaxy-ludora'
  | 'ludora-magnotes'
  | 'magnotes-studies'
  | 'studies-contact'
  | null;
type MorphPair = {
  from: Object3D;
  to: Object3D;
  spin: number;
  moveFrom: boolean;
  /** Échelle finale de la pièce sortante (0,5 par défaut : elle se resserre). */
  end: number;
  /** Échelle de départ de la pièce entrante (0,45 par défaut). */
  begin: number;
};
type Feature = {
  group: Group;
  materials: Array<
    MeshBasicMaterial | MeshStandardMaterial | LineBasicMaterial
  >;
  opacities: number[];
  partIndices: number[];
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const createFilamentGlowTexture = (): DataTexture => {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot(x - 31.5, y - 31.5) / 31.5;
      const falloff = Math.max(0, 1 - radius);
      const offset = (y * size + x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(255 * falloff ** 3);
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
};

/** Un seul monde WebGL traverse tout le récit, piloté par VisualDirector. */
export class StoryWorld3D {
  private readonly renderer: WebGLRenderer | null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 1, 0.1, 100);
  private readonly world = new Group();
  private readonly reduced = prefersReducedMotion();
  private readonly legacyMorphEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('scene-lab');
  private readonly pointer: Point = { x: 0.72, y: 0.42 };
  private readonly targetPointer: Point = { x: 0.72, y: 0.42 };
  private readonly positions = Array.from(
    { length: NODE_COUNT },
    () => new Vector3()
  );
  private readonly origins = Array.from(
    { length: NODE_COUNT },
    () => new Vector3()
  );
  private readonly features = new Map<VisualScene, Feature>();
  private readonly clockBreakPivots: Object3D[] = [];
  private clockBreakMechanism: Object3D | null = null;
  private stackCube: Object3D | null = null;
  private readonly stackCubePivots: Object3D[] = [];
  private readonly stackCubeCore: Object3D[] = [];
  private readonly stackCubeRings: { object: Object3D; base: Euler }[] = [];
  private stackCubeSparks: Points | null = null;
  private readonly selectionSeals: { pivot: Object3D; base: Vector3 }[] = [];
  private readonly galaxyRingSpins: Object3D[] = [];
  /** Scènes dont la forme vient d'un GLB fini : les anciennes animations par pièce les ignorent. */
  private readonly craftedScenes = new Set<VisualScene>();
  private readonly craftedNodes = new Map<string, Object3D>();
  /** Poses de repos des pièces déplacées par la métamorphose, rétablies à chaque image. */
  private readonly morphRest = new Map<
    Object3D,
    { position: Vector3; scale: Vector3; rotation: Euler }
  >();
  private readonly craftedBase = new Map<string, Vector3>();
  private readonly solutionsMonolithPivots: Object3D[] = [];
  private readonly solutionsMonolithBase: Vector3[] = [];
  private readonly identityStrokeOrigins: Vector3[] = [];
  private readonly medallion = new Group();
  private readonly medallionContent = new Group();
  private readonly clock = new Group();
  private readonly pendantTrim = new Group();
  private readonly lampSwing = new Group();
  private readonly bulbLight = new PointLight('#ffc08a', 30, 11, 2);
  private readonly reflectorBounce = new SpotLight(
    '#ffd3a1',
    22,
    11,
    0.69,
    0.94,
    2
  );
  private readonly filamentGlowTexture = createFilamentGlowTexture();
  private readonly filamentGlowMaterial = new SpriteMaterial({
    map: this.filamentGlowTexture,
    color: '#ffb16d',
    transparent: true,
    opacity: 0.45,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  private readonly filamentGlow = new Sprite(this.filamentGlowMaterial);
  private filamentMaterial: MeshStandardMaterial | null = null;
  private readonly clockHands: Object3D[] = [];
  private readonly clockMelt = { value: 0 };
  private readonly clockMorph = { value: 0 };
  private readonly clockDirect = { value: 0 };
  private readonly clockMorphMaterials = new Set<MeshStandardMaterial>();
  private readonly clockHousingMaterials = new Set<MeshStandardMaterial>();
  private readonly clockMorphColors = new Map<
    MeshStandardMaterial,
    { start: Color; end: Color }
  >();
  private readonly clockMaterials: MeshStandardMaterial[] = [];
  private readonly pendantMaterials: MeshStandardMaterial[] = [];
  private readonly pendantOpacities = new Map<MeshStandardMaterial, number>();
  private metalReflection: WebGLRenderTarget | null = null;
  private readonly pendantFinishes = new Map<
    MeshStandardMaterial,
    { color: Color; metalness: number; roughness: number }
  >();
  private readonly clockFinishes = new Map<
    MeshStandardMaterial,
    { color: Color; metalness: number; roughness: number }
  >();
  private readonly moltenMetalColor = new Color('#92b8cc');
  private readonly lampMaterials: MeshStandardMaterial[] = [];
  private readonly clockOpacities: number[] = [];
  private readonly clockTransparency: boolean[] = [];
  private readonly clockDepthWrite: boolean[] = [];
  private readonly liquidReveals = new Map<
    MeshStandardMaterial,
    { value: number }
  >();
  private clockReady = false;
  private lampReady = false;
  private destroyed = false;
  // Tous les GLB passent par ce gestionnaire : quand la file est vide, on précompile.
  private readonly loadingManager = new LoadingManager(() =>
    this.queueWarmup()
  );
  private warmupTimers: number[] = [];
  private readonly loadQueue: Array<{
    url: string;
    load: () => Promise<void>;
  }> = [];
  private loadQueueBusy = false;
  private loadQueueStarted = false;
  private programsReady = false;
  private primed = false;

  /** Rendu autorisé ; prévient l'interface (écran d'attente) une seule fois. */
  private markReady(): void {
    const first = !this.programsReady;
    this.programsReady = true;
    if (first) window.dispatchEvent(new Event('world-ready'));
  }
  private safetyTimer = 0;
  private readonly liquidUniforms = {
    flow: { value: 0 },
    melt: { value: 0 },
  };
  private readonly liquidMaterial = new MeshPhysicalMaterial({
    color: '#b4dbe9',
    emissive: '#173b6b',
    emissiveIntensity: 0.4,
    metalness: 0.48,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private readonly liquid = new Mesh(
    new SphereGeometry(1, 72, 48),
    this.liquidMaterial
  );
  private identityRoughness: DataTexture | null = null;
  private identityAlbedo: DataTexture | null = null;
  private readonly onResize = () => this.resize();
  private readonly onPointerMove = (event: PointerEvent) => {
    this.targetPointer.x = event.clientX / Math.max(innerWidth, 1);
    this.targetPointer.y = event.clientY / Math.max(innerHeight, 1);
  };
  private readonly onPointerLeave = () => {
    this.targetPointer.x = 0.72;
    this.targetPointer.y = 0.42;
  };
  private readonly contactDisclosure =
    document.querySelector<HTMLDetailsElement>('.contact__disclosure');
  private readonly onContactToggle = () => this.render(0);
  private contactOffset = 0;
  private state: VisualState | null = null;
  private activeScene: VisualScene = 'identity';
  private previousScene: VisualScene = 'identity';
  private lastFrame = 0;
  private paused = false;
  private interactive = false;
  private animated = true;
  private liteMode = false;
  private compact = false;
  private heroTablet = false;
  private desktopFormCenterX = 0;
  private readonly lampLab = { x: 0, y: 0, power: 1 };
  private lastStaticScene: VisualScene | null = null;
  private lastStaticClockPhase: boolean | null = null;
  private lastMagnotesProgress = 0.72;

  constructor(private readonly canvas: HTMLCanvasElement) {
    let renderer: WebGLRenderer | null = null;
    try {
      renderer = new WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      // Le contenu HTML reste complet si WebGL n'est pas disponible.
      canvas.hidden = true;
    }
    this.renderer = renderer;
    if (!renderer) {
      return;
    }

    // Lire le journal de compilation est synchrone : chaque nouveau programme gèle alors
    // le fil principal le temps que le GPU compile. En production on s'en passe (les
    // erreurs de shader restent visibles en développement).
    renderer.debug.checkShaderErrors =
      import.meta.env.DEV &&
      !new URLSearchParams(location.search).has('no-shader-log');
    renderer.setClearColor('#000000', 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    this.metalReflection = this.createMetalReflection(renderer);
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);
    // Les calques 1 et 2 isolent la lampe et l'horloge des éclairages généraux.
    this.camera.layers.enable(1);
    this.camera.layers.enable(2);
    this.scene.add(new AmbientLight('#8ba9dd', 0.7));
    const key = new PointLight('#a9c9ff', 26, 22);
    key.position.set(-3, 5, 7);
    this.scene.add(key);
    const rim = new PointLight('#b49cb8', 12, 18);
    rim.position.set(4, -2, -2);
    this.scene.add(rim);

    this.scene.add(this.world);
    this.world.add(this.medallion);
    this.medallion.add(this.medallionContent, this.clock);
    this.clock.add(this.pendantTrim);
    this.world.add(this.liquid);
    this.liquid.visible = false;
    this.liquid.castShadow = true;
    this.liquid.receiveShadow = true;
    this.liquidMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uFlow = this.liquidUniforms.flow;
      shader.uniforms.uMelt = this.liquidUniforms.melt;
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        'uniform float uFlow;\nuniform float uMelt;\nvoid main() {'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(position);
         float ripple = sin(position.y * 8.0 + position.x * 3.0 + uFlow * 4.0)
           * cos(position.x * 6.0 + position.z * 4.0 - uFlow * 2.7);
         float fold = sin(atan(position.y, position.x) * 5.0 + uFlow * 2.0);
         transformed += normal * (ripple * 0.13 + fold * 0.075) * uMelt;
         transformed.x += sin(position.y * 3.0 + uFlow * 2.2) * 0.14 * uMelt;`
      );
    };
    this.buildFeatures();
    this.loadClockBreakup();
    this.loadStackCube();
    this.loadSolutionsMonolith();
    this.loadSelectionSeals();
    this.loadGalaxyAstrolabe();
    this.loadLudoraDice();
    this.loadMagnotesGrimoire();
    this.loadStudiesArtifacts();
    this.loadContactLetter();
    // Filet de sécurité : le rendu reprend quoi qu'il arrive après 8 s.
    this.safetyTimer = window.setTimeout(() => this.markReady(), 8000);
    window.addEventListener('resize', this.onResize, { passive: true });
    this.contactDisclosure?.addEventListener('toggle', this.onContactToggle);
    if (!this.reduced) this.setInteractive(true);
    this.resize();
    this.render(0);
  }

  getPointer(): Point {
    return this.pointer;
  }

  setVisualState(state: VisualState): void {
    if (state.scene !== this.activeScene) {
      this.positions.forEach((position, index) =>
        this.origins[index].copy(position)
      );
      this.previousScene = this.activeScene;
      this.activeScene = state.scene;
    }
    this.state = state;
    // L'état est mutable : mémoriser la phase, pas la référence partagée.
    const clockPhase =
      state.scene === 'identity' && state.openingVariant === 'medallion'
        ? state.clockAgProgress >= 0.5
        : null;
    if (
      (this.reduced || !this.animated) &&
      (this.lastStaticScene !== state.scene ||
        this.lastStaticClockPhase !== clockPhase)
    ) {
      this.lastStaticScene = state.scene;
      this.lastStaticClockPhase = clockPhase;
      this.render(0);
    }
  }

  setScene(_scene: VisualScene, _accent: string): void {
    // La scène et l'accent sont lus ensemble depuis l'état visuel partagé.
  }

  setLabLamp(settings: { x: number; y: number; power: number }): void {
    this.lampLab.x = settings.x;
    this.lampLab.y = settings.y;
    this.lampLab.power = settings.power;
    this.resize();
  }

  getRenderDiagnostics(): {
    calls: number;
    triangles: number;
    geometries: number;
    textures: number;
    pixelRatio: number;
  } | null {
    if (!this.renderer) return null;
    const info = this.renderer.info;
    return {
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.canvas.style.visibility = paused ? 'hidden' : '';
    if (!paused) {
      this.lastFrame = 0;
      this.render(0);
    }
  }

  setAnimated(on: boolean): void {
    this.animated = on;
    this.lastStaticScene = null;
    this.lastFrame = 0;
    this.render(0);
  }

  setLiteMode(on: boolean): void {
    this.liteMode = on;
    this.resize();
  }

  setInteractive(on: boolean): void {
    if (this.reduced || on === this.interactive) return;
    this.interactive = on;
    if (on) {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        'pointerleave',
        this.onPointerLeave,
        { passive: true }
      );
    } else {
      window.removeEventListener('pointermove', this.onPointerMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        this.onPointerLeave
      );
      this.onPointerLeave();
    }
  }

  render(time: number): void {
    this.restoreMorph();
    if (!this.renderer || this.paused) return;
    const state = this.state;
    const scene = state?.scene ?? 'identity';
    const medallionOpening = state?.openingVariant === 'medallion';
    const directOpening =
      state?.openingVariant === 'direct' &&
      (scene === 'identity' || scene === 'stack') &&
      !this.reduced;
    const openingProgress = smooth(state?.openingProgress ?? 0);
    const clockVisible = medallionOpening
      ? scene === 'identity' && (state?.clockAgProgress ?? 0) >= 0.5
      : directOpening
        ? openingProgress < 0.88
        : scene === 'identity' && (state?.clockAgProgress ?? 0) < 0.92;
    const interval =
      this.reduced || !this.animated
        ? 1000
        : this.liteMode
          ? 50
          : clockVisible
            ? 0
            : 1000 / 45;
    if (time !== 0 && time - this.lastFrame < interval) return;
    this.lastFrame = time;
    const clockAgProgress = smooth(state?.clockAgProgress ?? 0);
    const identityStackProgress = clamp01(state?.identityStackProgress ?? 0);
    const stackSolutionsProgress = clamp01(state?.stackSolutionsProgress ?? 0);
    const solutionsSelectionProgress = clamp01(
      state?.solutionsSelectionProgress ?? 0
    );
    const selectionGalaxyProgress = clamp01(
      state?.selectionGalaxyProgress ?? 0
    );
    const galaxyLudoraProgress = clamp01(state?.galaxyLudoraProgress ?? 0);
    const ludoraMagnotesProgress = clamp01(state?.ludoraMagnotesProgress ?? 0);
    const magnotesStudiesProgress = clamp01(
      state?.magnotesStudiesProgress ?? 0
    );
    const studiesContactProgress = clamp01(state?.studiesContactProgress ?? 0);
    const galaxyCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'galaxy' && galaxyLudoraProgress > 0.001) ||
        (scene === 'ludora' && galaxyLudoraProgress < 0.999));
    const cardCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'ludora' && ludoraMagnotesProgress > 0.001) ||
        (scene === 'magnotes' && ludoraMagnotesProgress < 0.999));
    const identityCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'identity' && identityStackProgress > 0.001) ||
        (scene === 'stack' && identityStackProgress < 0.999));
    const stackCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'stack' && stackSolutionsProgress > 0.001) ||
        (scene === 'solutions' && stackSolutionsProgress < 0.999));
    const solutionsCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'solutions' && solutionsSelectionProgress > 0.001) ||
        (scene === 'selection' && solutionsSelectionProgress < 0.999));
    const selectionCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'selection' && selectionGalaxyProgress > 0.001) ||
        (scene === 'galaxy' && selectionGalaxyProgress < 0.999));
    const studiesCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'magnotes' && magnotesStudiesProgress > 0.001) ||
        (scene === 'studies' && magnotesStudiesProgress < 0.999));
    const contactCrossing =
      !this.reduced &&
      this.animated &&
      ((scene === 'studies' && studiesContactProgress > 0.001) ||
        (scene === 'contact' && studiesContactProgress < 0.999));
    const crossing: Crossing = identityCrossing
      ? 'identity-stack'
      : stackCrossing
        ? 'stack-solutions'
        : solutionsCrossing
          ? 'solutions-selection'
          : selectionCrossing
            ? 'selection-galaxy'
            : galaxyCrossing
              ? 'galaxy-ludora'
              : cardCrossing
                ? 'ludora-magnotes'
                : studiesCrossing
                  ? 'magnotes-studies'
                  : contactCrossing
                    ? 'studies-contact'
                    : null;
    const crossingProgress =
      crossing === 'identity-stack'
        ? identityStackProgress
        : crossing === 'stack-solutions'
          ? stackSolutionsProgress
          : crossing === 'solutions-selection'
            ? solutionsSelectionProgress
            : crossing === 'selection-galaxy'
              ? selectionGalaxyProgress
              : crossing === 'galaxy-ludora'
                ? galaxyLudoraProgress
                : crossing === 'ludora-magnotes'
                  ? ludoraMagnotesProgress
                  : crossing === 'magnotes-studies'
                    ? magnotesStudiesProgress
                    : studiesContactProgress;
    const stackBurst =
      crossing === 'identity-stack'
        ? smooth((identityStackProgress - 0.58) / 0.38)
        : crossing === 'stack-solutions'
          ? 1 - smooth((stackSolutionsProgress - 0.05) / 0.42)
          : scene === 'stack'
            ? 1
            : 0;
    // Le boîtier de l'horloge ne revient pas après l'éclatement.
    const pastStack =
      crossing === 'stack-solutions' ||
      SCENE_ORDER.indexOf(scene) > SCENE_ORDER.indexOf('stack');
    const shellBurst = pastStack ? 1 : stackBurst;
    const crossingSettled =
      (scene === 'identity' &&
        this.previousScene === 'stack' &&
        identityStackProgress <= 0.001) ||
      (scene === 'stack' &&
        this.previousScene === 'identity' &&
        identityStackProgress >= 0.999) ||
      (scene === 'stack' &&
        this.previousScene === 'solutions' &&
        stackSolutionsProgress <= 0.001) ||
      (scene === 'solutions' &&
        this.previousScene === 'stack' &&
        stackSolutionsProgress >= 0.999) ||
      (scene === 'solutions' &&
        this.previousScene === 'selection' &&
        solutionsSelectionProgress <= 0.001) ||
      (scene === 'selection' &&
        this.previousScene === 'solutions' &&
        solutionsSelectionProgress >= 0.999) ||
      (scene === 'selection' &&
        this.previousScene === 'galaxy' &&
        selectionGalaxyProgress <= 0.001) ||
      (scene === 'galaxy' &&
        this.previousScene === 'selection' &&
        selectionGalaxyProgress >= 0.999) ||
      (scene === 'galaxy' &&
        this.previousScene === 'ludora' &&
        galaxyLudoraProgress <= 0.001) ||
      (scene === 'ludora' &&
        this.previousScene === 'galaxy' &&
        galaxyLudoraProgress >= 0.999) ||
      (scene === 'ludora' &&
        this.previousScene === 'magnotes' &&
        ludoraMagnotesProgress <= 0.001) ||
      (scene === 'magnotes' &&
        this.previousScene === 'ludora' &&
        ludoraMagnotesProgress >= 0.999) ||
      (scene === 'magnotes' &&
        this.previousScene === 'studies' &&
        magnotesStudiesProgress <= 0.001) ||
      (scene === 'studies' &&
        this.previousScene === 'magnotes' &&
        magnotesStudiesProgress >= 0.999) ||
      (scene === 'studies' &&
        this.previousScene === 'contact' &&
        studiesContactProgress <= 0.001) ||
      (scene === 'contact' &&
        this.previousScene === 'studies' &&
        studiesContactProgress >= 0.999);
    const mix =
      this.reduced || !this.animated || crossingSettled
        ? 1
        : smooth(state?.transition ?? 1);
    const motionTime = this.reduced || !this.animated ? 0 : time * 0.001;
    const sceneProgress = this.reduced ? 0.72 : (state?.sceneProgress ?? 0.5);
    const accent = new Color(state?.accent ?? '#6ea8ff');

    const pointerEase = this.reduced ? 1 : 0.08;
    this.pointer.x += (this.targetPointer.x - this.pointer.x) * pointerEase;
    this.pointer.y += (this.targetPointer.y - this.pointer.y) * pointerEase;
    const galaxyPresence =
      crossing === 'selection-galaxy'
        ? smooth(crossingProgress)
        : crossing === 'galaxy-ludora'
          ? 1 - smooth(crossingProgress)
          : scene === 'galaxy'
            ? mix
            : this.previousScene === 'galaxy'
              ? 1 - mix
              : 0;
    const identityPresence = directOpening
      ? 1 - smooth((openingProgress - 0.58) / 0.36)
      : crossing === 'identity-stack'
        ? 1 - smooth(crossingProgress)
        : scene === 'identity'
          ? mix
          : this.previousScene === 'identity'
            ? 1 - mix
            : 0;
    this.world.rotation.y =
      (this.pointer.x - 0.5) * 0.11 +
      galaxyPresence * 0.3 +
      identityPresence * 0.2;
    this.world.rotation.x =
      (this.pointer.y - 0.5) * -0.075 -
      galaxyPresence * 0.16 -
      identityPresence * 0.08;
    const contactPresence =
      scene === 'contact'
        ? mix
        : this.previousScene === 'contact'
          ? 1 - mix
          : 0;
    const presenceScale = this.compact || this.heroTablet ? 0.68 : 1.52;
    const defaultScale = this.compact ? 0.62 : Math.min(1.1, innerWidth / 1200);
    this.world.scale.setScalar(
      medallionOpening
        ? presenceScale
        : defaultScale +
            (presenceScale - defaultScale) * identityPresence +
            galaxyPresence * (this.compact ? 0.1 : 0.13) +
            contactPresence * (this.compact ? 0.18 : 0.1) +
            (scene === 'stack' || scene === 'solutions' || scene === 'selection'
              ? this.compact
                ? scene === 'selection'
                  ? 0.02
                  : 0.1
                : 0.13
              : 0)
    );
    if (directOpening && this.compact) {
      const gather = Math.sin(
        Math.PI * smooth((openingProgress - 0.45) / 0.55)
      );
      this.world.scale.multiplyScalar(1 - 0.25 * gather);
    }
    // Après le prologue, l'objet garde une seule position à l'écran : il ne monte
    // ni ne descend d'un chapitre à l'autre, seul son contenu change.
    if (this.compact) {
      this.world.position.y =
        crossing === 'identity-stack'
          ? 3.3 - 0.8 * smooth(crossingProgress)
          : scene === 'identity'
            ? medallionOpening
              ? 3.3
              : 3.3 - 2.6 * Math.sin(Math.PI * Math.sqrt(clockAgProgress))
            : COMPACT_ANCHOR_Y;
    } else {
      this.world.position.y = 0;
    }
    // Sur bureau, l'axe de l'horloge reste l'axe des objets suivants.
    this.world.position.y -=
      0.8 * (this.compact || this.heroTablet ? identityPresence : 1);
    if (this.compact) {
      const targetOffset = Number(
        scene === 'contact' && Boolean(this.contactDisclosure?.open)
      );
      this.contactOffset =
        this.reduced || !this.animated
          ? targetOffset
          : this.contactOffset + (targetOffset - this.contactOffset) * 0.12;
      this.world.position.x = this.contactOffset * 2.1;
      this.world.position.y -= this.contactOffset;
    }
    if (this.heroTablet) {
      const heroY = medallionOpening
        ? 3.3
        : 3.3 - 2.6 * Math.sin(Math.PI * Math.sqrt(clockAgProgress));
      this.world.position.y +=
        (heroY - this.world.position.y) * identityPresence;
      this.world.position.x = this.desktopFormCenterX * (1 - identityPresence);
    }
    if (directOpening && this.compact) {
      const gather = Math.sin(
        Math.PI * smooth((openingProgress - 0.45) / 0.55)
      );
      this.world.position.y =
        3.3 - 0.8 * smooth((openingProgress - 0.58) / 0.36) + 0.38 * gather;
    }

    for (let index = 0; index < NODE_COUNT; index += 1) {
      if (crossing === 'identity-stack') {
        const letter = this.pointFor('identity', index, 0, motionTime);
        const rail = this.pointFor('stack', index, 0.5, motionTime);
        const unfold = smooth((crossingProgress - 0.16) / 0.74);
        this.positions[index].copy(
          this.flowPoint(letter, rail, unfold, index, 0.48)
        );
      } else if (crossing === 'stack-solutions') {
        const lane = Math.floor(index / 7);
        const flow = smooth((crossingProgress - 0.05 - lane * 0.045) / 0.8);
        this.positions[index].copy(
          this.flowPoint(
            this.pointFor('stack', index, 0.6, motionTime),
            this.pointFor('solutions', index, 0.3, motionTime),
            flow,
            index,
            0.36
          )
        );
      } else if (crossing === 'solutions-selection') {
        const lane = Math.floor(index / 7);
        const flow = smooth((crossingProgress - 0.06 - lane * 0.04) / 0.78);
        this.positions[index].copy(
          this.flowPoint(
            this.pointFor('solutions', index, 0.6, motionTime),
            this.pointFor('selection', index, 0.25, motionTime),
            flow,
            index,
            0.48
          )
        );
      } else if (crossing === 'selection-galaxy') {
        const choice = this.pointFor('selection', index, 0.5, motionTime);
        const aperture = this.aperturePoint(index);
        const orbit = this.pointFor('galaxy', index, 0.15, motionTime);
        const gather = smooth(crossingProgress * 2);
        const unfold = smooth((crossingProgress - 0.5) * 2);
        this.positions[index]
          .copy(this.flowPoint(choice, aperture, gather, index, 0.22))
          .lerp(this.flowPoint(aperture, orbit, unfold, index, 0.25), unfold);
      } else if (crossing === 'galaxy-ludora') {
        const orbit = this.pointFor('galaxy', index, 0.72, motionTime);
        const grid = this.pointFor('ludora', index, 0.24, motionTime);
        const row = Math.floor(index / 6);
        const fold = smooth((crossingProgress - 0.06 - row * 0.065) / 0.745);
        this.positions[index].copy(
          this.flowPoint(orbit, grid, fold, index, 0.32)
        );
      } else if (crossing === 'ludora-magnotes') {
        const grid = this.pointFor('ludora', index, 0.85, motionTime);
        const note = this.pointFor(
          'magnotes',
          index,
          scene === 'magnotes' ? sceneProgress : 0,
          motionTime
        );
        const card = Math.floor(index / 4);
        const detach = smooth((crossingProgress - 0.08 - card * 0.075) / 0.5);
        this.positions[index].copy(
          this.flowPoint(grid, note, detach, index, 0.5)
        );
      } else if (crossing === 'magnotes-studies') {
        const card = Math.floor(index / 4);
        const flow = smooth((crossingProgress - 0.04 - card * 0.035) / 0.76);
        this.positions[index].copy(
          this.flowPoint(
            this.pointFor('magnotes', index, 1, motionTime),
            this.pointFor('studies', index, 0.5, motionTime),
            flow,
            index,
            0.42
          )
        );
      } else if (crossing === 'studies-contact') {
        const branch = Math.floor(index / 12);
        const flow = smooth((crossingProgress - 0.06 - branch * 0.06) / 0.8);
        this.positions[index].copy(
          this.flowPoint(
            this.pointFor('studies', index, 0.6, motionTime),
            this.pointFor('contact', index, 0.5, motionTime),
            flow,
            index,
            0.5
          )
        );
      } else if (scene === 'identity') {
        const clockPoint = this.clockPoint(index);
        const letterPoint = this.pointFor('identity', index, 0, motionTime);
        this.positions[index].copy(
          this.flowPoint(clockPoint, letterPoint, clockAgProgress, index, 0.38)
        );
      } else {
        const target = this.pointFor(scene, index, sceneProgress, motionTime);
        this.positions[index].copy(
          this.flowPoint(this.origins[index], target, mix, index, 0.28)
        );
      }
    }
    this.updateFeatures(
      scene,
      mix,
      sceneProgress,
      motionTime,
      crossing,
      crossingProgress,
      clockAgProgress,
      directOpening ? openingProgress : null
    );
    this.updateClock(
      scene,
      crossing,
      clockAgProgress,
      directOpening ? openingProgress : null,
      medallionOpening,
      medallionOpening && crossing === 'identity-stack'
        ? 1 - smooth((identityStackProgress - 0.5) / 0.23)
        : 1 - shellBurst
    );
    if (directOpening || medallionOpening) {
      this.liquid.visible = false;
    } else {
      this.updateLiquid(
        scene,
        crossing,
        crossingProgress,
        clockAgProgress,
        accent
      );
    }
    if (medallionOpening) {
      const contentScale = 0.45 + stackBurst * (this.compact ? 0.62 : 0.45);
      this.medallionContent.scale.set(
        contentScale,
        contentScale,
        0.2 + stackBurst * 0.55
      );
      this.medallionContent.position.z = 0.45;
    } else {
      this.medallionContent.scale.setScalar(1);
      this.medallionContent.position.z = 0;
    }
    const monogram = this.features.get('identity')?.group;
    if (monogram) {
      const fold =
        medallionOpening && crossing === 'identity-stack'
          ? smooth((identityStackProgress - 0.36) / 0.15)
          : 0;
      monogram.scale.setScalar(medallionOpening ? 0.72 : 0.8);
      monogram.position.z = medallionOpening ? -0.9 : 0;
      monogram.rotation.y = fold * 0.38;
      monogram.children.forEach((piece, index) => {
        const origin = this.identityStrokeOrigins[index];
        if (!origin) return;
        const [x, y, z] = STACK_BURST_OFFSETS[Math.floor(index / 2)];
        const scatter = medallionOpening
          ? 0
          : smooth((stackBurst - 0.06) / 0.68);
        piece.position.set(
          origin.x + x * scatter,
          origin.y + y * scatter,
          origin.z + z * scatter
        );
        piece.rotation.z = scatter * (index < 4 ? -0.32 : 0.38);
        if (index % 2 === 0)
          piece.visible = !(
            crossing === 'identity-stack' && crossingProgress > 0.5
          );
      });
    }
    // L'horloge devient le cube à l'éclatement ; le cube se referme vers Solutions.
    const cubeChange =
      crossing === 'identity-stack'
        ? smooth((stackBurst - 0.5) / 0.4)
        : crossing === 'stack-solutions' || scene === 'stack'
          ? 1
          : 0;
    const cubePresence =
      crossing === 'stack-solutions'
        ? 1 - smooth((stackSolutionsProgress - 0.5) / 0.2)
        : crossing === 'identity-stack' || scene === 'stack'
          ? 1
          : 0;
    this.updateStackAssembly(
      pastStack ? 1 : stackBurst,
      cubeChange,
      cubePresence,
      motionTime
    );
    this.applyMorph(crossing, crossingProgress);
    // Ne pas montrer les prototypes procéduraux en attendant les objets finis.
    for (const [chapter, feature] of this.features) {
      const waiting =
        chapter === 'stack'
          ? this.clockBreakPivots.length === 0
          : chapter === 'solutions'
            ? this.solutionsMonolithPivots.length === 0
            : chapter !== 'identity' && !this.craftedScenes.has(chapter);
      if (waiting) feature.group.visible = false;
    }
    if (!medallionOpening && !this.reduced && this.animated) {
      const floating = 1 - identityPresence;
      this.world.position.y += Math.sin(motionTime * 0.82) * 0.075 * floating;
      this.world.rotation.z = Math.sin(motionTime * 0.48) * 0.012 * floating;
    } else {
      this.world.rotation.z = 0;
    }
    // Le boîtier reste frontal au repos et pivote à chaque frontière du récit.
    if (medallionOpening) {
      const turn = (progress: number) => {
        const t = clamp01(progress);
        const acceleration = Math.exp(6) - 1;
        return t < 0.5
          ? 0.5 * ((Math.exp(12 * t) - 1) / acceleration)
          : 1 - 0.5 * ((Math.exp(12 * (1 - t)) - 1) / acceleration);
      };
      // Seul le prologue pivote : après l'éclatement, chaque frontière a son propre geste.
      const spins = [clockAgProgress, identityStackProgress].reduce(
        (sum, progress) => sum + turn(progress),
        0
      );
      this.medallion.quaternion.copy(this.world.quaternion).invert();
      if (!this.reduced && this.animated)
        this.medallion.rotateY(spins * TAU * 5);
      this.clock.quaternion.identity();
    } else {
      this.medallion.quaternion.identity();
      if (this.clock.visible)
        this.clock.quaternion.copy(this.world.quaternion).invert();
    }
    // Tant que les shaders ne sont pas prêts, on ne dessine pas : la première utilisation
    // d'un programme non compilé bloque la page jusqu'à la fin de la compilation.
    if (!this.programsReady) return;
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    if (!this.renderer) return;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    const compact = width <= 860;
    const heroTablet = width > 860 && width <= 980;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // La surface WebGL reste bornée sur les grands écrans et les écrans Retina.
    const pixelBudget = this.liteMode ? 1_000_000 : 1_600_000;
    const budgetRatio = Math.sqrt(pixelBudget / (width * height));
    this.renderer.setPixelRatio(
      Math.min(
        devicePixelRatio || 1,
        this.liteMode ? 1 : compact ? 2 : 1.5,
        budgetRatio
      )
    );
    this.renderer.setSize(width, height, false);
    const visibleHeight = 2 * 15 * Math.tan((42 * Math.PI) / 360);
    const visibleWidth = visibleHeight * this.camera.aspect;
    this.compact = compact;
    this.heroTablet = heroTablet;
    this.desktopFormCenterX = visibleWidth * 0.22;
    const lampCompact = compact || heroTablet;
    this.bulbLight.intensity = lampCompact ? 24 : 30;
    this.reflectorBounce.intensity = lampCompact ? 17 : 22;
    this.bulbLight.shadow.mapSize.set(
      lampCompact ? 256 : 512,
      lampCompact ? 256 : 512
    );
    // La lampe partage l'axe projeté des formes malgré sa profondeur différente.
    const heroScale = (lampCompact ? 0.68 : 1.52) * 0.94;
    const formCenterX = lampCompact ? 0 : this.desktopFormCenterX;
    const lampDepth = 1.15 * heroScale;
    this.lampSwing.position.set(
      (formCenterX * (this.camera.position.z - lampDepth)) /
        this.camera.position.z +
        this.lampLab.x,
      (lampCompact ? 2.5 : -0.8) +
        (lampCompact ? 3.82 : 4.14) * heroScale +
        this.lampLab.y,
      lampDepth
    );
    this.lampSwing.scale.setScalar(heroScale);
    this.world.position.set(
      compact ? 0 : this.desktopFormCenterX,
      compact ? 3.3 : 0,
      0
    );
    this.world.scale.setScalar(compact ? 0.62 : Math.min(1.1, width / 1200));
    this.render(0);
  }

  destroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.safetyTimer);
    this.warmupTimers.forEach((timer) => window.clearTimeout(timer));
    window.removeEventListener('resize', this.onResize);
    this.contactDisclosure?.removeEventListener('toggle', this.onContactToggle);
    this.setInteractive(false);
    this.clock.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    this.lampSwing.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    this.clockMaterials.forEach((material) => material.dispose());
    this.pendantMaterials.forEach((material) => material.dispose());
    this.lampMaterials.forEach((material) => material.dispose());
    this.filamentGlowTexture.dispose();
    this.filamentGlowMaterial.dispose();
    this.liquid.geometry.dispose();
    this.liquidMaterial.dispose();
    this.features.forEach(({ group, materials }) => {
      group.traverse((object) => {
        if (object instanceof Mesh || object instanceof Line) {
          object.geometry.dispose();
        }
      });
      materials.forEach((material) => material.dispose());
    });
    this.identityRoughness?.dispose();
    this.identityAlbedo?.dispose();
    this.metalReflection?.dispose();
    this.renderer?.dispose();
  }

  private createMetalReflection(renderer: WebGLRenderer): WebGLRenderTarget {
    // Reflets de studio fixes sur le métal uniquement ; la lampe visible garde son éclairage.
    const room = new Scene();
    room.background = new Color('#19212a');
    const panels = [
      { color: '#ddd6c8', position: [-2.5, 3.5, 2.5], size: [2.2, 3.8] },
      { color: '#8191a0', position: [3.8, 1.4, 1.5], size: [1.2, 4.8] },
      { color: '#526171', position: [-3, -2.8, -1.5], size: [3.5, 1.4] },
    ] as const;
    for (const panel of panels) {
      const mesh = new Mesh(
        new PlaneGeometry(...panel.size),
        new MeshBasicMaterial({ color: panel.color, side: DoubleSide })
      );
      mesh.position.set(
        panel.position[0],
        panel.position[1],
        panel.position[2]
      );
      mesh.lookAt(0, 0, 0);
      room.add(mesh);
    }
    const generator = new PMREMGenerator(renderer);
    const reflection = generator.fromScene(room, 0.07, 0.1, 20, {
      size: 128,
    });
    generator.dispose();
    room.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      if (object.material instanceof MeshBasicMaterial)
        object.material.dispose();
    });
    return reflection;
  }

  private pointFor(
    scene: VisualScene,
    index: number,
    progress: number,
    time: number
  ): Vector3 {
    if (scene === 'identity') {
      const [x, y] = IDENTITY_POINTS[index];
      return this.identityPoint(index, x, y);
    }
    if (scene === 'galaxy') {
      const ring = Math.floor(index / 6);
      const angle = (index % 6) * (TAU / 6) + time * (0.12 + ring * 0.04);
      return this.galaxyPoint(ring, angle);
    }
    if (scene === 'ludora') {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const rise = smooth(progress * 1.7 - index * 0.018);
      return new Vector3(
        (column - 2.5) * 0.78,
        (1.5 - row) * 0.82,
        (((index * 7) % 5) - 2) * 0.16 + (index === 14 ? 0.5 : 0) * rise
      );
    }
    if (scene === 'magnotes') {
      const card = Math.floor(index / 4);
      const corner = index % 4;
      const center = this.magnotesCenter(card, progress);
      const angle = this.magnotesAngle(card, progress);
      const localX = corner % 2 ? 0.45 : -0.45;
      const localY = corner < 2 ? 0.515 : -0.515;
      return new Vector3(
        center.x + localX * Math.cos(angle) - localY * Math.sin(angle),
        center.y + localX * Math.sin(angle) + localY * Math.cos(angle),
        center.z
      );
    }
    if (scene === 'studies') {
      const side = index < 12 ? -1 : 1;
      const local = index % 12;
      const angle = (local / 12) * TAU;
      return new Vector3(
        side * 1.3 + Math.cos(angle) * 0.68,
        Math.sin(angle) * 1.12,
        side * 0.5 + Math.sin(angle * 2) * 0.43
      );
    }
    if (scene === 'contact') {
      const angle = (index / NODE_COUNT) * TAU;
      return new Vector3(
        Math.cos(angle) * 1.28,
        Math.sin(angle) * 1.28,
        Math.sin(angle * 2) * 0.68
      );
    }
    if (scene === 'selection') {
      const group = index < 7 ? 0 : index < 12 ? 1 : 2;
      const local = index - [0, 7, 12][group];
      const count = [7, 5, 12][group];
      const angle = (local / count) * TAU;
      return new Vector3(
        (group - 1) * 1.6 + Math.cos(angle) * 0.52,
        Math.sin(angle) * 0.82,
        group * 0.42 + Math.sin(angle * 2) * 0.25
      );
    }
    const lane = index < 7 ? 0 : index < 12 ? 1 : 2;
    const step = index - [0, 7, 12][lane];
    const count = [7, 5, 12][lane];
    const t = step / (count - 1);
    return new Vector3(
      (lane === 1 ? 0.5 - t : t - 0.5) * 3.71,
      (lane - 1) * 1.03 +
        (scene === 'solutions'
          ? Math.sin(t * 6.16 + lane * 1.35) * 0.34
          : Math.sin(t * 4.2) * 0.2),
      (scene === 'solutions' ? Math.sin(t * 6.58 + lane * 1.3) : lane - 1) * 0.7
    );
  }

  private identityPoint(index: number, x: number, y: number): Vector3 {
    const strokeDepth = index < 7 ? 0.24 : index < 12 ? 0.64 : 0.46;
    return new Vector3(x, y, strokeDepth);
  }

  private clockPoint(index: number): Vector3 {
    const angle = (-index / NODE_COUNT) * TAU;
    return new Vector3(
      Math.sin(angle) * 1.83,
      Math.cos(angle) * 1.83,
      0.47 + Math.sin(angle * 2) * 0.025
    );
  }

  private flowPoint(
    from: Vector3,
    to: Vector3,
    progress: number,
    index: number,
    amplitude: number
  ): Vector3 {
    const phase = smooth(progress);
    const arc = Math.sin(Math.PI * phase) * amplitude;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(Math.hypot(dx, dy), 0.001);
    const lane = Math.floor(index / 7);
    const current = Math.sin(index * 0.42 + lane * 0.65);
    return new Vector3(
      from.x + dx * phase - (dy / length) * arc * current,
      from.y + dy * phase + (dx / length) * arc * current,
      from.z + (to.z - from.z) * phase + arc * (0.7 + current * 0.2)
    );
  }

  private galaxyPoint(ring: number, angle: number): Vector3 {
    const radius = 0.65 + ring * 0.47;
    const inclinations = [
      [-0.52, 0.18],
      [0.72, -0.52],
      [-0.84, 0.35],
      [0.57, -0.25],
    ] as const;
    const [tiltX, tiltY] = inclinations[ring];
    const x = Math.cos(angle) * radius * 1.18;
    const y = Math.sin(angle) * radius * 0.92;
    const raisedY = y * Math.cos(tiltX);
    const depth = y * Math.sin(tiltX);
    return new Vector3(
      x * Math.cos(tiltY) + depth * Math.sin(tiltY),
      raisedY,
      depth * Math.cos(tiltY) - x * Math.sin(tiltY)
    );
  }

  private aperturePoint(index: number): Vector3 {
    const t = index / (NODE_COUNT - 1);
    const angle = -Math.PI * 0.7 + TAU * 1.75 * t;
    const radius = 0.42 + 1.6 * t;
    return new Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.78,
      0.3 + Math.cos(angle * 0.7) * 0.42
    );
  }

  private magnotesCenter(card: number, progress: number): Vector3 {
    const column = card % 3;
    const row = Math.floor(card / 3);
    const organized = this.magnotesOrder(card, progress);
    const [looseX, looseY, looseZ] = MAGNOTES_LOOSE_CENTERS[card];
    return new Vector3(
      looseX + ((column - 1) * 1.55 - looseX) * organized,
      looseY + ((0.5 - row) * 1.8 - looseY) * organized,
      looseZ * (1 - organized) +
        (column - 1) * 0.16 * organized +
        Math.sin(Math.PI * organized) * 0.62
    );
  }

  private magnotesOrder(card: number, progress: number): number {
    const column = card % 3;
    const row = Math.floor(card / 3);
    const entry = this.compact ? 0.13 : 0.42;
    const duration = 0.32;
    return smooth((progress - entry - column * 0.03 - row * 0.025) / duration);
  }

  private magnotesAngle(card: number, progress: number): number {
    return (
      (card % 2 === 0 ? -1 : 1) *
      (0.15 + (card % 3) * 0.07) *
      (1 - this.magnotesOrder(card, progress))
    );
  }

  private buildFeatures(): void {
    const identity = new Group();
    const identityMaterials: Feature['materials'] = [];
    const textureSize = 256;
    const roughnessData = new Uint8Array(textureSize * textureSize * 4);
    const albedoData = new Uint8Array(textureSize * textureSize * 4);
    let grain = 173;
    for (let pixel = 0; pixel < textureSize * textureSize; pixel += 1) {
      grain = (grain * 1664525 + 1013904223) >>> 0;
      const x = pixel % textureSize;
      const y = Math.floor(pixel / textureSize);
      const brushed = Math.sin(y * 0.22 + Math.sin(x * 0.045) * 0.55) * 10;
      const mark = x % 71 === 0 && y % 17 < 9 ? -16 : 0;
      const value = Math.max(
        96,
        Math.min(222, 169 + brushed + ((grain >>> 24) - 128) * 0.11 + mark)
      );
      const offset = pixel * 4;
      roughnessData[offset] = value;
      roughnessData[offset + 1] = value;
      roughnessData[offset + 2] = value;
      roughnessData[offset + 3] = 255;
      const surface = Math.max(
        205,
        Math.min(
          250,
          236 + brushed * 0.42 + ((grain >>> 24) - 128) * 0.045 + mark * 0.65
        )
      );
      albedoData[offset] = surface - 5;
      albedoData[offset + 1] = surface;
      albedoData[offset + 2] = Math.min(255, surface + 7);
      albedoData[offset + 3] = 255;
    }
    // Les stries et micro-entailles travaillent la rugosité et le relief.
    this.identityRoughness = new DataTexture(
      roughnessData,
      textureSize,
      textureSize,
      RGBAFormat
    );
    this.identityRoughness.wrapS = RepeatWrapping;
    this.identityRoughness.wrapT = RepeatWrapping;
    this.identityRoughness.repeat.set(1.25, 1.25);
    this.identityRoughness.needsUpdate = true;
    this.identityAlbedo = new DataTexture(
      albedoData,
      textureSize,
      textureSize,
      RGBAFormat
    );
    this.identityAlbedo.colorSpace = SRGBColorSpace;
    this.identityAlbedo.wrapS = RepeatWrapping;
    this.identityAlbedo.wrapT = RepeatWrapping;
    this.identityAlbedo.repeat.set(1.25, 1.25);
    this.identityAlbedo.needsUpdate = true;
    const heroKey = new DirectionalLight('#e5eeff', 1.8);
    heroKey.position.set(-3, 4, 6);
    heroKey.castShadow = true;
    heroKey.shadow.mapSize.set(512, 512);
    heroKey.shadow.camera.left = -4;
    heroKey.shadow.camera.right = 4;
    heroKey.shadow.camera.top = 4;
    heroKey.shadow.camera.bottom = -4;
    heroKey.shadow.camera.near = 0.5;
    heroKey.shadow.camera.far = 16;
    heroKey.shadow.bias = -0.001;
    // Une lumière de scène permanente évite de recolorer la lampe quand AG disparaît.
    this.scene.add(heroKey, heroKey.target);
    for (const [strokeIndex, indices] of IDENTITY_STROKES.entries()) {
      const points = indices.map((index) => {
        const [x, y] = IDENTITY_POINTS[index];
        return new Vector3(x, y, 0);
      });
      const curve = new CatmullRomCurve3(points, false, 'centripetal');
      const segments = Math.max(40, indices.length * 9);
      const left: Vector3[] = [];
      const right: Vector3[] = [];
      for (let step = 0; step <= segments; step += 1) {
        const t = step / segments;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).normalize();
        const nx = -tangent.y * 0.165;
        const ny = tangent.x * 0.165;
        left.push(new Vector3(point.x + nx, point.y + ny, 0));
        right.push(new Vector3(point.x - nx, point.y - ny, 0));
      }
      const strip = new Shape();
      strip.moveTo(left[0].x, left[0].y);
      left.slice(1).forEach((point) => strip.lineTo(point.x, point.y));
      right.reverse().forEach((point) => strip.lineTo(point.x, point.y));
      strip.closePath();
      const baseDepth =
        strokeIndex === 2 ? 0.28 : strokeIndex === 3 ? 0.1 : -0.12;
      const shadow = new MeshStandardMaterial({
        color: '#0b1118',
        metalness: 0.62,
        roughness: 0.52,
        transparent: true,
        opacity: 1,
      });
      const face = new MeshStandardMaterial({
        color: '#c4ced6',
        emissive: '#7a5a2a',
        emissiveIntensity: 0.45,
        metalness: 0.9,
        roughness: 0.36,
        envMap: this.metalReflection?.texture,
        envMapIntensity: 0.42,
        map: this.identityAlbedo,
        roughnessMap: this.identityRoughness,
        bumpMap: this.identityRoughness,
        bumpScale: 0.018,
        transparent: true,
        opacity: 1,
      });
      const side = new MeshStandardMaterial({
        color: '#9a7a3f',
        metalness: 0.9,
        roughness: 0.38,
        envMap: this.metalReflection?.texture,
        envMapIntensity: 0.42,
        map: this.identityAlbedo,
        roughnessMap: this.identityRoughness,
        bumpMap: this.identityRoughness,
        bumpScale: 0.016,
        transparent: true,
        opacity: 1,
      });
      const stroke = new Mesh(
        new ExtrudeGeometry(strip, {
          depth: 0.42,
          bevelEnabled: true,
          bevelThickness: 0.065,
          bevelSize: 0.06,
          bevelSegments: 5,
          steps: 1,
          curveSegments: 1,
        }),
        [face, side]
      );
      const shadowStroke = new Mesh(stroke.geometry, shadow);
      shadowStroke.position.set(-0.055, -0.075, baseDepth - 0.085);
      stroke.position.z = baseDepth;
      stroke.castShadow = true;
      stroke.receiveShadow = true;
      identity.add(shadowStroke, stroke);
      this.identityStrokeOrigins.push(
        shadowStroke.position.clone(),
        stroke.position.clone()
      );
      identityMaterials.push(shadow, face, side);
    }
    // Le monogramme reste contenu sous la suspension sans modifier les autres formes.
    identity.scale.setScalar(0.8);
    this.addFeature('identity', identity, identityMaterials);
    this.buildClock();

    this.buildSystemFeature();
    this.buildRibbonFeature(
      'solutions',
      [7, 5, 12],
      false,
      '#7a8ef4',
      '#d6dcff'
    );
    this.buildRibbonFeature(
      'selection',
      [7, 5, 12],
      true,
      '#749cff',
      '#d6e6ff'
    );
    this.buildRibbonFeature('studies', [12, 12], true, '#8fa2ed', '#dae3ff');

    const galaxy = new Group();
    const galaxyMaterials: Feature['materials'] = [];
    for (let ring = 0; ring < 4; ring += 1) {
      const points = Array.from({ length: 24 }, (_, index) =>
        this.galaxyPoint(ring, (index / 24) * TAU)
      );
      const orbit = new CatmullRomCurve3(points, true, 'centripetal');
      const glow = new MeshBasicMaterial({
        color: ring % 2 === 0 ? '#7fafff' : '#7671e4',
        transparent: true,
        opacity: 0.12,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const metal = new MeshStandardMaterial({
        color: ring === 2 ? '#bbdfff' : '#709bdf',
        emissive: ring === 2 ? '#5e99ed' : '#304d99',
        emissiveIntensity: 0.8,
        metalness: 0.58,
        roughness: 0.24,
        transparent: true,
        opacity: 0.88,
      });
      galaxy.add(new Mesh(new TubeGeometry(orbit, 96, 0.16, 8, true), glow));
      galaxy.add(new Mesh(new TubeGeometry(orbit, 96, 0.07, 10, true), metal));
      galaxyMaterials.push(glow, metal);
    }
    const sunMaterial = new MeshStandardMaterial({
      color: '#ffe6b4',
      emissive: '#ffad56',
      emissiveIntensity: 1.5,
      metalness: 0.35,
      roughness: 0.22,
      transparent: true,
      opacity: 0.98,
    });
    galaxy.add(new Mesh(new IcosahedronGeometry(0.3, 2), sunMaterial));
    galaxyMaterials.push(sunMaterial);
    const coronaMaterial = new MeshBasicMaterial({
      color: '#ffca82',
      transparent: true,
      opacity: 0.045,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    galaxy.add(new Mesh(new SphereGeometry(0.5, 20, 12), coronaMaterial));
    galaxyMaterials.push(coronaMaterial);
    this.addFeature('galaxy', galaxy, galaxyMaterials);

    const ludora = new Group();
    const ludoraMaterials: Feature['materials'] = [];
    const colors = ['#4fa7e1', '#796ee0', '#d49256', '#57b7a5'];
    for (let index = 0; index < NODE_COUNT; index += 1) {
      const color = colors[index % colors.length];
      const material = new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: index === 14 ? 0.7 : 0.26,
        metalness: 0.48,
        roughness: 0.31,
        transparent: true,
        opacity: 0.88,
      });
      const geometry =
        index % 4 === 0
          ? new BoxGeometry(0.52, 0.52, 0.43)
          : index % 4 === 1
            ? new DodecahedronGeometry(0.34, 0)
            : index % 4 === 2
              ? new IcosahedronGeometry(0.35, 0)
              : new OctahedronGeometry(0.4, 0);
      const piece = new Mesh(geometry, material);
      piece.position.copy(this.pointFor('ludora', index, 1, 0));
      piece.rotation.set(index * 0.31, index * 0.52, index * 0.17);
      ludora.add(piece);
      ludoraMaterials.push(material);
    }
    this.addFeature('ludora', ludora, ludoraMaterials);

    const magnotes = new Group();
    const magnotesMaterials: Feature['materials'] = [];
    const partIndices: number[] = [];
    const outline = new Shape();
    outline.moveTo(-0.46, -0.53);
    outline.lineTo(0.46, -0.53);
    outline.lineTo(0.46, 0.53);
    outline.lineTo(-0.46, 0.53);
    outline.closePath();
    const opening = new Path();
    opening.moveTo(-0.38, -0.45);
    opening.lineTo(-0.38, 0.45);
    opening.lineTo(0.38, 0.45);
    opening.lineTo(0.38, -0.45);
    opening.closePath();
    outline.holes.push(opening);
    for (let index = 0; index < 6; index += 1) {
      const frameMaterial = new MeshStandardMaterial({
        color: index % 2 === 0 ? '#b8aaff' : '#8eb5f0',
        emissive: index % 2 === 0 ? '#7968dc' : '#4b84bd',
        emissiveIntensity: 0.75,
        metalness: 0.52,
        roughness: 0.25,
        transparent: true,
        opacity: 0.92,
        side: DoubleSide,
      });
      const glassMaterial = new MeshBasicMaterial({
        color: index % 2 === 0 ? '#746dc6' : '#5585b2',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: DoubleSide,
      });
      const card = new Group();
      card.add(
        new Mesh(
          new ExtrudeGeometry(outline, {
            depth: 0.09,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelSegments: 1,
            steps: 1,
            curveSegments: 1,
          }),
          frameMaterial
        )
      );
      const glass = new Mesh(new BoxGeometry(0.77, 0.91, 0.02), glassMaterial);
      glass.position.z = 0.04;
      card.add(glass);
      card.position.copy(this.magnotesCenter(index, 1));
      magnotes.add(card);
      magnotesMaterials.push(frameMaterial, glassMaterial);
      partIndices.push(index, index);
    }
    this.addFeature('magnotes', magnotes, magnotesMaterials, partIndices);

    const contact = new Group();
    const contactPoints = Array.from({ length: NODE_COUNT }, (_, index) =>
      this.pointFor('contact', index, 0, 0)
    );
    const contactCurve = new CatmullRomCurve3(
      contactPoints,
      true,
      'centripetal'
    );
    const contactGlow = new MeshBasicMaterial({
      color: '#e99a62',
      transparent: true,
      opacity: 0.1,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const contactMetal = new MeshStandardMaterial({
      color: '#ffdfaa',
      emissive: '#cb754e',
      emissiveIntensity: 0.7,
      metalness: 0.62,
      roughness: 0.28,
      transparent: true,
      opacity: 0.9,
    });
    contact.add(
      new Mesh(new TubeGeometry(contactCurve, 96, 0.18, 8, true), contactGlow),
      new Mesh(new TubeGeometry(contactCurve, 96, 0.1, 10, true), contactMetal)
    );
    this.addFeature('contact', contact, [contactGlow, contactMetal]);
  }

  private buildSystemFeature(): void {
    const group = new Group();
    const materials: Feature['materials'] = [];
    const outline = new Shape();
    const halfWidth = 1.62;
    const halfHeight = 0.26;
    const corner = 0.1;
    outline.moveTo(-halfWidth + corner, -halfHeight);
    outline.lineTo(halfWidth - corner, -halfHeight);
    outline.quadraticCurveTo(
      halfWidth,
      -halfHeight,
      halfWidth,
      -halfHeight + corner
    );
    outline.lineTo(halfWidth, halfHeight - corner);
    outline.quadraticCurveTo(
      halfWidth,
      halfHeight,
      halfWidth - corner,
      halfHeight
    );
    outline.lineTo(-halfWidth + corner, halfHeight);
    outline.quadraticCurveTo(
      -halfWidth,
      halfHeight,
      -halfWidth,
      halfHeight - corner
    );
    outline.lineTo(-halfWidth, -halfHeight + corner);
    outline.quadraticCurveTo(
      -halfWidth,
      -halfHeight,
      -halfWidth + corner,
      -halfHeight
    );
    const plateGeometry = new ExtrudeGeometry(outline, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.035,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 3,
    });
    const colors = ['#c4e4ef', '#a9cfde', '#8fb6ca', '#b2d1de'];
    for (let layer = 0; layer < 4; layer += 1) {
      const y = 1.11 - layer * 0.74;
      const depth = 0.73 + layer * 0.045;
      const metal = new MeshStandardMaterial({
        color: colors[layer],
        emissive: '#285477',
        emissiveIntensity: 0.18,
        metalness: 0.78,
        roughness: 0.29,
        transparent: true,
        opacity: 0.94,
      });
      const plate = new Mesh(plateGeometry, metal);
      plate.position.set(layer % 2 === 0 ? -0.07 : 0.07, y, depth);
      plate.rotation.y = layer % 2 === 0 ? -0.035 : 0.035;
      group.add(plate);
      materials.push(metal);
    }
    const traceMaterial = new MeshStandardMaterial({
      color: '#d7f3ff',
      emissive: '#4ba9d8',
      emissiveIntensity: 0.32,
      metalness: 0.48,
      roughness: 0.22,
      transparent: true,
      opacity: 0.82,
    });
    for (let layer = 0; layer < 4; layer += 1) {
      const trace = new Mesh(
        new BoxGeometry(2.72, 0.035, 0.018),
        traceMaterial
      );
      trace.position.set(
        layer % 2 === 0 ? -0.07 : 0.07,
        1.11 - layer * 0.74,
        0.91 + layer * 0.045
      );
      group.add(trace);
    }
    materials.push(traceMaterial);
    const spineMaterial = new MeshStandardMaterial({
      color: '#355f79',
      emissive: '#153c58',
      emissiveIntensity: 0.18,
      metalness: 0.72,
      roughness: 0.34,
      transparent: true,
      opacity: 0.95,
    });
    const spine = new Mesh(new BoxGeometry(0.19, 2.72, 0.13), spineMaterial);
    spine.position.set(0, 0, 0.65);
    group.add(spine);
    materials.push(spineMaterial);
    this.addFeature('stack', group, materials);
  }

  private loadClockBreakup(): void {
    this.enqueueGlb('/models/clock_breakup.glb', (asset) => {
      if (this.destroyed) return;
      const pivots: Object3D[] = [];
      let mechanism: Object3D | null = null;
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        if (/CLOCK_BREAK__0[1-4]_[a-z]+_pivot/.test(object.name))
          pivots.push(object);
        if (object.name === 'CLOCK_BREAK__mechanism_pivot') mechanism = object;
        object.layers.set(2);
        if (!(object instanceof Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = true;
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          material.envMap = this.metalReflection?.texture ?? null;
          material.envMapIntensity = 0.85;
          this.tunePrologueMaterial(material);
          material.transparent = true;
          material.needsUpdate = true;
          materials.add(material);
        });
      });
      if (pivots.length !== 4 || !mechanism) return;
      pivots.sort((a, b) => a.name.localeCompare(b.name));
      const previous = this.features.get('stack');
      if (previous) {
        this.medallionContent.remove(previous.group);
        const geometries = new Set<BufferGeometry>();
        previous.group.traverse((object) => {
          if (object instanceof Mesh) geometries.add(object.geometry);
        });
        geometries.forEach((geometry) => geometry.dispose());
        previous.materials.forEach((material) => material.dispose());
      }
      this.clockBreakPivots.push(...pivots);
      this.clockBreakMechanism = mechanism;
      this.addFeature('stack', asset.scene, [...materials]);
      this.medallionContent.remove(asset.scene);
      this.medallion.add(asset.scene);
      this.render(0);
    });
  }

  private loadSolutionsMonolith(): void {
    this.enqueueGlb('/models/solutions_monolith.glb', (asset) => {
      if (this.destroyed) return;
      const pivots: Object3D[] = [];
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        if (/MONO__0[1-4]_offer_pivot/.test(object.name)) pivots.push(object);
        object.layers.set(2);
        if (!(object instanceof Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = true;
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          material.envMap = this.metalReflection?.texture ?? null;
          material.envMapIntensity = 0.7;
          if (material.name.includes('titanium')) {
            material.color.set('#68757f');
            material.metalness = 1;
            material.roughnessMap = this.identityRoughness;
            material.bumpMap = this.identityRoughness;
            material.bumpScale = 0.03;
            material.roughness = 0.62;
          }
          if (material.name.includes('obsidian')) {
            material.color.set('#1a212a');
            material.roughness = 0.3;
          }
          if (material.name.includes('graphite')) {
            material.color.set('#0b1118');
            material.roughness = 0.5;
          }
          if (material.name.includes('rune')) {
            material.emissiveIntensity = 1.25;
            material.envMapIntensity = 0.2;
          }
          if (material.name.includes('seam')) {
            material.color.set('#4f8fd8');
            material.emissive.set('#5aa8ff');
            material.emissiveIntensity = 1.4;
            material.envMapIntensity = 0;
          }
          material.transparent = true;
          material.needsUpdate = true;
          materials.add(material);
        });
      });
      if (pivots.length !== 4) return;
      pivots.sort((a, b) => a.name.localeCompare(b.name));
      pivots.forEach((pivot) => {
        this.solutionsMonolithBase.push(pivot.position.clone());
      });
      this.solutionsMonolithPivots.push(...pivots);
      const previous = this.features.get('solutions');
      if (previous) {
        this.medallionContent.remove(previous.group);
        previous.group.traverse((object) => {
          if (object instanceof Mesh) object.geometry.dispose();
        });
        previous.materials.forEach((material) => material.dispose());
      }
      this.addFeature('solutions', asset.scene, [...materials]);
      // Hors du médaillon aplati : le monolithe garde sa profondeur réelle.
      this.medallionContent.remove(asset.scene);
      this.medallion.add(asset.scene);
      this.render(0);
    });
  }

  /** Charge un objet Blender fini et remplace la forme procédurale de la scène. */
  /**
   * Chargement des objets hors héros : les fichiers se téléchargent tous tout de
   * suite (en parallèle), mais leur analyse se fait un par un, après l'apparition du
   * héros, avec une pause entre chaque pour laisser les images respirer.
   */
  private enqueueGlb(url: string, onLoad: (asset: GLTF) => void): void {
    const bytes = fetch(url)
      .then((response) =>
        response.ok ? response.arrayBuffer() : Promise.reject(new Error(url))
      )
      .catch(() => null);
    this.loadQueue.push({
      url,
      load: async () => {
        const buffer = await bytes;
        if (!buffer || this.destroyed) return;
        await new Promise<void>((resolve) => {
          new GLTFLoader().parse(
            buffer,
            `${window.location.origin}/models/`,
            (asset) => {
              if (!this.destroyed) onLoad(asset);
              resolve();
            },
            () => resolve()
          );
        });
      },
    });
    if (!this.loadQueueStarted) {
      this.loadQueueStarted = true;
      // Le héros (lampe, pendentif, horloge) passe avant tout le reste.
      window.setTimeout(() => this.pumpLoadQueue(), 1500);
    }
  }

  /**
   * Cède la place au défilement : l'analyse d'un GLB bloque 100 à 400 ms sur mobile.
   * On attend que la page se soit arrêtée (lecture ponctuelle, sans écouteur scroll),
   * mais jamais plus de 4 s pour que les objets finissent par arriver.
   */
  private whenScrollIdle(maxWaitMs = 4000): Promise<void> {
    return new Promise((resolve) => {
      const started = performance.now();
      let lastY = window.scrollY;
      let calmSince = started;
      const check = (): void => {
        const now = performance.now();
        const y = window.scrollY;
        if (Math.abs(y - lastY) > 1) {
          lastY = y;
          calmSince = now;
        }
        if (
          this.destroyed ||
          now - calmSince > 250 ||
          now - started > maxWaitMs
        ) {
          resolve();
          return;
        }
        window.setTimeout(check, 100);
      };
      window.setTimeout(check, 100);
    });
  }

  private pumpLoadQueue(): void {
    if (this.loadQueueBusy || this.destroyed) return;
    const activeScene = this.state?.scene;
    const activeIndex = activeScene
      ? this.loadQueue.findIndex((entry) =>
          entry.url.includes(`/${activeScene}_`)
        )
      : -1;
    const [next] = this.loadQueue.splice(activeIndex < 0 ? 0 : activeIndex, 1);
    if (!next) {
      this.queueWarmup();
      return;
    }
    this.loadQueueBusy = true;
    void this.whenScrollIdle()
      .then(next.load)
      .finally(() => {
        this.loadQueueBusy = false;
        window.setTimeout(() => this.pumpLoadQueue(), 160);
      });
  }

  /**
   * Précompilation : les objets cachés ne compilent leurs shaders et n'envoient leurs
   * textures au GPU qu'à leur première apparition, ce qui gèle l'image plusieurs
   * centaines de millisecondes. On le fait ici, au repos, après le chargement.
   * Deux passes : l'analyse des GLB peut finir après la fin du chargement réseau.
   */
  private queueWarmup(): void {
    if (!this.renderer || this.destroyed) return;
    this.warmupTimers.forEach((timer) => window.clearTimeout(timer));
    this.warmupTimers = [700, 3200].map((delay) =>
      window.setTimeout(() => void this.warmup(), delay)
    );
  }

  private async warmup(): Promise<void> {
    const renderer = this.renderer;
    if (!renderer || this.destroyed) return;
    try {
      await renderer.compileAsync(this.scene, this.camera);
    } catch {
      // Sans compilation asynchrone, on laisse le rendu compiler à la demande.
    }
    this.markReady();
    this.render(0);
    // Les GLB sont à double face et transparents : sans cela, chaque pièce est dessinée
    // deux fois (faces arrière puis avant). Une seule passe suffit pour ces objets pleins.
    this.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const list = Array.isArray(object.material)
        ? object.material
        : [object.material];
      list.forEach((material) => {
        if (material.transparent && material.side === DoubleSide) {
          material.forceSinglePass = true;
        }
      });
    });
    const textures = new Set<Texture>();
    this.scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof Texture) textures.add(value);
        });
      });
    });
    // Une texture par tranche de temps, pour ne jamais bloquer l'image.
    for (const texture of textures) {
      if (this.destroyed) return;
      if (
        (import.meta.env.DEV ||
          import.meta.env.MODE === 'startup-experiment') &&
        new URLSearchParams(location.search).has('idle-warmup')
      ) {
        await this.whenScrollIdle(10000);
      }
      if (this.destroyed) return;
      if (
        (import.meta.env.DEV ||
          import.meta.env.MODE === 'startup-experiment') &&
        new URLSearchParams(location.search).has('warmup-trace')
      )
        performance.mark('warmup-texture-start');
      renderer.initTexture(texture);
      if (
        (import.meta.env.DEV ||
          import.meta.env.MODE === 'startup-experiment') &&
        new URLSearchParams(location.search).has('warmup-trace')
      )
        performance.measure('warmup-texture', 'warmup-texture-start');
      await new Promise<void>((resolve) => window.setTimeout(resolve, 24));
    }
    await this.primePipelines();
  }

  /**
   * Amorçage : sur Safari/iOS (Metal), l'état de rendu d'un matériau n'est créé qu'à son
   * premier vrai dessin, même shader compilé. On dessine donc chaque pièce une fois,
   * confinée à un pixel (scissor), par petits lots, pour que la première apparition
   * d'une scène ne gèle plus l'image. Rien n'est visible : le pixel est effacé à l'image
   * suivante et la visibilité d'origine est restaurée dans la même tâche.
   */
  private async primePipelines(): Promise<void> {
    const renderer = this.renderer;
    if (!renderer || this.destroyed || this.primed) return;
    this.primed = true;
    const meshes: Mesh[] = [];
    this.scene.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object);
    });
    const BATCH = 36;
    for (let start = 0; start < meshes.length; start += BATCH) {
      if (this.destroyed) return;
      if (
        (import.meta.env.DEV ||
          import.meta.env.MODE === 'startup-experiment') &&
        new URLSearchParams(location.search).has('idle-warmup')
      ) {
        await this.whenScrollIdle(10000);
      }
      if (this.destroyed) return;
      const batch = meshes.slice(start, start + BATCH);
      const saved: Array<() => void> = [];
      const reveal = (object: Object3D): void => {
        const visible = object.visible;
        object.visible = true;
        saved.push(() => {
          object.visible = visible;
        });
      };
      batch.forEach((mesh) => {
        for (let node: Object3D | null = mesh; node; node = node.parent) {
          reveal(node);
        }
        const list = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        list.forEach((material) => {
          const visible = material.visible;
          material.visible = true;
          saved.push(() => {
            material.visible = visible;
          });
        });
      });
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, 1, 1);
      if (
        (import.meta.env.DEV ||
          import.meta.env.MODE === 'startup-experiment') &&
        new URLSearchParams(location.search).has('warmup-trace')
      )
        performance.mark('warmup-draw-start');
      try {
        renderer.render(this.scene, this.camera);
      } finally {
        if (
          (import.meta.env.DEV ||
            import.meta.env.MODE === 'startup-experiment') &&
          new URLSearchParams(location.search).has('warmup-trace')
        )
          performance.measure('warmup-draw', 'warmup-draw-start');
        renderer.setScissorTest(false);
        // Restauration en ordre inverse : les parents après leurs enfants.
        for (let i = saved.length - 1; i >= 0; i -= 1) saved[i]();
      }
      // Image normale tout de suite : le dessin d'amorçage ne doit jamais être présenté seul.
      this.render(0);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 60));
    }
    window.dispatchEvent(new Event('world-settled'));
  }

  private loadCraftedFeature(
    url: string,
    scene: VisualScene,
    collect: (object: Object3D) => void,
    ready: (root: Object3D) => void
  ): void {
    this.enqueueGlb(url, (asset) => {
      if (this.destroyed) return;
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        collect(object);
        object.layers.set(2);
        if (!(object instanceof Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = true;
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          this.tuneCraftedMaterial(material);
          material.transparent = true;
          material.needsUpdate = true;
          materials.add(material);
        });
      });
      const previous = this.features.get(scene);
      if (previous) {
        this.medallionContent.remove(previous.group);
        previous.group.traverse((object) => {
          if (object instanceof Mesh) object.geometry.dispose();
        });
        previous.materials.forEach((material) => material.dispose());
      }
      this.craftedScenes.add(scene);
      this.addFeature(scene, asset.scene, [...materials]);
      // Hors du médaillon aplati : l'objet garde sa profondeur réelle.
      this.medallionContent.remove(asset.scene);
      this.medallion.add(asset.scene);
      ready(asset.scene);
      if (import.meta.env.MODE === 'startup-experiment') {
        performance.mark(`scene-loaded-${scene}`);
      }
      this.render(0);
    });
  }

  /** Charte titane / laiton : l'abat-jour devient graphite, le métal reste chaud. */
  private tuneLampMaterial(material: MeshStandardMaterial): void {
    const name = material.name.toLowerCase();
    if (name.includes('cobalt enamel')) {
      material.color.set('#1a212b');
      material.metalness = 0.78;
      material.roughness = 0.36;
    } else if (name.includes('graphite powder')) {
      material.color.set('#68757f');
      material.metalness = 0.8;
      material.roughness = 0.34;
    } else if (name.includes('brass socket')) {
      material.color.set('#9a7a3f');
      material.metalness = 0.85;
      material.roughness = 0.3;
    }
  }

  /** Gravure du monogramme au dos de l'horloge : le dos visible pendant la rotation n'est plus vide. */
  private addClockBackEngraving(root: Object3D): void {
    const back = root.getObjectByName('Back__dark_steel');
    if (!back) return;
    root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(back);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const diameter = Math.min(size.x, size.y) * 0.8;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.strokeStyle = '#e0a24a';
    context.fillStyle = '#e0a24a';
    context.lineWidth = 7;
    context.beginPath();
    context.arc(256, 256, 238, 0, TAU);
    context.stroke();
    context.lineWidth = 2;
    context.beginPath();
    context.arc(256, 256, 214, 0, TAU);
    context.stroke();
    for (let tick = 0; tick < 60; tick += 1) {
      const angle = (tick / 60) * TAU;
      const inner = tick % 5 === 0 ? 190 : 200;
      context.lineWidth = tick % 5 === 0 ? 4 : 2;
      context.beginPath();
      context.moveTo(
        256 + Math.cos(angle) * inner,
        256 + Math.sin(angle) * inner
      );
      context.lineTo(256 + Math.cos(angle) * 210, 256 + Math.sin(angle) * 210);
      context.stroke();
    }
    context.font = '700 170px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('AG', 256, 262);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const plane = new Mesh(
      new PlaneGeometry(diameter, diameter),
      new MeshStandardMaterial({
        map: texture,
        emissive: '#e0a24a',
        emissiveMap: texture,
        emissiveIntensity: 0.7,
        color: '#000000',
        metalness: 0,
        roughness: 0.6,
        transparent: true,
        depthWrite: false,
      })
    );
    plane.name = 'Engraving__AG';
    plane.rotation.y = Math.PI;
    plane.position.set(center.x, center.y, box.min.z - 0.003);
    root.add(plane);
  }

  /** Charte du prologue : titane brossé, graphite, laiton et un accent ambre (la lampe). */
  private tunePrologueMaterial(material: MeshStandardMaterial): void {
    const name = material.name;
    const brushed = (color: string, roughness: number): void => {
      material.color.set(color);
      material.metalness = 1;
      material.roughness = roughness;
      material.roughnessMap = this.identityRoughness;
      material.bumpMap = this.identityRoughness;
      material.bumpScale = 0.025;
    };
    if (
      /satin silver|satin titanium|rear titanium|blue steel|gear steel/.test(
        name
      )
    )
      brushed('#68757f', 0.55);
    else if (/polished rhodium|satin rhodium|frosted ice/.test(name)) {
      brushed('#b4bec6', 0.34);
      material.emissive.set('#2a2218');
    } else if (
      /cobalt enamel|midnight dial|dark recess|dark steel|graphite|brushed enamel/.test(
        name
      )
    ) {
      material.color.set('#141a22');
      material.roughness = Math.max(material.roughness, 0.45);
    } else if (/mechanism violet/.test(name)) {
      brushed('#9a7a3f', 0.4);
      material.emissive.set('#000000');
    } else if (/smoked crystal/.test(name)) {
      material.color.set('#aab4bd');
    } else if (/luminous cyan/.test(name)) {
      material.color.set('#e0a24a');
      material.emissive.set('#e0a24a');
      material.emissiveIntensity = 0.9;
    } else if (/luminous numerals/.test(name)) {
      material.color.set('#f2e6cf');
      material.emissive.set('#e8c98e');
      material.emissiveIntensity = 0.7;
    }
  }

  /** Réglages de matière communs aux objets usinés : métal sombre brossé, runes colorées. */
  private tuneCraftedMaterial(material: MeshStandardMaterial): void {
    material.envMap = this.metalReflection?.texture ?? null;
    material.envMapIntensity = 0.7;
    const name = material.name;
    if (name.includes('titanium')) {
      material.color.set('#68757f');
      material.metalness = 1;
      material.roughnessMap = this.identityRoughness;
      material.bumpMap = this.identityRoughness;
      material.bumpScale = 0.03;
      material.roughness = 0.62;
    }
    if (name.includes('obsidian')) {
      material.color.set('#1a212a');
      material.roughness = 0.3;
    }
    if (name.includes('graphite')) {
      material.color.set('#0b1118');
      material.roughness = 0.5;
    }
    if (name.includes('brass')) material.envMapIntensity = 0.9;
    if (name.includes('rune')) {
      // L'émission forte du GLB brûle les couleurs : on la ramène à l'accent.
      material.emissiveIntensity = 1.25;
      material.envMapIntensity = 0.2;
    }
    if (name.includes('sun')) {
      material.color.set('#ffc872');
      material.emissive.set('#ffb44a');
      material.emissiveIntensity = 1.5;
      material.envMapIntensity = 0;
    }
    if (name.includes('seal glow') || name.includes('pupil')) {
      material.emissiveIntensity = 1.6;
      material.envMapIntensity = 0;
    }
    if (name.includes('lens glass')) {
      material.roughness = 0.08;
      material.envMapIntensity = 1.1;
    }
    if (name.includes('energy')) {
      material.emissiveIntensity = 1.3;
      material.envMapIntensity = 0.2;
    }
  }

  private loadSelectionSeals(): void {
    const pivots: Object3D[] = [];
    this.loadCraftedFeature(
      '/models/selection_seals.glb',
      'selection',
      (object) => {
        if (/SEAL__0[1-3]_[a-z]+_pivot/.test(object.name)) pivots.push(object);
      },
      () => {
        if (pivots.length !== 3) return;
        pivots.sort((a, b) => a.name.localeCompare(b.name));
        pivots.forEach((pivot) =>
          this.selectionSeals.push({ pivot, base: pivot.position.clone() })
        );
      }
    );
  }

  private updateSelectionSeals(time: number, appear: number): void {
    const group = this.features.get('selection')?.group;
    if (!group || this.selectionSeals.length !== 3) return;
    group.scale.setScalar((this.compact ? 0.95 : 1.05) * (0.7 + 0.3 * appear));
    group.rotation.set(-0.06, 0.18, 0);
    // Chaque sceau lévite à son rythme et se retourne en apparaissant.
    this.selectionSeals.forEach(({ pivot, base }, index) => {
      const lift = Math.sin(time * 0.8 + index * 2.1) * 0.06;
      pivot.position.set(base.x, base.y, base.z + lift);
      pivot.rotation.set(
        0,
        (1 - appear) * Math.PI * (index % 2 === 0 ? 1.5 : -1.5) +
          Math.sin(time * 0.5 + index) * 0.22,
        0
      );
    });
  }

  private loadGalaxyAstrolabe(): void {
    const spins: Object3D[] = [];
    this.loadCraftedFeature(
      '/models/galaxy_astrolabe.glb',
      'galaxy',
      (object) => {
        if (/ASTRO__ring_\d_spin$/.test(object.name)) spins.push(object);
      },
      () => {
        spins.sort((a, b) => a.name.localeCompare(b.name));
        this.galaxyRingSpins.push(...spins);
      }
    );
  }

  private updateGalaxyAstrolabe(time: number, appear: number): void {
    const group = this.features.get('galaxy')?.group;
    if (!group || this.galaxyRingSpins.length === 0) return;
    group.scale.setScalar((this.compact ? 1.02 : 0.92) * (0.6 + 0.4 * appear));
    group.rotation.set(-0.28, 0.5 + Math.sin(time * 0.25) * 0.2, 0);
    // Les anneaux tournent autour de leur axe, plus vite à l'apparition.
    this.galaxyRingSpins.forEach((spin, index) => {
      const speed = 0.35 + index * 0.22;
      spin.rotation.y =
        time * speed * (index % 2 === 0 ? 1 : -1) +
        (1 - appear) * 4 * (index + 1);
    });
  }

  private restoreMorph(): void {
    this.morphRest.forEach((rest, node) => {
      node.position.copy(rest.position);
      node.scale.copy(rest.scale);
      node.rotation.copy(rest.rotation);
    });
    this.morphRest.clear();
  }

  private remember(node: Object3D): void {
    if (this.morphRest.has(node)) return;
    this.morphRest.set(node, {
      position: node.position.clone(),
      scale: node.scale.clone(),
      rotation: node.rotation.clone(),
    });
  }

  /** Paires pièce sortante → pièce entrante : chaque objet devient le suivant, sans disparaître. */
  private morphPairs(crossing: Crossing): MorphPair[] {
    const node = (name: string): Object3D | undefined =>
      this.craftedNodes.get(name);
    const pairs: MorphPair[] = [];
    const add = (
      from: Object3D | undefined,
      to: Object3D | undefined,
      spin: number,
      moveFrom = true,
      end = 0.5,
      begin = 0.45
    ): void => {
      if (from && to) pairs.push({ from, to, spin, moveFrom, end, begin });
    };
    const seals = this.selectionSeals.map((seal) => seal.pivot);
    const rings = this.galaxyRingSpins;
    if (crossing === 'stack-solutions') {
      // Chaque module du cube se transfère dans le bloc de la même offre.
      this.stackCubePivots.forEach((pivot, index) =>
        add(pivot, this.solutionsMonolithPivots[index], index % 2 ? -1.6 : 1.6)
      );
    } else if (crossing === 'solutions-selection') {
      // Les quatre blocs se tassent en trois sceaux ; le dernier rejoint le troisième.
      this.solutionsMonolithPivots.forEach((pivot, index) =>
        add(
          pivot,
          seals[Math.min(index, 2)],
          index % 2 ? 2.2 : -2.2,
          true,
          0.85,
          0.8
        )
      );
    } else if (crossing === 'selection-galaxy') {
      // Les sceaux s'ouvrent en anneaux : chaque anneau naît à la place d'un sceau.
      seals.forEach((pivot, index) =>
        add(pivot, rings[index], 3 - index, true, [1.5, 1.05, 0.7][index])
      );
    } else if (crossing === 'galaxy-ludora') {
      // Les anneaux se resserrent en dé, puis se fragmentent en tuiles du plateau.
      const die = node('DICE__die_pivot');
      rings.forEach((ring) => add(ring, die, 4));
      for (let k = 1; k <= 6; k += 1)
        add(rings[(k - 1) % 3], node(`DICE__tile_${k}_pivot`), 2, false);
    } else if (crossing === 'ludora-magnotes') {
      // Le dé s'aplatit en livre ; chaque tuile se relève en note.
      add(node('DICE__die_pivot'), node('BOOK__book_pivot'), 1.5);
      for (let k = 1; k <= 6; k += 1)
        add(node(`DICE__tile_${k}_pivot`), node(`NOTE__0${k}_pivot`), 2.4);
    } else if (crossing === 'magnotes-studies') {
      // Les notes se replient dans l'œil et la lentille, le livre se referme sur elle.
      const eye = node('EYE__eye_pivot');
      const lens = node('LENS__lens_pivot');
      for (let k = 1; k <= 6; k += 1)
        add(node(`NOTE__0${k}_pivot`), k <= 3 ? eye : lens, 2.2);
      add(node('BOOK__book_pivot'), lens, 1.2);
    } else if (crossing === 'studies-contact') {
      // L'œil devient le sceau de la lettre, la lentille son papier.
      const letter = node('LETTER__letter_pivot');
      add(node('EYE__eye_pivot'), letter, 2);
      add(node('LENS__lens_pivot'), letter, -2);
    }
    return pairs;
  }

  /**
   * Toupie : la forme sortante accélère jusqu'à devenir floue, la permutation se fait
   * au pic de vitesse (autour de 0,5), puis la forme entrante ralentit jusqu'au repos.
   */
  private spinGroups(crossing: Crossing, c: number): void {
    if (this.reduced) return;
    let out: Object3D | undefined;
    let incoming: Object3D | undefined;
    if (crossing === 'stack-solutions') {
      out = this.stackCube ?? undefined;
      incoming = this.features.get('solutions')?.group;
    } else if (crossing) {
      const [from, to] = crossing.split('-') as VisualScene[];
      out = this.features.get(from)?.group;
      incoming = this.features.get(to)?.group;
    }
    const turns = Math.PI * 6;
    const rise = smooth(c / 0.55);
    const fall = 1 - smooth((c - 0.45) / 0.55);
    if (out) {
      this.remember(out);
      out.rotation.y += rise * rise * turns;
      out.scale.multiplyScalar(1 - 0.3 * rise);
    }
    if (incoming) {
      this.remember(incoming);
      incoming.rotation.y -= fall * fall * turns;
      incoming.scale.multiplyScalar(1 - 0.3 * fall);
    }
  }

  /**
   * Métamorphose : pendant le passage, chaque pièce sortante glisse et pivote vers
   * l'emplacement de la pièce entrante, qui naît à l'emplacement de l'ancienne.
   */
  private applyMorph(crossing: Crossing, crossingProgress: number): void {
    if (!crossing || crossing === 'identity-stack') return;
    const pairs = this.morphPairs(crossing);
    if (pairs.length === 0) return;
    const travel = smooth((crossingProgress - 0.04) / 0.66);
    this.spinGroups(crossing, crossingProgress);
    this.medallion.updateMatrixWorld(true);
    const fromWorld = pairs.map(({ from }) =>
      from.getWorldPosition(new Vector3())
    );
    const toWorld = pairs.map(({ to }) => to.getWorldPosition(new Vector3()));
    const movedFrom = new Set<Object3D>();
    const movedTo = new Set<Object3D>();
    pairs.forEach(({ from, to, spin, moveFrom, end, begin }, index) => {
      if (moveFrom && from.parent && !movedFrom.has(from)) {
        movedFrom.add(from);
        this.remember(from);
        from.position.lerp(
          from.parent.worldToLocal(toWorld[index].clone()),
          travel
        );
        from.scale.multiplyScalar(1 + (end - 1) * travel);
        from.rotation.y += travel * spin;
      }
      if (to.parent && !movedTo.has(to)) {
        movedTo.add(to);
        this.remember(to);
        const start = to.parent.worldToLocal(fromWorld[index].clone());
        to.position.lerp(start, 1 - travel);
        to.scale.multiplyScalar(begin + (1 - begin) * travel);
        to.rotation.y -= (1 - travel) * spin;
      }
    });
  }

  /** Part de visibilité d'une forme : la plus opaque de ses matières, rapportée à sa base. */
  private featureAppear(scene: VisualScene): number {
    const feature = this.features.get(scene);
    if (!feature) return 1;
    let best = 0;
    feature.materials.forEach((material, index) => {
      if (feature.opacities[index] > 0)
        best = Math.max(best, material.opacity / feature.opacities[index]);
    });
    return clamp01(best);
  }

  private collectCraftedNode = (object: Object3D): void => {
    if (!/_(pivot|spin)$/.test(object.name)) return;
    this.craftedNodes.set(object.name, object);
    this.craftedBase.set(object.name, object.position.clone());
  };

  private loadLudoraDice(): void {
    this.loadCraftedFeature(
      '/models/ludora_dice.glb',
      'ludora',
      this.collectCraftedNode,
      () => undefined
    );
  }

  private updateLudoraDice(time: number, appear: number): void {
    const group = this.features.get('ludora')?.group;
    const die = this.craftedNodes.get('DICE__die_pivot');
    const board = this.craftedNodes.get('DICE__board_pivot');
    if (!group || !die || !board) return;
    group.scale.setScalar((this.compact ? 0.98 : 0.95) * (0.7 + 0.3 * appear));
    group.rotation.set(0.32, -0.35, 0);
    // Le dé ancien roule en arrivant, puis se pose sur une lente rotation.
    const tumble = (1 - appear) * Math.PI * 2.5;
    die.rotation.set(tumble + time * 0.25, time * 0.4 + tumble, time * 0.15);
    die.position.y = Math.sin(time * 0.9) * 0.06;
    // Les tuiles du plateau viennent se placer en couronne autour du dé.
    board.rotation.y = time * 0.18 - (1 - appear) * 1.6;
    for (let k = 1; k <= 6; k += 1) {
      const tile = this.craftedNodes.get(`DICE__tile_${k}_pivot`);
      const base = this.craftedBase.get(`DICE__tile_${k}_pivot`);
      if (!tile || !base) continue;
      const spread = 1 + (1 - appear) * 0.7;
      tile.position.set(
        base.x * spread,
        base.y + Math.sin(time * 1.1 + k) * 0.03,
        base.z * spread
      );
    }
  }

  private loadMagnotesGrimoire(): void {
    this.loadCraftedFeature(
      '/models/magnotes_grimoire.glb',
      'magnotes',
      this.collectCraftedNode,
      () => undefined
    );
  }

  private updateMagnotesGrimoire(time: number, appear: number): void {
    const group = this.features.get('magnotes')?.group;
    const book = this.craftedNodes.get('BOOK__book_pivot');
    if (!group || !book) return;
    group.scale.setScalar(
      (this.compact ? 0.94 : 0.88) * (0.75 + 0.25 * appear)
    );
    group.rotation.set(0.42, 0.28, 0);
    book.position.y =
      (this.craftedBase.get('BOOK__book_pivot')?.y ?? 0) +
      Math.sin(time * 0.7) * 0.05;
    // Six notes s'échappent du livre et se rangent en deux rangées.
    for (let k = 0; k < 6; k += 1) {
      const note = this.craftedNodes.get(`NOTE__0${k + 1}_pivot`);
      if (!note) continue;
      const column = k % 3;
      const row = Math.floor(k / 3);
      const settle = smooth(appear * 1.4 - k * 0.07);
      const tx = (column - 1) * 0.7;
      const ty = 0.05 + row * 0.55 + Math.sin(time * 0.9 + k * 1.3) * 0.05;
      note.position.set(
        tx * settle,
        -0.6 + (ty + 0.6) * settle,
        0.1 + row * 0.12 + (1 - settle) * 0.2
      );
      note.rotation.set(0, (1 - settle) * 1.4, (column - 1) * -0.06 * settle);
      note.scale.setScalar(0.4 + 0.6 * settle);
    }
  }

  private loadStudiesArtifacts(): void {
    this.loadCraftedFeature(
      '/models/studies_artifacts.glb',
      'studies',
      this.collectCraftedNode,
      () => undefined
    );
  }

  private updateStudiesArtifacts(time: number, appear: number): void {
    const group = this.features.get('studies')?.group;
    const eye = this.craftedNodes.get('EYE__eye_pivot');
    const gimbal = this.craftedNodes.get('EYE__gimbal_spin');
    const lens = this.craftedNodes.get('LENS__lens_pivot');
    if (!group || !eye || !gimbal || !lens) return;
    group.scale.setScalar(
      (this.compact ? 0.66 : 0.85) * (0.75 + 0.25 * appear)
    );
    group.rotation.set(-0.05, 0.2, 0);
    // L'œil balaie lentement la scène ; l'anneau de veille tourne autour.
    eye.rotation.set(
      Math.sin(time * 0.6) * 0.12,
      Math.sin(time * 0.4) * 0.35 + (1 - appear) * 1.2,
      0
    );
    gimbal.rotation.y = time * 0.5 + (1 - appear) * 3;
    lens.rotation.set(
      Math.sin(time * 0.5) * 0.1,
      -0.25 + Math.sin(time * 0.35) * 0.3 - (1 - appear) * 1.2,
      Math.sin(time * 0.3) * 0.08
    );
  }

  private loadContactLetter(): void {
    this.loadCraftedFeature(
      '/models/contact_letter.glb',
      'contact',
      this.collectCraftedNode,
      () => undefined
    );
  }

  private updateContactLetter(time: number, appear: number): void {
    const group = this.features.get('contact')?.group;
    const letter = this.craftedNodes.get('LETTER__letter_pivot');
    if (!group || !letter) return;
    group.scale.setScalar((this.compact ? 0.85 : 1.1) * (0.75 + 0.25 * appear));
    group.rotation.set(-0.08, 0.3, 0);
    // La lettre se retourne en arrivant puis flotte, sceau tourné vers le visiteur.
    letter.rotation.set(
      Math.sin(time * 0.6) * 0.05,
      Math.sin(time * 0.4) * 0.12 + (1 - appear) * Math.PI,
      Math.sin(time * 0.5) * 0.03
    );
    letter.position.y = Math.sin(time * 0.8) * 0.06;
  }

  private updateSolutionsMonolith(time: number, visibility: number): void {
    const group = this.features.get('solutions')?.group;
    if (!group || this.solutionsMonolithPivots.length !== 4) return;
    group.scale.setScalar(
      (this.compact ? 0.84 : 1.05) * (0.8 + 0.2 * visibility)
    );
    // Dégager la pièce du texte sur téléphone et sous le texte sur tablette.
    group.position.y = this.compact ? (innerWidth <= 600 ? 0.45 : -0.45) : 0;
    group.rotation.set(
      -0.08,
      0.5 + (this.reduced ? 0 : Math.sin(time * 0.4) * 0.18),
      0
    );
    // Les quatre blocs lévitent à des rythmes distincts : une offre chacun.
    this.solutionsMonolithPivots.forEach((pivot, index) => {
      const base = this.solutionsMonolithBase[index];
      const lift = this.reduced ? 0 : Math.sin(time * 0.9 + index * 1.7) * 0.05;
      const spread = 0.12 * (index - 1.5) * -1;
      pivot.position.set(base.x, base.y, base.z + lift - spread * 0.4);
    });
  }

  private loadStackCube(): void {
    this.enqueueGlb('/models/stack_cube.glb', (asset) => {
      if (this.destroyed) return;
      const pivots: Object3D[] = [];
      asset.scene.traverse((object) => {
        if (/CUBE__0[1-4]_[a-z]+_pivot/.test(object.name)) pivots.push(object);
        if (/CUBE__core_(glass|crystal)$/.test(object.name))
          this.stackCubeCore.push(object);
        if (/CUBE__core_ring_\d$/.test(object.name))
          this.stackCubeRings.push({
            object,
            base: new Euler().setFromQuaternion(object.quaternion),
          });
        object.layers.set(2);
        if (!(object instanceof Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = true;
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          material.envMap = this.metalReflection?.texture ?? null;
          material.envMapIntensity = 0.9;
          if (material.name.includes('titanium')) {
            // Métal brossé : stries et micro-entailles de la carte d'identité.
            material.color.set('#68757f');
            material.metalness = 1;
            material.envMapIntensity = 0.85;
            material.roughnessMap = this.identityRoughness;
            material.bumpMap = this.identityRoughness;
            material.bumpScale = 0.03;
            material.roughness = 0.62;
          }
          if (material.name.includes('rune')) {
            // L'émission forte du GLB brûle les couleurs : on la ramène à l'accent.
            material.emissiveIntensity = 1.25;
            material.envMapIntensity = 0.2;
          }
          if (material.name.includes('brass')) material.envMapIntensity = 0.6;
          if (material.name.includes('graphite')) {
            material.color.set('#0b1118');
            material.roughness = 0.5;
          }
          if (material.name.includes('core glass')) {
            material.transparent = true;
            material.opacity = 0.2;
            material.depthWrite = false;
            material.envMapIntensity = 1.4;
          }
          if (material.name.includes('core crystal')) {
            // L'émission du GLB sature en blanc sous le tone mapping.
            material.color.set('#2f7fc4');
            material.emissive.set('#3b9dff');
            material.emissiveIntensity = 1.3;
            material.envMapIntensity = 0;
          }
          material.needsUpdate = true;
        });
      });
      if (pivots.length !== 4) return;
      pivots.sort((a, b) => a.name.localeCompare(b.name));
      this.stackCubePivots.push(...pivots);
      asset.scene.visible = false;
      this.stackCube = asset.scene;
      this.stackCubeSparks = this.createSparks();
      asset.scene.add(this.stackCubeSparks);
      this.medallion.add(asset.scene);
      this.render(0);
    });
  }

  /**
   * Horloge éclatée → cube-puzzle. `burst` écarte les pièces de l'horloge,
   * `change` les remplace par les modules du cube (même quadrant, même famille),
   * `presence` referme le cube quand le récit passe à Solutions.
   */
  private updateStackAssembly(
    burst: number,
    change: number,
    presence: number,
    time: number
  ): void {
    if (this.clockBreakPivots.length !== 4) return;
    const unfold = smooth(burst);
    const clockGroup = this.features.get('stack')?.group;
    clockGroup?.scale.setScalar(0.705 + unfold * 0.08);
    if (clockGroup) clockGroup.visible = change < 0.999 && presence > 0.002;
    this.clockBreakPivots.forEach((pivot, index) => {
      const [x, y, z, tilt] = CLOCK_BREAK_OFFSETS[index];
      pivot.position.set(x * unfold, y * unfold, z * unfold);
      pivot.rotation.set(
        (index % 2 === 0 ? 1 : -1) * unfold * 0.22,
        (index === 3 ? -0.95 : index < 2 ? 0.4 : -0.4) * unfold,
        tilt * unfold + change * (index % 2 === 0 ? 1.2 : -1.2)
      );
      pivot.scale.setScalar((1 - unfold * 0.3) * (1 - change));
    });
    if (this.clockBreakMechanism)
      this.clockBreakMechanism.position.z = unfold * 0.72;

    const cube = this.stackCube;
    if (!cube) return;
    const visible = change > 0.002 && presence > 0.002;
    cube.visible = visible;
    if (!visible) return;
    const scale = this.compact ? 0.74 : 0.88;
    cube.scale.setScalar(scale);
    cube.rotation.set(
      -0.24,
      0.52 + (this.reduced ? 0 : Math.sin(time * 0.5) * 0.12) + (1 - presence),
      0
    );
    const clockScale = clockGroup?.scale.x ?? 0.78;
    this.stackCubePivots.forEach((pivot, index) => {
      const [cx, cz] = CUBE_CENTERS[index];
      const open = 1 + 0.62 * presence;
      const from = this.clockBreakPivots[index].position;
      const startX = (from.x * clockScale) / scale;
      const startY = (from.y * clockScale) / scale;
      pivot.position.set(
        startX + (cx * open - startX) * change,
        startY + (cz * open - startY) * change,
        0
      );
      pivot.scale.setScalar(change * presence);
    });
    const glow = change * presence * (1 + 0.5 * Math.sin(Math.PI * change));
    this.stackCubeCore.forEach((object) => object.scale.setScalar(glow));
    this.stackCubeRings.forEach(({ object, base }, index) => {
      object.scale.setScalar(glow);
      const speed = 0.35 + index * 0.18;
      object.rotation.set(
        base.x + time * speed,
        base.y + time * speed * 0.6,
        base.z - time * speed * 0.4
      );
    });
    if (this.stackCubeSparks) {
      this.stackCubeSparks.rotation.y = time * 0.12;
      this.stackCubeSparks.rotation.x = Math.sin(time * 0.2) * 0.1;
      (this.stackCubeSparks.material as PointsMaterial).opacity =
        0.9 * change * presence;
    }
  }

  /** Étincelles en suspension autour du cube : la touche magique. */
  private createSparks(): Points {
    const count = 90;
    const positions = new Float32Array(count * 3);
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      const radius = 1.15 + random() * 1.1;
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.9;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const sparks = new Points(
      geometry,
      new PointsMaterial({
        color: '#9fd8ff',
        size: 0.035,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      })
    );
    sparks.layers.set(2);
    return sparks;
  }

  private buildRibbonFeature(
    scene: VisualScene,
    counts: readonly number[],
    closed: boolean,
    glowColor: string,
    metalColor: string
  ): void {
    const group = new Group();
    const materials: Feature['materials'] = [];
    let start = 0;
    for (const count of counts) {
      const points = Array.from({ length: count }, (_, index) =>
        this.pointFor(scene, start + index, 0.5, 0)
      );
      start += count;
      const curve = new CatmullRomCurve3(points, closed, 'centripetal');
      const segments = closed ? 64 : 48;
      const glow = new MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.11,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const metal = new MeshStandardMaterial({
        color: metalColor,
        emissive: glowColor,
        emissiveIntensity: 0.65,
        metalness: 0.64,
        roughness: 0.24,
        transparent: true,
        opacity: 0.9,
      });
      group.add(
        new Mesh(new TubeGeometry(curve, segments, 0.2, 8, closed), glow),
        new Mesh(new TubeGeometry(curve, segments, 0.105, 10, closed), metal)
      );
      materials.push(glow, metal);
    }
    this.addFeature(scene, group, materials);
  }

  private addFeature(
    scene: VisualScene,
    group: Group,
    materials: Feature['materials'],
    partIndices = materials.map((_, index) => index)
  ): void {
    group.visible = false;
    this.medallionContent.add(group);
    materials.forEach((material) => {
      if (this.legacyMorphEnabled && material instanceof MeshStandardMaterial)
        this.attachLiquidMask(material, scene === 'identity');
    });
    this.features.set(scene, {
      group,
      materials,
      opacities: materials.map((material) => material.opacity),
      partIndices,
    });
  }

  private attachLiquidMask(
    material: MeshStandardMaterial,
    cohesive = false,
    clock = false
  ): void {
    if (this.liquidReveals.has(material)) return;
    const reveal = { value: 1 };
    this.liquidReveals.set(material, reveal);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uLiquidReveal = reveal;
      if (clock) {
        shader.uniforms.uClockMelt = this.clockMelt;
        shader.uniforms.uClockMorph = this.clockMorph;
        shader.uniforms.uClockDirect = this.clockDirect;
      }
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `uniform float uLiquidReveal;
         ${clock ? 'uniform float uClockMelt;\nuniform float uClockMorph;\nuniform float uClockDirect;\nattribute vec3 aClockTarget;\nattribute vec3 aClockBridgeTarget;\nattribute vec3 aClockDirectTarget;' : ''}
         varying vec3 vLiquidWorld;
         void main() {`
      );
      if (clock) {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
           float wetNormal = sin(3.14159265 * uClockMorph) * 0.68;
           objectNormal = normalize(mix(
             objectNormal,
             normalize(vec3(position.x * 0.14, 0.55 + position.y * 0.08, 0.82)),
             wetNormal
           ));`
        );
      }
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         ${
           clock
             ? `vec3 agShape = mix(position, aClockBridgeTarget,
           smoothstep(0.0, 0.5, uClockMorph));
         agShape = mix(agShape, aClockTarget,
           smoothstep(0.66, 0.98, uClockMorph));
         vec3 directShape = mix(position, aClockBridgeTarget,
           smoothstep(0.0, 0.48, uClockMorph));
         directShape = mix(directShape, aClockDirectTarget,
           smoothstep(0.6, 0.98, uClockMorph));
         transformed = mix(agShape, directShape, uClockDirect);
         float fluid = mix(0.5, 1.0, uClockDirect)
           * sin(3.14159265 * uClockMorph);
         transformed.x += sin(position.y * 5.2 + position.z * 3.1 + uClockMorph * 8.0)
           * fluid * 0.035;
         transformed.y += cos(position.x * 4.8 - position.z * 2.4 - uClockMorph * 7.0)
           * fluid * 0.03;
         transformed.z += sin(position.x * 5.1 + position.y * 4.3 + uClockMorph * 6.0)
           * fluid * 0.025;
         transformed.x += sin(position.y * 4.5 + position.x * 2.4)
           * uClockMelt * 0.09;
         transformed.y += cos(position.x * 4.2 - position.y * 2.8)
           * uClockMelt * 0.07;
         transformed += normal * sin(position.x * 7.0 + position.y * 5.0)
           * uClockMelt * 0.06;`
             : ''
         }
         vLiquidWorld = (modelMatrix * vec4(${clock ? 'transformed' : 'position'}, 1.0)).xyz;
         float meltLine = clamp(
           0.5 + vLiquidWorld.y * ${cohesive ? '0.15' : '0.13'}
             + sin(vLiquidWorld.x * ${cohesive ? '1.35' : '2.8'} + vLiquidWorld.y * ${cohesive ? '0.35' : '1.6'}) * ${cohesive ? '0.055' : '0.13'},
           0.04, 0.96
         );
         float transitionActive = step(0.005, uLiquidReveal)
           * (1.0 - step(0.995, uLiquidReveal));
         float meltBand = transitionActive
           * (1.0 - smoothstep(0.0, 0.18, abs(uLiquidReveal - meltLine)));
         transformed.x += sin(vLiquidWorld.y * 4.0 + vLiquidWorld.x * 1.8)
           * meltBand * 0.12;
         transformed.y -= meltBand * 0.1;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        'uniform float uLiquidReveal;\nvarying vec3 vLiquidWorld;\nfloat liquidEdge;\nvoid main() {'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
         liquidEdge = clamp(
           0.5 + vLiquidWorld.y * ${cohesive ? '0.15' : '0.13'}
             + sin(vLiquidWorld.x * ${cohesive ? '1.35' : '2.8'} + vLiquidWorld.y * ${cohesive ? '0.35' : '1.6'}) * ${cohesive ? '0.055' : '0.13'}
             + sin(vLiquidWorld.x * 5.4 - vLiquidWorld.y * 3.2) * ${cohesive ? '0.012' : '0.045'},
           0.04, 0.96
         );
         if (uLiquidReveal < ${clock ? '1.0 - liquidEdge' : 'liquidEdge'}) discard;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `float wetEdge = (1.0 - smoothstep(0.0, 0.07, uLiquidReveal - ${clock ? '(1.0 - liquidEdge)' : 'liquidEdge'}))
           * (1.0 - step(0.995, uLiquidReveal));
         gl_FragColor.rgb += vec3(0.13, 0.21, 0.26) * wetEdge;
         #include <dithering_fragment>`
      );
    };
  }

  private prepareClockMorph(root: Object3D): void {
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const positions = object.geometry.getAttribute('position');
      if (!positions) return;
      const indices = CLOCK_STROKE_MESHES[object.name];
      const curve = indices
        ? new CatmullRomCurve3(
            indices.map((index) => {
              const [x, y] = IDENTITY_POINTS[index];
              return new Vector3(x, y, 0);
            }),
            true,
            'centripetal'
          )
        : null;
      const target = new Float32Array(positions.count * 3);
      const bridgeTarget = new Float32Array(positions.count * 3);
      const directTarget = new Float32Array(positions.count * 3);
      const lane =
        object.name.startsWith('Case') ||
        object.name === 'Bezel__outer_polished_edge'
          ? 0
          : object.name.startsWith('Dial') ||
              object.name === 'Bezel__cyan_inner_lip'
            ? 1
            : 2;
      const laneStart = [0, 7, 12][lane];
      const laneCount = [7, 5, 12][lane];
      const directCurve = new CatmullRomCurve3(
        Array.from({ length: laneCount }, (_, index) =>
          this.pointFor('stack', laneStart + index, 0.5, 0)
        ),
        false,
        'centripetal'
      );
      const agCurve = new CatmullRomCurve3(
        IDENTITY_STROKES[lane === 2 ? 3 : lane].map((index) => {
          const [x, y] = IDENTITY_POINTS[index];
          return new Vector3(x, y, 0);
        }),
        false,
        'centripetal'
      );
      const source = new Vector3();
      const clockPoint = new Vector3();
      const strokePoint = new Vector3();
      const tangent = new Vector3();
      const directPoint = new Vector3();
      const bridgePoint = new Vector3();
      const inverse = object.matrixWorld.clone().invert();
      const centerZ = object.getWorldPosition(new Vector3()).z;
      const radius =
        object.name === 'Bezel__outer_polished_edge'
          ? 1.82
          : object.name === 'Bezel__cyan_inner_lip'
            ? 1.69
            : 1.5;
      for (let index = 0; index < positions.count; index += 1) {
        source.fromBufferAttribute(positions, index);
        strokePoint.copy(source);
        clockPoint.copy(source).applyMatrix4(object.matrixWorld);
        const distance = Math.hypot(clockPoint.x, clockPoint.y);
        const lowerEdge = Math.max(0, -clockPoint.y / 1.9) ** 3;
        const drip =
          lowerEdge * (0.2 + 0.16 * Math.sin(clockPoint.x * 3.8) ** 2);
        bridgePoint.set(
          clockPoint.x * 0.78 + 0.055 * Math.sin(clockPoint.y * 2.5),
          clockPoint.y * 0.73 - drip,
          0.2 +
            0.24 * Math.max(0, 1 - (distance / 2.1) ** 2) +
            0.12 * Math.sin(clockPoint.x * 3.2) * Math.cos(clockPoint.y * 2.6) +
            (clockPoint.z - centerZ) * 0.48
        );
        bridgePoint.applyMatrix4(inverse);
        const turn = (Math.atan2(clockPoint.y, clockPoint.x) + Math.PI) / TAU;
        const travel = (1 - Math.cos(turn * TAU)) * 0.5;
        directCurve.getPoint(travel, directPoint);
        directCurve.getTangent(travel, tangent).normalize();
        const radialOffset = Math.hypot(clockPoint.x, clockPoint.y) - radius;
        directPoint.x -= tangent.y * radialOffset * 0.22;
        directPoint.y += tangent.x * radialOffset * 0.22;
        directPoint.z += (clockPoint.z - centerZ) * 0.35;
        directPoint.applyMatrix4(inverse);
        if (curve) {
          curve.getPoint(turn, strokePoint);
          curve.getTangent(turn, tangent).normalize();
          const edge = (Math.hypot(clockPoint.x, clockPoint.y) - radius) * 1.5;
          strokePoint.x -= tangent.y * edge;
          strokePoint.y += tangent.x * edge;
          strokePoint.z =
            (object.name === 'Bezel__cyan_inner_lip' ? 0.45 : 0.24) +
            (clockPoint.z - centerZ) * 0.7;
          strokePoint.applyMatrix4(inverse);
        } else {
          agCurve.getPoint(travel, strokePoint);
          agCurve.getTangent(travel, tangent).normalize();
          strokePoint.x -= tangent.y * radialOffset * 0.22;
          strokePoint.y += tangent.x * radialOffset * 0.22;
          strokePoint.z = 0.25 + (clockPoint.z - centerZ) * 0.35;
          strokePoint.applyMatrix4(inverse);
        }
        strokePoint.toArray(target, index * 3);
        bridgePoint.toArray(bridgeTarget, index * 3);
        directPoint.toArray(directTarget, index * 3);
      }
      object.geometry.setAttribute(
        'aClockTarget',
        new Float32BufferAttribute(target, 3)
      );
      object.geometry.setAttribute(
        'aClockBridgeTarget',
        new Float32BufferAttribute(bridgeTarget, 3)
      );
      object.geometry.setAttribute(
        'aClockDirectTarget',
        new Float32BufferAttribute(directTarget, 3)
      );
      if (
        curve ||
        object.name === 'Case__cobalt_body' ||
        object.name === 'Dial__recessed_enamel'
      ) {
        const original = object.material;
        object.material = Array.isArray(original)
          ? original.map((material) => material.clone())
          : original.clone();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          material.side = DoubleSide;
          this.clockMorphMaterials.add(material);
          this.clockMorphColors.set(material, {
            start: material.color.clone(),
            end: new Color(
              object.name === 'Bezel__cyan_inner_lip' ? '#95bcd4' : '#b4d0df'
            ),
          });
        });
      }
    });
  }

  private buildClock(): void {
    this.clock.visible = false;
    this.clock.scale.setScalar(0.705);
    // La suspension garde un pivot au plafond pour une interaction future.
    this.lampSwing.name = 'LAMP_SWING_RUNTIME';
    this.lampSwing.visible = false;
    this.scene.add(this.lampSwing);
    // Le filament visible et cette source ponctuelle partagent le même centre.
    // Les autres éclairages du récit ne touchent ni la lampe ni l'horloge.
    const source = new Vector3(0, -1.76, 0);
    this.bulbLight.position.copy(source);
    this.bulbLight.layers.set(1);
    this.bulbLight.layers.enable(0);
    this.bulbLight.layers.enable(2);
    this.bulbLight.castShadow = true;
    this.bulbLight.shadow.camera.near = 0.08;
    this.bulbLight.shadow.camera.far = 9;
    this.bulbLight.shadow.bias = -0.0005;
    this.bulbLight.shadow.normalBias = 0.012;
    this.bulbLight.shadow.radius = 2;
    this.lampSwing.add(this.bulbLight);
    // Le même réflecteur éclaire le cadran et les formes qui lui succèdent.
    this.reflectorBounce.position.set(0, -1.28, 0);
    this.reflectorBounce.target.position.set(0.42, -4.02, -1.15);
    this.reflectorBounce.layers.set(2);
    this.reflectorBounce.layers.enable(0);
    this.lampSwing.add(this.reflectorBounce, this.reflectorBounce.target);
    this.filamentGlow.position.copy(source);
    this.filamentGlow.scale.set(1.05, 1.05, 1);
    this.filamentGlow.layers.set(1);
    this.lampSwing.add(this.filamentGlow);
    new GLTFLoader(this.loadingManager).load('/models/lamp.glb', (asset) => {
      if (this.destroyed) return;
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        object.layers.set(1);
        if (!(object instanceof Mesh)) return;
        object.castShadow =
          object.name.startsWith('Shade /') ||
          object.name.startsWith('Socket /') ||
          object.name.startsWith('Canopy /');
        object.receiveShadow = true;
        if (object.name === 'Bulb / clear glass envelope') {
          object.castShadow = false;
          object.receiveShadow = false;
          const glass = object.material;
          if (glass instanceof MeshPhysicalMaterial) {
            // Pas de transmission : elle redessine toute la scène opaque à chaque image.
            // Un verre transparent à vernis (clearcoat) donne le même aspect pour une ampoule.
            glass.transmission = 0;
            glass.ior = 1.45;
            glass.thickness = 0;
            glass.roughness = 0.045;
            glass.clearcoat = 0.2;
            glass.clearcoatRoughness = 0.03;
            glass.transparent = true;
            glass.opacity = 0.1;
            glass.depthWrite = false;
          }
        }
        // Autres verres de l'ampoule (tige) : même traitement, sans passe de transmission.
        if (
          object.name !== 'Bulb / clear glass envelope' &&
          object.material instanceof MeshPhysicalMaterial &&
          object.material.transmission > 0
        ) {
          const glass = object.material;
          glass.transmission = 0;
          glass.thickness = 0;
          glass.transparent = true;
          glass.opacity = 0.15;
          glass.depthWrite = false;
        }
        if (object.name === 'Filament / glowing coil') {
          const filament = object.material;
          if (filament instanceof MeshStandardMaterial) {
            this.filamentMaterial = filament;
            filament.emissive.set('#ff9d51');
          }
        }
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (material instanceof MeshStandardMaterial) materials.add(material);
        });
      });
      materials.forEach((material) => {
        this.tuneLampMaterial(material);
        this.lampMaterials.push(material);
      });
      this.lampSwing.add(asset.scene);
      this.lampReady = true;
      this.lampSwing.visible = true;
      this.render(0);
    });
    new GLTFLoader(this.loadingManager).load('/models/clock.glb', (asset) => {
      if (this.destroyed) return;
      asset.scene.traverse((object) => object.layers.set(2));
      const hands = ['HAND_HOUR', 'HAND_MINUTE', 'HAND_SECOND'].map((name) =>
        asset.scene.getObjectByName(name)
      );
      if (hands.some((hand) => !hand)) return;
      this.clockHands.push(...(hands as Object3D[]));
      if (this.legacyMorphEnabled) this.prepareClockMorph(asset.scene);
      this.addClockBackEngraving(asset.scene);
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const housing =
          object.name.startsWith('Case__') ||
          object.name.startsWith('Back__') ||
          object.name.startsWith('Bezel__') ||
          object.name.startsWith('Crystal__') ||
          object.name === 'Dial__recessed_enamel' ||
          object.name === 'Dial__brushed_face' ||
          object.name === 'Dial__circular_minute_track';
        if (housing) {
          const original = object.material;
          const originalMaterials = Array.isArray(original)
            ? original
            : [original];
          if (
            !originalMaterials.some((material) =>
              this.clockMorphMaterials.has(material)
            )
          )
            object.material = Array.isArray(original)
              ? original.map((material) => material.clone())
              : original.clone();
        }
        // Les aiguilles gardent leur ombre ; les index miniatures n'en ont pas besoin.
        object.castShadow =
          object.name.startsWith('HAND_') ||
          object.name === 'Case / cobalt body' ||
          object.name === 'Bezel / outer polished edge' ||
          object.name === 'Dial / brushed face';
        object.receiveShadow = true;
        if (object.name === 'Crystal / smoked glass') {
          object.renderOrder = 4;
          object.castShadow = false;
          object.receiveShadow = false;
        }
        if (object.name === 'Dial / brushed face') {
          const face = object.material;
          if (face instanceof MeshStandardMaterial) {
            face.emissive.set('#2a2012');
            face.emissiveIntensity = 0.16;
          }
        }
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          this.tunePrologueMaterial(material);
          materials.add(material);
          if (housing) {
            this.clockHousingMaterials.add(material);
            material.envMap = this.metalReflection?.texture ?? null;
            material.envMapIntensity = 0.28;
            material.needsUpdate = true;
            if (!object.name.startsWith('Crystal__')) {
              const dial = object.name.startsWith('Dial__');
              const back = object.name.startsWith('Back__');
              const seam =
                object.name.includes('inner_machined_seam') ||
                object.name.includes('cyan_inner_lip');
              this.pendantFinishes.set(material, {
                color: new Color(
                  dial
                    ? '#141a22'
                    : back
                      ? '#3a444d'
                      : seam
                        ? '#a8833f'
                        : object.name.startsWith('Case__')
                          ? '#68757f'
                          : '#8e9aa3'
                ),
                metalness: dial ? 0.55 : 0.95,
                roughness: dial ? 0.46 : seam ? 0.3 : 0.42,
              });
            }
          }
        });
      });
      materials.forEach((material) => {
        if (this.legacyMorphEnabled)
          this.attachLiquidMask(material, true, true);
        this.clockMaterials.push(material);
        this.clockFinishes.set(material, {
          color: material.color.clone(),
          metalness: material.metalness,
          roughness: material.roughness,
        });
        this.clockOpacities.push(material.opacity);
        this.clockTransparency.push(material.transparent);
        this.clockDepthWrite.push(material.depthWrite);
      });
      this.clock.add(asset.scene);
      this.clockReady = true;
      this.render(0);
    });
    new GLTFLoader(this.loadingManager).load('/models/pendant.glb', (asset) => {
      if (this.destroyed) return;
      const materials = new Set<MeshStandardMaterial>();
      asset.scene.traverse((object) => {
        object.layers.set(2);
        if (!(object instanceof Mesh)) return;
        object.castShadow =
          object.name.includes('pierced_bail') ||
          object.name.includes('welded_top_lug');
        object.receiveShadow = true;
        const meshMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        meshMaterials.forEach((material) => {
          if (!(material instanceof MeshStandardMaterial)) return;
          material.envMap = this.metalReflection?.texture ?? null;
          material.envMapIntensity = 0.42;
          this.tunePrologueMaterial(material);
          material.needsUpdate = true;
          materials.add(material);
        });
      });
      this.pendantMaterials.push(...materials);
      materials.forEach((material) => {
        this.pendantOpacities.set(material, material.opacity);
      });
      this.pendantTrim.add(asset.scene);
      this.render(0);
    });
  }

  private updateClock(
    scene: VisualScene,
    crossing: Crossing,
    clockAgProgress: number,
    directProgress: number | null,
    medallionOpening: boolean,
    shellPresence: number
  ): void {
    const active =
      medallionOpening ||
      directProgress !== null ||
      (scene === 'identity' && crossing === null)
        ? 1
        : 0;
    const morph = medallionOpening
      ? 0
      : directProgress === null
        ? smooth((clockAgProgress - 0.08) / 0.75)
        : smooth((directProgress - 0.08) / 0.75);
    const details = medallionOpening
      ? Number(clockAgProgress >= 0.5)
      : directProgress === null
        ? active * (1 - smooth((clockAgProgress - 0.25) / 0.22))
        : active * (1 - smooth((directProgress - 0.64) / 0.12));
    const strokes =
      (medallionOpening ? 1 : active) *
      (1 -
        smooth(
          medallionOpening
            ? 0
            : directProgress === null
              ? (clockAgProgress - 0.8) / 0.15
              : (directProgress - 0.64) / 0.12
        ));
    this.clock.scale.setScalar(
      medallionOpening ? 0.705 : 0.705 + 0.095 * morph
    );
    this.clockMorph.value = morph;
    this.clockDirect.value = directProgress === null ? 0 : 1;
    this.clockMelt.value = Math.sin(Math.PI * morph) * 0.015;
    this.clock.visible =
      this.clockReady &&
      shellPresence > 0.002 &&
      (medallionOpening || Math.max(details, strokes) > 0.002);
    this.pendantTrim.visible =
      medallionOpening && clockAgProgress < 0.5 && shellPresence > 0.002;
    this.pendantMaterials.forEach((material) => {
      material.opacity =
        (this.pendantOpacities.get(material) ?? 1) * shellPresence;
      const transparent = shellPresence < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite = !transparent;
    });
    this.clockHands.forEach((hand) => {
      hand.scale.setScalar(
        medallionOpening
          ? 1
          : 1 -
              0.94 *
                smooth(
                  directProgress === null
                    ? (clockAgProgress - 0.06) / 0.38
                    : (directProgress - 0.08) / 0.3
                )
      );
    });
    this.clockMorphColors.forEach(({ start, end }, material) => {
      material.color.copy(start).lerp(end, directProgress === null ? morph : 0);
    });
    this.lampSwing.visible = this.lampReady;
    this.bulbLight.intensity =
      (this.compact || this.heroTablet ? 24 : 30) * this.lampLab.power;
    this.reflectorBounce.intensity =
      (this.compact || this.heroTablet ? 17 : 22) * this.lampLab.power;
    this.filamentGlowMaterial.opacity =
      this.compact || this.heroTablet ? 0.35 : 0.45;
    if (this.filamentMaterial) this.filamentMaterial.emissiveIntensity = 2.7;
    this.clockMaterials.forEach((material, index) => {
      const finish = this.clockFinishes.get(material);
      if (finish) {
        const wet =
          material instanceof MeshPhysicalMaterial
            ? 0
            : Math.sin(Math.PI * morph) * 0.75;
        if (
          !this.clockMorphMaterials.has(material) ||
          directProgress !== null
        ) {
          material.color
            .copy(finish.color)
            .lerp(this.moltenMetalColor, wet * 0.68);
        }
        material.metalness = finish.metalness + (0.34 - finish.metalness) * wet;
        material.roughness = finish.roughness + (0.1 - finish.roughness) * wet;
        if (medallionOpening) {
          const pendant = this.pendantFinishes.get(material);
          if (pendant) {
            const blend = 1 - smooth((clockAgProgress - 0.25) / 0.5);
            material.color.copy(finish.color).lerp(pendant.color, blend);
            material.metalness +=
              (pendant.metalness - material.metalness) * blend;
            material.roughness +=
              (pendant.roughness - material.roughness) * blend;
          }
        }
      }
      const reveal = this.liquidReveals.get(material);
      if (reveal) reveal.value = 1;
      const presence = medallionOpening
        ? this.clockHousingMaterials.has(material)
          ? 1
          : details
        : directProgress !== null || this.clockMorphMaterials.has(material)
          ? strokes
          : details;
      material.opacity = this.clockOpacities[index] * presence * shellPresence;
      material.visible = presence * shellPresence > 0.002;
      const transparent =
        this.clockTransparency[index] || presence * shellPresence < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.depthWrite =
        this.clockDepthWrite[index] && presence * shellPresence >= 0.999;
    });
    if (!this.clock.visible || (medallionOpening && clockAgProgress < 0.99))
      return;
    const angles = clockHandAngles(new Date());
    this.clockHands[0].rotation.z = angles.hour;
    this.clockHands[1].rotation.z = angles.minute;
    this.clockHands[2].rotation.z = angles.second;
  }

  private updateLiquid(
    scene: VisualScene,
    crossing: Crossing,
    crossingProgress: number,
    clockAgProgress: number,
    accent: Color
  ): void {
    const progress =
      crossing !== null
        ? crossingProgress
        : scene === 'identity'
          ? clockAgProgress
          : 0;
    const presence =
      this.reduced || !this.animated
        ? 0
        : Math.pow(
            Math.sin(Math.PI * progress),
            scene === 'identity' && crossing === null ? 2.2 : 1.35
          );
    const identityMelt = scene === 'identity' && crossing === null;
    this.liquid.visible =
      !identityMelt &&
      crossing !== 'identity-stack' &&
      presence > 0.015 &&
      !this.compact;
    if (!this.liquid.visible) return;
    const swell = Math.sin(Math.PI * progress);
    this.liquid.position.set(
      identityMelt ? 0 : (progress - 0.5) * 1.15,
      identityMelt ? -0.04 + 0.1 * swell : 0.22 * swell,
      identityMelt ? 0.18 : -0.28 + 0.12 * swell
    );
    this.liquid.rotation.set(
      0.12 * Math.sin(progress * TAU),
      0.22 * Math.sin(progress * Math.PI),
      (progress - 0.5) * -0.48
    );
    this.liquid.scale.set(
      identityMelt ? 1.18 + 0.14 * swell : 1.5 + 0.25 * swell,
      identityMelt ? 0.84 + 0.08 * swell : 0.44 + 0.2 * swell,
      identityMelt ? 0.42 : 0.58
    );
    this.liquidMaterial.color.copy(accent).lerp(new Color('#b4e2ec'), 0.7);
    this.liquidMaterial.emissive
      .copy(accent)
      .multiplyScalar(identityMelt ? 0.42 : 0.26);
    this.liquidMaterial.opacity = (identityMelt ? 0.62 : 0.56) * presence;
    this.liquidMaterial.emissiveIntensity = identityMelt
      ? (0.4 + 0.2 * swell) * this.lampLab.power
      : 0.4;
    this.liquidUniforms.flow.value = progress * TAU;
    this.liquidUniforms.melt.value = swell;
  }

  private updateFeatures(
    scene: VisualScene,
    mix: number,
    progress: number,
    time: number,
    crossing: Crossing,
    crossingProgress: number,
    clockAgProgress: number,
    directProgress: number | null
  ): void {
    for (const project of [
      'identity',
      'stack',
      'solutions',
      'selection',
      ...PROJECT_SCENES,
      'studies',
      'contact',
    ] as VisualScene[]) {
      const feature = this.features.get(project);
      if (!feature) continue;
      let alpha =
        crossing === 'identity-stack'
          ? project === 'identity'
            ? 1
            : project === 'stack'
              ? smooth((crossingProgress - 0.35) / 0.42)
              : 0
          : crossing === 'stack-solutions'
            ? project === 'identity' || project === 'stack'
              ? 1 - smooth((crossingProgress - 0.24) / 0.54)
              : project === 'solutions'
                ? smooth((crossingProgress - 0.4) / 0.2)
                : 0
            : crossing === 'solutions-selection'
              ? project === 'solutions'
                ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                : project === 'selection'
                  ? smooth((crossingProgress - 0.4) / 0.2)
                  : 0
              : crossing === 'selection-galaxy'
                ? project === 'selection'
                  ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                  : project === 'galaxy'
                    ? smooth((crossingProgress - 0.4) / 0.2)
                    : 0
                : crossing === 'galaxy-ludora'
                  ? project === 'galaxy'
                    ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                    : project === 'ludora'
                      ? smooth((crossingProgress - 0.4) / 0.2)
                      : 0
                  : crossing === 'ludora-magnotes'
                    ? project === 'ludora'
                      ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                      : project === 'magnotes'
                        ? smooth((crossingProgress - 0.4) / 0.2)
                        : 0
                    : crossing === 'magnotes-studies'
                      ? project === 'magnotes'
                        ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                        : project === 'studies'
                          ? smooth((crossingProgress - 0.4) / 0.2)
                          : 0
                      : crossing === 'studies-contact'
                        ? project === 'studies'
                          ? 1 - smooth((crossingProgress - 0.5) / 0.2)
                          : project === 'contact'
                            ? smooth((crossingProgress - 0.4) / 0.2)
                            : 0
                        : project === scene
                          ? project === 'identity'
                            ? mix *
                              smooth(
                                this.state?.openingVariant === 'medallion'
                                  ? (clockAgProgress - 0.5) / 0.16
                                  : (clockAgProgress - 0.68) / 0.2
                              )
                            : mix
                          : project === this.previousScene
                            ? 1 - mix
                            : 0;
      if (directProgress !== null) {
        if (project === 'identity') alpha = 0;
        else if (project === 'stack')
          alpha = smooth((directProgress - 0.6) / 0.2);
        else alpha = 0;
      }
      if (this.state?.openingVariant === 'medallion') {
        if (crossing === 'identity-stack') {
          alpha =
            project === 'identity'
              ? 0
              : project === 'stack'
                ? smooth((crossingProgress - 0.5) / 0.19)
                : 0;
        } else if (crossing) {
          // Le monogramme ne revient pas après le prologue.
          if (project === 'identity') alpha = 0;
        } else {
          alpha = Number(
            project === scene &&
              (project !== 'identity' || clockAgProgress < 0.5)
          );
        }
      }
      feature.group.visible = alpha > 0.002;
      feature.materials.forEach((material, index) => {
        material.opacity = alpha * feature.opacities[index];
      });
      const crafted = this.craftedScenes.has(project);
      if (!crafted && project === 'ludora' && crossing === 'galaxy-ludora') {
        feature.materials.forEach((material, index) => {
          const row = Math.floor(index / 6);
          material.opacity *= smooth(
            (crossingProgress - 0.16 - row * 0.1) / 0.5
          );
        });
      }
      if (!crafted && project === 'ludora' && crossing === 'ludora-magnotes') {
        feature.materials.forEach((material, index) => {
          const card = Math.floor(index / 4);
          material.opacity *=
            1 - smooth((crossingProgress - 0.08 - card * 0.075) / 0.5);
        });
      }
      if (
        !crafted &&
        project === 'magnotes' &&
        crossing === 'ludora-magnotes'
      ) {
        feature.materials.forEach((material, index) => {
          material.opacity *= smooth(
            (crossingProgress - 0.08 - feature.partIndices[index] * 0.075) / 0.5
          );
        });
      }
      const dissolving =
        crossing !== null &&
        crossing !== 'identity-stack' &&
        this.state?.openingVariant !== 'medallion';
      feature.materials.forEach((material, index) => {
        if (!(material instanceof MeshStandardMaterial)) return;
        const reveal = this.liquidReveals.get(material);
        if (!reveal) return;
        reveal.value = dissolving
          ? clamp01(material.opacity / feature.opacities[index])
          : 1;
        if (dissolving) material.opacity = feature.opacities[index];
      });
    }
    this.updateSolutionsMonolith(
      time * 0.001,
      this.features.get('solutions')?.materials[0]?.opacity ?? 1
    );
    const motion = this.reduced ? 0 : time * 0.001;
    this.updateSelectionSeals(motion, this.featureAppear('selection'));
    this.updateGalaxyAstrolabe(motion, this.featureAppear('galaxy'));
    this.updateLudoraDice(motion, this.featureAppear('ludora'));
    this.updateMagnotesGrimoire(motion, this.featureAppear('magnotes'));
    this.updateStudiesArtifacts(motion, this.featureAppear('studies'));
    this.updateContactLetter(motion, this.featureAppear('contact'));
    const ludora = this.craftedScenes.has('ludora')
      ? undefined
      : this.features.get('ludora')?.group;
    if (ludora) {
      ludora.children.forEach((piece, index) => {
        piece.position.copy(this.positions[index]);
        piece.rotation.y = index * 0.52 + (this.reduced ? 0 : time * 0.11);
      });
    }
    const magnotes = this.craftedScenes.has('magnotes')
      ? undefined
      : this.features.get('magnotes')?.group;
    if (magnotes) {
      if (scene === 'magnotes') this.lastMagnotesProgress = progress;
      const cardProgress =
        crossing === 'ludora-magnotes'
          ? scene === 'magnotes'
            ? progress
            : 0
          : scene === 'magnotes'
            ? progress
            : this.lastMagnotesProgress;
      magnotes.children.forEach((card, index) => {
        const center = this.magnotesCenter(index, cardProgress);
        if (crossing === 'ludora-magnotes') {
          const first = index * 4;
          const gridCenter = new Vector3();
          for (let corner = 0; corner < 4; corner += 1) {
            gridCenter.add(this.pointFor('ludora', first + corner, 0.85, 0));
          }
          gridCenter.multiplyScalar(0.25);
          const detach = smooth(
            (crossingProgress - 0.08 - index * 0.075) / 0.5
          );
          center.lerp(gridCenter, 1 - detach);
          center.z += Math.sin(Math.PI * detach) * 0.85;
        }
        card.position.copy(center);
        card.rotation.z = this.magnotesAngle(index, cardProgress);
      });
    }
  }
}
