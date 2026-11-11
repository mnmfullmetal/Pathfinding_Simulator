import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function runBFS(gridMap, startNode, targetNode) {
    const executionStartTimeMilliseconds = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;

    const startKey = `${startNode.x},${startNode.y}`;
    const targetKey = `${targetNode.x},${targetNode.y}`;

    let frontierQueue = [startNode];
    let visitedKeys = new Set([startKey]);
    let previousNodeMap = new Map();
    let evaluatedNodesList = [];

    while (frontierQueue.length > 0) {
        let currentlyEvaluatingNode = frontierQueue.shift();
        evaluatedNodesList.push(currentlyEvaluatingNode);

        if (currentlyEvaluatingNode.x === targetNode.x && currentlyEvaluatingNode.y === targetNode.y) {
            let finalPath = [];
            let currentNode = currentlyEvaluatingNode;
            let currentNodeStringKey = `${currentNode.x},${currentNode.y}`;
            while (previousNodeMap.has(currentNodeStringKey)) {
                finalPath.unshift(currentNode);
                currentNode = previousNodeMap.get(currentNodeStringKey);
                currentNodeStringKey = `${currentNode.x},${currentNode.y}`;
            }
            finalPath.unshift(startNode);
            const executionEndTimeMilliseconds = performance.now();
            return { path: finalPath, evaluated: evaluatedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
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

                    let neighborNode = {x: neighborCoordinateX, y: neighborCoordinateY};
                    let neighborStringKey = `${neighborCoordinateX},${neighborCoordinateY}`;

                    if (!visitedKeys.has(neighborStringKey)) {
                        visitedKeys.add(neighborStringKey);
                        previousNodeMap.set(neighborStringKey, currentlyEvaluatingNode);
                        frontierQueue.push(neighborNode);
                    }
                }
            }
        }
    }

    const executionEndTimeMilliseconds = performance.now();
    return { path: [], evaluated: evaluatedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
}

RegisterAlgorithm('bfs', 'Breadth-First Search', runBFS);