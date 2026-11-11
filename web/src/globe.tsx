import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface GlobeProps {
  ra: number;  // in degrees
  dec: number; // in degrees
  fov: number; // in degrees
}

export const CelestialGlobe: React.FC<GlobeProps> = ({ ra, dec, fov }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sphereGroupRef = useRef<THREE.Group | null>(null);
  const footprintMeshRef = useRef<THREE.LineLoop | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 200;
    const height = mount.clientHeight || 200;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // root rotating group
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    sphereGroupRef.current = sphereGroup;

    // celestial sphere wireframe grid (ra / dec circles)
    const sphereRadius = 1.0;
    
    // celestial equator
    const eqGeo = new THREE.BufferGeometry();
    const eqPts = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      eqPts.push(new THREE.Vector3(Math.cos(th) * sphereRadius, 0, Math.sin(th) * sphereRadius));
    }
    eqGeo.setFromPoints(eqPts);
    const eqMat = new THREE.LineBasicMaterial({ color: 0x888888, linewidth: 1 });
    sphereGroup.add(new THREE.Line(eqGeo, eqMat));

    // declination circles (+/- 30, +/- 60)
    [-60, -30, 30, 60].forEach(d => {
      const rad = (d * Math.PI) / 180;
      const r = Math.cos(rad) * sphereRadius;
      const y = Math.sin(rad) * sphereRadius;
      const decGeo = new THREE.BufferGeometry();
      const decPts = [];
      for (let i = 0; i <= 48; i++) {
        const th = (i / 48) * Math.PI * 2;
        decPts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
      }
      decGeo.setFromPoints(decPts);
      const decMat = new THREE.LineBasicMaterial({ color: 0x333333 });
      sphereGroup.add(new THREE.Line(decGeo, decMat));
    });

    // right ascension hour meridians (every 30 deg / 2 hours)
    for (let h = 0; h < 12; h++) {
      const th = (h / 12) * Math.PI * 2;
      const mGeo = new THREE.BufferGeometry();
      const mPts = [];
      for (let i = -16; i <= 16; i++) {
        const lat = (i / 16) * (Math.PI / 2);
        const r = Math.cos(lat) * sphereRadius;
        const y = Math.sin(lat) * sphereRadius;
        mPts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
      }
      mGeo.setFromPoints(mPts);
      const mMat = new THREE.LineBasicMaterial({ color: 0x282828 });
      sphereGroup.add(new THREE.Line(mGeo, mMat));
    }

    // dark sphere core
    const coreGeo = new THREE.SphereGeometry(sphereRadius * 0.995, 32, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    sphereGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // interactive drag rotation
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;

      sphereGroup.rotation.y += dx * 0.008;
      sphereGroup.rotation.x += dy * 0.008;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // render loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [expanded]);

  // update 3D square footprint polygon when ra/dec/fov change
  useEffect(() => {
    const sphereGroup = sphereGroupRef.current;
    if (!sphereGroup) return;

    if (footprintMeshRef.current) {
      sphereGroup.remove(footprintMeshRef.current);
      footprintMeshRef.current.geometry.dispose();
      footprintMeshRef.current = null;
    }

    const rad = Math.PI / 180;
    const half = Math.max(0.5, fov * 5); // visual size scaled slightly for visibility on macro sphere

    // 4 corners of footprint
    const corners = [
      { r: ra - half, d: dec - half },
      { r: ra + half, d: dec - half },
      { r: ra + half, d: dec + half },
      { r: ra - half, d: dec + half }
    ];

    const pts = corners.map(c => {
      const cr = c.r * rad;
      const cd = c.d * rad;
      const r = Math.cos(cd) * 1.01; // slightly elevated above sphere surface
      const y = Math.sin(cd) * 1.01;
      const x = Math.cos(cr) * r;
      const z = Math.sin(cr) * r;
      return new THREE.Vector3(x, y, z);
    });

    const fGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const fMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const fLine = new THREE.LineLoop(fGeo, fMat);

    sphereGroup.add(fLine);
    footprintMeshRef.current = fLine;

    // reorient sphere to point target toward camera
    const targetRaRad = ra * rad;
    const targetDecRad = dec * rad;
    sphereGroup.rotation.y = -targetRaRad - Math.PI / 2;
    sphereGroup.rotation.x = targetDecRad;
  }, [ra, dec, fov, expanded]);

  return (
    <div
      className={`border border-mono-800 bg-mono-950 font-mono transition-all duration-200 select-none ${
        expanded
          ? 'fixed inset-4 z-50 flex flex-col p-2 shadow-2xl'
          : 'relative w-48 h-48 flex flex-col'
      }`}
    >
      <div className="flex items-center justify-between px-2 py-1 border-b border-mono-850 text-[10px] text-mono-400">
        <span>3D Celestial Footprint</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-mono-300 hover:text-white uppercase font-bold"
        >
          {expanded ? '[Minimize]' : '[Expand]'}
        </button>
      </div>

      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="px-2 py-0.5 border-t border-mono-900 text-[9px] text-mono-500 flex justify-between">
        <span>RA: {ra.toFixed(1)}° DEC: {dec.toFixed(1)}°</span>
        <span>FOV: {fov.toFixed(2)}°</span>
      </div>
    </div>
  );
};
