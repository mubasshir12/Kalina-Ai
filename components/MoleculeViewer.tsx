import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MoleculeData } from '../types';
import Tooltip from './Tooltip';
import { Info, Atom, Maximize, ChevronDown } from 'lucide-react';

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
    H: 0.3, C: 0.7, N: 0.65, O: 0.6, F: 0.5,
    CL: 1.0, BR: 1.15, I: 1.35, S: 1.0, P: 1.0,
    DEFAULT: 0.6,
};

const vdwRadii: Record<string, number> = {
    H: 1.1, C: 1.7, N: 1.55, O: 1.52, F: 1.47,
    CL: 1.75, BR: 1.85, I: 1.98, S: 1.8, P: 1.8,
    DEFAULT: 1.5,
};

type MoleculeStyle = 'ballAndStick' | 'sticks' | 'wireframe' | 'spaceFilling';

// Function to get high-contrast text color
const getTextColorForBackground = (hexColor: number): string => {
    const color = new THREE.Color(hexColor);
    // Using YIQ formula for luminance
    const luminance = (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

/**
 * Creates a THREE.Sprite object to act as a world-space label for an atom.
 * This uses a CanvasTexture, which allows the label to be part of the WebGL scene
 * and be correctly depth-tested and occluded by other objects. It also adds an
 * outline to the text for better visibility against various backgrounds.
 */
const createAtomLabelSprite = (text: string, atomColorHex: number, atomRadius: number): THREE.Sprite | null => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    const fontSize = 100; // High resolution for crisp text
    const padding = 20; // Padding for the outline
    context.font = `bold ${fontSize}px Arial`;
    
    // Set canvas size based on text and padding
    const textMetrics = context.measureText(text);
    canvas.width = textMetrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;

    // Re-apply settings after canvas resize and ensure canvas is clear
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    const textColor = getTextColorForBackground(atomColorHex);
    // Use a semi-transparent dark or light color for a softer outline
    const outlineColor = textColor === '#000000' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

    // Draw outline
    context.strokeStyle = outlineColor;
    context.lineWidth = 16; // Outline thickness
    context.strokeText(text, canvas.width / 2, canvas.height / 2);

    // Draw text fill
    context.fillStyle = textColor;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
    });

    const sprite = new THREE.Sprite(material);
    // Scale the sprite to be slightly larger than the atom sphere
    const scale = atomRadius * 1.5;
    sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);
    
    return sprite;
};


interface MoleculeViewerProps {
    molecule: MoleculeData;
    onMaximize?: () => void;
    isFullScreen?: boolean;
}

const StyleRadioButton: React.FC<{ id: string; label: string; value: MoleculeStyle; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; isOverlay?: boolean; }> = ({ id, label, value, checked, onChange, isOverlay }) => (
    <div className="flex items-center">
        <input
            type="radio"
            id={id}
            name="molecule-style"
            value={value}
            checked={checked}
            onChange={onChange}
            className="sr-only"
        />
        <label
            htmlFor={id}
            className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                checked
                    ? 'bg-amber-500 text-white shadow-sm'
                    : isOverlay
                        ? 'bg-black/20 dark:bg-white/10 text-neutral-800 dark:text-gray-200 hover:bg-black/30 dark:hover:bg-white/20'
                        : 'bg-neutral-200 dark:bg-gray-700/60 text-neutral-600 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-600'
            }`}
        >
            {label}
        </label>
    </div>
);

const CustomCheckbox: React.FC<{ id: string; label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; isOverlay?: boolean; }> = ({ id, label, checked, onChange, isOverlay }) => (
    <div className="flex items-center">
        <input
            type="checkbox"
            id={id}
            checked={checked}
            onChange={onChange}
            className="sr-only"
        />
        <label
            htmlFor={id}
            className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${isOverlay ? 'text-neutral-700 dark:text-gray-200' : 'text-neutral-600 dark:text-gray-300'}`}
        >
            <div
                className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${
                    checked
                        ? 'bg-amber-500 border-amber-500'
                        : `bg-transparent ${isOverlay ? 'border-neutral-200 dark:border-gray-300' : 'border-neutral-400 dark:border-gray-500'}`
                }`}
            >
                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
            {label}
        </label>
    </div>
);


const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ molecule, onMaximize, isFullScreen = false }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [showElectrons, setShowElectrons] = useState(false);
    const [style, setStyle] = useState<MoleculeStyle>('ballAndStick');
    const [showHydrogens, setShowHydrogens] = useState(true);
    const [autoRotate, setAutoRotate] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(true);
    
    const autoRotateRef = useRef(autoRotate);
    useEffect(() => {
        autoRotateRef.current = autoRotate;
    }, [autoRotate]);

    const animationFrameIdRef = useRef<number | null>(null);
    const isPausedRef = useRef(false);

    const filteredMolecule = useMemo(() => {
        if (showHydrogens) {
            return molecule;
        }
        
        const nonHydrogenAtoms = molecule.atoms.map((atom, index) => ({ ...atom, originalIndex: index }))
            .filter(atom => atom.element.toUpperCase() !== 'H');

        const oldToNewIndexMap = new Map<number, number>();
        nonHydrogenAtoms.forEach((atom, newIndex) => {
            oldToNewIndexMap.set(atom.originalIndex, newIndex);
        });

        const filteredBonds = molecule.bonds.filter(bond => 
            oldToNewIndexMap.has(bond.from) && oldToNewIndexMap.has(bond.to)
        ).map(bond => ({
            ...bond,
            from: oldToNewIndexMap.get(bond.from)!,
            to: oldToNewIndexMap.get(bond.to)!,
        }));

        return { ...molecule, atoms: nonHydrogenAtoms, bonds: filteredBonds };
    }, [molecule, showHydrogens]);


    useEffect(() => {
        if (!mountRef.current || !filteredMolecule) return;
        
        const currentMount = mountRef.current;

        // Cleanup previous scene
        while(currentMount.firstChild) {
            currentMount.removeChild(currentMount.firstChild);
        }

        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
        currentMount.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 10;
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const moleculeGroup = new THREE.Group();
        const positions = filteredMolecule.atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z));
        const center = new THREE.Vector3();
        positions.forEach(pos => center.add(pos));
        if (positions.length > 0) center.divideScalar(positions.length);
        moleculeGroup.position.sub(center);

        const labelData: { sprite: THREE.Sprite; sphere: THREE.Mesh }[] = [];

        // Atoms and Labels
        if (style !== 'sticks' && style !== 'wireframe') {
            filteredMolecule.atoms.forEach((atom, index) => {
                const radius = style === 'spaceFilling' 
                    ? vdwRadii[atom.element.toUpperCase()] || vdwRadii.DEFAULT
                    : atomRadii[atom.element.toUpperCase()] || atomRadii.DEFAULT;
                const colorHex = atomColors[atom.element.toUpperCase()] || atomColors.DEFAULT;
                
                const geometry = new THREE.SphereGeometry(radius, 32, 32);
                const material = new THREE.MeshPhongMaterial({ color: colorHex });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(positions[index]);
                moleculeGroup.add(sphere);

                if (style !== 'spaceFilling') {
                    const labelSprite = createAtomLabelSprite(atom.element, colorHex, radius);
                    if (labelSprite) {
                        scene.add(labelSprite);
                        labelData.push({ sprite: labelSprite, sphere });
                    }
                }
            });
        }

        // Bonds
        if (style !== 'spaceFilling') {
            const bondRadius = style === 'wireframe' ? 0.03 : 0.1;
            filteredMolecule.bonds.forEach(bond => {
                const start = positions[bond.from];
                const end = positions[bond.to];
                if (!start || !end) return;

                const bondVector = new THREE.Vector3().subVectors(end, start);
                const bondLength = bondVector.length();
                const bondCenter = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

                for (let i = 0; i < bond.order; i++) {
                    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, bondLength, 16);
                    const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
                    const cylinder = new THREE.Mesh(geometry, material);
                    
                    const offset = new THREE.Vector3();
                    if (bond.order > 1) {
                        const offsetVector = new THREE.Vector3();
                        if (bondVector.x !== 0 || bondVector.y !== 0) {
                            offsetVector.set(-bondVector.y, bondVector.x, 0).normalize();
                        } else { offsetVector.set(1, 0, 0); }
                        offset.copy(offsetVector).multiplyScalar((i - (bond.order - 1) / 2) * 0.25);
                    }
                    
                    cylinder.position.copy(bondCenter).add(offset);
                    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bondVector.clone().normalize());
                    moleculeGroup.add(cylinder);
                }
            });
        }

        scene.add(moleculeGroup);

        const electronsGroup = new THREE.Group();
        if (showElectrons) {
            filteredMolecule.atoms.forEach((_, index) => {
                const radius = atomRadii[filteredMolecule.atoms[index].element.toUpperCase()] || atomRadii.DEFAULT;
                const electron = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0x00FFFF })
                );
                electron.userData = {
                    center: positions[index], orbitRadius: radius + 0.5,
                    orbitSpeed: Math.random() * 0.02 + 0.01, angle: Math.random() * Math.PI * 2,
                    axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize()
                };
                electronsGroup.add(electron);
            });
            moleculeGroup.add(electronsGroup);
        }
        
        const animate = () => {
            if (!isPausedRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(animate);
            }
            if (autoRotateRef.current) {
                moleculeGroup.rotation.y += 0.005;
            }

            if (labelData.length > 0) {
                const cameraPosition = new THREE.Vector3();
                camera.getWorldPosition(cameraPosition);
                const sphereWorldPosition = new THREE.Vector3();

                for (const data of labelData) {
                    const { sprite, sphere } = data;
                    sphere.getWorldPosition(sphereWorldPosition);

                    const toCamera = new THREE.Vector3().subVectors(cameraPosition, sphereWorldPosition).normalize();
                    const radius = (sphere.geometry as THREE.SphereGeometry).parameters.radius;
                    
                    sprite.position.copy(sphereWorldPosition).add(toCamera.multiplyScalar(radius * 1.1));
                }
            }

            controls.update();
            if (showElectrons) {
                electronsGroup.children.forEach(electron => {
                    const data = electron.userData; data.angle += data.orbitSpeed;
                    const q = new THREE.Quaternion().setFromAxisAngle(data.axis, data.angle);
                    const offset = new THREE.Vector3(data.orbitRadius, 0, 0).applyQuaternion(q);
                    electron.position.copy(data.center).add(offset);
                });
            }
            renderer.render(scene, camera);
        };
        
        const startAnimation = () => { if (isPausedRef.current) { isPausedRef.current = false; animate(); } };
        const stopAnimation = () => { isPausedRef.current = true; if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current); };

        if (!isPausedRef.current) animate();

        const observer = new IntersectionObserver(([entry]) => { entry.isIntersecting ? startAnimation() : stopAnimation(); }, { threshold: 0.1 });
        if (currentMount) observer.observe(currentMount);
        
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            stopAnimation();
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            (controls as any).dispose();
            scene.traverse(object => {
                 if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) { object.geometry.dispose();
                    const material = object.material as (THREE.Material | THREE.Material[]);
                    Array.isArray(material) ? material.forEach(m => m.dispose()) : material.dispose();
                }
            });
            if (currentMount) { while(currentMount.firstChild) currentMount.removeChild(currentMount.firstChild); }
        };
    }, [filteredMolecule, showElectrons, style]);

    if (isFullScreen) {
        return (
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-black/10">
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

                <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/20 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-white/30 dark:border-white/20 shadow-lg animate-fade-in-up">
                    <summary
                        className="flex items-center justify-between cursor-pointer list-none"
                        onClick={() => setIsControlsOpen(prev => !prev)}
                        aria-expanded={isControlsOpen}
                        aria-controls="molecule-controls-fs"
                    >
                        <div className="text-sm flex-1 min-w-0">
                            {molecule.iupacName && <p className="font-semibold text-neutral-800 dark:text-gray-100 truncate">{molecule.iupacName}</p>}
                            <div className="flex items-center gap-4 text-xs text-neutral-700 dark:text-gray-300 mt-1">
                                {molecule.molecularFormula && <Tooltip content="Molecular Formula"><span className="cursor-help">{molecule.molecularFormula}</span></Tooltip>}
                                {molecule.molecularWeight && <Tooltip content="Molecular Weight"><span className="cursor-help">{molecule.molecularWeight} g/mol</span></Tooltip>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <Tooltip content={
                                <div className="max-w-xs text-left">
                                    <h4 className="font-bold mb-1">About this model</h4>
                                    <p>This 3D model is a representation of the molecule's lowest energy conformation, sourced from PubChem.</p>
                                </div>
                            }>
                                <Info className="h-5 w-5 text-neutral-700 dark:text-gray-300 cursor-help" onClick={(e) => e.stopPropagation()} />
                            </Tooltip>
                            <ChevronDown className={`h-6 w-6 text-neutral-700 dark:text-gray-300 transition-transform duration-300 ${isControlsOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </summary>

                    <div
                        id="molecule-controls-fs"
                        className={`grid transition-all duration-500 ease-in-out ${isControlsOpen ? 'grid-rows-[1fr] opacity-100 pt-4 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                        <div className="overflow-hidden border-t border-white/20 dark:border-white/10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <div>
                                    <p className="text-xs font-semibold mb-2 text-neutral-600 dark:text-gray-300">Style</p>
                                    <div className="flex flex-wrap gap-2">
                                        <StyleRadioButton id="style-ball-fs" label="Ball and Stick" value="ballAndStick" checked={style === 'ballAndStick'} onChange={e => setStyle(e.target.value as MoleculeStyle)} isOverlay />
                                        <StyleRadioButton id="style-sticks-fs" label="Sticks" value="sticks" checked={style === 'sticks'} onChange={e => setStyle(e.target.value as MoleculeStyle)} isOverlay />
                                        <StyleRadioButton id="style-wire-fs" label="Wireframe" value="wireframe" checked={style === 'wireframe'} onChange={e => setStyle(e.target.value as MoleculeStyle)} isOverlay />
                                        <StyleRadioButton id="style-space-fs" label="Space-filling" value="spaceFilling" checked={style === 'spaceFilling'} onChange={e => setStyle(e.target.value as MoleculeStyle)} isOverlay />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold mb-2 text-neutral-600 dark:text-gray-300">Options</p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <CustomCheckbox id="opt-h-fs" label="Show Hydrogens" checked={showHydrogens} onChange={e => setShowHydrogens(e.target.checked)} isOverlay />
                                        <CustomCheckbox id="opt-rot-fs" label="Auto-rotate" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} isOverlay />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-100 dark:bg-gray-800/50 rounded-lg my-4 border border-neutral-200 dark:border-gray-700 overflow-hidden shadow-md">
            <div className="relative w-full aspect-video">
                <div ref={mountRef} className="absolute inset-0" />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                    {onMaximize && (
                        <Tooltip content="Full Screen View">
                            <button
                                onClick={onMaximize}
                                className="p-2 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 rounded-full transition-colors"
                                aria-label="Full Screen View"
                            >
                                <Maximize className="h-5 w-5" />
                            </button>
                        </Tooltip>
                    )}
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
                    {molecule.iupacName && <p className="font-semibold text-neutral-800 dark:text-gray-200">{molecule.iupacName}</p>}
                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-gray-400 mt-1">
                        {molecule.molecularFormula && <Tooltip content="Molecular Formula"><span className="cursor-help">{molecule.molecularFormula}</span></Tooltip>}
                        {molecule.molecularWeight && <Tooltip content="Molecular Weight"><span className="cursor-help">{molecule.molecularWeight} g/mol</span></Tooltip>}
                         <Tooltip content={
                            <div className="max-w-xs text-left">
                                <h4 className="font-bold mb-1">About this model</h4>
                                <p>This 3D model is a representation of the molecule's lowest energy conformation, sourced from PubChem.</p>
                            </div>
                         }><Info className="h-4 w-4 ml-auto cursor-help" /></Tooltip>
                    </div>
                </div>
            )}
             <div className="p-4 border-t border-neutral-200 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-semibold mb-2 text-neutral-500 dark:text-gray-400">Style</p>
                        <div className="flex flex-wrap gap-2">
                           <StyleRadioButton id="style-ball" label="Ball and Stick" value="ballAndStick" checked={style === 'ballAndStick'} onChange={e => setStyle(e.target.value as MoleculeStyle)} />
                           <StyleRadioButton id="style-sticks" label="Sticks" value="sticks" checked={style === 'sticks'} onChange={e => setStyle(e.target.value as MoleculeStyle)} />
                           <StyleRadioButton id="style-wire" label="Wireframe" value="wireframe" checked={style === 'wireframe'} onChange={e => setStyle(e.target.value as MoleculeStyle)} />
                           <StyleRadioButton id="style-space" label="Space-filling" value="spaceFilling" checked={style === 'spaceFilling'} onChange={e => setStyle(e.target.value as MoleculeStyle)} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold mb-2 text-neutral-500 dark:text-gray-400">Options</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <CustomCheckbox id="opt-h" label="Show Hydrogens" checked={showHydrogens} onChange={e => setShowHydrogens(e.target.checked)} />
                           <CustomCheckbox id="opt-rot" label="Auto-rotate" checked={autoRotate} onChange={e => setAutoRotate(e.target.checked)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoleculeViewer;