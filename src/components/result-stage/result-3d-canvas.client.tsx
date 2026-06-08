"use client";

import {
  useEffect,
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
import { PackedBlock } from "@/lib/workspace/types";

export type ThreeCameraPreset = "isometric" | "top" | "front" | "side";

interface Result3DCanvasProps {
  blocks: PackedBlock[];
  bounds: PackingSceneBoundsInput;
  selectedBlockTemplateId: string | null;
  chainPreviewBlockIds: Set<string>;
  cameraPreset: ThreeCameraPreset;
  resetToken: number;
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

export function Result3DCanvas({
  blocks,
  bounds,
  selectedBlockTemplateId,
  chainPreviewBlockIds,
  cameraPreset,
  resetToken,
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
      blockGroup.add(mesh);
      meshes.push(mesh);
    });

    blockMeshesRef.current = meshes;
    requestSceneRender();
  }, [chainPreviewBlockIds, sceneBlocks, selectedBlockTemplateId]);

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
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!camera || !controls) {
      return;
    }

    if (event.key === "Escape") {
      onClearSelection();
      return;
    }

    if (event.key === "0") {
      event.preventDefault();
      applyCameraPreset("isometric", camera, controls, sceneBounds);
      return;
    }

    if (event.key === "1" || event.key === "2" || event.key === "3") {
      event.preventDefault();
      applyCameraPreset(event.key === "1" ? "top" : event.key === "2" ? "front" : "side", camera, controls, sceneBounds);
      return;
    }

    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      const direction = event.key === "-" ? 1.12 : 0.88;
      camera.position.multiplyScalar(direction);
      controls.update();
      requestSceneRender();
      return;
    }

    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const angle = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -0.16 : 0.16;
      const axis = event.key === "ArrowUp" || event.key === "ArrowDown" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      camera.position.sub(controls.target).applyAxisAngle(axis, angle).add(controls.target);
      controls.update();
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
        role="img"
        aria-label={`${statusText}. 드래그로 회전, 휠 또는 더하기/빼기로 확대 축소, 1 상면, 2 정면, 3 측면, 0 리셋, Esc 선택 해제.`}
        data-render-state={renderState}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
      >
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
              · {hoverState.block.fragile ? "깨짐주의" : "일반"}
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
            ? "3D가 뜨지 않아도 위/앞/옆 보기로 배치를 확인할 수 있습니다."
            : statusText}
        </span>
      </div>
      {selectedBlock ? (
        <div className="three-selection-actions">
          <button
            className="secondary-button three-selection-clear-action"
            onClick={onClearSelection}
          >
            <X size={16} />
            전체 보기
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
