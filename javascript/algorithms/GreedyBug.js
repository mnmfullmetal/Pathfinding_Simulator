import { RegisterAlgorithm } from '../PathfinderRegistry.js';

class MinHeap {
    constructor() { this.heap = []; }
    push(node) {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.sinkDown(0);
        return top;
    }
    bubbleUp(index) {
        let current = this.heap[index];
        while (index > 0) {
            let parentIndex = Math.floor((index - 1) / 2);
            let parent = this.heap[parentIndex];
            if (current.h >= parent.h) break;
            this.heap[index] = parent;
            index = parentIndex;
        }
        this.heap[index] = current;
    }
    sinkDown(index) {
        let length = this.heap.length;
        let current = this.heap[index];
        while (true) {
            let leftChildIdx = 2 * index + 1;
            let rightChildIdx = 2 * index + 2;
            let swap = null;

            if (leftChildIdx < length) {
                let leftChild = this.heap[leftChildIdx];
                if (leftChild.h < current.h) swap = leftChildIdx;
            }
            if (rightChildIdx < length) {
                let rightChild = this.heap[rightChildIdx];
                if ((swap === null && rightChild.h < current.h) || (swap !== null && rightChild.h < this.heap[leftChildIdx].h)) {
                    swap = rightChildIdx;
                }
            }
            if (swap === null) break;
            this.heap[index] = this.heap[swap];
            index = swap;
        }
        this.heap[index] = current;
    }
    get length() { return this.heap.length; }
}

function calculateOctileHeuristicDistance(coordinateX, coordinateY, targetNode) {
    let absoluteDifferenceX = Math.abs(coordinateX - targetNode.x);
    let absoluteDifferenceY = Math.abs(coordinateY - targetNode.y);
    return absoluteDifferenceX > absoluteDifferenceY 
        ? 14 * absoluteDifferenceY + 10 * (absoluteDifferenceX - absoluteDifferenceY) 
        : 14 * absoluteDifferenceX + 10 * (absoluteDifferenceY - absoluteDifferenceX);
}

function optimisePath(pathArray, canMoveInDirectionStrict) {
    if (!pathArray || pathArray.length <= 2) return pathArray;
    let optimizedPath = [pathArray[0]];
    let currentIndex = 0;

    while (currentIndex < pathArray.length - 1) {
        let furthestReachableIndex = currentIndex + 1;
        for (let forwardIndex = pathArray.length - 1; forwardIndex > currentIndex + 1; forwardIndex--) {
            let currentNode = pathArray[currentIndex];
            let futureNode = pathArray[forwardIndex];
            let dx = futureNode.x - currentNode.x;
            let dy = futureNode.y - currentNode.y;
            
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                if (canMoveInDirectionStrict(currentNode.x, currentNode.y, dx, dy)) {
                    furthestReachableIndex = forwardIndex;
                    break;
                }
            }
        }
        optimizedPath.push(pathArray[furthestReachableIndex]);
        currentIndex = furthestReachableIndex;
    }
    return optimizedPath;
}

function reconstructFinalPath(finalBranch, finalSegment) {
    let chunks = [finalSegment];
    let curr = finalBranch;
    while (curr !== null) {
        if (curr.segment && curr.segment.length > 0) chunks.push(curr.segment);
        curr = curr.parent;
    }
    let finalPath = [];
    for (let i = chunks.length - 1; i >= 0; i--) {
        finalPath.push(...chunks[i]);
    }
    return finalPath;
}

function runGreedyBug(gridMap, startNode, targetNode, config = {}) {
    const executionStartTimeMilliseconds = performance.now();
    const totalRowsCount = gridMap.length;
    const totalColumnsCount = gridMap[0].length;
    
    const baseBloomRadius = config.bloomRadius || 4;
    const bloomDecayRate = config.bloomDecay !== undefined ? config.bloomDecay : 50;
    
    let visitedGrid = new Uint8Array(totalColumnsCount * totalRowsCount);
    const setVis = (x, y) => { visitedGrid[y * totalColumnsCount + x] = 1; };
    const getVis = (x, y) => visitedGrid[y * totalColumnsCount + x] === 1;

    const isCellWalkable = (coordinateX, coordinateY) => coordinateX >= 0 && coordinateX < totalColumnsCount && coordinateY >= 0 && coordinateY < totalRowsCount && gridMap[coordinateY][coordinateX] === 0;
    
    const canMoveInDirectionStrict = (currentXCoordinate, currentYCoordinate, directionOffsetX, directionOffsetY) => {
        if (!isCellWalkable(currentXCoordinate + directionOffsetX, currentYCoordinate + directionOffsetY)) return false;
        if (directionOffsetX !== 0 && directionOffsetY !== 0) {
            if (!isCellWalkable(currentXCoordinate + directionOffsetX, currentYCoordinate) || !isCellWalkable(currentXCoordinate, currentYCoordinate + directionOffsetY)) {
                return false; 
            }
        }
        return true;
    };

    let evaluatedNodesList = [];
    let raycastSegmentsList = []; 
    let pathDivergenceQueue = new MinHeap(); 

    for (let initialDirectionOffsetY = -1; initialDirectionOffsetY <= 1; initialDirectionOffsetY++) {
        for (let initialDirectionOffsetX = -1; initialDirectionOffsetX <= 1; initialDirectionOffsetX++) {
            if (initialDirectionOffsetX === 0 && initialDirectionOffsetY === 0) continue;
            if (canMoveInDirectionStrict(startNode.x, startNode.y, initialDirectionOffsetX, initialDirectionOffsetY)) {
                pathDivergenceQueue.push({
                    x: startNode.x, y: startNode.y, 
                    dirX: initialDirectionOffsetX, dirY: initialDirectionOffsetY, 
                    h: calculateOctileHeuristicDistance(startNode.x + initialDirectionOffsetX, startNode.y + initialDirectionOffsetY, targetNode),
                    parent: null,
                    segment: [{x: startNode.x, y: startNode.y}], 
                    obstaclesHitX: 0,
                    yHistory: [] 
                });
            }
        }
    }

    let infiniteLoopSafetyCounter = 0;

    while (pathDivergenceQueue.length > 0) {
        if (infiniteLoopSafetyCounter++ > 15000) break; 

        let currentlyEvaluatingPathBranch = pathDivergenceQueue.pop();
        
        evaluatedNodesList.push({x: currentlyEvaluatingPathBranch.x, y: currentlyEvaluatingPathBranch.y});
        
        let currentXCoordinate = currentlyEvaluatingPathBranch.x;
        let currentYCoordinate = currentlyEvaluatingPathBranch.y;
        let raycastStartX = currentXCoordinate;
        let raycastStartY = currentYCoordinate;

        let directionOffsetX = currentlyEvaluatingPathBranch.dirX;
        let directionOffsetY = currentlyEvaluatingPathBranch.dirY;
        
        let raycastSegment = []; 
        
        let branchObstacleCollisionCount = currentlyEvaluatingPathBranch.obstaclesHitX;
        let branchTraversalDistanceHistory = [...currentlyEvaluatingPathBranch.yHistory];

        let consecutiveCellsTraversedCount = 0;
        let hasEncounteredObstacle = false;
        let hasOvershotTarget = false;
        let hasStartedImproving = false;

        let previousHeuristic = calculateOctileHeuristicDistance(currentXCoordinate, currentYCoordinate, targetNode);

        while (true) {
            if (!canMoveInDirectionStrict(currentXCoordinate, currentYCoordinate, directionOffsetX, directionOffsetY)) {
                hasEncounteredObstacle = true;
                break; 
            }

            let nextX = currentXCoordinate + directionOffsetX;
            let nextY = currentYCoordinate + directionOffsetY;
            let nextHeuristic = calculateOctileHeuristicDistance(nextX, nextY, targetNode);

            if (nextHeuristic < previousHeuristic) {
                hasStartedImproving = true;
            } else if (nextHeuristic > previousHeuristic && hasStartedImproving) {
                hasOvershotTarget = true;
                break;
            }

            currentXCoordinate = nextX;
            currentYCoordinate = nextY;
            previousHeuristic = nextHeuristic;
            
            consecutiveCellsTraversedCount++;
            raycastSegment.push({x: currentXCoordinate, y: currentYCoordinate});

            if (currentXCoordinate === targetNode.x && currentYCoordinate === targetNode.y) {
                raycastSegmentsList.push({ startX: raycastStartX, startY: raycastStartY, endX: currentXCoordinate, endY: currentYCoordinate });
                const finalSequence = reconstructFinalPath(currentlyEvaluatingPathBranch, raycastSegment);
                const executionEndTimeMilliseconds = performance.now();
                return { 
                    path: optimisePath(finalSequence, canMoveInDirectionStrict), 
                    evaluated: evaluatedNodesList, 
                    raycasts: raycastSegmentsList, 
                    timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds 
                };
            }
        }

        raycastSegmentsList.push({ startX: raycastStartX, startY: raycastStartY, endX: currentXCoordinate, endY: currentYCoordinate });

        if (hasEncounteredObstacle || hasOvershotTarget) {
            
            if (hasEncounteredObstacle) {
                branchObstacleCollisionCount++;
                branchTraversalDistanceHistory.push(consecutiveCellsTraversedCount);
            }
            
            setVis(currentXCoordinate, currentYCoordinate);

            let recentTraversalDistances = branchTraversalDistanceHistory.slice(-3);
            let averageRecentTraversalDistance = recentTraversalDistances.reduce((sumA, sumB) => sumA + sumB, 0) / (recentTraversalDistances.length || 1);
            let dynamicRequiredCollisionCountForEscape = Math.max(2, Math.ceil(averageRecentTraversalDistance * 1.5)); 

            // Step 4: Trigger Escape Mode
            if (hasEncounteredObstacle && branchObstacleCollisionCount >= dynamicRequiredCollisionCountForEscape) {
                let wallTracingEscapePath = executeWallTracingEscapeMode(currentXCoordinate, currentYCoordinate, targetNode, gridMap, evaluatedNodesList, setVis, canMoveInDirectionStrict);
                
                if (wallTracingEscapePath && wallTracingEscapePath.length > 0) {
                    let newSegmentForEscape = [...raycastSegment, ...wallTracingEscapePath];
                    
                    if (wallTracingEscapePath.targetFound) {
                        const finalSequence = reconstructFinalPath(currentlyEvaluatingPathBranch, newSegmentForEscape);
                        const executionEndTimeMilliseconds = performance.now();
                        return { 
                            path: optimisePath(finalSequence, canMoveInDirectionStrict), 
                            evaluated: evaluatedNodesList, 
                            raycasts: raycastSegmentsList, 
                            timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds 
                        };
                    }
                    
                    let escapeModeReleaseNode = wallTracingEscapePath[wallTracingEscapePath.length - 1];
                    
                    for (let escapeDirectionOffsetY = -1; escapeDirectionOffsetY <= 1; escapeDirectionOffsetY++) {
                        for (let escapeDirectionOffsetX = -1; escapeDirectionOffsetX <= 1; escapeDirectionOffsetX++) {
                            if (escapeDirectionOffsetX === 0 && escapeDirectionOffsetY === 0) continue;
                            if (canMoveInDirectionStrict(escapeModeReleaseNode.x, escapeModeReleaseNode.y, escapeDirectionOffsetX, escapeDirectionOffsetY)) {
                                pathDivergenceQueue.push({
                                    x: escapeModeReleaseNode.x, y: escapeModeReleaseNode.y, 
                                    dirX: escapeDirectionOffsetX, dirY: escapeDirectionOffsetY, 
                                    h: calculateOctileHeuristicDistance(escapeModeReleaseNode.x + escapeDirectionOffsetX, escapeModeReleaseNode.y + escapeDirectionOffsetY, targetNode),
                                    parent: currentlyEvaluatingPathBranch,
                                    segment: newSegmentForEscape,
                                    obstaclesHitX: 0, 
                                    yHistory: []      
                                });
                            }
                        }
                    }
                    continue; 
                } else {
                    branchObstacleCollisionCount = 0;
                }
            }

            let surroundingDirectionChecks = [
                {x: -directionOffsetY, y: directionOffsetX}, 
                {x: directionOffsetY, y: -directionOffsetX}, 
                {x: directionOffsetX - directionOffsetY, y: directionOffsetY + directionOffsetX}, 
                {x: directionOffsetX + directionOffsetY, y: directionOffsetY - directionOffsetX}, 
                {x: -directionOffsetX - directionOffsetY, y: -directionOffsetY + directionOffsetX}, 
                {x: -directionOffsetX + directionOffsetY, y: -directionOffsetY - directionOffsetX} 
            ];

            // Calculate Dynamic Bloom Exponent based on collision count
            let currentBloomRadius = Math.max(1, Math.floor(baseBloomRadius * Math.pow(1 - (bloomDecayRate / 100), branchObstacleCollisionCount)));

            for (let directionIndex = 0; directionIndex < surroundingDirectionChecks.length; directionIndex++) {
                let checkDir = surroundingDirectionChecks[directionIndex];
                checkDir.x = Math.max(-1, Math.min(1, checkDir.x));
                checkDir.y = Math.max(-1, Math.min(1, checkDir.y));

                if (checkDir.x === 0 && checkDir.y === 0) continue;

                let currentStepX = currentXCoordinate;
                let currentStepY = currentYCoordinate;
                
                let optimalBloomX = null;
                let optimalBloomY = null;
                let optimalBloomHeuristic = Infinity;
                let optimalStep = null; 

                for (let step = 1; step <= currentBloomRadius; step++) {
                    if (canMoveInDirectionStrict(currentStepX, currentStepY, checkDir.x, checkDir.y)) {
                        currentStepX += checkDir.x;
                        currentStepY += checkDir.y;

                        evaluatedNodesList.push({x: currentStepX, y: currentStepY});

                        let stepHeuristic = calculateOctileHeuristicDistance(currentStepX, currentStepY, targetNode);
                        if (stepHeuristic < optimalBloomHeuristic) {
                            optimalBloomHeuristic = stepHeuristic;
                            optimalBloomX = currentStepX;
                            optimalBloomY = currentStepY;
                            optimalStep = step;
                        }
                    } else {
                        break;
                    }
                }

                if (optimalBloomX !== null && !getVis(optimalBloomX, optimalBloomY)) {
                    setVis(optimalBloomX, optimalBloomY);
                    
                    let bloomSegment = [];
                    for (let i = 1; i <= optimalStep; i++) {
                        bloomSegment.push({
                            x: currentXCoordinate + (checkDir.x * i),
                            y: currentYCoordinate + (checkDir.y * i)
                        });
                    }

                    pathDivergenceQueue.push({
                        x: optimalBloomX, y: optimalBloomY,
                        dirX: checkDir.x, dirY: checkDir.y,
                        h: optimalBloomHeuristic,
                        parent: currentlyEvaluatingPathBranch,
                        segment: [...raycastSegment, ...bloomSegment],
                        obstaclesHitX: branchObstacleCollisionCount, 
                        yHistory: [...branchTraversalDistanceHistory] 
                    });
                }
            }
        }
    }

    const executionEndTimeMilliseconds = performance.now();
    return { path: [], evaluated: evaluatedNodesList, raycasts: raycastSegmentsList, timeMs: executionEndTimeMilliseconds - executionStartTimeMilliseconds };
}

function executeWallTracingEscapeMode(tracingStartXCoordinate, tracingStartYCoordinate, targetNode, gridMap, evaluatedNodesList, setVisCallback, canMoveInDirectionStrict) {
    let currentXCoordinate = tracingStartXCoordinate;
    let currentYCoordinate = tracingStartYCoordinate;
    let anchorHeuristicDistance = calculateOctileHeuristicDistance(currentXCoordinate, currentYCoordinate, targetNode);
    let wallTracingEscapePath = []; 
    let lenienceBuffer = 15; 
    let tempVisitedNodes = []; 

    const movementDirections = [
        {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1}, 
        {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
    ];
    let currentMovementHeadingIndex = 0; 

    while (lenienceBuffer > 0) {
        let isWallTracePathFound = false;
        let nextDirectionCheckIndex = (currentMovementHeadingIndex + 2) % 8; 

        for (let directionIndex = 0; directionIndex < 8; directionIndex++) {
            let directionOffsetX = movementDirections[nextDirectionCheckIndex].x;
            let directionOffsetY = movementDirections[nextDirectionCheckIndex].y;
            
            if (canMoveInDirectionStrict(currentXCoordinate, currentYCoordinate, directionOffsetX, directionOffsetY)) {
                currentXCoordinate += directionOffsetX;
                currentYCoordinate += directionOffsetY;
                currentMovementHeadingIndex = nextDirectionCheckIndex;
                isWallTracePathFound = true;
                
                wallTracingEscapePath.push({x: currentXCoordinate, y: currentYCoordinate});
                evaluatedNodesList.push({x: currentXCoordinate, y: currentYCoordinate}); 
                tempVisitedNodes.push({x: currentXCoordinate, y: currentYCoordinate});
                
                if (currentXCoordinate === targetNode.x && currentYCoordinate === targetNode.y) {
                    wallTracingEscapePath.targetFound = true;
                    tempVisitedNodes.forEach(node => setVisCallback(node.x, node.y));
                    return wallTracingEscapePath;
                }
                
                break;
            }
            nextDirectionCheckIndex = (nextDirectionCheckIndex - 1 + 8) % 8;
        }

        if (!isWallTracePathFound) return null; 

        let currentHeuristicDistance = calculateOctileHeuristicDistance(currentXCoordinate, currentYCoordinate, targetNode);
        
        if (currentHeuristicDistance < anchorHeuristicDistance) {
            tempVisitedNodes.forEach(node => setVisCallback(node.x, node.y));
            return wallTracingEscapePath; 
        } else if (currentHeuristicDistance > anchorHeuristicDistance) {
            lenienceBuffer--; 
        }
    }
    
    return null;
}

RegisterAlgorithm('greedy_bug', 'Greedy-Bug', runGreedyBug);