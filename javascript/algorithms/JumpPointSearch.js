import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function getOctileHeuristic(pointOne, pointTwo) {
    let absoluteDifferenceX = Math.abs(pointOne.x - pointTwo.x);
    let absoluteDifferenceY = Math.abs(pointOne.y - pointTwo.y);
    return absoluteDifferenceX > absoluteDifferenceY 
        ? 14 * absoluteDifferenceY + 10 * (absoluteDifferenceX - absoluteDifferenceY) 
        : 14 * absoluteDifferenceX + 10 * (absoluteDifferenceY - absoluteDifferenceX);
}

function buildContinuousPath(jumpPointsArray) {
    if (jumpPointsArray.length < 2) return jumpPointsArray;
    let fullyInterpolatedPath = [];
    for (let index = 0; index < jumpPointsArray.length - 1; index++) {
        let jumpPointOne = jumpPointsArray[index];
        let jumpPointTwo = jumpPointsArray[index+1];
        let directionOffsetX = Math.sign(jumpPointTwo.x - jumpPointOne.x);
        let directionOffsetY = Math.sign(jumpPointTwo.y - jumpPointOne.y);
        let currentXCoordinate = jumpPointOne.x;
        let currentYCoordinate = jumpPointOne.y;
        while (currentXCoordinate !== jumpPointTwo.x || currentYCoordinate !== jumpPointTwo.y) {
            fullyInterpolatedPath.push({x: currentXCoordinate, y: currentYCoordinate});
            currentXCoordinate += directionOffsetX;
            currentYCoordinate += directionOffsetY;
        }
    }
    fullyInterpolatedPath.push(jumpPointsArray[jumpPointsArray.length - 1]);
    return fullyInterpolatedPath;
}

function runJPS(gridMap, startNode, targetNode) {
    const executionStartTimeMilliseconds = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    
    let nodesToEvaluateQueue = [startNode];
    let previousNodeMap = new Map();
    let costFromStartMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    let estimatedTotalCostMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    
    costFromStartMap[startNode.y][startNode.x] = 0;
    estimatedTotalCostMap[startNode.y][startNode.x] = getOctileHeuristic(startNode, targetNode);
    
    let visitedNodesList = [];

    const isWalkableCell = (coordinateX, coordinateY) => coordinateX >= 0 && coordinateX < totalColumnsCount && coordinateY >= 0 && coordinateY < totalRowsCount && gridMap[coordinateY][coordinateX] === 0;

    function findJumpPoint(currentXCoordinate, currentYCoordinate, directionOffsetX, directionOffsetY) {
        let nextCoordinateX = currentXCoordinate + directionOffsetX;
        let nextCoordinateY = currentYCoordinate + directionOffsetY;

        if (!isWalkableCell(nextCoordinateX, nextCoordinateY)) return null;
        if (nextCoordinateX === targetNode.x && nextCoordinateY === targetNode.y) return {x: nextCoordinateX, y: nextCoordinateY};
        
        if (directionOffsetX !== 0 && directionOffsetY !== 0) { 
            if ((isWalkableCell(nextCoordinateX - directionOffsetX, nextCoordinateY + directionOffsetY) && !isWalkableCell(nextCoordinateX - directionOffsetX, nextCoordinateY)) ||
                (isWalkableCell(nextCoordinateX + directionOffsetX, nextCoordinateY - directionOffsetY) && !isWalkableCell(nextCoordinateX, nextCoordinateY - directionOffsetY))) {
                return {x: nextCoordinateX, y: nextCoordinateY};
            }
            if (findJumpPoint(nextCoordinateX, nextCoordinateY, directionOffsetX, 0) || findJumpPoint(nextCoordinateX, nextCoordinateY, 0, directionOffsetY)) {
                return {x: nextCoordinateX, y: nextCoordinateY};
            }
        } else { 
            if (directionOffsetX !== 0) {
                if ((isWalkableCell(nextCoordinateX + directionOffsetX, nextCoordinateY + 1) && !isWalkableCell(nextCoordinateX, nextCoordinateY + 1)) ||
                    (isWalkableCell(nextCoordinateX + directionOffsetX, nextCoordinateY - 1) && !isWalkableCell(nextCoordinateX, nextCoordinateY - 1))) {
                    return {x: nextCoordinateX, y: nextCoordinateY};
                }
            } else {
                if ((isWalkableCell(nextCoordinateX + 1, nextCoordinateY + directionOffsetY) && !isWalkableCell(nextCoordinateX + 1, nextCoordinateY)) ||
                    (isWalkableCell(nextCoordinateX - 1, nextCoordinateY + directionOffsetY) && !isWalkableCell(nextCoordinateX - 1, nextCoordinateY))) {
                    return {x: nextCoordinateX, y: nextCoordinateY};
                }
            }
        }
        return findJumpPoint(nextCoordinateX, nextCoordinateY, directionOffsetX, directionOffsetY);
    }

    function getPrunedNeighbors(currentlyEvaluatingNode) {
        let validNeighborDirections = [];
        let parentNodeStringKey = `${currentlyEvaluatingNode.x},${currentlyEvaluatingNode.y}`;
        
        if (!previousNodeMap.has(parentNodeStringKey)) {
            for (let directionOffsetY = -1; directionOffsetY <= 1; directionOffsetY++) {
                for (let directionOffsetX = -1; directionOffsetX <= 1; directionOffsetX++) {
                    if (directionOffsetX === 0 && directionOffsetY === 0) continue;
                    if (isWalkableCell(currentlyEvaluatingNode.x + directionOffsetX, currentlyEvaluatingNode.y + directionOffsetY)) validNeighborDirections.push({x: directionOffsetX, y: directionOffsetY});
                }
            }
            return validNeighborDirections;
        }

        let parentNode = previousNodeMap.get(parentNodeStringKey);
        let normalisedDirectionX = Math.sign(currentlyEvaluatingNode.x - parentNode.x);
        let normalisedDirectionY = Math.sign(currentlyEvaluatingNode.y - parentNode.y);

        if (normalisedDirectionX !== 0 && normalisedDirectionY !== 0) {
            if (isWalkableCell(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y + normalisedDirectionY)) validNeighborDirections.push({x: 0, y: normalisedDirectionY});
            if (isWalkableCell(currentlyEvaluatingNode.x + normalisedDirectionX, currentlyEvaluatingNode.y)) validNeighborDirections.push({x: normalisedDirectionX, y: 0});
            if (isWalkableCell(currentlyEvaluatingNode.x + normalisedDirectionX, currentlyEvaluatingNode.y + normalisedDirectionY)) validNeighborDirections.push({x: normalisedDirectionX, y: normalisedDirectionY});
            if (!isWalkableCell(currentlyEvaluatingNode.x - normalisedDirectionX, currentlyEvaluatingNode.y)) validNeighborDirections.push({x: -normalisedDirectionX, y: normalisedDirectionY});
            if (!isWalkableCell(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y - normalisedDirectionY)) validNeighborDirections.push({x: normalisedDirectionX, y: -normalisedDirectionY});
        } else {
            if (normalisedDirectionX !== 0) {
                if (isWalkableCell(currentlyEvaluatingNode.x + normalisedDirectionX, currentlyEvaluatingNode.y)) validNeighborDirections.push({x: normalisedDirectionX, y: 0});
                if (!isWalkableCell(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y + 1)) validNeighborDirections.push({x: normalisedDirectionX, y: 1});
                if (!isWalkableCell(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y - 1)) validNeighborDirections.push({x: normalisedDirectionX, y: -1});
            } else {
                if (isWalkableCell(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y + normalisedDirectionY)) validNeighborDirections.push({x: 0, y: normalisedDirectionY});
                if (!isWalkableCell(currentlyEvaluatingNode.x + 1, currentlyEvaluatingNode.y)) validNeighborDirections.push({x: 1, y: normalisedDirectionY});
                if (!isWalkableCell(currentlyEvaluatingNode.x - 1, currentlyEvaluatingNode.y)) validNeighborDirections.push({x: -1, y: normalisedDirectionY});
            }
        }
        return validNeighborDirections;
    }

    while (nodesToEvaluateQueue.length > 0) {
        nodesToEvaluateQueue.sort((nodeA, nodeB) => estimatedTotalCostMap[nodeA.y][nodeA.x] - estimatedTotalCostMap[nodeB.y][nodeB.x]);
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
            return { path: buildContinuousPath(finalPath), evaluated: visitedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
        }

        let validNeighborDirections = getPrunedNeighbors(currentlyEvaluatingNode);
        for (let directionIndex = 0; directionIndex < validNeighborDirections.length; directionIndex++) {
            let discoveredJumpPointNode = findJumpPoint(currentlyEvaluatingNode.x, currentlyEvaluatingNode.y, validNeighborDirections[directionIndex].x, validNeighborDirections[directionIndex].y);
            if (discoveredJumpPointNode) {
                let tentativeCostFromStart = costFromStartMap[currentlyEvaluatingNode.y][currentlyEvaluatingNode.x] + getOctileHeuristic(currentlyEvaluatingNode, discoveredJumpPointNode);
                if (tentativeCostFromStart < costFromStartMap[discoveredJumpPointNode.y][discoveredJumpPointNode.x]) {
                    previousNodeMap.set(`${discoveredJumpPointNode.x},${discoveredJumpPointNode.y}`, currentlyEvaluatingNode);
                    costFromStartMap[discoveredJumpPointNode.y][discoveredJumpPointNode.x] = tentativeCostFromStart;
                    estimatedTotalCostMap[discoveredJumpPointNode.y][discoveredJumpPointNode.x] = tentativeCostFromStart + getOctileHeuristic(discoveredJumpPointNode, targetNode);
                    if (!nodesToEvaluateQueue.some(existingNode => existingNode.x === discoveredJumpPointNode.x && existingNode.y === discoveredJumpPointNode.y)) {
                        nodesToEvaluateQueue.push(discoveredJumpPointNode);
                    }
                }
            }
        }
    }

    const executionEndTimeMilliseconds = performance.now();
    return { path: [], evaluated: visitedNodesList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
}

RegisterAlgorithm('jps', 'Jump Point Search', runJPS);