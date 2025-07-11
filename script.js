// GLOBAL VARIABLES AND CONSTANTS
const CONFIG = {
    CANVAS_ID: 'babylon-canvas',
    MAX_OBJECTS: 100,
    ANIMATION_DURATION: 0.5,
    CAMERA: {
        ALPHA: Math.PI / 4,
        BETA: Math.PI / 3,
        RADIUS: 20,
        TARGET: new BABYLON.Vector3(0, 0, 0)
    },
    COLORS: {
        GROUP_A: new BABYLON.Color3(0.29, 0.57, 0.89), // Blue
        GROUP_B: new BABYLON.Color3(0.89, 0.29, 0.29), // Red
        GROUND: new BABYLON.Color3(0.8, 0.8, 0.8)
    },
    POSITIONS: {
        GROUP_A: new BABYLON.Vector3(-5, 0, 0),
        GROUP_B: new BABYLON.Vector3(5, 0, 0)
    }
};

// Application State
const AppState = {
    engine: null,
    scene: null,
    camera: null,
    selectedShape: 'sphere',
    selectedQuantity: 5,
    groupA: {
        objects: [],
        shape: null,
        quantity: 0
    },
    groupB: {
        objects: [],
        shape: null,
        quantity: 0
    },
    isPlacingGroupA: false,
    isPlacingGroupB: false
};

// DOM Elements
const DOMElements = {
    canvas: null,
    feedbackText: null,
    numberSlider: null,
    numberDisplay: null,
    shapeButtons: null,
    presetButtons: null,
    placeGroupABtn: null,
    placeGroupBBtn: null,
    compareBtn: null,
    clearBtn: null,
    switchBtn: null
};

// INITIALIZATION
function initializeApp() {
    console.log('Initializing Scale Explorer...');
    
    // Get DOM elements
    getDOMElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Babylon.js
    initializeBabylon();
    
    // Set initial state
    setInitialState();
    
    console.log('Scale Explorer initialized successfully!');
}

function getDOMElements() {
    DOMElements.canvas = document.getElementById(CONFIG.CANVAS_ID);
    DOMElements.feedbackText = document.getElementById('feedback-text');
    DOMElements.numberSlider = document.getElementById('number-slider');
    DOMElements.numberDisplay = document.getElementById('number-display');
    DOMElements.shapeButtons = document.querySelectorAll('.shape-btn');
    DOMElements.presetButtons = document.querySelectorAll('.preset-btn');
    DOMElements.placeGroupABtn = document.getElementById('place-group-a');
    DOMElements.placeGroupBBtn = document.getElementById('place-group-b');
    DOMElements.compareBtn = document.getElementById('compare-btn');
    DOMElements.clearBtn = document.getElementById('clear-btn');
    DOMElements.switchBtn = document.getElementById('switch-btn');
    
    // Verify all elements exist
    Object.entries(DOMElements).forEach(([key, element]) => {
        if (!element) {
            console.error(`DOM element not found: ${key}`);
        } else {
            console.log(`DOM element found: ${key}`, element);
        }
    });
    
    // Check canvas specifically
    if (DOMElements.canvas) {
        console.log('Canvas element:', DOMElements.canvas);
        console.log('Canvas dimensions:', DOMElements.canvas.clientWidth, 'x', DOMElements.canvas.clientHeight);
    }
}

function setupEventListeners() {
    // Number slider
    DOMElements.numberSlider.addEventListener('input', handleNumberSliderChange);
    
    // Preset buttons
    DOMElements.presetButtons.forEach(btn => {
        btn.addEventListener('click', handlePresetButtonClick);
    });
    
    // Shape buttons
    DOMElements.shapeButtons.forEach(btn => {
        btn.addEventListener('click', handleShapeButtonClick);
    });
    
    // Placement buttons
    DOMElements.placeGroupABtn.addEventListener('click', handlePlaceGroupAClick);
    DOMElements.placeGroupBBtn.addEventListener('click', handlePlaceGroupBClick);
    
    // Action buttons
    DOMElements.compareBtn.addEventListener('click', handleCompareClick);
    DOMElements.clearBtn.addEventListener('click', handleClearClick);
    DOMElements.switchBtn.addEventListener('click', handleSwitchClick);
}

function setInitialState() {
    console.log('Setting initial state...');
    
    // Set initial shape selection
    if (DOMElements.shapeButtons.length > 0) {
        DOMElements.shapeButtons[0].classList.add('active');
        AppState.selectedShape = 'sphere';
        console.log('Initial shape set to:', AppState.selectedShape);
    }
    
    // Set initial quantity
    DOMElements.numberDisplay.textContent = AppState.selectedQuantity;
    DOMElements.numberSlider.value = AppState.selectedQuantity;
    console.log('Initial quantity set to:', AppState.selectedQuantity);
    
    // Set initial feedback
    updateFeedback('Choose a shape and quantity, then place your first group!');
    
    // Disable compare button initially
    if (DOMElements.compareBtn) {
        DOMElements.compareBtn.disabled = true;
        console.log('Compare button disabled');
    }
    
    console.log('Initial state set successfully');
}

// BABYLON.JS SETUP
function initializeBabylon() {
    try {
        console.log('Starting Babylon.js initialization...');
        console.log('Canvas element:', DOMElements.canvas);
        
        // Create engine
        AppState.engine = new BABYLON.Engine(DOMElements.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });
        console.log('Engine created:', AppState.engine);
        
        // Create scene
        AppState.scene = new BABYLON.Scene(AppState.engine);
        AppState.scene.clearColor = new BABYLON.Color3(0.9, 0.95, 1.0);
        console.log('Scene created:', AppState.scene);
    
    // Create camera
    AppState.camera = new BABYLON.ArcRotateCamera(
        'camera',
        CONFIG.CAMERA.ALPHA,
        CONFIG.CAMERA.BETA,
        CONFIG.CAMERA.RADIUS,
        CONFIG.CAMERA.TARGET,
        AppState.scene
    );
    console.log('Camera created successfully');
    
    // Set camera target and attach controls
    AppState.camera.setTarget(BABYLON.Vector3.Zero());
    // Camera controls are automatically attached in Babylon.js v6
    console.log('Camera controls ready');
    
    // Set camera limits
    AppState.camera.lowerBetaLimit = 0.1;
    AppState.camera.upperBetaLimit = Math.PI / 2;
    AppState.camera.lowerRadiusLimit = 5;
    AppState.camera.upperRadiusLimit = 50;
    
    // Create lighting
    const hemisphericLight = new BABYLON.HemisphericLight(
        'hemisphericLight',
        new BABYLON.Vector3(0, 1, 0),
        AppState.scene
    );
    hemisphericLight.intensity = 0.8;
    
    const directionalLight = new BABYLON.DirectionalLight(
        'directionalLight',
        new BABYLON.Vector3(-1, -1, -1),
        AppState.scene
    );
    directionalLight.intensity = 0.5;
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround(
        'ground',
        { width: 30, height: 30 },
        AppState.scene
    );
    ground.position.y = -1;
    
    const groundMaterial = new BABYLON.StandardMaterial('groundMaterial', AppState.scene);
    groundMaterial.diffuseColor = CONFIG.COLORS.GROUND;
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    ground.material = groundMaterial;
    
    console.log('Babylon.js scene created successfully');
    
    // Create invisible walls for drop zones
    createDropZones();
    
    // Start render loop
    AppState.engine.runRenderLoop(() => {
        AppState.scene.render();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        AppState.engine.resize();
    });
    
    } catch (error) {
        console.error('Error initializing Babylon.js:', error);
        updateFeedback('Error loading 3D engine. Please refresh the page.');
    }
}

function createDropZones() {
    // Create invisible boxes to help with object placement
    const dropZoneA = BABYLON.MeshBuilder.CreateBox(
        'dropZoneA',
        { width: 8, height: 0.1, depth: 8 },
        AppState.scene
    );
    dropZoneA.position = CONFIG.POSITIONS.GROUP_A.clone();
    dropZoneA.position.y = 0;
    dropZoneA.isVisible = false;
    
    const dropZoneB = BABYLON.MeshBuilder.CreateBox(
        'dropZoneB',
        { width: 8, height: 0.1, depth: 8 },
        AppState.scene
    );
    dropZoneB.position = CONFIG.POSITIONS.GROUP_B.clone();
    dropZoneB.position.y = 0;
    dropZoneB.isVisible = false;
}

// EVENT HANDLERS
function handleNumberSliderChange(event) {
    const value = parseInt(event.target.value);
    AppState.selectedQuantity = value;
    DOMElements.numberDisplay.textContent = value;
    
    // Remove active class from preset buttons
    DOMElements.presetButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to matching preset button
    const matchingPreset = Array.from(DOMElements.presetButtons).find(
        btn => parseInt(btn.dataset.value) === value
    );
    if (matchingPreset) {
        matchingPreset.classList.add('active');
    }
}

function handlePresetButtonClick(event) {
    const value = parseInt(event.target.dataset.value);
    AppState.selectedQuantity = value;
    DOMElements.numberDisplay.textContent = value;
    DOMElements.numberSlider.value = value;
    
    // Update active preset button
    DOMElements.presetButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function handleShapeButtonClick(event) {
    const shape = event.target.dataset.shape;
    AppState.selectedShape = shape;
    
    // Update active shape button
    DOMElements.shapeButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function handlePlaceGroupAClick() {
    placeGroup('A');
}

function handlePlaceGroupBClick() {
    placeGroup('B');
}

function handleCompareClick() {
    performComparison();
}

function handleClearClick() {
    clearAllObjects();
}

function handleSwitchClick() {
    switchGroups();
}

// SHAPE CREATION FUNCTIONS
function createShape(type, position, material) {
    let mesh;
    
    switch (type) {
        case 'sphere':
            mesh = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 1 }, AppState.scene);
            break;
        case 'cube':
            mesh = BABYLON.MeshBuilder.CreateBox('cube', { size: 1 }, AppState.scene);
            break;
        case 'cylinder':
            mesh = BABYLON.MeshBuilder.CreateCylinder('cylinder', { height: 1, diameter: 1 }, AppState.scene);
            break;
        case 'pyramid':
            mesh = BABYLON.MeshBuilder.CreatePolyhedron('pyramid', { type: 0, size: 0.7 }, AppState.scene);
            break;
        case 'torus':
            mesh = BABYLON.MeshBuilder.CreateTorus('torus', { diameter: 1, thickness: 0.3 }, AppState.scene);
            break;
        default:
            mesh = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 1 }, AppState.scene);
    }
    
    mesh.position = position;
    mesh.material = material;
    
    return mesh;
}

function createMaterial(color, name) {
    const material = new BABYLON.StandardMaterial(name, AppState.scene);
    material.diffuseColor = color;
    material.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    return material;
}

// GROUP PLACEMENT FUNCTIONS
function placeGroup(groupName) {
    const group = groupName === 'A' ? AppState.groupA : AppState.groupB;
    const position = groupName === 'A' ? CONFIG.POSITIONS.GROUP_A : CONFIG.POSITIONS.GROUP_B;
    const color = groupName === 'A' ? CONFIG.COLORS.GROUP_A : CONFIG.COLORS.GROUP_B;
    
    // Clear existing objects in this group
    clearGroup(groupName);
    
    // Create material for this group
    const material = createMaterial(color, `group${groupName}Material`);
    
    // Create objects
    const objects = [];
    const arrangement = calculateGridArrangement(AppState.selectedQuantity);
    
    for (let i = 0; i < AppState.selectedQuantity; i++) {
        const gridPosition = getGridPosition(i, arrangement);
        const objectPosition = new BABYLON.Vector3(
            position.x + gridPosition.x,
            position.y + gridPosition.y,
            position.z + gridPosition.z
        );
        
        const mesh = createShape(AppState.selectedShape, objectPosition, material);
        objects.push(mesh);
    }
    
    // Update group state
    group.objects = objects;
    group.shape = AppState.selectedShape;
    group.quantity = AppState.selectedQuantity;
    
    // Update UI
    updatePlacementButtonState(groupName, true);
    updateFeedback(`Group ${groupName} placed with ${AppState.selectedQuantity} ${AppState.selectedShape}s!`);
    
    // Enable compare button if both groups have objects
    if (AppState.groupA.objects.length > 0 && AppState.groupB.objects.length > 0) {
        DOMElements.compareBtn.disabled = false;
    }
}

function calculateGridArrangement(count) {
    if (count === 1) {
        return { rows: 1, cols: 1, spacing: 1.5 };
    }
    
    // Find the most square-like arrangement
    let bestRows = 1;
    let bestCols = count;
    let bestDiff = Math.abs(bestCols - bestRows);
    
    for (let rows = 1; rows <= Math.sqrt(count); rows++) {
        if (count % rows === 0) {
            const cols = count / rows;
            const diff = Math.abs(cols - rows);
            if (diff < bestDiff) {
                bestRows = rows;
                bestCols = cols;
                bestDiff = diff;
            }
        }
    }
    
    // If no perfect factor, use closest square root
    if (bestDiff === Math.abs(count - 1)) {
        const sqrt = Math.ceil(Math.sqrt(count));
        bestRows = sqrt;
        bestCols = sqrt;
    }
    
    return { rows: bestRows, cols: bestCols, spacing: 1.5 };
}

function getGridPosition(index, arrangement) {
    const row = Math.floor(index / arrangement.cols);
    const col = index % arrangement.cols;
    
    const x = (col - (arrangement.cols - 1) / 2) * arrangement.spacing;
    const z = (row - (arrangement.rows - 1) / 2) * arrangement.spacing;
    
    return new BABYLON.Vector3(x, 0, z);
}

// GROUP MANAGEMENT FUNCTIONS
function clearGroup(groupName) {
    const group = groupName === 'A' ? AppState.groupA : AppState.groupB;
    
    // Dispose of all objects in the group
    group.objects.forEach(obj => {
        if (obj && obj.dispose) {
            obj.dispose();
        }
    });
    
    // Reset group state
    group.objects = [];
    group.shape = null;
    group.quantity = 0;
    
    // Update UI
    updatePlacementButtonState(groupName, false);
}

function clearAllObjects() {
    clearGroup('A');
    clearGroup('B');
    
    // Update UI
    DOMElements.compareBtn.disabled = true;
    updateFeedback('All objects cleared. Start placing new groups!');
}

function switchGroups() {
    // Store temporary references
    const tempObjects = AppState.groupA.objects;
    const tempShape = AppState.groupA.shape;
    const tempQuantity = AppState.groupA.quantity;
    
    // Swap group A with group B
    AppState.groupA.objects = AppState.groupB.objects;
    AppState.groupA.shape = AppState.groupB.shape;
    AppState.groupA.quantity = AppState.groupB.quantity;
    
    AppState.groupB.objects = tempObjects;
    AppState.groupB.shape = tempShape;
    AppState.groupB.quantity = tempQuantity;
    
    // Update object positions
    repositionGroup('A');
    repositionGroup('B');
    
    // Update UI
    updatePlacementButtonState('A', AppState.groupA.objects.length > 0);
    updatePlacementButtonState('B', AppState.groupB.objects.length > 0);
    updateFeedback('Groups switched!');
}

function repositionGroup(groupName) {
    const group = groupName === 'A' ? AppState.groupA : AppState.groupB;
    const position = groupName === 'A' ? CONFIG.POSITIONS.GROUP_A : CONFIG.POSITIONS.GROUP_B;
    
    if (group.objects.length === 0) return;
    
    const arrangement = calculateGridArrangement(group.quantity);
    
    group.objects.forEach((obj, index) => {
        const gridPosition = getGridPosition(index, arrangement);
        obj.position = new BABYLON.Vector3(
            position.x + gridPosition.x,
            position.y + gridPosition.y,
            position.z + gridPosition.z
        );
    });
}

// COMPARISON FUNCTIONS
function performComparison() {
    const groupACount = AppState.groupA.quantity;
    const groupBCount = AppState.groupB.quantity;
    
    if (groupACount === 0 || groupBCount === 0) {
        updateFeedback('Both groups need objects to compare!');
        return;
    }
    
    const ratio = groupACount / groupBCount;
    let comparisonText;
    
    if (Math.abs(ratio - 1) < 0.01) {
        comparisonText = `Groups are equal! Both have ${groupACount} objects.`;
    } else if (ratio > 1) {
        const times = Math.round(ratio * 10) / 10;
        comparisonText = `Group A is ${times}x larger than Group B (${groupACount} vs ${groupBCount})`;
    } else {
        const times = Math.round((1/ratio) * 10) / 10;
        comparisonText = `Group B is ${times}x larger than Group A (${groupBCount} vs ${groupACount})`;
    }
    
    updateFeedback(comparisonText);
    
    // Animate camera to show both groups
    animateCameraToShowBothGroups();
}

function animateCameraToShowBothGroups() {
    // Calculate center point between both groups
    const centerX = (CONFIG.POSITIONS.GROUP_A.x + CONFIG.POSITIONS.GROUP_B.x) / 2;
    const centerTarget = new BABYLON.Vector3(centerX, 0, 0);
    
    // Animate camera to center position
    BABYLON.Animation.CreateAndStartAnimation(
        'cameraTargetAnimation',
        AppState.camera,
        'target',
        30,
        30,
        AppState.camera.target,
        centerTarget,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    
    // Adjust camera radius to fit both groups
    const newRadius = Math.max(25, AppState.camera.radius);
    BABYLON.Animation.CreateAndStartAnimation(
        'cameraRadiusAnimation',
        AppState.camera,
        'radius',
        30,
        30,
        AppState.camera.radius,
        newRadius,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );
}

// UI UPDATE FUNCTIONS
function updateFeedback(message) {
    DOMElements.feedbackText.textContent = message;
}

function updatePlacementButtonState(groupName, hasObjects) {
    const button = groupName === 'A' ? DOMElements.placeGroupABtn : DOMElements.placeGroupBBtn;
    
    if (hasObjects) {
        button.classList.add('active');
        button.textContent = `Update Group ${groupName}`;
    } else {
        button.classList.remove('active');
        button.textContent = `Place Group ${groupName}`;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp); 