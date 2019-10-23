import './style.css';

import { initShaderProgram, initBuffers } from './webGLUtil';
import premadeBoards from './premadeboards';
import shaders from './shaders';

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

let programInfo = null;
let buffers = null;
let gameCanvasContext = null;

const canvasWidth = gameCanvas.width;
const canvasHeight = gameCanvas.height;

const oneDimensional = true;
const useWasm = false;
const useWebGL = true;
const useOpenGL = false;

const offset = 0;
const count = 6;
let primitiveType = null;

let neighbourCalcTimes = [];
let drawTimes = [];
let enableDebugCoordinates = true;

let gridWidth = parseInt(gridSizeSlider.value, 10);
let gridHeight = parseInt(gridSizeSlider.value, 10);
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

module.onRuntimeInitialized = () => {
    module.canvas = gameCanvas;
    if (useOpenGL) {
        module._initOpenGL(canvasWidth, canvasHeight);
        // module._draw();
        // module._drawScene();
        // setInterval(module._draw, 100);
    }
};

console.log(module);

function initWebGL() {
    const shaderProgram = initShaderProgram(gameCanvasContext, shaders.vsSource, shaders.fsSource);
    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gameCanvasContext.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            resolutionUniformLocation: gameCanvasContext.getUniformLocation(shaderProgram, 'u_resolution'),
        },
    };

    buffers = initBuffers(gameCanvasContext);

    // Tell WebGL to use our program when drawing.
    // All drawn webl gl shapes are the same (square), so calling this at init instead of each draw.
    gameCanvasContext.useProgram(programInfo.program);

    {
        const numComponents = 2;
        const type = gameCanvasContext.FLOAT;
        const normalize = false;
        const stride = 0;
        const offsetAtt = 0;
        gameCanvasContext.bindBuffer(gameCanvasContext.ARRAY_BUFFER, buffers.position);
        gameCanvasContext.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offsetAtt,
        );
        gameCanvasContext.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    primitiveType = gameCanvasContext.TRIANGLES;
}

// Initialise board
let board = createEmptyBoard();
if (oneDimensional) {
    board = new Int32Array(board.flat());
}
const bytesPerElement = board.BYTES_PER_ELEMENT;

function setRectangle(x, y) {
    const x1 = (x * gridWidth) + 1;
    const x2 = (x * gridWidth) + gridWidth;
    const y1 = (y * gridHeight) + 1;
    const y2 = (y * gridHeight) + gridHeight;

    gameCanvasContext.bufferData(gameCanvasContext.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2]), gameCanvasContext.STATIC_DRAW);
}

function setRect(x, y) {
    const x1 = (x * gridWidth) + 1;
    const x2 = (x * gridWidth) + gridWidth;
    const y1 = (y * gridHeight) + 1;
    const y2 = (y * gridHeight) + gridHeight;

    return [x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2];
}

// Draw the scene.
function drawScene(rectCount = count) {
    gameCanvasContext.viewport(0, 0, gameCanvasContext.canvas.width, gameCanvasContext.canvas.height);

    // Set the shader uniforms
    gameCanvasContext.uniform2f(
        programInfo.uniformLocations.resolutionUniformLocation,
        gameCanvasContext.canvas.clientWidth,
        gameCanvasContext.canvas.clientHeight,
    );

    gameCanvasContext.drawArrays(primitiveType, offset, rectCount);
}

function getValue(array, x, y) {
    const xIndex = ((x % gridCountX + gridCountX) % gridCountX);
    const yIndex = ((y % gridCountY + gridCountY) % gridCountY);
    const index = xIndex + gridCountX * yIndex;
    return array[index];
}

function getElementAt(x, y) {
    return board[(y % gridCountY + gridCountY) % gridCountY][(x % gridCountX + gridCountX) % gridCountX];
}

function clearGridRect(x, y) {
    if (useWebGL) {
        // TODO: Fix
        // turn on the scissor test.
        gameCanvasContext.enable(gameCanvasContext.SCISSOR_TEST);

        const x1 = (x * gridWidth) + 1;
        const x2 = (x * gridWidth) + gridWidth;
        const y1 = (y * gridHeight) + 1;
        const y2 = (y * gridHeight) + gridHeight;

        // set the scissor rectangle.
        gameCanvasContext.scissor(x1, y1, x2, y2);

        // clear.
        gameCanvasContext.clearColor(0, 0.0, 0.0, 0);
        gameCanvasContext.clearDepth(1.0); // Clear everything
        gameCanvasContext.clear(gameCanvasContext.COLOR_BUFFER_BIT | gameCanvasContext.DEPTH_BUFFER_BIT);

        // turn off the scissor test so you can render like normal again.
        gameCanvasContext.disable(gameCanvasContext.SCISSOR_TEST);
    } else {
        gameCanvasContext.clearRect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
    }
}

function drawGridRect(x, y) {
    if (useWebGL) {
        setRectangle(x, y);
        drawScene();
    } else {
        gameCanvasContext.beginPath();
        gameCanvasContext.rect((x * gridWidth) + 1, (y * gridHeight) + 1, gridWidth - 1, gridHeight - 1);
        gameCanvasContext.fill();
        gameCanvasContext.closePath();
    }
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
    if (useWebGL) {
        gameCanvasContext.clearColor(0, 0.0, 0.0, 0);
        gameCanvasContext.clearDepth(1.0);
        gameCanvasContext.clear(gameCanvasContext.COLOR_BUFFER_BIT | gameCanvasContext.DEPTH_BUFFER_BIT);
    } else {
        gameCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }
}

export function drawLife(state = board) {
    clearLife();
    const rects = [];
    for (let y = 0; y < gridCountY; y++) {
        for (let x = 0; x < gridCountX; x++) {
            if (oneDimensional) {
                const i = x + gridCountX * y;
                if (state[i] === 1) {
                    // For webgl, group all rects into one array, so buffer is only set once and drawArrays is called once
                    if (useWebGL) {
                        rects.push(setRect(x, y));
                    } else {
                        drawGridRect(x, y);
                    }
                }
            } else if (state[y][x] === 1) {
                drawGridRect(x, y);
            }
        }
    }
    if (useWebGL) {
        const rectCount = rects.length;
        const flattenRects = rects.flat();
        gameCanvasContext.bufferData(
            gameCanvasContext.ARRAY_BUFFER, new Float32Array(flattenRects), gameCanvasContext.STATIC_DRAW,
        );
        drawScene(rectCount * count);
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
        console.log('Draw avg', average(drawTimes));
        console.log('Neighbour calcs avg', average(neighbourCalcTimes));
        drawTimes = [];
        neighbourCalcTimes = [];
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

                // deallocate memory
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
        neighbourCalcTimes.push((performance.now() - oneDimStart));
    }
    lastFrame = time;
    const drawStart = performance.now();
    drawLife(nextGeneration || board);
    drawTimes.push((performance.now() - drawStart));
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
    if (!useOpenGL) {
        drawLife();
    }
    if (enableDebugCoordinates) {
        drawDebugCoordinates();
    }
}

function gridSizeChange(value, keepBoard = true) {
    gridWidth = parseInt(value, 10);
    gridHeight = parseInt(value, 10);
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
    if (!useOpenGL) {
        if (useWebGL) {
            gameCanvasContext = gameCanvas.getContext('webgl', { preserveDrawingBuffer: true });
            if (gameCanvasContext === null) {
                console.error('WebGL not supported');
            } else {
                initWebGL();
            }
        }
        if (gameCanvasContext === null) {
            gameCanvasContext = gameCanvas.getContext('2d');
            gameCanvasContext.fillStyle = 'black';
        }
    }

    backgroundCanvasContext.fillStyle = 'grey';
    debugCanvasContext.fillStyle = 'red';
    debugCanvasContext.textAlign = 'center';

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
