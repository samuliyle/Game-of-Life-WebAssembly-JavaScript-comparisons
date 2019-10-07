import './style.css';

import premadeBoards from './premadeboards';

// eslint-disable-next-line import/extensions
import adderino from './add.js';
import addModule from './add.wasm';

// Since webpack will change the name and potentially the path of the
// `.wasm` file, we have to provide a `locateFile()` hook to redirect
// to the appropriate URL.
// More details: https://kripken.github.io/emscripten-site/docs/api_reference/module.html
// eslint-disable-next-line no-var
var module = adderino({
    locateFile(path) {
        if (path.endsWith('.wasm')) {
            return addModule;
        }
        return path;
    },
});

const backgroundCanvas = document.getElementById('backgroundCanvas');
const gameCanvas = document.getElementById('gameCanvas');
const debugCanvas = document.getElementById('debugCanvas');
const interactionCanvas = document.getElementById('interactionCanvas');

const iterationSlider = document.getElementById('iterationIntervalSlider');
const gridSizeSlider = document.getElementById('gridSizeSlider');

const fpsElement = document.getElementById('fps');
const speedElement = document.getElementById('speed');
const gridElement = document.getElementById('grid');
const generationElement = document.getElementById('generation');

const backgroundCanvasContext = backgroundCanvas.getContext('2d');
const debugCanvasContext = debugCanvas.getContext('2d');
const gameCanvasContext = gameCanvas.getContext('2d');

const canvasWidth = gameCanvas.width;
const canvasHeight = gameCanvas.height;

const oneDimensional = true;
const useWasm = false;
let performances = [];

let enableDebugCoordinates = true;

let gridWidth = gridSizeSlider.value;
let gridHeight = gridSizeSlider.value;
gridElement.textContent = gridSizeSlider.value;
let step = iterationSlider.value;
speedElement.textContent = step;

let gridCountY = Math.round(canvasHeight / gridHeight);
let gridCountX = Math.round(canvasWidth / gridWidth);

let last = null;
let lastFrame = null;

let animationRequestId;
let generation = 0;

function createEmptyBoard() {
    const emptyBoard = [];
    for (let i = 0; i < gridCountY; i++) {
        emptyBoard[i] = [];
        for (let j = 0; j < gridCountX; j++) {
            emptyBoard[i][j] = 0;
        }
    }
    return emptyBoard;
}

// const nByte = Int32Array.BYTES_PER_ELEMENT;

// Initialise board
let board = createEmptyBoard();
if (oneDimensional) {
    board = new Int32Array(board.flat());
}
const bytesPerElement = board.BYTES_PER_ELEMENT;

// Takes an Int32Array, copies it to the heap and returns a pointer
// function arrayToPtr(array) {
//     const numBytes = array.length * array.BYTES_PER_ELEMENT;
//     const ptr = module._malloc(numBytes);
//     const heapBytes = new Int32Array(module.HEAP32.buffer, ptr, numBytes);
//     heapBytes.set(new Int32Array(array.buffer));
//     return heapBytes;
//     // const ptr = module._malloc(array.length * nByte);
//     // module.HEAP32.set(array, ptr / nByte);
//     // return ptr;
// }

// // Takes a pointer and  array length, and returns a Int32Array from the heap
// function ptrToArray(ptr, length) {
//     // const array = new Int32Array(length);
//     // const pos = ptr / nByte;
//     return new Int32Array(module.HEAP32.buffer, ptr, length);
//     // array.set(module.HEAP32.subarray(pos, pos + length));
//     // return array;
// }

// function freeArray(heapBytes) {
//     module._free(heapBytes.byteOffset);
// }

module.onRuntimeInitialized = () => {
    // console.log(module._add(10, 11));

    // const len = board.length;

    // // alloc memory, in this case 5*4 bytes
    // const inputPtr = module._malloc(len * bytesPerElement);
    // const outputPtr = module._malloc(len * bytesPerElement);

    // module.HEAP32.set(board, inputPtr / bytesPerElement);
    // module._calculateNextGeneration(inputPtr, outputPtr, gridCountY, gridCountX);
    // const outputArray = new Int32Array(module.HEAP32.buffer, outputPtr, len);
    // console.log('The starting array was:', board);
    // console.log('The result read is:', outputArray);

    // // dealloc memory
    // module._free(inputPtr);
    // module._free(outputPtr);

    // const heapBytes = arrayToPtr(board);
    // const nextGenerationHeapBytes = arrayToPtr(board);
    // module._calculateNextGeneration(heapBytes, nextGenerationHeapBytes, gridCountY, gridCountX);
    // const nextGeneration = ptrToArray(nextGenerationHeapBytes, board.length);
    // console.log(nextGeneration);
    // freeArray(nextGenerationHeapBytes);
    // freeArray(heapBytes);
};

// console.log(module);

const testArray = new Int32Array(gridCountX * gridCountY);
for (let y = 0; y < gridCountY; y++) {
    for (let x = 0; x < gridCountX; x++) {
        const i = x + gridCountX * y;
        testArray[i] = 1;
    }
}

// console.log(testArray);

function getValue(array, x, y) {
    /* eslint-disable */
    return array[(((x) % gridCountX + gridCountX) % gridCountX) + gridCountX * (((y) % gridCountY + gridCountY) % gridCountY)];
    /* eslint-enable */
}

function getElementAt(x, y) {
    /* eslint-disable */
    return board[(y % gridCountY + gridCountY) % gridCountY][(x % gridCountX + gridCountX) % gridCountX];
    /* eslint-enable */
}

function clearGridRect(x, y) {
    gameCanvasContext.clearRect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
}

function drawGridRect(x, y) {
    gameCanvasContext.beginPath();
    gameCanvasContext.rect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
    gameCanvasContext.fill();
    gameCanvasContext.closePath();
}

function fillDebugCoordinates(x, y) {
    debugCanvasContext.fillText(`${y},${x}`, (x * gridWidth) + (gridWidth / 2), (y * gridHeight) + (gridHeight / 2));
}

function roundToPrecision(x) {
    // eslint-disable-next-line prefer-template
    return +(Math.round(x + 'e+2') + 'e-2');
}

function updateFps(fps) {
    fpsElement.textContent = roundToPrecision(fps);
}

function updateGeneration(currentGeneration) {
    generationElement.textContent = currentGeneration;
}

function clearDebugCoordinates() {
    debugCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

function drawDebugCoordinates() {
    debugCanvasContext.font = `${Math.floor(gridHeight / 3)}px Arial`;
    for (let y = 0; y < gridCountY; y++) {
        for (let x = 0; x < gridCountX; x++) {
            fillDebugCoordinates(x, y);
        }
    }
}

function clearLife() {
    gameCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

export function drawLife(state = board) {
    clearLife();
    for (let y = 0; y < gridCountY; y++) {
        for (let x = 0; x < gridCountX; x++) {
            if (oneDimensional) {
                const i = x + gridCountX * y;
                if (state[i] === 1) {
                    drawGridRect(x, y);
                }
            } else if (state[y][x] === 1) {
                drawGridRect(x, y);
            }
        }
    }
}

function start() {
    if (!animationRequestId) {
        // eslint-disable-next-line no-use-before-define
        animationRequestId = window.requestAnimationFrame(draw);
    }
}

function stop() {
    if (animationRequestId) {
        window.cancelAnimationFrame(animationRequestId);
        animationRequestId = undefined;
        const average = (arr) => arr.reduce((p, c) => p + c, 0) / arr.length;
        const result = average(performances);
        console.log(result);
        performances = [];
    }
}

function clearBoard() {
    stop();
    generation = 0;
    updateGeneration(generation);
    clearLife();
    if (oneDimensional) {
        board.fill(0);
    } else {
        board.forEach((element) => {
            element.fill(0);
        });
    }
}

function calculateNeighbors(y, x) {
    let neighbourCount = 0;
    // |1|0|0|
    // |0|x|0|
    // |0|0|0|
    neighbourCount += getElementAt(x - 1, y - 1);
    // |0|1|0|
    // |0|x|0|
    // |0|0|0|
    neighbourCount += getElementAt(x, y - 1);
    // |0|0|1|
    // |0|x|0|
    // |0|0|0|
    neighbourCount += getElementAt(x + 1, y - 1);
    // |0|0|0|
    // |1|x|0|
    // |0|0|0|
    neighbourCount += getElementAt(x - 1, y);
    // |0|0|0|
    // |0|x|1|
    // |0|0|0|
    neighbourCount += getElementAt(x + 1, y);
    // |0|0|0|
    // |0|x|0|
    // |1|0|0|
    neighbourCount += getElementAt(x - 1, y + 1);
    // |0|0|0|
    // |0|x|0|
    // |0|1|0|
    neighbourCount += getElementAt(x, y + 1);
    // |0|0|0|
    // |0|x|0|
    // |0|0|1|
    neighbourCount += getElementAt(x + 1, y + 1);
    return neighbourCount;
}

function calculate1dNeighbors(i) {
    const xIndex = i % gridCountX;
    let neighbourCount = 0;
    // eslint-disable-next-line no-bitwise
    const yIndex = ~~(i / gridCountX);
    neighbourCount += getValue(board, xIndex - 1, yIndex - 1);
    neighbourCount += getValue(board, xIndex, yIndex - 1);
    neighbourCount += getValue(board, xIndex + 1, yIndex - 1);
    neighbourCount += getValue(board, xIndex - 1, yIndex);
    neighbourCount += getValue(board, xIndex + 1, yIndex);
    neighbourCount += getValue(board, xIndex - 1, yIndex + 1);
    neighbourCount += getValue(board, xIndex, yIndex + 1);
    neighbourCount += getValue(board, xIndex + 1, yIndex + 1);
    return neighbourCount;
}

// Main loop
export function draw(time, oneStep = false) {
    // Draw life
    animationRequestId = undefined;
    let nextGeneration = null;
    if (last === null) {
        last = time;
        lastFrame = time;
    }
    const progress = time - last;
    if (oneStep || (progress > step)) {
        const oneDimStart = performance.now();
        if (oneDimensional) {
            if (useWasm) {
                const len = board.length;

                const inputPtr = module._malloc(len * bytesPerElement);
                const outputPtr = module._malloc(len * bytesPerElement);

                module.HEAP32.set(board, inputPtr / bytesPerElement);
                module._calculateNextGeneration(inputPtr, outputPtr, gridCountY, gridCountX);
                nextGeneration = new Int32Array(module.HEAP32.buffer, outputPtr, len);

                // dealloc memory
                module._free(inputPtr);
                module._free(outputPtr);
            } else {
                nextGeneration = new Int32Array(gridCountY * gridCountX);
                for (let y = 0; y < gridCountY; y++) {
                    for (let x = 0; x < gridCountX; x++) {
                        const i = x + gridCountX * y;
                        const neighbourCount = calculate1dNeighbors(i);
                        const current = board[i];
                        if (current === 1 && (neighbourCount <= 1 || neighbourCount > 3)) {
                            nextGeneration[i] = 0;
                        } else if (current === 0 && neighbourCount === 3) {
                            nextGeneration[i] = 1;
                        } else {
                            nextGeneration[i] = current;
                        }
                    }
                }
            }
        } else {
            nextGeneration = [];
            for (let y = 0; y < gridCountY; y++) {
                nextGeneration[y] = [];
                for (let x = 0; x < gridCountX; x++) {
                    const neighbourCount = calculateNeighbors(y, x);
                    const current = board[y][x];
                    if (current === 1 && (neighbourCount <= 1 || neighbourCount > 3)) {
                        nextGeneration[y][x] = 0;
                    } else if (current === 0 && neighbourCount === 3) {
                        nextGeneration[y][x] = 1;
                    } else {
                        nextGeneration[y][x] = current;
                    }
                }
            }
        }
        updateFps(1000 / (time - lastFrame));
        last = time;
        board = nextGeneration;
        generation += 1;
        updateGeneration(generation);
        performances.push((performance.now() - oneDimStart));
    }
    lastFrame = time;
    drawLife(nextGeneration || board);
    if (!oneStep) {
        start();
    }
}

function addOrRemoveLife(x, y) {
    if (oneDimensional) {
        const i = x + gridCountX * y;
        if (board[i] === 0) {
            board[i] = 1;
            drawGridRect(x, y);
        } else {
            board[i] = 0;
            clearGridRect(x, y);
        }
    } else if (board[y][x] === 0) {
        board[y][x] = 1;
        drawGridRect(x, y);
    } else {
        board[y][x] = 0;
        clearGridRect(x, y);
    }
}

function clearGrid() {
    backgroundCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
}

function drawGrid() {
    for (let i = 1; i < gridCountY; i++) {
        backgroundCanvasContext.beginPath();
        backgroundCanvasContext.rect(0, i * gridHeight, canvasWidth, 1);
        backgroundCanvasContext.fill();
        backgroundCanvasContext.closePath();
    }
    for (let i = 1; i < gridCountX; i++) {
        backgroundCanvasContext.beginPath();
        backgroundCanvasContext.rect(i * gridWidth, 0, 1, canvasHeight);
        backgroundCanvasContext.fill();
        backgroundCanvasContext.closePath();
    }
}

function clearAll() {
    clearGrid();
    clearLife();
    if (enableDebugCoordinates) {
        clearDebugCoordinates();
    }
}

function drawAll() {
    drawGrid();
    drawLife();
    if (enableDebugCoordinates) {
        drawDebugCoordinates();
    }
}

function gridSizeChange(value, keepBoard = true) {
    gridWidth = value;
    gridHeight = value;
    gridCountY = Math.round(canvasHeight / gridHeight);
    gridCountX = Math.round(canvasWidth / gridWidth);
    clearAll();
    if (keepBoard) {
        let newBoard = [];
        if (oneDimensional) {
            newBoard = new Int32Array(createEmptyBoard().flat());
        } else {
            // Expand current board
            for (let i = 0; i < gridCountY; i++) {
                newBoard[i] = [];
                for (let j = 0; j < gridCountX; j++) {
                    // TODO: Improve?
                    if (board[i] !== undefined && board[i][j] !== undefined) {
                        newBoard[i][j] = board[i][j];
                    } else {
                        newBoard[i][j] = 0;
                    }
                }
            }
        }
        board = newBoard;
    }
    drawAll();
}

document.addEventListener('DOMContentLoaded', () => {
    backgroundCanvasContext.fillStyle = 'grey';

    debugCanvasContext.fillStyle = 'red';
    debugCanvasContext.textAlign = 'center';

    gameCanvasContext.fillStyle = 'black';

    interactionCanvas.addEventListener('click', (event) => {
        if (generation === 0) {
            // Calculate grid coordinates from clicked x, y coordinates
            const rect = interactionCanvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const gridX = Math.floor(x / gridWidth);
            const gridY = Math.floor(y / gridHeight);
            if (event.shiftKey) {
                for (let i = 0; i < gridCountX; i++) {
                    addOrRemoveLife(i, gridY);
                }
            } else {
                addOrRemoveLife(gridX, gridY);
            }
        }
    });

    const debugCoordinatesCheckbox = document.getElementById('debugCoordinates');
    enableDebugCoordinates = debugCoordinatesCheckbox.checked;
    debugCoordinatesCheckbox.addEventListener('change', (event) => {
        enableDebugCoordinates = event.target.checked;
        if (enableDebugCoordinates) {
            drawDebugCoordinates();
        } else {
            clearDebugCoordinates();
        }
    });

    iterationSlider.addEventListener('input', (event) => {
        step = event.target.value;
        speedElement.textContent = step;
    });

    gridSizeSlider.addEventListener('input', (event) => {
        gridSizeChange(event.target.value);
        gridElement.textContent = event.target.value;
    });
    const premadeBoardSelect = document.getElementById('premadeBoardSelect');
    premadeBoardSelect.addEventListener('change', (event) => {
        if (event.target.value.length !== 0) {
            const premadeBoard = premadeBoards[event.target.value];
            if (premadeBoard) {
                gridSizeSlider.value = premadeBoard.gridSize;
                iterationSlider.value = premadeBoard.speed;
                step = premadeBoard.speed;
                board = premadeBoard.board;
                gridSizeChange(premadeBoard.gridSize, false);
            }
        }
    });

    const nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', () => {
        draw(performance.now(), true);
    });

    const startStopButton = document.getElementById('startStopButton');
    startStopButton.addEventListener('click', () => {
        if (animationRequestId) {
            stop();
            startStopButton.textContent = 'Start';
        } else {
            start();
            startStopButton.textContent = 'Stop';
        }
    });

    const clearButton = document.getElementById('clearButton');
    clearButton.addEventListener('click', () => {
        clearBoard();
    });

    drawAll();
});
