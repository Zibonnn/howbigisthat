// Minimal Babylon.js setup for How Big Is That
// Robust, minimal mesh management and arrangement

window.addEventListener('DOMContentLoaded', function () {
    // Get the canvas element
    const canvas = document.getElementById('visualization-canvas');

    // Create Babylon.js engine
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Create scene
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.07, 0.09, 0.15, 1.0); // match dark bg

    // Camera
    const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 4, Math.atan(Math.sqrt(2)), 10, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelDeltaPercentage = 0.01;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;

    // Light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.95;

    // --- State ---
    let currentShape = 'sphere';
    let currentColor = '#818CF8';
    let currentSize = 2;
    let currentMode = 'single'; // 'single' or 'arrangement'
    let currentArrangement = 'grid';
    let currentCount = 1; // Default to 1 for single shape
    let currentMaterial = 'cartoon';
    let isComparing = false;
    let comparisonColor = '#F472B6';
    let comparisonCount = 50;
    let comparisonLayout = 'horizontal';
    let groupMeshes = [];

    // --- Material Factories ---
    function makeCartoonMaterial(color) {
        const mat = new BABYLON.StandardMaterial('cartoon', scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(color);
        mat.specularColor = BABYLON.Color3.Black();
        mat.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.2);
        return mat;
    }
    function makeGradientMaterial(color) {
        const mat = new BABYLON.StandardMaterial('gradient', scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString(color);
        mat.specularColor = BABYLON.Color3.White().scale(0.2);
        mat.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.1);
        mat.diffuseFresnelParameters = new BABYLON.FresnelParameters();
        mat.diffuseFresnelParameters.bias = 0.2;
        mat.diffuseFresnelParameters.power = 2.5;
        mat.diffuseFresnelParameters.leftColor = BABYLON.Color3.FromHexString(color).scale(1.1);
        mat.diffuseFresnelParameters.rightColor = BABYLON.Color3.FromHexString(color).scale(0.7);
        return mat;
    }
    function getMaterial(color) {
        return currentMaterial === 'cartoon' ? makeCartoonMaterial(color) : makeGradientMaterial(color);
    }

    // --- Shape creation ---
    function createShape(type, size, color) {
        let mesh;
        switch (type) {
            case 'sphere':
                mesh = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: size }, scene);
                break;
            case 'cube':
                mesh = BABYLON.MeshBuilder.CreateBox('cube', { size: size }, scene);
                break;
            case 'cylinder':
                mesh = BABYLON.MeshBuilder.CreateCylinder('cylinder', { diameter: size, height: size }, scene);
                break;
            case 'pyramid':
                mesh = BABYLON.MeshBuilder.CreateCylinder('pyramid', { diameterTop: 0, diameterBottom: size, height: size, tessellation: 4 }, scene);
                break;
            case 'torus':
                mesh = BABYLON.MeshBuilder.CreateTorus('torus', { diameter: size, thickness: size * 0.25 }, scene);
                break;
            default:
                mesh = BABYLON.MeshBuilder.CreateBox('default', { size: size }, scene);
        }
        mesh.material = getMaterial(color);
        mesh.position.y = size / 2;
        return mesh;
    }

    // --- Arrangement creation ---
    function createArrangement(type, size, color, arrangement, count) {
        const group = new BABYLON.TransformNode('arrangement', scene);
        const gap = 0.2 * size;
        const step = size + gap;
        if (arrangement === 'line') {
            for (let i = 0; i < count; i++) {
                const mesh = createShape(type, size, color);
                mesh.parent = group;
                mesh.position.x = i * step;
            }
        } else if (arrangement === 'grid') {
            const [rows, cols] = bestGridFactors(count);
            for (let i = 0; i < count; i++) {
                const mesh = createShape(type, size, color);
                mesh.parent = group;
                const row = Math.floor(i / cols);
                const col = i % cols;
                mesh.position.set(col * step, size / 2, row * step);
            }
        } else if (arrangement === 'pyramid') {
            // Compute the number of layers needed for the given count
            let layers = 0;
            let total = 0;
            while (total + (layers + 1) * (layers + 1) <= count) {
                layers++;
                total += layers * layers;
            }
            // If not a perfect pyramid, the last layer will have fewer shapes
            let countPlaced = 0;
            let y = 0;
            let minY = Infinity;
            for (let level = 0; countPlaced < count; level++) {
                let layerSize = layers - level;
                if (layerSize <= 0) layerSize = 1;
                // If this is the last layer and not full, adjust layerSize
                if (count - countPlaced < layerSize * layerSize) {
                    layerSize = Math.ceil(Math.sqrt(count - countPlaced));
                }
                for (let x = 0; x < layerSize && countPlaced < count; x++) {
                    for (let z = 0; z < layerSize && countPlaced < count; z++) {
                        const mesh = createShape(type, size, color);
                        mesh.parent = group;
                        mesh.position.set(
                            (x - (layerSize - 1) / 2) * step,
                            y,
                            (z - (layerSize - 1) / 2) * step
                        );
                        if (mesh.position.y < minY) minY = mesh.position.y;
                        countPlaced++;
                    }
                }
                y += step;
            }
            group.position.y = -minY;
        }
        group.position = BABYLON.Vector3.Zero();
        return group;
    }

    // --- Helper: Find best grid factor pair ---
    function bestGridFactors(n) {
        let bestRows = 1, bestCols = n, minDiff = n;
        for (let rows = 1; rows <= Math.sqrt(n); rows++) {
            let cols = Math.ceil(n / rows);
            if (rows * cols >= n) {
                let diff = Math.abs(rows - cols);
                if (diff < minDiff || (diff === minDiff && rows > bestRows)) {
                    bestRows = rows;
                    bestCols = cols;
                    minDiff = diff;
                }
            }
        }
        return [bestRows, bestCols];
    }

    // --- Mesh disposal ---
    function clearGroupMeshes() {
        groupMeshes.forEach(mesh => { if (mesh && !mesh.isDisposed()) mesh.dispose(); });
        groupMeshes = [];
    }

    // --- Scene update logic ---
    function updateSceneBabylon() {
        clearGroupMeshes();
        if (!isComparing) {
            if (currentMode === 'single') {
                groupMeshes.push(createShape(currentShape, currentSize, currentColor));
            } else {
                groupMeshes.push(createArrangement(currentShape, currentSize, currentColor, currentArrangement, currentCount));
            }
        } else {
            let meshA, meshB;
            if (currentMode === 'single') {
                meshA = createShape(currentShape, currentSize, currentColor);
                meshB = createShape(currentShape, currentSize, comparisonColor);
            } else {
                meshA = createArrangement(currentShape, currentSize, currentColor, currentArrangement, currentCount);
                meshB = createArrangement(currentShape, currentSize, comparisonColor, currentArrangement, comparisonCount);
            }
            if (meshA && meshB) {
                if (comparisonLayout === 'horizontal') {
                    meshA.position.x = -currentSize * 2.5;
                    meshB.position.x = currentSize * 2.5;
                    meshA.position.y = meshB.position.y = currentSize / 2;
                } else {
                    meshA.position.y = currentSize / 2;
                    meshB.position.y = currentSize * 2.5;
                    meshA.position.x = meshB.position.x = 0;
                }
                groupMeshes.push(meshA, meshB);
            }
        }
    }

    // --- UI Event Handlers ---
    // --- Reset view button ---
    function setIsometricView() {
        camera.alpha = Math.PI / 4;
        camera.beta = Math.atan(Math.sqrt(2));
        camera.radius = 10;
        camera.target = BABYLON.Vector3.Zero();
    }
    let resetViewBtn = document.getElementById('reset-view-btn');
    if (!resetViewBtn) {
        resetViewBtn = document.createElement('button');
        resetViewBtn.id = 'reset-view-btn';
        resetViewBtn.title = 'Reset view to isometric';
        resetViewBtn.style.position = 'fixed';
        resetViewBtn.style.top = '16px';
        resetViewBtn.style.right = '64px';
        resetViewBtn.style.zIndex = 51;
        resetViewBtn.style.fontSize = '2rem';
        resetViewBtn.style.background = 'none';
        resetViewBtn.style.border = 'none';
        resetViewBtn.style.color = '#fff';
        resetViewBtn.style.cursor = 'pointer';
        resetViewBtn.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><g stroke="#fff" stroke-width="2" fill="none"><polygon points="14,4 24,10 24,20 14,26 4,20 4,10"/><path d="M14 4V14L24 10"/></g></svg>';
        document.body.appendChild(resetViewBtn);
    }
    resetViewBtn.onclick = setIsometricView;

    // --- Material picker interactivity ---
    const materialPicker = document.getElementById('material-picker');
    if (materialPicker) {
        materialPicker.value = currentMaterial;
        materialPicker.addEventListener('change', function(e) {
            currentMaterial = e.target.value;
            updateSceneBabylon();
        });
    }

    // --- Shape picker interactivity ---
    const shapeSelector = document.getElementById('shape-selector');
    if (shapeSelector) {
        shapeSelector.addEventListener('click', function(e) {
            let btn = e.target;
            if (btn.tagName !== 'BUTTON') btn = btn.closest('button[data-shape]');
            if (!btn) return;
            const shapeType = btn.getAttribute('data-shape');
            if (!shapeType) return;
            shapeSelector.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShape = shapeType;
            updateSceneBabylon();
        });
    }

    // --- Color picker and swatches interactivity ---
    const primaryColorInput = document.getElementById('primary-color');
    const primaryColorRow = document.getElementById('primary-color-row');
    if (primaryColorInput) {
        primaryColorInput.addEventListener('input', function(e) {
            currentColor = e.target.value;
            updateSceneBabylon();
        });
    }
    if (primaryColorRow) {
        primaryColorRow.querySelectorAll('.color-swatch').forEach(btn => {
            btn.addEventListener('click', function() {
                const color = btn.getAttribute('data-color');
                if (!color) return;
                currentColor = color;
                if (primaryColorInput) primaryColorInput.value = color;
                updateSceneBabylon();
            });
        });
    }

    // --- Base unit size stepper and slider interactivity ---
    const baseUnitInput = document.getElementById('base-unit-value');
    const baseUnitSlider = document.getElementById('base-unit-slider');
    const baseUnitMinus = document.getElementById('base-unit-minus');
    const baseUnitPlus = document.getElementById('base-unit-plus');
    function updateBaseUnit(val) {
        let v = parseFloat(val);
        if (isNaN(v)) v = 1;
        v = Math.max(0.05, Math.min(5, v));
        v = Math.round(v * 100) / 100;
        currentSize = v;
        if (baseUnitInput) baseUnitInput.value = v.toFixed(2);
        if (baseUnitSlider) baseUnitSlider.value = v;
        updateSceneBabylon();
    }
    if (baseUnitInput) {
        baseUnitInput.addEventListener('input', e => updateBaseUnit(e.target.value));
    }
    if (baseUnitSlider) {
        baseUnitSlider.addEventListener('input', e => updateBaseUnit(e.target.value));
    }
    if (baseUnitMinus) {
        baseUnitMinus.addEventListener('click', () => updateBaseUnit(currentSize - 0.05));
    }
    if (baseUnitPlus) {
        baseUnitPlus.addEventListener('click', () => updateBaseUnit(currentSize + 0.05));
    }

    // --- Display mode tabs interactivity ---
    const displayModeSelector = document.getElementById('display-mode-selector');
    const arrangementPanel = document.getElementById('arrangement-panel');
    if (displayModeSelector) {
        displayModeSelector.addEventListener('click', function(e) {
            let btn = e.target;
            if (btn.tagName !== 'BUTTON') btn = btn.closest('button[data-mode]');
            if (!btn) return;
            const mode = btn.getAttribute('data-mode');
            if (!mode) return;
            displayModeSelector.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = mode;
            if (arrangementPanel) arrangementPanel.classList.toggle('hidden', currentMode !== 'arrangement');
            // Set count to 1 for single, 10 for arrangement
            if (currentMode === 'single') {
                currentCount = 1;
            } else {
                currentCount = 10;
            }
            // Update UI controls
            if (primaryValueInput) primaryValueInput.value = currentCount;
            if (primarySlider) primarySlider.value = currentCount;
            updateSceneBabylon();
        });
    }

    // --- Arrangement tabs interactivity ---
    const arrangementTypeSelector = document.getElementById('arrangement-type-selector');
    if (arrangementTypeSelector) {
        arrangementTypeSelector.addEventListener('click', function(e) {
            let btn = e.target;
            if (btn.tagName !== 'BUTTON') btn = btn.closest('button[data-arrangement]');
            if (!btn) return;
            const arrangement = btn.getAttribute('data-arrangement');
            if (!arrangement) return;
            arrangementTypeSelector.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentArrangement = arrangement;
            updateSceneBabylon();
        });
    }

    // --- Primary value stepper and slider interactivity ---
    const primaryValueInput = document.getElementById('primary-value-value');
    const primarySlider = document.getElementById('primary-slider');
    const primaryMinus = document.getElementById('primary-value-minus');
    const primaryPlus = document.getElementById('primary-value-plus');
    function updatePrimaryValue(val) {
        let v = parseInt(val, 10);
        if (isNaN(v)) v = 10;
        v = Math.max(1, Math.min(1000000, v));
        currentCount = v;
        if (primaryValueInput) primaryValueInput.value = v;
        if (primarySlider) primarySlider.value = v;
        updateSceneBabylon();
    }
    if (primaryValueInput) {
        primaryValueInput.addEventListener('input', e => updatePrimaryValue(e.target.value));
    }
    if (primarySlider) {
        primarySlider.addEventListener('input', e => updatePrimaryValue(e.target.value));
    }
    if (primaryMinus) {
        primaryMinus.addEventListener('click', () => updatePrimaryValue(currentCount - 1));
    }
    if (primaryPlus) {
        primaryPlus.addEventListener('click', () => updatePrimaryValue(currentCount + 1));
    }

    // --- Zoom slider and reset button interactivity ---
    const zoomSlider = document.getElementById('zoom-slider');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    if (zoomSlider) {
        zoomSlider.addEventListener('input', function(e) {
            const val = parseFloat(e.target.value);
            camera.radius = val;
        });
        // Sync slider with camera
        camera.onViewMatrixChangedObservable.add(() => {
            zoomSlider.value = camera.radius;
        });
    }
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', function() {
            camera.radius = 10;
            if (zoomSlider) zoomSlider.value = 10;
        });
    }

    // --- Compare controls interactivity ---
    const compareCheckbox = document.getElementById('compare-checkbox');
    const comparisonControls = document.getElementById('comparison-controls');
    const layoutPanel = document.getElementById('layout-panel');
    if (compareCheckbox && comparisonControls && layoutPanel) {
        function updateCompareUI() {
            isComparing = compareCheckbox.checked;
            comparisonControls.classList.toggle('hidden', !isComparing);
            layoutPanel.classList.toggle('hidden', !isComparing);
            updateSceneBabylon();
        }
        compareCheckbox.addEventListener('change', updateCompareUI);
        updateCompareUI();
    }

    // --- Comparison value stepper and slider interactivity ---
    const comparisonValueInput = document.getElementById('comparison-value-value');
    const comparisonSlider = document.getElementById('comparison-slider');
    const comparisonMinus = document.getElementById('comparison-value-minus');
    const comparisonPlus = document.getElementById('comparison-value-plus');
    if (comparisonValueInput) {
        comparisonValueInput.addEventListener('input', e => updateComparisonValue(e.target.value));
    }
    if (comparisonSlider) {
        comparisonSlider.addEventListener('input', e => updateComparisonValue(e.target.value));
    }
    if (comparisonMinus) {
        comparisonMinus.addEventListener('click', () => updateComparisonValue(comparisonCount - 1));
    }
    if (comparisonPlus) {
        comparisonPlus.addEventListener('click', () => updateComparisonValue(comparisonCount + 1));
    }

    // --- Layout tabs interactivity ---
    const layoutSelector = document.getElementById('layout-selector');
    if (layoutSelector) {
        layoutSelector.addEventListener('click', function(e) {
            let btn = e.target;
            if (btn.tagName !== 'BUTTON') btn = btn.closest('button[data-layout]');
            if (!btn) return;
            const layout = btn.getAttribute('data-layout');
            if (!layout) return;
            layoutSelector.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            comparisonLayout = layout;
            updateSceneBabylon();
        });
    }

    // Initial render
    updateSceneBabylon();

    // Render loop
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Resize
    window.addEventListener('resize', function () {
        engine.resize();
    });
}); 