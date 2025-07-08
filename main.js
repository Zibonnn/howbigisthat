// Minimal Babylon.js setup for How Big Is That
// Remove all Three.js code

window.addEventListener('DOMContentLoaded', function () {
    // Get the canvas element
    const canvas = document.getElementById('visualization-canvas');

    // Create Babylon.js engine
    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Create scene
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.07, 0.09, 0.15, 1.0); // match dark bg

    // Camera
    const camera = new BABYLON.ArcRotateCamera('camera', Math.PI / 4, Math.PI / 3, 10, BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas, true);
    camera.wheelDeltaPercentage = 0.01;
    camera.lowerRadiusLimit = 2;
    camera.upperRadiusLimit = 100;

    // Light
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.95;

    // Basic shape: sphere
    const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);
    const mat = new BABYLON.StandardMaterial('mat', scene);
    mat.diffuseColor = new BABYLON.Color3(0.51, 0.55, 0.97); // #818CF8
    sphere.material = mat;
    sphere.position.y = 1;

    // Render loop
    engine.runRenderLoop(function () {
        scene.render();
    });

    // Resize
    window.addEventListener('resize', function () {
        engine.resize();
    });
}); 