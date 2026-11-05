import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useTheme } from '../context/ThemeContext';

export const ThreeBrandVisual: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera tuned to active theme
    const scene = new THREE.Scene();
    const bgColor = isDark ? '#050505' : '#F5F6F8';
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDark ? 0.04 : 0.035);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.2 : 1.05;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(isDark ? '#398BFF' : '#2962FF', isDark ? 3.5 : 3.0);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#9065E8', 2.4);
    fillLight.position.set(-4, -1, -3);
    scene.add(fillLight);

    const hemiLight = new THREE.HemisphereLight(
      isDark ? '#2962FF' : '#FFFFFF',
      isDark ? '#101010' : '#E5E7EB',
      isDark ? 0.8 : 1.0
    );
    scene.add(hemiLight);

    const corePointLight = new THREE.PointLight('#2962FF', 2.2, 4);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    // 5. Composite 8-Part Procedural AUREVIAN Emblem (THREE.Group)
    const emblemGroup = new THREE.Group();

    // Material 1: Polished Dark Steel (Primary Silhouette)
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2A303C,
      metalness: 0.92,
      roughness: 0.16,
      envMapIntensity: 1.6,
    });

    // Material 2: Lustrous Silver Platinum (#BFC5D2)
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xE2E5EC,
      metalness: 0.96,
      roughness: 0.12,
      envMapIntensity: 2.2,
    });

    // Material 3: Electric Aurevian Blue (#2962FF)
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x2962FF,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x1A3FAA,
      emissiveIntensity: 0.5,
    });

    // Material 4: Royal Purple Alloy (#9065E8)
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0x9065E8,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x4B2E83,
      emissiveIntensity: 0.4,
    });

    // Part 1: Primary Silhouette - Stylized 'A' Chevron Crest
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0, 1.3);
    chevronShape.lineTo(0.9, -0.7);
    chevronShape.lineTo(0.55, -0.7);
    chevronShape.lineTo(0, 0.45);
    chevronShape.lineTo(-0.55, -0.7);
    chevronShape.lineTo(-0.9, -0.7);
    chevronShape.closePath();

    const extrudeSettings = {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };
    const chevronGeo = new THREE.ExtrudeGeometry(chevronShape, extrudeSettings);
    chevronGeo.center();
    const primaryChevron = new THREE.Mesh(chevronGeo, steelMat);
    primaryChevron.castShadow = !isSoftwareGl;
    primaryChevron.receiveShadow = !isSoftwareGl;
    emblemGroup.add(primaryChevron);

    // Part 2: Inner Silver Floating Ingot
    const crossbarGeo = new THREE.BoxGeometry(0.72, 0.1, 0.24);
    const crossbar = new THREE.Mesh(crossbarGeo, silverMat);
    crossbar.position.set(0, -0.12, 0);
    crossbar.castShadow = !isSoftwareGl;
    emblemGroup.add(crossbar);

    // Part 3: Center Core - Octahedron Quantum Matrix
    const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x2962FF,
      metalness: 0.35,
      roughness: 0.1,
      emissive: 0x1A4FD8,
      emissiveIntensity: 1.2,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.15, 0);
    emblemGroup.add(coreMesh);

    // Part 4 & 5: Gimbal Rings
    const ring1Geo = new THREE.TorusGeometry(1.45, 0.022, 16, 80);
    const ring1 = new THREE.Mesh(ring1Geo, blueMat);
    ring1.rotation.x = Math.PI / 3;
    emblemGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(1.65, 0.018, 16, 80);
    const ring2 = new THREE.Mesh(ring2Geo, purpleMat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    emblemGroup.add(ring2);

    // Part 6: Perimeter Accent Silver Pins
    const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.18, 12);
    const pinsGroup = new THREE.Group();
    const pinCoords = [
      [1.45, 0, 0],
      [-1.45, 0, 0],
      [0, 1.45, 0],
      [0, -1.45, 0],
    ];
    for (const [px, py, pz] of pinCoords) {
      const pin = new THREE.Mesh(pinGeo, silverMat);
      pin.position.set(px, py, pz);
      pin.rotation.z = Math.PI / 2;
      pinsGroup.add(pin);
    }
    emblemGroup.add(pinsGroup);

    // Part 7: Soft Grounding Radial Contact Shadow for Light Background
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
      grad.addColorStop(0, 'rgba(40, 50, 70, 0.35)');
      grad.addColorStop(0.5, 'rgba(60, 70, 90, 0.12)');
      grad.addColorStop(1, 'rgba(245, 246, 248, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.6;
    scene.add(shadowPlane);

    emblemGroup.position.set(0, 0.1, 0);
    scene.add(emblemGroup);

    // Mouse tilt tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
    };

    window.addEventListener('mousemove', handlePointerMove);

    // Animation Loop
    let frameId = 0;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      frameId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      emblemGroup.rotation.y += 0.38 * dt;
      ring1.rotation.z += 0.22 * dt;
      ring2.rotation.x += 0.18 * dt;
      coreMesh.rotation.y -= 0.55 * dt;
      coreMesh.rotation.x += 0.28 * dt;

      targetRotationY = mouseX * 0.35;
      targetRotationX = -mouseY * 0.25;

      emblemGroup.rotation.x = THREE.MathUtils.damp(emblemGroup.rotation.x, targetRotationX, 4, dt);
      emblemGroup.position.y = 0.1 + Math.sin(currentTime * 0.0015) * 0.05;

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      chevronGeo.dispose();
      crossbarGeo.dispose();
      coreGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      pinGeo.dispose();
      shadowGeo.dispose();
      steelMat.dispose();
      silverMat.dispose();
      blueMat.dispose();
      purpleMat.dispose();
      coreMat.dispose();
      shadowMat.dispose();
      shadowTex.dispose();

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}>
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
