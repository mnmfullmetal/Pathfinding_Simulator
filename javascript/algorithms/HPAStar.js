import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function getOctileHeuristic(pointA, pointB) {
    let dx = Math.abs(pointA.x - pointB.x);
    let dy = Math.abs(pointA.y - pointB.y);
    return dx > dy ? 14 * dy + 10 * (dx - dy) : 14 * dx + 10 * (dy - dx);
}

function localAStar(startX, startY, targetX, targetY, gridMap, constrainToCluster, clusterSize) {
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    let openSet = [{x: startX, y: startY}];
    let costMap = new Map();
    let parentMap = new Map();
    
    let startKey = `${startX},${startY}`;
    costMap.set(startKey, 0);
    
    let clusterBounds = {
        minX: Math.floor(startX / clusterSize) * clusterSize,
        maxX: Math.floor(startX / clusterSize) * clusterSize + clusterSize - 1,
        minY: Math.floor(startY / clusterSize) * clusterSize,
        maxY: Math.floor(startY / clusterSize) * clusterSize + clusterSize - 1
    };

    while (openSet.length > 0) {
        openSet.sort((a, b) => (costMap.get(`${a.x},${a.y}`) + getOctileHeuristic(a, {x: targetX, y: targetY})) - (costMap.get(`${b.x},${b.y}`) + getOctileHeuristic(b, {x: targetX, y: targetY})));
        let current = openSet.shift();
        let currKey = `${current.x},${current.y}`;

        if (current.x === targetX && current.y === targetY) {
            let path = [];
            while (parentMap.has(currKey)) {
                path.unshift(current);
                current = parentMap.get(currKey);
                currKey = `${current.x},${current.y}`;
            }
            path.unshift({x: startX, y: startY});
            return path;
        }

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                let nx = current.x + dx;
                let ny = current.y + dy;

                if (nx >= 0 && nx < totalColumnsCount && ny >= 0 && ny < totalRowsCount && gridMap[ny][nx] === 0) {
                    if (constrainToCluster && (nx < clusterBounds.minX || nx > clusterBounds.maxX || ny < clusterBounds.minY || ny > clusterBounds.maxY)) {
                        if (!(nx === targetX && ny === targetY)) continue;
                    }
                    if (dx !== 0 && dy !== 0 && gridMap[current.y][nx] === 1 && gridMap[ny][current.x] === 1) continue;

                    let nextKey = `${nx},${ny}`;
                    let newCost = costMap.get(currKey) + getOctileHeuristic(current, {x: nx, y: ny});
                    
                    if (!costMap.has(nextKey) || newCost < costMap.get(nextKey)) {
                        costMap.set(nextKey, newCost);
                        parentMap.set(nextKey, current);
                        openSet.push({x: nx, y: ny});
                    }
                }
            }
        }
    }
    return null;
}

function runHPAStar(gridMap, startNode, targetNode, config = {}) {
    const executionStartTime = performance.now();
    const clusterSize = config.clusterSize || 10;
    
    let visitedNodesList = [];
    let raycastSegmentsList = [];

    let openSet = [startNode];
    let previousNodeMap = new Map();
    let costFromStartMap = new Map();
    costFromStartMap.set(`${startNode.x},${startNode.y}`, 0);
    
    while(openSet.length > 0) {
        openSet.sort((a, b) => (costFromStartMap.get(`${a.x},${a.y}`) + getOctileHeuristic(a, targetNode)) - (costFromStartMap.get(`${b.x},${b.y}`) + getOctileHeuristic(b, targetNode)));
        let current = openSet.shift();
        let currKey = `${current.x},${current.y}`;
        visitedNodesList.push(current);

        if (getOctileHeuristic(current, targetNode) < clusterSize * 20) {
            let localPath = localAStar(current.x, current.y, targetNode.x, targetNode.y, gridMap, false, clusterSize);
            if (localPath) {
                let fullPath = [...localPath];
                let traceKey = currKey;
                
                while (previousNodeMap.has(traceKey)) {
                    let cachedData = previousNodeMap.get(traceKey);
                    fullPath.unshift(...cachedData.path.slice(0, -1));
                    traceKey = `${cachedData.node.x},${cachedData.node.y}`;
                }
                
                return { path: fullPath, evaluated: visitedNodesList, raycasts: raycastSegmentsList, timeMs: performance.now() - executionStartTime };
            }
        }

        let cx = Math.floor(current.x / clusterSize);
        let cy = Math.floor(current.y / clusterSize);
        
        let neighbors = [
            {x: current.x, y: current.y - clusterSize},
            {x: current.x, y: current.y + clusterSize},
            {x: current.x - clusterSize, y: current.y},
            {x: current.x + clusterSize, y: current.y}
        ];

        for (let n of neighbors) {
            if (n.x >= 0 && n.x < gridMap[0].length && n.y >= 0 && n.y < gridMap.length) {
                let localPath = localAStar(current.x, current.y, n.x, n.y, gridMap, false, clusterSize);
                if (localPath) {
                    let nKey = `${n.x},${n.y}`;
                    let newCost = costFromStartMap.get(currKey) + (localPath.length * 10);
                    
                    if (!costFromStartMap.has(nKey) || newCost < costFromStartMap.get(nKey)) {
                        costFromStartMap.set(nKey, newCost);
                        previousNodeMap.set(nKey, {node: current, path: localPath});
                        raycastSegmentsList.push({startX: current.x, startY: current.y, endX: n.x, endY: n.y});
                        if (!openSet.some(existing => existing.x === n.x && existing.y === n.y)) openSet.push(n);
                    }
                }
            }
        }
    }
    
    return { path: [], evaluated: visitedNodesList, timeMs: performance.now() - executionStartTime };
}

RegisterAlgorithm('hpastar', 'HPA* (Simplified)', runHPAStar);