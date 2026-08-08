import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Background3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Canvas Container
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 1. Node Grid Network (Particles + Lines)
    const count = 75;
    const positions = new Float32Array(count * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      velocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: (Math.random() - 0.5) * 0.015,
        z: (Math.random() - 0.5) * 0.008,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.22,
      transparent: true,
      opacity: 0.8,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Dynamic Connections Lines
    const linesGeometry = new THREE.BufferGeometry();
    const maxConnections = count * 6;
    const linePositions = new Float32Array(maxConnections * 6);
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      transparent: true,
      opacity: 0.18,
    });

    const lines = new THREE.LineSegments(linesGeometry, linesMaterial);
    scene.add(lines);

    // 2. Holographic Sphere & Orbital Rings
    const sphereGroup = new THREE.Group();
    sphereGroup.position.set(12, -4, -5);

    const sphereGeo = new THREE.IcosahedronGeometry(4.5, 2);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const holoSphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphereGroup.add(holoSphere);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.3,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    sphereGroup.add(coreMesh);

    // Orbital Rings
    const ringGeo = new THREE.TorusGeometry(6.2, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.4,
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    sphereGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.y = Math.PI / 4;
    sphereGroup.add(ring2);

    scene.add(sphereGroup);

    // Mouse Parallax Effect
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Update node positions
      const pos = particleGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Bounce boundaries
        if (Math.abs(pos[i * 3]) > 20) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 20) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 15) velocities[i].z *= -1;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Re-calculate line connections
      let lineIndex = 0;
      const linePos = linesGeometry.attributes.position.array as Float32Array;
      const connectionDist = 6.5;

      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDist) {
            linePos[lineIndex++] = pos[i * 3];
            linePos[lineIndex++] = pos[i * 3 + 1];
            linePos[lineIndex++] = pos[i * 3 + 2];

            linePos[lineIndex++] = pos[j * 3];
            linePos[lineIndex++] = pos[j * 3 + 1];
            linePos[lineIndex++] = pos[j * 3 + 2];
          }
        }
      }
      linesGeometry.setDrawRange(0, lineIndex / 3);
      linesGeometry.attributes.position.needsUpdate = true;

      // Rotate 3D Hologram
      sphereGroup.rotation.y = elapsedTime * 0.15;
      ring1.rotation.z = elapsedTime * 0.25;
      ring2.rotation.x = elapsedTime * 0.2;

      // Smooth Camera Motion (Parallax)
      camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 2 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60"
      aria-hidden="true"
    />
  );
}
