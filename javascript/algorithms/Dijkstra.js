import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function runDijkstra(gridMap, startNode, targetNode) {
    const executionStartTimeMilliseconds = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    
    let nodesToEvaluateQueue = [startNode];
    let previousNodeMap = new Map();
    let costFromStartMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    
    costFromStartMap[startNode.y][startNode.x] = 0;
    
    let visitedNodesList = [];

    while (nodesToEvaluateQueue.length > 0) {
        nodesToEvaluateQueue.sort((nodeA, nodeB) => costFromStartMap[nodeA.y][nodeA.x] - costFromStartMap[nodeB.y][nodeB.x]);
        let currentlyEvaluatingNode = nodesToEvaluateQueue.shift();
        visitedNodesList.push(currentlyEvaluatingNode);

        if (currentlyEvaluatingNode.x === targetNode.x && currentlyEvaluatingNode.y === targetNode.y) {
            let finalPath = [];
            let currentNodeStringKey = `${currentlyEvaluatingNode.x},${currentlyEvaluatingNode.y}`;
            while (previousNodeMap.has(currentNodeStringKey)) {
                finalPath.unshift(currentlyEvaluatingNode);
                currentlyEvaluatingNode = previousNodeMap.get(currentNodeStringKey);
                currentNodeStringKey = `${currentlyEvaluatingNode.x},${currentlyEvaluatingNode.y}`;
            }
            finalPath.unshift(startNode);
            const executionEndTimeMilliseconds = performance.now();
            return { path: finalPath, evaluated: visitedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
        }

        for (let directionOffsetY = -1; directionOffsetY <= 1; directionOffsetY++) {
            for (let directionOffsetX = -1; directionOffsetX <= 1; directionOffsetX++) {
                if (directionOffsetX === 0 && directionOffsetY === 0) continue;
                
                let neighborCoordinateX = currentlyEvaluatingNode.x + directionOffsetX;
                let neighborCoordinateY = currentlyEvaluatingNode.y + directionOffsetY;

                if (neighborCoordinateX >= 0 && neighborCoordinateX < totalColumnsCount && neighborCoordinateY >= 0 && neighborCoordinateY < totalRowsCount && gridMap[neighborCoordinateY][neighborCoordinateX] === 0) {
                    if (directionOffsetX !== 0 && directionOffsetY !== 0 && gridMap[currentlyEvaluatingNode.y][neighborCoordinateX] === 1 && gridMap[neighborCoordinateY][currentlyEvaluatingNode.x] === 1) {
                        continue; 
                    }

                    let movementCost = (directionOffsetX !== 0 && directionOffsetY !== 0) ? 14 : 10;
                    let neighborNode = {x: neighborCoordinateX, y: neighborCoordinateY};
                    let tentativeCostFromStart = costFromStartMap[currentlyEvaluatingNode.y][currentlyEvaluatingNode.x] + movementCost;
                    
                    if (tentativeCostFromStart < costFromStartMap[neighborCoordinateY][neighborCoordinateX]) {
                        previousNodeMap.set(`${neighborCoordinateX},${neighborCoordinateY}`, currentlyEvaluatingNode);
                        costFromStartMap[neighborCoordinateY][neighborCoordinateX] = tentativeCostFromStart;
                        
                        if (!nodesToEvaluateQueue.some(existingNode => existingNode.x === neighborCoordinateX && existingNode.y === neighborCoordinateY)) {
                            nodesToEvaluateQueue.push(neighborNode);
                        }
                    }
                }
            }
        }
    }

    const executionEndTimeMilliseconds = performance.now();
    return { path: [], evaluated: visitedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
}

RegisterAlgorithm('dijkstra', 'Dijkstra', runDijkstra);