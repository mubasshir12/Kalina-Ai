import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const particleCss = `
.particle-universe-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    background: #000;
}
.particle-canvas {
    display: block;
    width: 100%;
    height: 100%;
}
`;

const ParticleUniverse: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
        let particles: THREE.Points, lines: THREE.LineSegments, rays: THREE.Mesh[];
        let velocities: Float32Array, originalColors: Float32Array, glowTimers: Float32Array;
        let animationFrameId: number;
        let mouseX = 0;
        let mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;
        const collisionThreshold = 0.5;


        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
            camera.position.z = 25;

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.domElement.className = 'particle-canvas';
            currentMount.appendChild(renderer.domElement);
            
            const createGlowTexture = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const context = canvas.getContext('2d');
                if (!context) return null;

                const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
                gradient.addColorStop(0, 'rgba(255,255,255,1)');
                gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
                gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');

                context.fillStyle = gradient;
                context.fillRect(0, 0, 128, 128);

                return new THREE.CanvasTexture(canvas);
            };
            const glowTexture = createGlowTexture();
            
            const particleCount = 1500;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const colorPalette = [new THREE.Color(0xffffff), new THREE.Color(0x87CEEB), new THREE.Color(0x9370DB)];

            velocities = new Float32Array(particleCount * 3);
            glowTimers = new Float32Array(particleCount);

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 40;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

                const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
                
                velocities[i * 3] = (Math.random() - 0.5) * 0.02;
                velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
                velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
            }
            
            originalColors = new Float32Array(colors);

            const particlesGeometry = new THREE.BufferGeometry();
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.15,
                map: glowTexture,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                vertexColors: true,
            });

            particles = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particles);

            const lineGeometry = new THREE.BufferGeometry();
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x8888ff,
                transparent: true,
                opacity: 0.05,
                blending: THREE.AdditiveBlending,
            });
            lines = new THREE.LineSegments(lineGeometry, lineMaterial);
            scene.add(lines);

            const lightSourcePosition = new THREE.Vector3(-40, 30, -30);
            
            const createRayTexture = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 256;
                const context = canvas.getContext('2d');
                if (!context) return null;
                const gradient = context.createLinearGradient(0, 0, 0, 256);
                gradient.addColorStop(0, 'rgba(255, 250, 230, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 250, 230, 0)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, 1, 256);
                return new THREE.CanvasTexture(canvas);
            };

            rays = [];
            const rayCount = 15;
            const rayMaterial = new THREE.MeshBasicMaterial({
                map: createRayTexture(),
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.1,
                depthWrite: false,
            });

            for (let i = 0; i < rayCount; i++) {
                const rayGeometry = new THREE.PlaneGeometry(2, 80);
                const ray = new THREE.Mesh(rayGeometry, rayMaterial);
                ray.position.copy(lightSourcePosition);
                ray.lookAt(scene.position);
                ray.rotation.z = (Math.random() - 0.5) * Math.PI;
                ray.rotation.y += (Math.random() - 0.5) * 0.5;
                scene.add(ray);
                rays.push(ray);
            }


            window.addEventListener('resize', onWindowResize);
            document.addEventListener('mousemove', onDocumentMouseMove);

            animate();

            function animate() {
                animationFrameId = requestAnimationFrame(animate);

                const time = Date.now() * 0.0005;
                const positionsAttribute = particles.geometry.attributes.position as THREE.BufferAttribute;
                const colorsAttribute = particles.geometry.attributes.color as THREE.BufferAttribute;
                const bounds = 20;

                const sunColor = new THREE.Color(0xfff5e1);
                const collisionGlowColor = new THREE.Color(0xffff99);
                const maxIlluminationDist = 50;
                const particlePosition = new THREE.Vector3();
                const originalColor = new THREE.Color();

                for (let i = 0; i < particleCount; i++) {
                    const i3 = i * 3;
                    positionsAttribute.array[i3] += velocities[i3];
                    positionsAttribute.array[i3 + 1] += velocities[i3 + 1];
                    positionsAttribute.array[i3 + 2] += velocities[i3 + 2];

                    if (Math.abs(positionsAttribute.array[i3]) > bounds) velocities[i3] *= -1;
                    if (Math.abs(positionsAttribute.array[i3 + 1]) > bounds) velocities[i3 + 1] *= -1;
                    if (Math.abs(positionsAttribute.array[i3 + 2]) > bounds) velocities[i3 + 2] *= -1;
                    
                    particlePosition.set(
                        positionsAttribute.array[i3],
                        positionsAttribute.array[i3 + 1],
                        positionsAttribute.array[i3 + 2]
                    );
                    originalColor.setRGB(originalColors[i3], originalColors[i3 + 1], originalColors[i3 + 2]);
                    
                    const distanceToSun = particlePosition.distanceTo(lightSourcePosition);
                    const illuminationFactor = Math.pow(1 - Math.min(distanceToSun / maxIlluminationDist, 1), 2);
                    
                    const illuminatedColor = originalColor.clone().lerp(sunColor, illuminationFactor * 0.8);

                    if (glowTimers[i] > 0) {
                        glowTimers[i] -= 0.05;
                        const intensity = glowTimers[i];
                        const finalColor = illuminatedColor.clone().lerp(collisionGlowColor, intensity);
                        colorsAttribute.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
                    } else {
                        colorsAttribute.setXYZ(i, illuminatedColor.r, illuminatedColor.g, illuminatedColor.b);
                    }
                }

                for (let i = 0; i < particleCount; i++) {
                    if (glowTimers[i] > 0) continue;
                    for (let k = 0; k < 2; k++) {
                        const j = Math.floor(Math.random() * particleCount);
                        if (i === j || glowTimers[j] > 0) continue;

                        const i3 = i * 3;
                        const j3 = j * 3;
                        const dx = positionsAttribute.array[i3] - positionsAttribute.array[j3];
                        const dy = positionsAttribute.array[i3 + 1] - positionsAttribute.array[j3 + 1];
                        const dz = positionsAttribute.array[i3 + 2] - positionsAttribute.array[j3 + 2];
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        if (distance < collisionThreshold) {
                            [velocities[i3], velocities[j3]] = [velocities[j3], velocities[i3]];
                            [velocities[i3 + 1], velocities[j3 + 1]] = [velocities[j3 + 1], velocities[i3 + 1]];
                            [velocities[i3 + 2], velocities[j3 + 2]] = [velocities[j3 + 2], velocities[i3 + 2]];
                            glowTimers[i] = 1.0;
                            glowTimers[j] = 1.0;
                            break;
                        }
                    }
                }

                positionsAttribute.needsUpdate = true;
                colorsAttribute.needsUpdate = true;
                
                rays.forEach((ray, i) => { 
                    ray.rotation.z += 0.001;
                    (ray.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(time * 0.5 + i) * 0.05;
                });
                
                lines.geometry.setDrawRange(0, 0);

                camera.position.x += (mouseX - camera.position.x) * 0.02;
                camera.position.y += (-mouseY - camera.position.y) * 0.02;
                camera.lookAt(scene.position);
                
                renderer.render(scene, camera);
            }
        }

        function onWindowResize() {
            if (!renderer || !camera) return;
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
            camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        }

        function onDocumentMouseMove(event: MouseEvent) {
            mouseX = (event.clientX - windowHalfX) / 20;
            mouseY = (event.clientY - windowHalfY) / 20;
        }

        init();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', onWindowResize);
            document.removeEventListener('mousemove', onDocumentMouseMove);
            
            scene.traverse(object => {
                if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
                    object.geometry.dispose();
                    const material = object.material as THREE.Material | THREE.Material[];
                    if(Array.isArray(material)) {
                        material.forEach(mat => {
                           if ((mat as any).map) (mat as any).map.dispose();
                           mat.dispose()
                        });
                    } else {
                        if ((material as any).map) (material as any).map.dispose();
                        material.dispose();
                    }
                }
            });
            renderer?.dispose();
            if (currentMount && renderer?.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
        };

    }, []);

    return (
        <>
            <style>{particleCss}</style>
            <div ref={mountRef} className="particle-universe-container" />
        </>
    );
};

export default ParticleUniverse;
