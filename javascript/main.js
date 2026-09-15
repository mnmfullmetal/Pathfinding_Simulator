import { AlgorithmRegistry } from './PathfinderRegistry.js';
import './algorithms/AStar.js';
import './algorithms/JumpPointSearch.js';
import './algorithms/GreedyBug.js'

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

algorithmDropdownElement.addEventListener('change', (eventObject) => {
    if (eventObject.target.value === 'greedy_bug') {
        bloomGroupElement.style.display = 'block';
    } else {
        bloomGroupElement.style.display = 'none';
    }
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
        bloomRadius: parseInt(bloomRadiusElement.value, 10)
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

window.addEventListener('resize', resizeCanvas);

initGrid();