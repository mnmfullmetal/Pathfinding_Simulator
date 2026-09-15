import { RegisterAlgorithm } from '../PathfinderRegistry.js';

function getOctileHeuristic(pointOne, pointTwo) {
    let absoluteDifferenceX = Math.abs(pointOne.x - pointTwo.x);
    let absoluteDifferenceY = Math.abs(pointOne.y - pointTwo.y);
    return absoluteDifferenceX > absoluteDifferenceY 
        ? 14 * absoluteDifferenceY + 10 * (absoluteDifferenceX - absoluteDifferenceY) 
        : 14 * absoluteDifferenceX + 10 * (absoluteDifferenceY - absoluteDifferenceX);
}

function runBidirectionalAStar(gridMap, startNode, targetNode) {
    const executionStartTimeMilliseconds = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    
    let forwardQueue = [startNode];
    let backwardQueue = [targetNode];
    
    let forwardParentMap = new Map();
    let backwardParentMap = new Map();
    
    let forwardCostMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    let backwardCostMap = Array(totalRowsCount).fill().map(() => Array(totalColumnsCount).fill(Infinity));
    
    forwardCostMap[startNode.y][startNode.x] = 0;
    backwardCostMap[targetNode.y][targetNode.x] = 0;
    
    let visitedNodesList = [];

    function expand(queue, costMap, parentMap, opposingCostMap, targetHeuristicNode) {
        queue.sort((nodeA, nodeB) => 
            (costMap[nodeA.y][nodeA.x] + getOctileHeuristic(nodeA, targetHeuristicNode)) - 
            (costMap[nodeB.y][nodeB.x] + getOctileHeuristic(nodeB, targetHeuristicNode))
        );
        
        let current = queue.shift();
        visitedNodesList.push(current);

        if (opposingCostMap[current.y][current.x] !== Infinity) {
            return current; 
        }

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                let nx = current.x + dx;
                let ny = current.y + dy;

                if (nx >= 0 && nx < totalColumnsCount && ny >= 0 && ny < totalRowsCount && gridMap[ny][nx] === 0) {
                    if (dx !== 0 && dy !== 0 && gridMap[current.y][nx] === 1 && gridMap[ny][current.x] === 1) continue;

                    let neighbor = {x: nx, y: ny};
                    let tentativeCost = costMap[current.y][current.x] + getOctileHeuristic(current, neighbor);
                    
                    if (tentativeCost < costMap[ny][nx]) {
                        parentMap.set(`${nx},${ny}`, current);
                        costMap[ny][nx] = tentativeCost;
                        
                        if (!queue.some(existing => existing.x === nx && existing.y === ny)) {
                            queue.push(neighbor);
                        }
                    }
                }
            }
        }
        return null;
    }

    while (forwardQueue.length > 0 && backwardQueue.length > 0) {
        let intersectNode = expand(forwardQueue, forwardCostMap, forwardParentMap, backwardCostMap, targetNode);
        if (!intersectNode) {
            intersectNode = expand(backwardQueue, backwardCostMap, backwardParentMap, forwardCostMap, startNode);
        }

        if (intersectNode) {
            let finalPath = [];
            
            let curr = intersectNode;
            while (forwardParentMap.has(`${curr.x},${curr.y}`)) {
                finalPath.unshift(curr);
                curr = forwardParentMap.get(`${curr.x},${curr.y}`);
            }
            finalPath.unshift(startNode);
            
            curr = backwardParentMap.get(`${intersectNode.x},${intersectNode.y}`);
            while (curr) {
                finalPath.push(curr);
                curr = backwardParentMap.get(`${curr.x},${curr.y}`);
            }
            
            return { path: finalPath, evaluated: visitedNodesList, timeMs: performance.now() - executionStartTimeMilliseconds };
        }
    }

    return { path: [], evaluated: visitedNodesList, timeMs: performance.now() - executionStartTimeMilliseconds };
}

RegisterAlgorithm('bidirectional', 'Bidirectional A*', runBidirectionalAStar);