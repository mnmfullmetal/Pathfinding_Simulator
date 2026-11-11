import { AlgorithmRegistry } from './PathfinderRegistry.js';
import './algorithms/AStar.js';
import './algorithms/JumpPointSearch.js';
import './algorithms/GreedyBug.js'
import './algorithms/ThetaStar.js'
import './algorithms/HPAStar.js'
import './algorithms/Dijkstra.js'
import './algorithms/BidirectionalAStar.js'
import './algorithms/BFS.js'



let totalColumnsCount = 50, totalRowsCount = 50;
let gridMap = [];      // 0 = empty, 1 = wall
let visualStateGrid = []; // 0 = empty, 1 = evaluated, 2 = path
let startNode = {x: 5, y: 25};
let targetNode = {x: 45, y: 25};

let activeRaycasts = [];

let isVisualisationPlaying = false;
let isVisualisationPaused = false;
let currentVisualisationRunId = 0;

const drawingCanvasElement = document.getElementById('gridCanvas');
const canvasGraphicsContext = drawingCanvasElement.getContext('2d');

function initGrid() {
    gridMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(0));
    resetVisuals();
}

function resetVisuals() {
    currentVisualisationRunId++; 
    isVisualisationPlaying = false;
    isVisualisationPaused = false;
    document.getElementById('btn-pause').innerText = "Pause";
    activeRaycasts = [];
    visualStateGrid = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(0));
    resizeCanvas();
}

const algorithmDropdownElement = document.getElementById('algorithm-dropdown');
for (const [algorithmId, algorithmData] of Object.entries(AlgorithmRegistry)) {
    const dropdownOptionElement = document.createElement('option');
    dropdownOptionElement.value = algorithmId;
    dropdownOptionElement.innerText = algorithmData.displayName;
    algorithmDropdownElement.appendChild(dropdownOptionElement);
}

document.getElementById('layout-mode').addEventListener('change', (eventObject) => {
    const isRandomLayoutSelected = eventObject.target.value === 'random';
    document.getElementById('density-group').style.display = isRandomLayoutSelected ? 'block' : 'none';
    document.getElementById('btn-generate').style.display = isRandomLayoutSelected ? 'block' : 'none';
});

document.getElementById('density').addEventListener('input', (eventObject) => {
    document.getElementById('density-val').innerText = eventObject.target.value;
});

document.getElementById('speed').addEventListener('input', (eventObject) => {
    document.getElementById('speed-val').innerText = eventObject.target.value;
});

const bloomGroupElement = document.getElementById('bloom-group');
const bloomRadiusElement = document.getElementById('bloom-radius');
const bloomValElement = document.getElementById('bloom-val');
const bloomDecayElement = document.getElementById('bloom-decay');
const decayValElement = document.getElementById('decay-val');

algorithmDropdownElement.addEventListener('change', (eventObject) => {
    const selectedAlgo = eventObject.target.value;
    bloomGroupElement.style.display = selectedAlgo === 'greedy_bug' ? 'block' : 'none';
    hpaGroupElement.style.display = selectedAlgo === 'hpastar' ? 'block' : 'none';
});

bloomDecayElement.addEventListener('input', (eventObject) => {
    decayValElement.innerText = eventObject.target.value;
});

const hpaGroupElement = document.getElementById('hpa-group');
const clusterSizeElement = document.getElementById('cluster-size');
const clusterValElement = document.getElementById('cluster-val');

clusterSizeElement.addEventListener('input', (eventObject) => {
    clusterValElement.innerText = eventObject.target.value;
});

algorithmDropdownElement.dispatchEvent(new Event('change'));

bloomRadiusElement.addEventListener('input', (eventObject) => {
    bloomValElement.innerText = eventObject.target.value;
});

document.getElementById('btn-update-grid').addEventListener('click', () => {
    totalColumnsCount = parseInt(document.getElementById('grid-x').value);
    totalRowsCount = parseInt(document.getElementById('grid-y').value);
    startNode = {x: 1, y: Math.floor(totalRowsCount / 2)};
    targetNode = {x: totalColumnsCount - 2, y: Math.floor(totalRowsCount / 2)};
    initGrid();
});

document.getElementById('btn-generate').addEventListener('click', () => {
    const wallDensityValue = parseInt(document.getElementById('density').value) / 100;
    for (let gridCoordinateY = 0; gridCoordinateY < totalRowsCount; gridCoordinateY++) {
        for (let gridCoordinateX = 0; gridCoordinateX < totalColumnsCount; gridCoordinateX++) {
            if ((gridCoordinateX === startNode.x && gridCoordinateY === startNode.y) || (gridCoordinateX === targetNode.x && gridCoordinateY === targetNode.y)) continue;
            gridMap[gridCoordinateY][gridCoordinateX] = Math.random() < wallDensityValue ? 1 : 0;
        }
    }
    resetVisuals();
});

document.getElementById('btn-clear').addEventListener('click', initGrid);
document.getElementById('btn-reset').addEventListener('click', resetVisuals);

document.getElementById('btn-pause').addEventListener('click', () => {
    if (!isVisualisationPlaying) return;
    isVisualisationPaused = !isVisualisationPaused;
    document.getElementById('btn-pause').innerText = isVisualisationPaused ? "Unpause" : "Pause";
});

document.getElementById('btn-run').addEventListener('click', async () => {
    resetVisuals(); 
    
    const selectedAlgorithmId = algorithmDropdownElement.value;
    const selectedAlgorithmObject = AlgorithmRegistry[selectedAlgorithmId];

    if (!selectedAlgorithmObject) {
        console.error("Algorithm not found!");
        return;
    }

   const algorithmConfig = {
        bloomRadius: parseInt(bloomRadiusElement.value, 10),
        bloomDecay: parseInt(bloomDecayElement.value, 10),
        clusterSize: parseInt(clusterSizeElement.value, 10) // New param
    };


    const pathfindingResultObject = selectedAlgorithmObject.run(gridMap, startNode, targetNode, algorithmConfig);

    activeRaycasts = pathfindingResultObject.raycasts || [];
    
    document.getElementById('stat-time').innerText = pathfindingResultObject.timeMs.toFixed(3);
    document.getElementById('stat-eval').innerText = pathfindingResultObject.evaluated.length;
    document.getElementById('stat-path').innerText = pathfindingResultObject.path.length;

    currentVisualisationRunId++;
    let activeVisualisationRunId = currentVisualisationRunId;
    isVisualisationPlaying = true;
    isVisualisationPaused = false;

    for (let evaluationIndex = 0; evaluationIndex < pathfindingResultObject.evaluated.length; evaluationIndex++) {
        if (activeVisualisationRunId !== currentVisualisationRunId) return; 
        while (isVisualisationPaused) await new Promise(resolvePromise => requestAnimationFrame(resolvePromise)); 
        
        let currentNode = pathfindingResultObject.evaluated[evaluationIndex];
        if (!(currentNode.x === startNode.x && currentNode.y === startNode.y) && !(currentNode.x === targetNode.x && currentNode.y === targetNode.y)) {
            visualStateGrid[currentNode.y][currentNode.x] = 1; 
            drawGrid();
        }

        let playbackSpeedValue = parseInt(document.getElementById('speed').value);
        let evaluatedNodesPerRenderFrame = playbackSpeedValue === 100 ? 50 : Math.max(1, Math.floor(playbackSpeedValue / 15));
        
        if (evaluationIndex % evaluatedNodesPerRenderFrame === 0) {
            let delayBetweenFramesMilliseconds = Math.max(0, 100 - playbackSpeedValue);
            if (delayBetweenFramesMilliseconds > 0) await new Promise(resolvePromise => setTimeout(resolvePromise, delayBetweenFramesMilliseconds));
            else await new Promise(resolvePromise => requestAnimationFrame(resolvePromise));
        }
    }

    for (let pathIndex = 0; pathIndex < pathfindingResultObject.path.length; pathIndex++) {
        if (activeVisualisationRunId !== currentVisualisationRunId) return;
        let currentNode = pathfindingResultObject.path[pathIndex];
        if (!(currentNode.x === startNode.x && currentNode.y === startNode.y) && !(currentNode.x === targetNode.x && currentNode.y === targetNode.y)) {
            visualStateGrid[currentNode.y][currentNode.x] = 2; 
            drawGrid();
        }
        await new Promise(resolvePromise => setTimeout(resolvePromise, 10)); 
    }
    isVisualisationPlaying = false;
});

let isMouseCurrentlyDragging = false;
let currentDragInteractionType = null; 

function getGridCoords(eventObject) {
    const canvasBoundingRectangle = drawingCanvasElement.getBoundingClientRect();
    const singleCellWidth = drawingCanvasElement.width / totalColumnsCount;
    const singleCellHeight = drawingCanvasElement.height / totalRowsCount;
    const gridCoordinateX = Math.floor((eventObject.clientX - canvasBoundingRectangle.left) / singleCellWidth);
    const gridCoordinateY = Math.floor((eventObject.clientY - canvasBoundingRectangle.top) / singleCellHeight);
    return { x: Math.max(0, Math.min(gridCoordinateX, totalColumnsCount - 1)), y: Math.max(0, Math.min(gridCoordinateY, totalRowsCount - 1)) };
}

function handleInteraction(gridCoordinateX, gridCoordinateY) {
    if (isVisualisationPlaying) resetVisuals(); 
    
    if (currentDragInteractionType === 'start' && gridMap[gridCoordinateY][gridCoordinateX] !== 1 && !(gridCoordinateX === targetNode.x && gridCoordinateY === targetNode.y)) startNode = {x: gridCoordinateX, y: gridCoordinateY};
    else if (currentDragInteractionType === 'target' && gridMap[gridCoordinateY][gridCoordinateX] !== 1 && !(gridCoordinateX === startNode.x && gridCoordinateY === startNode.y)) targetNode = {x: gridCoordinateX, y: gridCoordinateY};
    else if (currentDragInteractionType === 'wall' && !(gridCoordinateX === startNode.x && gridCoordinateY === startNode.y) && !(gridCoordinateX === targetNode.x && gridCoordinateY === targetNode.y)) gridMap[gridCoordinateY][gridCoordinateX] = 1;
    else if (currentDragInteractionType === 'empty') gridMap[gridCoordinateY][gridCoordinateX] = 0;
    
    drawGrid();
}

drawingCanvasElement.addEventListener('mousedown', (eventObject) => {
    const {x: gridCoordinateX, y: gridCoordinateY} = getGridCoords(eventObject);
    if (gridCoordinateX === startNode.x && gridCoordinateY === startNode.y) currentDragInteractionType = 'start';
    else if (gridCoordinateX === targetNode.x && gridCoordinateY === targetNode.y) currentDragInteractionType = 'target';
    else if (gridMap[gridCoordinateY][gridCoordinateX] === 1) currentDragInteractionType = 'empty';
    else currentDragInteractionType = 'wall';
    
    isMouseCurrentlyDragging = true;
    handleInteraction(gridCoordinateX, gridCoordinateY);
});

drawingCanvasElement.addEventListener('mousemove', (eventObject) => {
    if (isMouseCurrentlyDragging) {
        const {x: gridCoordinateX, y: gridCoordinateY} = getGridCoords(eventObject);
        handleInteraction(gridCoordinateX, gridCoordinateY);
    }
});


document.getElementById('btn-save-layout').addEventListener('click', () => {
    const slotId = document.getElementById('layout-slot').value;
    const layoutData = {
        cols: totalColumnsCount,
        rows: totalRowsCount,
        start: startNode,
        target: targetNode,
        grid: gridMap
    };
    
    localStorage.setItem(`pathfinder_layout_${slotId}`, JSON.stringify(layoutData));
    console.log(`Layout saved to Slot ${slotId}`);
});

document.getElementById('btn-load-layout').addEventListener('click', () => {
    const slotId = document.getElementById('layout-slot').value;
    const savedData = localStorage.getItem(`pathfinder_layout_${slotId}`);
    
    if (savedData) {
        const layoutData = JSON.parse(savedData);
        
        totalColumnsCount = layoutData.cols;
        totalRowsCount = layoutData.rows;
        startNode = layoutData.start;
        targetNode = layoutData.target;
        
        document.getElementById('grid-x').value = totalColumnsCount;
        document.getElementById('grid-y').value = totalRowsCount;
        
        gridMap = layoutData.grid.map(row => [...row]);
        
        resetVisuals();
        console.log(`Layout loaded from Slot ${slotId}`);
    } else {
        console.warn(`No layout found in Slot ${slotId}`);
    }
});

window.addEventListener('mouseup', () => isMouseCurrentlyDragging = false);

function resizeCanvas() {
    const mainUiContainerElement = document.querySelector('.main');
    drawingCanvasElement.width = mainUiContainerElement.clientWidth - 40;
    drawingCanvasElement.height = mainUiContainerElement.clientHeight - 40;
    drawGrid();
}

function drawGrid() {
    canvasGraphicsContext.clearRect(0, 0, drawingCanvasElement.width, drawingCanvasElement.height);
    let singleCellWidth = drawingCanvasElement.width / totalColumnsCount;
    let singleCellHeight = drawingCanvasElement.height / totalRowsCount;

    for (let gridCoordinateY = 0; gridCoordinateY < totalRowsCount; gridCoordinateY++) {
        for (let gridCoordinateX = 0; gridCoordinateX < totalColumnsCount; gridCoordinateX++) {
            canvasGraphicsContext.strokeStyle = '#444';
            canvasGraphicsContext.strokeRect(gridCoordinateX * singleCellWidth, gridCoordinateY * singleCellHeight, singleCellWidth, singleCellHeight);

            if (gridMap[gridCoordinateY][gridCoordinateX] === 1) {
                canvasGraphicsContext.fillStyle = '#888';
                canvasGraphicsContext.fillRect(gridCoordinateX * singleCellWidth, gridCoordinateY * singleCellHeight, singleCellWidth, singleCellHeight);
            } else if (visualStateGrid[gridCoordinateY][gridCoordinateX] === 1) {
                canvasGraphicsContext.fillStyle = 'rgba(0, 122, 204, 0.5)';
                canvasGraphicsContext.fillRect(gridCoordinateX * singleCellWidth, gridCoordinateY * singleCellHeight, singleCellWidth, singleCellHeight);
            } else if (visualStateGrid[gridCoordinateY][gridCoordinateX] === 2) {
                canvasGraphicsContext.fillStyle = '#00ff88';
                canvasGraphicsContext.fillRect(gridCoordinateX * singleCellWidth, gridCoordinateY * singleCellHeight, singleCellWidth, singleCellHeight);
            }
        }
    }

    canvasGraphicsContext.fillStyle = '#ff3366'; 
    canvasGraphicsContext.fillRect(startNode.x * singleCellWidth, startNode.y * singleCellHeight, singleCellWidth, singleCellHeight);

    canvasGraphicsContext.fillStyle = '#ffcc00';
    canvasGraphicsContext.fillRect(targetNode.x * singleCellWidth, targetNode.y * singleCellHeight, singleCellWidth, singleCellHeight);

    if (activeRaycasts && activeRaycasts.length > 0) {
        canvasGraphicsContext.strokeStyle = '#ff3333';
        canvasGraphicsContext.lineWidth = 1;
        canvasGraphicsContext.beginPath();
        for (let rc of activeRaycasts) {
            let startPixelX = (rc.startX + 0.5) * singleCellWidth;
            let startPixelY = (rc.startY + 0.5) * singleCellHeight;
            let endPixelX = (rc.endX + 0.5) * singleCellWidth;
            let endPixelY = (rc.endY + 0.5) * singleCellHeight;
            canvasGraphicsContext.moveTo(startPixelX, startPixelY);
            canvasGraphicsContext.lineTo(endPixelX, endPixelY);
        }
        canvasGraphicsContext.stroke();
    }
}

const simulatorView = document.getElementById('simulator-view');
const encyclopediaView = document.getElementById('encyclopedia-view');
const btnInfo = document.getElementById('btn-info');
const btnCloseEncy = document.getElementById('btn-close-ency');
const btnTryAlgo = document.getElementById('btn-try-algo');
const encyMenuItems = document.querySelectorAll('.ency-menu li');

const encyTitle = document.getElementById('ency-title-container');
const encyOverview = document.getElementById('ency-overview-text');
const encyUseCases = document.getElementById('ency-use-cases');
const encyDiagram = document.getElementById('ency-diagram-container');
const encyLegend = document.getElementById('ency-diagram-legend');
const encyDiagDesc = document.getElementById('ency-diagram-desc');
const encyScenarios = document.getElementById('ency-scenarios-container');
const encyComplexity = document.getElementById('ency-complexity');

const createScenario = (name, efficiency, color, desc) => `
    <div class="scenario">
        <div class="scenario-name">${name}</div>
        <div class="scenario-desc"><strong style="color: ${color};">${efficiency}</strong><br>${desc}</div>
    </div>
`;

const standardLegend = `
    <div><span class="box-start">S</span> Start</div>
    <div><span class="box-target">T</span> Target</div>
    <div><span class="box-eval"></span> Evaluated Nodes</div>
`;

const algoData = {
    astar: {
        title: '<h1>A* (A-STAR)</h1>',
        overview: 'Finds the shortest path on a grid by combining actual cost from the start g(n) and estimated cost to the target h(n), using the evaluation formula:<br><br><code style="color: #fff; background: #111; padding: 4px 8px; border-radius: 4px;">f(n) = g(n) + h(n)</code>',
        useCases: '<li>General 2D game movement</li><li>Obstacle-heavy grids</li><li>Where a single optimal path is required</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-eval">f</div>
            <div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-wall"></div><div class="diag-wall"></div><div class="diag-wall"></div>
            <div class="diag-empty"></div><div class="diag-start">S</div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-wall"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'The algorithm evaluates neighbors around the Start node, scoring them based on distance traveled (g) + estimated distance to Target (h). It prioritizes expanding nodes with the lowest total score (f) to flow around the wall.',
        scenarios: 
            createScenario('Open Terrain', 'High Efficiency', '#00ff88', 'Expands in a narrow cone toward target.') +
            createScenario('Cluttered Space', 'Moderate Efficiency', '#ffcc00', 'Explores smoothly around edges of obstacles.') +
            createScenario('Dead Ends', 'Low Efficiency', '#ff3333', 'Forces massive evaluation expansion as it explores closed corridors.'),
        complexity: '<span>Time: O(b<sup>d</sup>)</span> | <span>Space: O(b<sup>d</sup>)</span>'
    },
    dijkstra: {
        title: '<h1>DIJKSTRA</h1>',
        overview: 'Expands outward uniformly from the start node evaluating the actual cost g(n) to reach each node. It does not use a heuristic to guide it toward the target.<br><br><code style="color: #fff; background: #111; padding: 4px 8px; border-radius: 4px;">f(n) = g(n)</code>',
        useCases: '<li>Unknown target locations</li><li>Pathing to multiple potential targets</li><li>Generating flow-fields</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">g</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-start">S</div><div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-eval">g</div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">g</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'Because it lacks a target heuristic, Dijkstra evaluates nodes uniformly in a diamond or circular pattern radiating outward from the start node until it blindly hits the target.',
        scenarios: 
            createScenario('Open Terrain', 'Low Efficiency', '#ff3333', 'Wastes evaluations expanding away from the target.') +
            createScenario('Cluttered Space', 'Low Efficiency', '#ff3333', 'Evaluates all reachable space regardless of direction.') +
            createScenario('Dead Ends', 'Low Efficiency', '#ff3333', 'Will eventually find the exit, but checks all dead ends equally.'),
        complexity: '<span>Time: O(|V| + |E|)</span> | <span>Space: O(|V|)</span>'
    },
    bidirectional: {
        title: '<h1>BIDIRECTIONAL A*</h1>',
        overview: 'Executes two simultaneous A* searches: one expanding forward from the Start, and one expanding backward from the Target. The algorithm terminates when the two search frontiers intersect.',
        useCases: '<li>Point-to-point routing</li><li>Large maps with known start/end coordinates</li><li>Road networks</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">h</div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">h</div><div class="diag-eval">h</div><div class="diag-eval">h</div>
            <div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-start">S</div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'The two frontiers grow toward each other, drastically reducing the search radius required compared to a single directional search.',
        scenarios: 
            createScenario('Open Terrain', 'High Efficiency', '#00ff88', 'Halves the search depth, significantly reducing evaluated nodes.') +
            createScenario('Cluttered Space', 'Moderate Efficiency', '#ffcc00', 'Frontiers may miss each other temporarily around large obstacles.') +
            createScenario('Dead Ends', 'Low Efficiency', '#ff3333', 'If one side starts in a dead end, it evaluates the whole trap before intersecting.'),
        complexity: '<span>Time: O(b<sup>d/2</sup>)</span> | <span>Space: O(b<sup>d/2</sup>)</span>'
    },
    jps: {
        title: '<h1>JUMP POINT SEARCH</h1>',
        overview: 'An optimization for A* on uniform-cost grids. It prunes symmetrically redundant paths by casting rays vertically, horizontally, and diagonally, only adding nodes to the open set when they are "forced neighbors" (corners of obstacles).',
        useCases: '<li>Massive, uniform, unweighted grids</li><li>RTS Games with open maps</li><li>Reducing memory overhead</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-start">S</div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: '<div><span class="box-start">S</span> Start</div><div><span class="box-target">T</span> Target</div><div><span class="box-eval" style="border-radius: 50%;"></span> Jump Point</div>',
        diagDesc: 'Instead of evaluating every single cell, JPS "jumps" across empty space. The node marked `f` is a Jump Point because it is adjacent to the corner of an obstacle, making it mathematically necessary to evaluate.',
        scenarios: 
            createScenario('Open Terrain', 'Max Efficiency', '#00ff88', 'Skips thousands of empty cells in a single bound.') +
            createScenario('Cluttered Space', 'High Efficiency', '#00ff88', 'Highly effective at pruning useless paths around square walls.') +
            createScenario('Dead Ends', 'Moderate Efficiency', '#ffcc00', 'Still bounded by A* worst-case scenarios, but evaluates faster.'),
        complexity: '<span>Time: O(b<sup>d</sup>)</span> | <span>Space: O(b<sup>d</sup>)</span>'
    },
    thetastar: {
        title: '<h1>THETA*</h1>',
        overview: 'A variant of A* that propagates information along grid edges without constraining the path to grid cell transitions. It checks line-of-sight between a node\'s parent and its neighbor to bypass intermediate cells.',
        useCases: '<li>Unconstrained 2D movement</li><li>Smooth, realistic unit pathing</li><li>Removing blocky/zigzag paths</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-start">S</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'Theta* can connect the Start node directly to a distant node (like T) via a straight vector, completely ignoring the 8-directional grid constraints if no walls block the line of sight.',
        scenarios: 
            createScenario('Open Terrain', 'High Efficiency', '#00ff88', 'Finds the true shortest Euclidean vector.') +
            createScenario('Cluttered Space', 'Moderate Efficiency', '#ffcc00', 'Line-of-sight checks add constant overhead to evaluation time.') +
            createScenario('Dead Ends', 'Low Efficiency', '#ff3333', 'Suffers from the same expansion traps as standard A*.'),
        complexity: '<span>Time: O(b<sup>d</sup>)</span> | <span>Space: O(b<sup>d</sup>)</span>'
    },
    hpastar: {
        title: '<h1>HIERARCHICAL A*</h1>',
        overview: 'Divides the grid into macro-clusters. Pre-computes local paths between entrances on cluster borders, reducing the global search to a high-level graph of clusters rather than individual grid cells.',
        useCases: '<li>Massive scale MMO maps</li><li>Real-time dynamic pathing across long distances</li><li>Reducing memory limits</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-wall"></div><div class="diag-eval">f</div><div class="diag-wall"></div><div class="diag-wall"></div><div class="diag-eval">f</div><div class="diag-wall"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-start">S</div><div class="diag-empty"></div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: '<div><span class="box-start">S</span> Start</div><div><span class="box-target">T</span> Target</div><div><span class="box-eval" style="border-radius: 50%;"></span> Cluster Entrance</div>',
        diagDesc: 'The walls here represent the boundaries of a predefined cluster size. The algorithm only searches for connections between cluster entrances (f), abstracting the details inside the cluster until traversal is required.',
        scenarios: 
            createScenario('Open Terrain', 'Max Efficiency', '#00ff88', 'Skips entire sectors of the map effortlessly.') +
            createScenario('Cluttered Space', 'High Efficiency', '#00ff88', 'Bypasses complex local geometry by routing globally.') +
            createScenario('Dead Ends', 'High Efficiency', '#00ff88', 'Pre-computation identifies unreachable cluster entrances, ignoring dead ends.'),
        complexity: '<span>Time: O(b<sup>d/2</sup>)</span> | <span>Space: O(1) Local</span>'
    },
    greedy_bug: {
        title: '<h1>GREEDYBUG</h1>',
      overview: 'A custom hybrid algorithm combining directional raycasting, dynamic branching (blooming), and robotic "Bug" obstacle-hugging. It prioritizes rapid straight-line speed, using decaying bloom radii to efficiently navigate corners, and falls back on perimeter wall-tracing only as an absolute last resort when trapped.',
        useCases: '<li>Performance-critical pathing</li><li>Highly cluttered environments</li><li>Lightning-fast point-to-point traversal</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">f</div><div class="diag-wall"></div><div class="diag-wall"></div><div class="diag-wall"></div>
            <div class="diag-start">S</div><div class="diag-eval">f</div><div class="diag-eval">f</div><div class="diag-wall"></div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'Casts a continuous ray in a straight line. Upon collision, it uses dynamic "blooming" to spawn new rays around the obstacle. If collision thresholds are exceeded, it anchors its distance and engages an escape trace.',
        scenarios: 
            createScenario('Open Terrain', 'Max Efficiency', '#00ff88', 'Connects Start and Target rapidly with continuous raycasts.') +
            createScenario('Cluttered Space', 'High Efficiency', '#00ff88', 'Swiftly navigates complex corners using bloom radius and decay without getting stuck.') +
            createScenario('Dead Ends', 'Moderate Efficiency', '#ffcc00', 'Successfully resolves large traps by anchoring and utilizing bug-tracing as a reliable fallback.'),
        complexity: '<span>Time: O(N) Avg</span> | <span>Space: O(1) Avg</span>'
    },
    bfs: {
        title: '<h1>BREADTH-FIRST SEARCH (BFS)</h1>',
        overview: 'Explores the grid level by level, expanding all nodes at the current depth before moving deeper. It ignores edge weights and heuristics, guaranteeing the shortest path on an unweighted grid.<br><br><code style="color: #fff; background: #111; padding: 4px 8px; border-radius: 4px;">Queue (FIFO) &middot; uniform expansion</code>',
        useCases: '<li>Unweighted grid pathfinding</li><li>Shortest path in steps, not distance</li><li>Baseline for comparing smarter algorithms</li>',
        diagram: `
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">2</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-target">T</div>
            <div class="diag-empty"></div><div class="diag-eval">2</div><div class="diag-eval">2</div><div class="diag-eval">2</div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-eval">1</div><div class="diag-eval">1</div><div class="diag-start">S</div><div class="diag-eval">1</div><div class="diag-eval">1</div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-eval">2</div><div class="diag-eval">2</div><div class="diag-eval">2</div><div class="diag-empty"></div><div class="diag-empty"></div>
            <div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-eval">2</div><div class="diag-empty"></div><div class="diag-empty"></div><div class="diag-empty"></div>
        `,
        legend: standardLegend,
        diagDesc: 'BFS processes nodes in rings of equal distance from the Start (labeled 1, then 2, ...). Because it uses a FIFO queue and no heuristic, it expands uniformly in every direction until the Target is dequeued.',
        scenarios: 
            createScenario('Open Terrain', 'Moderate Efficiency', '#ffcc00', 'Finds the shortest step path but expands uniformly instead of aiming at the target.') +
            createScenario('Cluttered Space', 'Moderate Efficiency', '#ffcc00', 'Guarantees an optimal path if one exists, though it explores many irrelevant branches.') +
            createScenario('Dead Ends', 'Low Efficiency', '#ff3333', 'Must exhaust entire depth levels, including dead ends, before the path can reach the target.'),
        complexity: '<span>Time: O(|V| + |E|)</span> | <span>Space: O(|V|)</span>'
    }
};

let currentEncyAlgo = 'astar'; 

function syncEncyclopediaSelection(algoId) {
    currentEncyAlgo = algoId;
    
    encyMenuItems.forEach(li => {
        if (li.getAttribute('data-algo') === algoId) {
            li.classList.add('active');
        } else {
            li.classList.remove('active');
        }
    });
    
    const data = algoData[algoId] || algoData['astar'];
    encyTitle.innerHTML = data.title;
    encyOverview.innerHTML = data.overview;
    encyUseCases.innerHTML = data.useCases;
    encyDiagram.innerHTML = data.diagram;
    encyLegend.innerHTML = data.legend;
    encyDiagDesc.innerHTML = data.diagDesc;
    encyScenarios.innerHTML = data.scenarios;
    encyComplexity.innerHTML = data.complexity;
}

encyMenuItems.forEach(item => {
    item.addEventListener('click', (eventObject) => {
        syncEncyclopediaSelection(eventObject.target.getAttribute('data-algo'));
    });
});

function openEncyclopedia() {
    simulatorView.classList.add('hidden');
    encyclopediaView.classList.remove('hidden');
    syncEncyclopediaSelection(algorithmDropdownElement.value);
}

function closeEncyclopedia() {
    encyclopediaView.classList.add('hidden');
    simulatorView.classList.remove('hidden');
    resizeCanvas();
}

btnInfo.addEventListener('click', openEncyclopedia);
btnCloseEncy.addEventListener('click', closeEncyclopedia);

btnTryAlgo.addEventListener('click', () => {
    algorithmDropdownElement.value = currentEncyAlgo;
    algorithmDropdownElement.dispatchEvent(new Event('change'));
    closeEncyclopedia();
});

window.addEventListener('resize', resizeCanvas);

initGrid();