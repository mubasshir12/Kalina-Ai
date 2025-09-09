import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MoleculeData } from '../types';
import Tooltip from './Tooltip';
import { Info, Atom } from 'lucide-react';

// CPK colors for atoms
const atomColors: Record<string, number> = {
    H: 0xffffff,  // White
    C: 0x222222,  // Black
    N: 0x0000ff,  // Blue
    O: 0xff0000,  // Red
    F: 0x00ff00,  // Green
    CL: 0x00ff00, // Green
    BR: 0xa52a2a, // Brown
    I: 0x9400d3,  // Violet
    S: 0xffff00,  // Yellow
    P: 0xffa500,  // Orange
    B: 0xffc0cb,  // Pink
    SI: 0xdaa520, // Goldenrod
    DEFAULT: 0xcccccc, // Gray
};

const atomRadii: Record<string, number> = {
    H: 0.3,
    C: 0.7,
    N: 0.65,
    O: 0.6,
    F: 0.5,
    CL: 1.0,
    BR: 1.15,
    I: 1.35,
    S: 1.0,
    P: 1.0,
    DEFAULT: 0.6,
};


// Function to get high-contrast text color
const getTextColorForBackground = (hexColor: number): string => {
    const color = new THREE.Color(hexColor);
    // Simple luminance formula: (0.299*R + 0.587*G + 0.114*B)
    const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

interface MoleculeViewerProps {
    molecule: MoleculeData;
}

const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ molecule }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [showElectrons, setShowElectrons] = useState(false);

    useEffect(() => {
        if (!mountRef.current || !molecule) return;
        
        let animationFrameId: number;
        const currentMount = mountRef.current;

        // Cleanup previous scene
        while(currentMount.firstChild) {
            currentMount.removeChild(currentMount.firstChild);
        }

        const scene = new THREE.Scene();
        
        // Main Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0); // Transparent background
        currentMount.appendChild(renderer.domElement);
        
        // Label Renderer
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        labelRenderer.domElement.style.pointerEvents = 'none'; // Allow OrbitControls to work
        currentMount.appendChild(labelRenderer.domElement);

        // Camera
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 10;
        
        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        
        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Molecule group and centering logic
        const moleculeGroup = new THREE.Group();
        const positions = molecule.atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z));
        const center = new THREE.Vector3();
        positions.forEach(pos => center.add(pos));
        center.divideScalar(positions.length);
        moleculeGroup.position.sub(center);

        // Atoms and Labels
        molecule.atoms.forEach((atom, index) => {
            const radius = atomRadii[atom.element.toUpperCase()] || atomRadii.DEFAULT;
            const colorHex = atomColors[atom.element.toUpperCase()] || atomColors.DEFAULT;
            
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color: colorHex });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.copy(positions[index]);
            moleculeGroup.add(sphere);

            // Create and style the atom label
            const labelDiv = document.createElement('div');
            labelDiv.textContent = atom.element;
            const textColor = getTextColorForBackground(colorHex);
            labelDiv.style.color = textColor;
            labelDiv.style.fontSize = '14px';
            labelDiv.style.fontWeight = 'bold';
            labelDiv.style.textShadow = `0 0 4px ${textColor === '#FFFFFF' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'}`;

            const label = new CSS2DObject(labelDiv);
            label.position.copy(sphere.position);
            moleculeGroup.add(label);
        });

        // Bonds
        molecule.bonds.forEach(bond => {
            const start = positions[bond.from];
            const end = positions[bond.to];
            const bondVector = new THREE.Vector3().subVectors(end, start);
            const bondLength = bondVector.length();
            const bondCenter = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

            for (let i = 0; i < bond.order; i++) {
                const geometry = new THREE.CylinderGeometry(0.1, 0.1, bondLength, 16);
                const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
                const cylinder = new THREE.Mesh(geometry, material);

                if (bond.order > 1) { // Offset for double/triple bonds
                    const offsetVector = new THREE.Vector3();
                    if (bondVector.x !== 0 || bondVector.y !== 0) {
                        offsetVector.set(-bondVector.y, bondVector.x, 0).normalize();
                    } else { offsetVector.set(1, 0, 0); }
                    const offset = offsetVector.multiplyScalar((i - (bond.order - 1) / 2) * 0.2);
                    cylinder.position.copy(bondCenter).add(offset);
                } else {
                     cylinder.position.copy(bondCenter);
                }
                
                cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bondVector.clone().normalize());
                moleculeGroup.add(cylinder);
            }
        });

        scene.add(moleculeGroup);

        // Electron Logic
        const electronsGroup = new THREE.Group();
        if (showElectrons) {
            molecule.atoms.forEach((atom, index) => {
                const radius = atomRadii[atom.element.toUpperCase()] || atomRadii.DEFAULT;
                const electron = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0x00FFFF })
                );
                
                electron.userData = {
                    center: positions[index],
                    orbitRadius: radius + 0.5,
                    orbitSpeed: Math.random() * 0.02 + 0.01,
                    angle: Math.random() * Math.PI * 2,
                    axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                };
                electronsGroup.add(electron);
            });
            moleculeGroup.add(electronsGroup);
        }
        
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            
            if (showElectrons) {
                electronsGroup.children.forEach(electron => {
                    const data = electron.userData;
                    data.angle += data.orbitSpeed;
                    const q = new THREE.Quaternion().setFromAxisAngle(data.axis, data.angle);
                    const offset = new THREE.Vector3(data.orbitRadius, 0, 0).applyQuaternion(q);
                    electron.position.copy(data.center).add(offset);
                });
            }

            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        };
        animate();
        
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
                labelRenderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            scene.traverse(object => {
                 if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    const material = object.material as THREE.Material | THREE.Material[];
                    if(Array.isArray(material)) {
                        material.forEach(mat => mat.dispose());
                    } else {
                        material.dispose();
                    }
                }
            });
             if (currentMount) {
                while(currentMount.firstChild) {
                    currentMount.removeChild(currentMount.firstChild);
                }
            }
        };
    }, [molecule, showElectrons]);

    return (
        <div className="bg-neutral-100 dark:bg-gray-800/50 rounded-lg my-4 border border-neutral-200 dark:border-gray-700 overflow-hidden shadow-md">
            <div className="relative w-full aspect-video">
                <div ref={mountRef} className="absolute inset-0" />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                    <Tooltip content="Toggle Electron View">
                        <button
                            onClick={() => setShowElectrons(prev => !prev)}
                            className={`p-2 rounded-full transition-colors ${showElectrons ? 'bg-amber-500 text-white' : 'bg-black/30 text-white backdrop-blur-sm hover:bg-black/50'}`}
                            aria-label="Toggle Electron View"
                        >
                            <Atom className="h-5 w-5" />
                        </button>
                    </Tooltip>
                </div>
            </div>
             {(molecule.iupacName || molecule.molecularFormula) && (
                <div className="p-3 border-t border-neutral-200 dark:border-gray-700 text-sm">
                    {molecule.iupacName && (
                        <p className="font-semibold text-neutral-800 dark:text-gray-200">{molecule.iupacName}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-gray-400 mt-1">
                        {molecule.molecularFormula && (
                            <Tooltip content="Molecular Formula"><span className="cursor-help">{molecule.molecularFormula}</span></Tooltip>
                        )}
                        {molecule.molecularWeight && (
                            <Tooltip content="Molecular Weight"><span className="cursor-help">{molecule.molecularWeight} g/mol</span></Tooltip>
                        )}
                         <Tooltip content={
                            <div className="max-w-xs text-left">
                                <h4 className="font-bold mb-1">About this model</h4>
                                <p>This 3D model is a representation of the molecule's lowest energy conformation, sourced from PubChem.</p>
                            </div>
                         }>
                           <Info className="h-4 w-4 ml-auto cursor-help" />
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoleculeViewer;