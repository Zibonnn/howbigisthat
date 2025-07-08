import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
// --- Global State ---
const state = {
    displayMode: 'single', // 'single' or 'arrangement'
    arrangementType: 'grid', // 'grid', 'pyramid', 'line'
    shape: 'cube',
    layout: 'horizontal',
    baseUnitSize: 1,
    primaryValue: 10,
    primaryColor: '#818CF8',
    isComparing: false,
    comparisonValue: 50,
    comparisonColor: '#F472B6',
};

const DEFAULT_FOV = 50;
const DEFAULT_CAMERA_DISTANCE = 30;
const MIN_CAMERA_DISTANCE = 10;
const MAX_CAMERA_DISTANCE = 10000;
let scene, camera, renderer, controls;
let primaryObject, comparisonObject;
const canvasContainer = document.getElementById('canvas-container');
const canvas = document.getElementById('visualization-canvas');

function init() {
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);

    camera = new THREE.PerspectiveCamera(50, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 5000);
    camera.position.set(15, 10, DEFAULT_CAMERA_DISTANCE);
    camera.lookAt(scene.position);

    // Ambient and fill lights for realism
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const fillLight1 = new THREE.AmbientLight(0x404040, 0.6); // soft gray
    scene.add(fillLight1);
    const fillLight2 = new THREE.AmbientLight(0x222244, 0.3); // blueish
    scene.add(fillLight2);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(15, 25, 10);
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = MIN_CAMERA_DISTANCE;
    controls.maxDistance = MAX_CAMERA_DISTANCE;
    controls.addEventListener('change', syncZoomSliderWithCamera);

    window.addEventListener('resize', onWindowResize);
    onWindowResize();
    animate();
    updateScene();
    setupZoomControls();
    setupColorSwatches();
}

function getCameraDistance() {
    // Distance from camera to scene origin
    return camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
}

function setCameraDistance(distance) {
    // Move camera along the vector from origin to camera, preserving direction
    const origin = new THREE.Vector3(0, 0, 0);
    const camDir = camera.position.clone().sub(origin).normalize();
    camera.position.copy(camDir.multiplyScalar(distance));
    camera.lookAt(origin);
    controls.update();
}

function setupZoomControls() {
    const zoomSlider = document.getElementById('zoom-slider');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    if (!zoomSlider || !resetZoomBtn) return;
    zoomSlider.min = MIN_CAMERA_DISTANCE;
    zoomSlider.max = MAX_CAMERA_DISTANCE;
    zoomSlider.step = 1;
    // Set initial slider value to match camera distance
    zoomSlider.value = Math.round(getCameraDistance());
    zoomSlider.addEventListener('input', (e) => {
        setCameraDistance(parseFloat(e.target.value));
    });
    resetZoomBtn.addEventListener('click', () => {
        setCameraDistance(DEFAULT_CAMERA_DISTANCE);
        zoomSlider.value = DEFAULT_CAMERA_DISTANCE;
    });
}

function syncZoomSliderWithCamera() {
    const zoomSlider = document.getElementById('zoom-slider');
    if (!zoomSlider) return;
    const dist = Math.round(getCameraDistance());
    if (parseInt(zoomSlider.value, 10) !== dist) {
        zoomSlider.value = dist;
    }
}

function onWindowResize() {
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// --- Core Logic ---
function getUnitGeometry(shapeType, size = 1) {
    switch (shapeType) {
        case 'sphere': return new THREE.SphereGeometry(size / 2, 16, 16);
        case 'cylinder': return new THREE.CylinderGeometry(size / 2, size / 2, size, 16);
        case 'cone': return new THREE.ConeGeometry(size / 2, size, 16);
        case 'cube': default: return new THREE.BoxGeometry(size, size, size);
    }
}

function createSingleObject(value, shapeType, color) {
    const scaleFactor = Math.cbrt(value);
    const geometry = getUnitGeometry(shapeType, scaleFactor * state.baseUnitSize);
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 });
    return new THREE.Mesh(geometry, material);
}

function createArrangement(value, shapeType, color, arrangementType) {
    const group = new THREE.Group();
    const unitGeometry = getUnitGeometry(shapeType, state.baseUnitSize);
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 });
    const unitSize = state.baseUnitSize;
    const gap = 0.2 * unitSize;
    const step = unitSize + gap;

    if (arrangementType === 'line') {
        for (let i = 0; i < value; i++) {
            const mesh = new THREE.Mesh(unitGeometry, material);
            mesh.position.x = i * step;
            group.add(mesh);
        }
    } else if (arrangementType === 'grid') {
        const cols = Math.ceil(Math.sqrt(value));
        for (let i = 0; i < value; i++) {
            const mesh = new THREE.Mesh(unitGeometry, material);
            const row = Math.floor(i / cols);
            const col = i % cols;
            mesh.position.set(col * step, row * step, 0);
            group.add(mesh);
        }
    } else if (arrangementType === 'pyramid') {
        let count = 0;
        let level = 0;
        while (count < value) {
            const layerSize = level + 1;
            for (let x = 0; x < layerSize && count < value; x++) {
                for (let z = 0; z < layerSize && count < value; z++) {
                    const mesh = new THREE.Mesh(unitGeometry, material);
                    mesh.position.set(
                        (x - (layerSize - 1) / 2) * step,
                        level * step,
                        (z - (layerSize - 1) / 2) * step
                    );
                    group.add(mesh);
                    count++;
                }
            }
            level++;
        }
    }
    
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.children.forEach(child => child.position.sub(center));

    return group;
}

function updateScene() {
    if (primaryObject) scene.remove(primaryObject);
    if (comparisonObject) scene.remove(comparisonObject);

    const createObject = state.displayMode === 'single' ? createSingleObject : (v, s, c) => createArrangement(v, s, c, state.arrangementType);

    primaryObject = createObject(state.primaryValue, state.shape, state.primaryColor);
    scene.add(primaryObject);

    if (state.isComparing) {
        comparisonObject = createObject(state.comparisonValue, state.shape, state.comparisonColor);
        scene.add(comparisonObject);
        positionObjects();
    } else {
        primaryObject.position.set(0, 0, 0);
    }
}

function positionObjects() {
    if (!primaryObject || !comparisonObject) return;
    
    const primaryBox = new THREE.Box3().setFromObject(primaryObject);
    const comparisonBox = new THREE.Box3().setFromObject(comparisonObject);
    const primarySize = new THREE.Vector3();
    primaryBox.getSize(primarySize);
    const comparisonSize = new THREE.Vector3();
    comparisonBox.getSize(comparisonSize);

    const gap = 4 * state.baseUnitSize;

    if (state.layout === 'horizontal') {
        const totalWidth = primarySize.x + comparisonSize.x + gap;
        primaryObject.position.x = -totalWidth / 2 + primarySize.x / 2;
        comparisonObject.position.x = totalWidth / 2 - comparisonSize.x / 2;
        primaryObject.position.y = 0;
        comparisonObject.position.y = 0;
    } else { // Vertical
        const totalHeight = primarySize.y + comparisonSize.y + gap;
        primaryObject.position.y = -totalHeight / 2 + primarySize.y / 2;
        comparisonObject.position.y = totalHeight / 2 - comparisonSize.y / 2;
        primaryObject.position.x = 0;
        comparisonObject.position.x = 0;
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    // Display Mode, Arrangement, Shape, Layout...
    document.getElementById('display-mode-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.displayMode = e.target.dataset.mode;
            document.querySelectorAll('#display-mode-selector .tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('arrangement-panel').classList.toggle('hidden', state.displayMode !== 'arrangement');
            updateScene();
        }
    });
    document.getElementById('arrangement-type-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.arrangementType = e.target.dataset.arrangement;
            document.querySelectorAll('#arrangement-type-selector .tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            updateScene();
        }
    });
    document.getElementById('shape-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.shape = e.target.dataset.shape;
            document.querySelectorAll('#shape-selector .control-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            updateScene();
        }
    });
    document.getElementById('layout-selector').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            state.layout = e.target.dataset.layout;
            document.querySelectorAll('#layout-selector .tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            positionObjects();
        }
    });

    // Base Unit Size Controls
    const unitSizeInput = document.getElementById('base-unit-size');
    const unitSizeSlider = document.getElementById('base-unit-slider');
    unitSizeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) { state.baseUnitSize = Math.max(0.01, val); unitSizeSlider.value = state.baseUnitSize; updateScene(); }
    });
    unitSizeSlider.addEventListener('input', (e) => {
        state.baseUnitSize = parseFloat(e.target.value); unitSizeInput.value = state.baseUnitSize; updateScene();
    });

    // Primary Controls
    const primaryValueInput = document.getElementById('primary-value');
    const primarySlider = document.getElementById('primary-slider');
    const primaryColorInput = document.getElementById('primary-color');
    primaryValueInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) { state.primaryValue = Math.max(1, val); primarySlider.value = Math.min(val, 10000); updateScene(); }
    });
    primarySlider.addEventListener('input', (e) => {
        state.primaryValue = parseInt(e.target.value, 10); primaryValueInput.value = state.primaryValue; updateScene();
    });
    primaryColorInput.addEventListener('input', (e) => {
        state.primaryColor = e.target.value; updateScene();
    });

    // Comparison Controls
    const compareCheckbox = document.getElementById('compare-checkbox');
    const comparisonControls = document.getElementById('comparison-controls');
    const comparisonValueInput = document.getElementById('comparison-value');
    const comparisonSlider = document.getElementById('comparison-slider');
    const comparisonColorInput = document.getElementById('comparison-color');
    compareCheckbox.addEventListener('change', (e) => {
        state.isComparing = e.target.checked;
        comparisonControls.classList.toggle('hidden', !state.isComparing);
        document.getElementById('layout-panel').classList.toggle('hidden', !state.isComparing);
        updateScene();
    });
    comparisonValueInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) { state.comparisonValue = Math.max(1, val); comparisonSlider.value = Math.min(val, 10000); updateScene(); }
    });
    comparisonSlider.addEventListener('input', (e) => {
        state.comparisonValue = parseInt(e.target.value, 10); comparisonValueInput.value = state.comparisonValue; updateScene();
    });
    comparisonColorInput.addEventListener('input', (e) => {
        state.comparisonColor = e.target.value; updateScene();
    });
    
    // Initial state for hidden panels
    document.getElementById('layout-panel').classList.toggle('hidden', !state.isComparing);
}

function setupColorSwatches() {
    // Primary
    const primaryColorInput = document.getElementById('primary-color');
    document.querySelectorAll('#primary-color-row .color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            primaryColorInput.value = color;
            state.primaryColor = color;
            updateScene();
        });
    });
    // Comparison
    const comparisonColorInput = document.getElementById('comparison-color');
    document.querySelectorAll('#comparison-color-row .color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color');
            comparisonColorInput.value = color;
            state.comparisonColor = color;
            updateScene();
        });
    });
}

// --- Initialize ---
init();
setupEventListeners();
}); 