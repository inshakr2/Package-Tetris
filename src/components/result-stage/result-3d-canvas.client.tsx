"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { X } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  createPackingSceneBlocks,
  createPackingSceneBounds,
  type PackingSceneBlock,
  type PackingSceneBoundsInput
} from "@/lib/workspace/packing-scene";
import {
  RESULT_3D_KEYBOARD_HELP_TEXT,
  getResult3DKeyboardAction
} from "@/lib/workspace/result-3d-keyboard-controls";
import { PackedBlock } from "@/lib/workspace/types";

export type ThreeCameraPreset = "isometric" | "top" | "front" | "side";

interface Result3DCanvasProps {
  blocks: PackedBlock[];
  bounds: PackingSceneBoundsInput;
  selectedBlockTemplateId: string | null;
  chainPreviewBlockIds: Set<string>;
  cameraPreset: ThreeCameraPreset;
  resetToken: number;
  showOrientationArrows: boolean;
  spaceLabel: string;
  utilizationLabel: string;
  onSelectBlockTemplate: (blockTemplateId: string) => void;
  onClearSelection: () => void;
  fallbackAction?: {
    label: string;
    ariaLabel: string;
    onClick: () => void;
  };
}

interface HoverState {
  block: PackingSceneBlock;
  left: number;
  top: number;
}

const CAMERA_DISTANCE_MULTIPLIER = 1.45;
const CAMERA_MIN_POLAR_RAD = 0.08;

export function Result3DCanvas({
  blocks,
  bounds,
  selectedBlockTemplateId,
  chainPreviewBlockIds,
  cameraPreset,
  resetToken,
  showOrientationArrows,
  spaceLabel,
  utilizationLabel,
  onSelectBlockTemplate,
  onClearSelection,
  fallbackAction
}: Result3DCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const blockGroupRef = useRef<THREE.Group | null>(null);
  const blockMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const hoverFrameRef = useRef<number | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const renderSceneRef = useRef<(() => void) | null>(null);
  const pendingHoverPointRef = useRef<{
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "error">("loading");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const keyboardHelpId = useId();

  const sceneBounds = useMemo(
    () => createPackingSceneBounds(bounds),
    [bounds.depthMm, bounds.heightMm, bounds.widthMm]
  );
  const sceneBlocks = useMemo(
    () => createPackingSceneBlocks(blocks, bounds),
    [blocks, bounds.depthMm, bounds.heightMm, bounds.widthMm]
  );
  const selectedBlock =
    sceneBlocks.find((block) => block.blockTemplateId === selectedBlockTemplateId) ?? null;
  const statusText = `${spaceLabel}, ${blocks.length}개 블록, ${utilizationLabel}${
    selectedBlock ? `, 현재 ${selectedBlock.name} 강조` : ""
  }`;
  const orientationStatusText = showOrientationArrows
    ? "화살표는 처음 입력한 높이 방향입니다."
    : "방향 화살표 숨김";

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    setRenderState("loading");
    setRenderError(null);

    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let controls: OrbitControls | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let controlsChangeHandler: (() => void) | null = null;

    const cleanup = () => {
      disposed = true;
      resizeObserver?.disconnect();

      if (controls && controlsChangeHandler) {
        controls.removeEventListener("change", controlsChangeHandler);
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (hoverFrameRef.current !== null) {
        window.cancelAnimationFrame(hoverFrameRef.current);
        hoverFrameRef.current = null;
      }

      if (scene) {
        cleanupSceneObjects(scene);
      }

      controls?.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();

      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      sceneRef.current = null;
      blockGroupRef.current = null;
      blockMeshesRef.current = [];
      renderSceneRef.current = null;
      pendingHoverPointRef.current = null;
    };

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setClearColor(0xf7faf8, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.className = "result-three-canvas";
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7faf8);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
      cameraRef.current = camera;

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false;
      controls.target.set(0, sceneBounds.height / 2, 0);
      controls.minDistance = Math.max(sceneBounds.width, sceneBounds.depth, sceneBounds.height) * 0.55;
      controls.maxDistance = Math.max(sceneBounds.width, sceneBounds.depth, sceneBounds.height) * 4.2;
      controlsRef.current = controls;

      const blockGroup = new THREE.Group();
      blockGroupRef.current = blockGroup;
      scene.add(blockGroup);
      scene.add(createSpaceFrame(sceneBounds));
      scene.add(createFloorGrid(sceneBounds));

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
      keyLight.position.set(sceneBounds.width, sceneBounds.height * 2, sceneBounds.depth);
      scene.add(ambientLight, keyLight);

      const activeRenderer = renderer;
      const activeScene = scene;
      renderSceneRef.current = () => {
        if (disposed) {
          return;
        }

        activeRenderer.render(activeScene, camera);
      };
      controlsChangeHandler = () => {
        requestSceneRender();
      };
      controls.addEventListener("change", controlsChangeHandler);

      resizeObserver = new ResizeObserver(() => {
        resizeRendererToHost(host, activeRenderer, camera);
        requestSceneRender();
      });
      resizeObserver.observe(host);
      resizeRendererToHost(host, activeRenderer, camera);
      applyCameraPreset(cameraPreset, camera, controls, sceneBounds);
      renderSceneRef.current();
      setRenderState("ready");

      return cleanup;
    } catch (error) {
      cleanup();
      setRenderState("error");
      setRenderError(error instanceof Error ? error.message : "WebGL 렌더러를 초기화하지 못했습니다.");
      return undefined;
    }
  }, [sceneBounds]);

  useEffect(() => {
    const blockGroup = blockGroupRef.current;

    if (!blockGroup) {
      return;
    }

    clearObject3D(blockGroup);
    const meshes: THREE.Mesh[] = [];

    sceneBlocks.forEach((block) => {
      const isSelected = !selectedBlockTemplateId || selectedBlockTemplateId === block.blockTemplateId;
      const previewState = chainPreviewBlockIds.has(block.blockId) ? "new" : "base";
      const mesh = createBlockMesh(block, isSelected, previewState);
      const edges = createBlockEdges(block, isSelected, previewState);

      mesh.add(edges);

      if (showOrientationArrows) {
        mesh.add(createBlockOrientationArrow(block, isSelected, previewState));
      }

      blockGroup.add(mesh);
      meshes.push(mesh);
    });

    blockMeshesRef.current = meshes;
    requestSceneRender();
  }, [chainPreviewBlockIds, sceneBlocks, selectedBlockTemplateId, showOrientationArrows]);

  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) {
      return;
    }

    applyCameraPreset(cameraPreset, cameraRef.current, controlsRef.current, sceneBounds);
    requestSceneRender();
  }, [cameraPreset, resetToken, sceneBounds]);

  function requestSceneRender() {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      renderSceneRef.current?.();
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    pendingHoverPointRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY
    };

    if (hoverFrameRef.current !== null) {
      return;
    }

    hoverFrameRef.current = window.requestAnimationFrame(() => {
      hoverFrameRef.current = null;
      const point = pendingHoverPointRef.current;

      if (!point) {
        return;
      }

      const hit = pickBlockAt(point.clientX, point.clientY);

      if (!hit) {
        setHoverState(null);
        return;
      }

      setHoverState({
        block: hit.block,
        left: point.offsetX,
        top: point.offsetY
      });
    });
  }

  function handlePointerLeave() {
    pendingHoverPointRef.current = null;

    if (hoverFrameRef.current !== null) {
      window.cancelAnimationFrame(hoverFrameRef.current);
      hoverFrameRef.current = null;
    }

    setHoverState(null);
  }

  function handleClick(event: ReactPointerEvent<HTMLDivElement>) {
    const hit = pickBlockAt(event.clientX, event.clientY);

    if (!hit) {
      return;
    }

    onSelectBlockTemplate(hit.block.blockTemplateId);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const action = getResult3DKeyboardAction(event.key);

    if (!action) {
      return;
    }

    event.preventDefault();

    if (action.type === "clearSelection") {
      onClearSelection();
      return;
    }

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      return;
    }

    if (action.type === "reset") {
      applyCameraPreset(cameraPreset, camera, controls, sceneBounds);
      requestSceneRender();
      return;
    }

    if (action.type === "preset") {
      applyCameraPreset(action.preset, camera, controls, sceneBounds);
      requestSceneRender();
      return;
    }

    if (action.type === "zoom") {
      zoomCameraAroundTarget(camera, controls, action.scale);
      requestSceneRender();
      return;
    }

    if (action.type === "rotate") {
      rotateCameraAroundTarget(camera, controls, action.thetaDelta, action.phiDelta);
      requestSceneRender();
    }
  }

  function pickBlockAt(clientX: number, clientY: number) {
    const host = hostRef.current;
    const camera = cameraRef.current;

    if (!host || !camera) {
      return null;
    }

    const rect = host.getBoundingClientRect();
    pointerRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(pointerRef.current, camera);

    const [hit] = raycasterRef.current.intersectObjects(blockMeshesRef.current, false);

    if (!hit?.object.userData.sceneBlock) {
      return null;
    }

    return {
      block: hit.object.userData.sceneBlock as PackingSceneBlock
    };
  }

  return (
    <div className="result-three-shell">
      <div
        ref={hostRef}
        className="result-three-host"
        tabIndex={0}
        role="region"
        aria-roledescription="3D 적재 보기"
        aria-label={`${statusText}. ${orientationStatusText} 3D 적재 결과 조작 영역.`}
        aria-describedby={keyboardHelpId}
        data-render-state={renderState}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
      >
        <p id={keyboardHelpId} className="three-keyboard-help">
          {RESULT_3D_KEYBOARD_HELP_TEXT}
        </p>
        <div className="three-dimension-overlay" aria-label="3D 공간 치수">
          <span>
            <strong>가로</strong>
            {formatThreeDimensionMm(bounds.widthMm)}
          </span>
          <span>
            <strong>깊이</strong>
            {formatThreeDimensionMm(bounds.depthMm)}
          </span>
          <span>
            <strong>높이</strong>
            {formatThreeDimensionMm(bounds.heightMm)}
          </span>
        </div>
        {renderState === "loading" ? (
          <div className="projection-empty">
            <strong>3D 뷰 준비 중</strong>
            <span className="fine-print">적재 좌표를 WebGL 장면으로 변환하고 있습니다.</span>
          </div>
        ) : null}
        {renderState === "error" ? (
          <div className="projection-empty" role="alert">
            <strong>3D 렌더링을 사용할 수 없습니다.</strong>
            <span className="fine-print">{renderError ?? "이 브라우저에서 WebGL 초기화가 실패했습니다."}</span>
          </div>
        ) : null}
        {hoverState ? (
          <div
            className="three-tooltip"
            style={{
              left: hoverState.left,
              top: hoverState.top
            }}
          >
            <strong>{hoverState.block.name}</strong>
            <span>
              {hoverState.block.source.widthMm} / {hoverState.block.source.depthMm} / {hoverState.block.source.heightMm}mm
              · {hoverState.block.fragile ? "깨짐주의" : "일반"} · {hoverState.block.orientation.label}
            </span>
          </div>
        ) : null}
      </div>
      <div className="projection-status three-status" role="status">
        <span className="badge" data-tone={renderState === "error" ? "red" : "green"}>
          {renderState === "error" ? "2D 확인 권장" : `3D 표시 ${blocks.length}개`}
        </span>
        <span className="fine-print">
          {renderState === "error"
            ? "방향 화살표가 없어도 위/앞/옆 보기로 배치를 확인할 수 있습니다."
            : `${statusText} · ${orientationStatusText}`}
        </span>
      </div>
      {selectedBlock ? (
        <div className="three-selection-actions">
          <button
            className="secondary-button three-selection-clear-action"
            onClick={onClearSelection}
          >
            <X size={16} />
            강조 해제
          </button>
        </div>
      ) : null}
      {renderState === "error" && fallbackAction ? (
        <div className="three-fallback-actions">
          <button
            className="secondary-button three-fallback-action"
            aria-label={fallbackAction.ariaLabel}
            onClick={fallbackAction.onClick}
          >
            {fallbackAction.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function createBlockMesh(block: PackingSceneBlock, isSelected: boolean, previewState: "base" | "new") {
  const geometry = new THREE.BoxGeometry(block.size.width, block.size.height, block.size.depth);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(block.color),
    transparent: true,
    opacity: resolveBlockOpacity(isSelected, previewState),
    roughness: 0.72,
    metalness: 0.02,
    emissive: previewState === "new" ? new THREE.Color(0x234a32) : new THREE.Color(0x000000),
    emissiveIntensity: previewState === "new" ? 0.18 : 0
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(block.position.x, block.position.y, block.position.z);
  mesh.userData.sceneBlock = block;
  return mesh;
}

function createBlockEdges(block: PackingSceneBlock, isSelected: boolean, previewState: "base" | "new") {
  const boxGeometry = new THREE.BoxGeometry(block.size.width, block.size.height, block.size.depth);
  const geometry = new THREE.EdgesGeometry(boxGeometry);
  boxGeometry.dispose();
  const material = new THREE.LineBasicMaterial({
    color: previewState === "new" || isSelected ? 0x0f172a : 0xffffff,
    transparent: true,
    opacity: isSelected ? 0.9 : 0.64
  });
  return new THREE.LineSegments(geometry, material);
}

function createBlockOrientationArrow(
  block: PackingSceneBlock,
  isSelected: boolean,
  previewState: "base" | "new"
) {
  const direction = new THREE.Vector3(
    block.orientation.direction.x,
    block.orientation.direction.y,
    block.orientation.direction.z
  ).normalize();
  const origin = direction.clone().multiplyScalar(-block.orientation.length / 2);
  const arrow = new THREE.ArrowHelper(
    direction,
    origin,
    block.orientation.length,
    previewState === "new" ? 0x166534 : 0x111827,
    Math.max(block.orientation.length * 0.24, 0.12),
    Math.max(block.orientation.length * 0.16, 0.08)
  );
  const opacity = isSelected ? 0.96 : 0.48;

  arrow.name = "처음 입력한 높이 방향";
  arrow.userData.orientationLabel = block.orientation.label;
  arrow.traverse((object) => {
    object.renderOrder = 3;

    if ("material" in object) {
      const material = object.material;
      const materials = Array.isArray(material) ? material : [material];

      materials.forEach((item) => {
        if (!item) {
          return;
        }

        item.transparent = true;
        item.opacity = opacity;
        item.depthTest = false;
        item.depthWrite = false;
      });
    }
  });

  return arrow;
}

function createSpaceFrame(bounds: ReturnType<typeof createPackingSceneBounds>) {
  const boxGeometry = new THREE.BoxGeometry(bounds.width, bounds.height, bounds.depth);
  const edges = new THREE.EdgesGeometry(boxGeometry);
  boxGeometry.dispose();
  const material = new THREE.LineBasicMaterial({
    color: 0x607067,
    transparent: true,
    opacity: 0.72
  });
  const frame = new THREE.LineSegments(edges, material);
  frame.position.set(0, bounds.height / 2, 0);
  return frame;
}

function createFloorGrid(bounds: ReturnType<typeof createPackingSceneBounds>) {
  const grid = new THREE.GridHelper(Math.max(bounds.width, bounds.depth), 10, 0x607067, 0xd7ded8);
  grid.position.y = 0;
  grid.scale.x = bounds.width / Math.max(bounds.width, bounds.depth);
  grid.scale.z = bounds.depth / Math.max(bounds.width, bounds.depth);
  return grid;
}

function resolveBlockOpacity(isSelected: boolean, previewState: "base" | "new") {
  if (previewState === "new") {
    return 0.98;
  }

  return isSelected ? 0.94 : 0.24;
}

function resizeRendererToHost(
  host: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
) {
  const width = Math.max(host.clientWidth, 1);
  const height = Math.max(host.clientHeight, 1);

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function rotateCameraAroundTarget(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  thetaDelta: number,
  phiDelta: number
) {
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);

  spherical.theta += thetaDelta;
  spherical.phi = clampNumber(spherical.phi + phiDelta, CAMERA_MIN_POLAR_RAD, Math.PI - CAMERA_MIN_POLAR_RAD);
  offset.setFromSpherical(spherical);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}

function zoomCameraAroundTarget(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  scale: number
) {
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();

  if (distance <= 0) {
    return;
  }

  const minDistance = controls.minDistance || 0;
  const maxDistance = Number.isFinite(controls.maxDistance) ? controls.maxDistance : Number.POSITIVE_INFINITY;
  const nextDistance = clampNumber(distance * scale, minDistance, maxDistance);

  offset.setLength(nextDistance);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}

function applyCameraPreset(
  preset: ThreeCameraPreset,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  bounds: ReturnType<typeof createPackingSceneBounds>
) {
  const longest = Math.max(bounds.width, bounds.depth, bounds.height, 1);
  const distance = longest * CAMERA_DISTANCE_MULTIPLIER;
  const target = new THREE.Vector3(0, bounds.height / 2, 0);
  const positions: Record<ThreeCameraPreset, THREE.Vector3> = {
    isometric: new THREE.Vector3(distance, distance * 0.9, distance),
    top: new THREE.Vector3(0, distance * 1.25, 0.01),
    front: new THREE.Vector3(0, bounds.height * 0.55, distance * 1.25),
    side: new THREE.Vector3(distance * 1.25, bounds.height * 0.55, 0)
  };

  controls.target.copy(target);
  camera.position.copy(positions[preset]);
  camera.lookAt(target);
  controls.update();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatThreeDimensionMm(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}mm`;
}

function cleanupSceneObjects(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.GridHelper) {
      object.geometry?.dispose();
      disposeMaterial(object.material);
    }
  });
  scene.clear();
}

function clearObject3D(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry?.dispose();
      disposeMaterial(child.material);
    }
  });
  object.clear();
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  material.dispose();
}
