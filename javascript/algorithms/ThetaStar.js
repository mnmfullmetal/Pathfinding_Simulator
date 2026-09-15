import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function getEuclideanHeuristic(pointOne, pointTwo) {
    let dx = pointOne.x - pointTwo.x;
    let dy = pointOne.y - pointTwo.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function hasLineOfSight(nodeA, nodeB, gridMap) {
    let x0 = nodeA.x;
    let y0 = nodeA.y;
    let x1 = nodeB.x;
    let y1 = nodeB.y;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        if (x0 === x1 && y0 === y1) return true;
        if (gridMap[y0][x0] === 1) return false;

        let e2 = 2 * err;
        let stepX = 0, stepY = 0;
        
        if (e2 > -dy) { err -= dy; stepX = sx; }
        if (e2 < dx) { err += dx; stepY = sy; }

        if (stepX !== 0 && stepY !== 0) {
            if (gridMap[y0][x0 + stepX] === 1 && gridMap[y0 + stepY][x0] === 1) return false;
        }

        if (stepX !== 0) x0 += stepX;
        if (stepY !== 0) y0 += stepY;
    }
}

function interpolatePath(waypoints) {
    if (!waypoints || waypoints.length < 2) return waypoints;
    let continuousPath = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
        let x0 = waypoints[i].x;
        let y0 = waypoints[i].y;
        let x1 = waypoints[i + 1].x;
        let y1 = waypoints[i + 1].y;

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = x0 < x1 ? 1 : -1;
        let sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (x0 !== x1 || y0 !== y1) {
            continuousPath.push({ x: x0, y: y0 });
            let e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }
    }

    continuousPath.push(waypoints[waypoints.length - 1]);
    return continuousPath;
}

function runThetaStar(gridMap, startNode, targetNode) {
    const executionStartTime = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    
    let nodesToEvaluateQueue = [startNode];
    let previousNodeMap = new Map();
    let costFromStartMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    let estimatedTotalCostMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    
    costFromStartMap[startNode.y][startNode.x] = 0;
    estimatedTotalCostMap[startNode.y][startNode.x] = getEuclideanHeuristic(startNode, targetNode);
    previousNodeMap.set(`${startNode.x},${startNode.y}`, startNode);
    
    let visitedNodesList = [];
    let raycastSegmentsList = [];

    while (nodesToEvaluateQueue.length > 0) {
        nodesToEvaluateQueue.sort((nodeA, nodeB) => estimatedTotalCostMap[nodeA.y][nodeA.x] - estimatedTotalCostMap[nodeB.y][nodeB.x]);
        let current = nodesToEvaluateQueue.shift();
        visitedNodesList.push(current);

        if (current.x === targetNode.x && current.y === targetNode.y) {
            let waypoints = [];
            let currStringKey = `${current.x},${current.y}`;
            while (previousNodeMap.has(currStringKey)) {
                waypoints.unshift(current);
                let parent = previousNodeMap.get(currStringKey);
                if (parent.x === current.x && parent.y === current.y) break;
                current = parent;
                currStringKey = `${current.x},${current.y}`;
            }

            const interpolatedPath = interpolatePath(waypoints);

            return { 
                path: interpolatedPath, 
                evaluated: visitedNodesList, 
                raycasts: raycastSegmentsList, 
                timeMs: performance.now() - executionStartTime 
            };
        }

        let currentParent = previousNodeMap.get(`${current.x},${current.y}`);

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                let neighborX = current.x + dx;
                let neighborY = current.y + dy;

                if (neighborX >= 0 && neighborX < totalColumnsCount && neighborY >= 0 && neighborY < totalRowsCount && gridMap[neighborY][neighborX] === 0) {
                    if (dx !== 0 && dy !== 0 && gridMap[current.y][neighborX] === 1 && gridMap[neighborY][current.x] === 1) continue;

                    let neighbor = {x: neighborX, y: neighborY};
                    let targetParent = current;
                    let costToTargetParent = costFromStartMap[current.y][current.x];
                    
                    if (hasLineOfSight(currentParent, neighbor, gridMap)) {
                        targetParent = currentParent;
                        costToTargetParent = costFromStartMap[currentParent.y][currentParent.x];
                    }

                    let tentativeCost = costToTargetParent + getEuclideanHeuristic(targetParent, neighbor);

                    if (tentativeCost < costFromStartMap[neighborY][neighborX]) {
                        previousNodeMap.set(`${neighborX},${neighborY}`, targetParent);
                        costFromStartMap[neighborY][neighborX] = tentativeCost;
                        estimatedTotalCostMap[neighborY][neighborX] = tentativeCost + getEuclideanHeuristic(neighbor, targetNode);
                        
                        raycastSegmentsList.push({ startX: targetParent.x, startY: targetParent.y, endX: neighborX, endY: neighborY });

                        if (!nodesToEvaluateQueue.some(n => n.x === neighborX && n.y === neighborY)) {
                            nodesToEvaluateQueue.push(neighbor);
                        }
                    }
                }
            }
        }
    }
    return { path: [], evaluated: visitedNodesList, raycasts: raycastSegmentsList, timeMs: performance.now() - executionStartTime };
}

RegisterAlgorithm('thetastar', 'Theta* (Any-Angle)', runThetaStar);