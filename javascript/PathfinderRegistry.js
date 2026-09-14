export const AlgorithmRegistry = {};

/**
 * The contract every algorithm must fulfill.
 * @param {string} algorithmIdentifierKey - The internal key (e.g., 'astar')
 * @param {string} uiDisplayNameText - What shows in the UI dropdown
 * @param {function} algorithmExecutionCallback - The function to execute. 
 */

export function RegisterAlgorithm(algorithmIdentifierKey, uiDisplayNameText, algorithmExecutionCallback) {
    if (AlgorithmRegistry[algorithmIdentifierKey]) {
        console.warn(`Algorithm ${algorithmIdentifierKey} is already registered.`);
        return;
    }
    AlgorithmRegistry[algorithmIdentifierKey] = { displayName: uiDisplayNameText, run: algorithmExecutionCallback };
}