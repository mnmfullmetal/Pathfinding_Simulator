# Pathfinding Simulator

A browser-based visualisation tool for testing 2D grid pathfinding algorithms. The simulator provides a visual representation of node evaluation, raycasting, and path construction.

**Live Demo:** [Insert Web URL Here]

## Core Features

*   **Interactive Canvas:** Click and drag to draw or erase obstacles. Start and target nodes are freely movable.
*   **Grid Management:** Adjustable X/Y grid dimensions.
*   **Obstacle Generation:** Supports manual wall drawing and random obstacle scatter with adjustable density.
*   **Layout State:** Save and load up to three grid configurations via local storage.
*   **Playback Controls:** Real-time simulation execution with adjustable playback speed and pause functionality.
*   **Performance Metrics:** Tracks execution time (ms), total nodes evaluated, and final path length.

## Supported Algorithms

*   **A* (Octile Heuristic):** Standard heuristic-based search.
*   **Dijkstra:** Uniform cost search without heuristic optimization.
*   **Bidirectional A*:** Simultaneous search originating from both start and target nodes.
*   **Jump Point Search (JPS):** Optimized A* for uniform cost grids, skipping symmetrical paths.
*   **Theta* (Any-Angle):** Line-of-sight pathfinding that bypasses intermediate grid cells to construct unconstrained vectors.
*   **Hierarchical Pathfinding A* (HPA*):** Macro-graph abstraction dividing the grid into configurable clusters to reduce the search space. Includes dynamic UI controls for cluster sizing.

## Architecture

*   **Frontend:** Vanilla HTML, CSS, and JavaScript.
*   **Rendering:** HTML5 `<canvas>` API driven by a centralized visualization loop (`requestAnimationFrame`).
*   **Module System:** ES6 Modules. Algorithms are isolated into individual files and injected via a `PathfinderRegistry`.

## Usage

**Web Access**
Open `[Insert Web URL Here]` in any modern browser to run the simulator immediately.

**Local Execution**
1.  Download or clone the repository.
2.  Open `index.html` in any modern web browser. No local server or build tools are required.
3.  Select an algorithm from the control panel, configure the grid, and initiate the simulation.