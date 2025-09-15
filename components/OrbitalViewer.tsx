import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitalData } from '../types';
import { Maximize, ChevronDown } from 'lucide-react';
import Tooltip from './Tooltip';

type OrbitalType = 's' | 'p' | 'd';
type pSubtype = 'px' | 'py' | 'pz';
type dSubtype = 'dxy' | 'dyz' | 'dxz' | 'dx2-y2' | 'dz2';

const createAxes = (size: number): THREE.Group => {
    const axes = new THREE.Group();
    
    const createAxis = (vec: THREE.Vector3, color: number) => {
        const points = [new THREE.Vector3(0, 0, 0), vec.clone().multiplyScalar(size)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
    };

    const createLabel = (text: string, position: THREE.Vector3, color: string) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.font = 'bold 80px Arial';
        canvas.width = 128;
        canvas.height = 128;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 64, 64);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(0.5, 0.5, 1.0);
        sprite.position.copy(position);
        return sprite;
    };
    
    axes.add(createAxis(new THREE.Vector3(1, 0, 0), 0xff0000));
    const xLabel = createLabel('X', new THREE.Vector3(size + 0.3, 0, 0), '#ff0000');
    if(xLabel) axes.add(xLabel);
    
    axes.add(createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00));
    const yLabel = createLabel('Y', new THREE.Vector3(0, size + 0.3, 0), '#00ff00');
    if(yLabel) axes.add(yLabel);

    axes.add(createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff));
    const zLabel = createLabel('Z', new THREE.Vector3(0, 0, size + 0.3), '#0000ff');
    if(zLabel) axes.add(zLabel);
    
    return axes;
};

const createLobe = (color: number) => {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    geometry.scale(0.5, 1, 0.5); 
    const material = new THREE.MeshLambertMaterial({ color, opacity: 0.9, transparent: true });
    return new THREE.Mesh(geometry, material);
};

const createLabelSprite = (text: string): THREE.Sprite | null => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    const fontSize = 100;
    context.font = `bold ${fontSize}px Arial`;
    
    const textMetrics = context.measureText(text);
    canvas.width = textMetrics.width + 40;
    canvas.height = fontSize + 40;

    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.strokeStyle = 'rgba(0,0,0,0.7)';
    context.lineWidth = 12;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);

    context.fillStyle = '#FFFFFF';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.6 * (canvas.width / canvas.height), 0.6, 1);
    
    return sprite;
};

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

interface OrbitalViewerProps {
    orbital: OrbitalData;
    onMaximize?: () => void;
    isFullScreen?: boolean;
}

const OrbitalViewer: React.FC<OrbitalViewerProps> = ({ orbital, onMaximize, isFullScreen = false }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [activeType, setActiveType] = useState<OrbitalType>('p');
    const [activePSubtype, setActivePSubtype] = useState<pSubtype>('px');
    const [activeDSubtype, setActiveDSubtype] = useState<dSubtype>('dxy');
    const [showAxes, setShowAxes] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [autoRotate, setAutoRotate] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(true);

    const autoRotateRef = useRef(autoRotate);
    useEffect(() => {
        autoRotateRef.current = autoRotate;
    }, [autoRotate]);

    const animationFrameIdRef = useRef<number | null>(null);
    const isPausedRef = useRef(false);

    const activeOrbitalName = useMemo(() => {
        if (activeType === 's') return 's';
        if (activeType === 'p') return activePSubtype;
        return activeDSubtype;
    }, [activeType, activePSubtype, activeDSubtype]);
    
    useEffect(() => {
        const name = orbital.name.toLowerCase();
        if (name.includes('s')) setActiveType('s');
        else if (name.includes('p')) setActiveType('p');
        else if (name.includes('d')) setActiveType('d');
    }, [orbital]);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        while(currentMount.firstChild) currentMount.removeChild(currentMount.firstChild);

        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
        camera.position.set(3, 3, 5);
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        const orbitalGroup = new THREE.Group();
        scene.add(orbitalGroup);

        const axes = createAxes(2);
        if (showAxes) orbitalGroup.add(axes);
        
        const lobeA = createLobe(0x3B82F6);
        const lobeB = createLobe(0xEF4444);

        if (showLabels) {
            let labelText = '';
            let labelPosition = new THREE.Vector3(0, 0, 0);

            switch(activeOrbitalName) {
                case 'px': labelText = 'px'; labelPosition.set(2, 0, 0); break;
                case 'py': labelText = 'py'; labelPosition.set(0, 2, 0); break;
                case 'pz': labelText = 'pz'; labelPosition.set(0, 0, 2); break;
                case 'dxy': labelText = 'dxy'; labelPosition.set(1.5, 1.5, 0); break;
                case 'dyz': labelText = 'dyz'; labelPosition.set(0, 1.5, 1.5); break;
                case 'dxz': labelText = 'dxz'; labelPosition.set(1.5, 0, 1.5); break;
                case 'dx2-y2': labelText = 'dx²-y²'; labelPosition.set(2, 0, 0); break;
                case 'dz2': labelText = 'dz²'; labelPosition.set(0, 0, 2.2); break;
            }

            if (labelText) {
                const label = createLabelSprite(labelText);
                if (label) {
                    label.position.copy(labelPosition);
                    orbitalGroup.add(label);
                }
            }
        }

        switch(activeOrbitalName) {
            case 's':
                orbitalGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshLambertMaterial({ color: 0x3B82F6, opacity: 0.9, transparent: true })));
                break;
            case 'px':
                const px1 = lobeA.clone(); px1.position.x = 1; px1.rotation.z = -Math.PI / 2;
                const px2 = lobeB.clone(); px2.position.x = -1; px2.rotation.z = Math.PI / 2;
                orbitalGroup.add(px1, px2);
                break;
            case 'py':
                 const py1 = lobeA.clone(); py1.position.y = 1;
                 const py2 = lobeB.clone(); py2.position.y = -1;
                 orbitalGroup.add(py1, py2);
                break;
            case 'pz':
                 const pz1 = lobeA.clone(); pz1.position.z = 1; pz1.rotation.x = Math.PI / 2;
                 const pz2 = lobeB.clone(); pz2.position.z = -1; pz2.rotation.x = -Math.PI / 2;
                 orbitalGroup.add(pz1, pz2);
                break;
            case 'dxy':
                [45, 135, 225, 315].forEach((angle, i) => {
                    const lobe = (i % 2 === 0 ? lobeA : lobeB).clone();
                    const rad = THREE.MathUtils.degToRad(angle);
                    lobe.position.set(Math.cos(rad) * 1.5, Math.sin(rad) * 1.5, 0);
                    lobe.lookAt(0,0,0);
                    orbitalGroup.add(lobe);
                });
                break;
            case 'dyz':
                [45, 135, 225, 315].forEach((angle, i) => {
                    const lobe = (i % 2 === 0 ? lobeA : lobeB).clone();
                    const rad = THREE.MathUtils.degToRad(angle);
                    lobe.position.set(0, Math.cos(rad) * 1.5, Math.sin(rad) * 1.5);
                    lobe.lookAt(0,0,0);
                    orbitalGroup.add(lobe);
                });
                break;
            case 'dxz':
                 [45, 135, 225, 315].forEach((angle, i) => {
                    const lobe = (i % 2 === 0 ? lobeA : lobeB).clone();
                    const rad = THREE.MathUtils.degToRad(angle);
                    lobe.position.set(Math.cos(rad) * 1.5, 0, Math.sin(rad) * 1.5);
                    lobe.lookAt(0,0,0);
                    orbitalGroup.add(lobe);
                });
                break;
            case 'dx2-y2':
                 [0, 90, 180, 270].forEach((angle, i) => {
                    const lobe = (i % 2 === 0 ? lobeA : lobeB).clone();
                    const rad = THREE.MathUtils.degToRad(angle);
                    lobe.position.set(Math.cos(rad) * 1.5, Math.sin(rad) * 1.5, 0);
                    lobe.lookAt(0,0,0);
                    orbitalGroup.add(lobe);
                });
                break;
            case 'dz2':
                 const dz2_1 = lobeA.clone(); dz2_1.position.z = 1.2; dz2_1.rotation.x = Math.PI / 2;
                 const dz2_2 = lobeB.clone(); dz2_2.position.z = -1.2; dz2_2.rotation.x = -Math.PI / 2;
                 orbitalGroup.add(dz2_1, dz2_2);
                 const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.2, 16, 100), new THREE.MeshLambertMaterial({ color: 0xEF4444, side: THREE.DoubleSide }));
                 torus.rotation.x = Math.PI / 2;
                 orbitalGroup.add(torus);
                break;
        }

        const animate = () => {
            if (!isPausedRef.current) {
                animationFrameIdRef.current = requestAnimationFrame(animate);
            }
            if (autoRotateRef.current) {
                orbitalGroup.rotation.y += 0.005;
            }
            controls.update();
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
        }
        window.addEventListener('resize', handleResize);

        return () => {
            stopAnimation();
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            (controls as any).dispose();
            scene.traverse(object => {
                const mesh = object as THREE.Mesh;
                if (mesh.isMesh || mesh.type === 'Line' || mesh.type === 'Sprite') {
                    mesh.geometry.dispose();
                }
                const material = (mesh as any).material;
                if (material) {
                    Array.isArray(material) ? material.forEach(m => m.dispose()) : material.dispose();
                }
            });
            if (currentMount) { while(currentMount.firstChild) currentMount.removeChild(currentMount.firstChild); }
        };

    }, [activeOrbitalName, showAxes, showLabels]);
    
    const renderSubtypeButtons = (isOverlay = false) => {
        const Button: React.FC<{ sub: pSubtype | dSubtype, children: React.ReactNode }> = ({ sub, children }) => {
            const isActive = activeType === 'p' ? activePSubtype === sub : activeDSubtype === sub;
            const onClick = () => activeType === 'p' ? setActivePSubtype(sub as pSubtype) : setActiveDSubtype(sub as dSubtype);
            return (
                <button onClick={onClick} className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${isActive ? 'bg-amber-500 text-white' : (isOverlay ? 'bg-black/20 text-neutral-800 dark:text-gray-200 hover:bg-black/30' : 'bg-neutral-200 dark:bg-gray-700/60 hover:bg-neutral-300 dark:hover:bg-gray-600')}`}>
                    {children}
                </button>
            );
        };

        if (activeType === 'p') {
            return (['px', 'py', 'pz'] as pSubtype[]).map(sub => <Button key={sub} sub={sub}>{sub}</Button>);
        }
        if (activeType === 'd') {
            return (['dxy', 'dyz', 'dxz', 'dx2-y2', 'dz2'] as dSubtype[]).map(sub => (
                <Button key={sub} sub={sub}>{sub.replace('2-y2', '²-y²').replace('z2', 'z²')}</Button>
            ));
        }
        return null;
    }

    const titleText = useMemo(() => {
        if (activeType === 's') return 'S Orbital';
        const subtype = activeType === 'p' ? activePSubtype : activeDSubtype;
        return `${activeType.toUpperCase()} Orbital - ${subtype.replace('2-y2', '²-y²').replace('z2', 'z²')}`;
    }, [activeType, activePSubtype, activeDSubtype]);

    const controlsContent = (isOverlay = false) => (
        <>
            <div className="flex items-center justify-between">
                <p className={`font-semibold ${isOverlay ? 'text-neutral-800 dark:text-gray-200' : 'text-neutral-800 dark:text-gray-200'}`}>{titleText}</p>
                <div className="flex items-center gap-4">
                    <CustomCheckbox id={isOverlay ? "orb-axes-fs" : "orb-axes"} label="Axes" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} isOverlay={isOverlay} />
                    <CustomCheckbox id={isOverlay ? "orb-labels-fs" : "orb-labels"} label="Labels" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} isOverlay={isOverlay} />
                    <CustomCheckbox id={isOverlay ? "orb-rotate-fs" : "orb-rotate"} label="Auto-rotate" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} isOverlay={isOverlay} />
                </div>
            </div>
            <div className={`flex items-center gap-2 ${isOverlay ? '' : 'border-t border-neutral-200 dark:border-gray-700 pt-3'}`}>
                <div className="flex items-center gap-2">
                    {(['s', 'p', 'd'] as OrbitalType[]).map(type => (
                        <button key={type} onClick={() => setActiveType(type)} className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${activeType === type ? 'bg-amber-500 text-white' : (isOverlay ? 'bg-black/20 text-neutral-800 dark:text-gray-200 hover:bg-black/30' : 'bg-neutral-200 dark:bg-gray-700/60 hover:bg-neutral-300 dark:hover:bg-gray-600')}`}>
                            {type.toUpperCase()}
                        </button>
                    ))}
                </div>
                {(activeType === 'p' || activeType === 'd') &&
                    <div className={`flex flex-wrap items-center gap-2 ${isOverlay ? '' : 'border-l border-neutral-200 dark:border-gray-700 pl-3 ml-1'}`}>
                        {renderSubtypeButtons(isOverlay)}
                    </div>
                }
            </div>
        </>
    );

    if (isFullScreen) {
         return (
            <div className="relative w-full h-full">
                <div ref={mountRef} className="absolute inset-0" />
                 <div className="absolute bottom-4 left-4 right-4 p-3 bg-white/20 dark:bg-black/40 backdrop-blur-md rounded-xl border border-white/30 dark:border-white/20 shadow-lg animate-fade-in-up space-y-3">
                    {controlsContent(true)}
                </div>
            </div>
         );
    }
    
    return (
        <div className="bg-neutral-100 dark:bg-gray-800/50 rounded-lg my-4 border border-neutral-200 dark:border-gray-700 overflow-hidden shadow-md">
            <div className="relative w-full aspect-[4/3]">
                <div ref={mountRef} className="absolute inset-0" />
                {onMaximize && (
                    <div className="absolute top-2 right-2">
                         <Tooltip content="Full Screen View">
                            <button
                                onClick={onMaximize}
                                className="p-2 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 rounded-full transition-colors"
                                aria-label="Full Screen View"
                            >
                                <Maximize className="h-5 w-5" />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-neutral-200 dark:border-gray-700 space-y-3">
                {controlsContent(false)}
            </div>
        </div>
    );
};

export default OrbitalViewer;