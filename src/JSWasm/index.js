import '../style.css';

import { initShaderProgram, initBuffers } from '../webGLUtil';
import shaders from '../shaders';

// eslint-disable-next-line import/extensions
import adderino from '../life.js';
import addModule from '../life.wasm';

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
const gameCanvas = document.getElementById('gameCanvas');

let programInfo = null;
let buffers = null;
let gameCanvasContext = null;

const canvasWidth = gameCanvas.width;
const canvasHeight = gameCanvas.height;

const offset = 0;
const count = 6;
let primitiveType = null;

const gridWidth = 2;
const gridHeight = 2;
const step = 20;

const gridCountY = Math.round(canvasHeight / gridHeight);
const gridCountX = Math.round(canvasWidth / gridWidth);

let last = null;

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
let board = new Int32Array(createEmptyBoard().flat());
const bytesPerElement = board.BYTES_PER_ELEMENT;

function setRect(x, y, arr) {
    const x1 = (x * gridWidth) + 1;
    const x2 = (x * gridWidth) + gridWidth;
    const y1 = (y * gridHeight) + 1;
    const y2 = (y * gridHeight) + gridHeight;

    arr.push(x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2);
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

function clearLife() {
    gameCanvasContext.clearColor(0, 0.0, 0.0, 0);
    gameCanvasContext.clearDepth(1.0);
    gameCanvasContext.clear(gameCanvasContext.COLOR_BUFFER_BIT | gameCanvasContext.DEPTH_BUFFER_BIT);
}

export function drawLife(state = board) {
    clearLife();
    const rects = [];
    for (let y = 0; y < gridCountY; y++) {
        for (let x = 0; x < gridCountX; x++) {
            const i = x + gridCountX * y;
            if (state[i] === 1) {
                // For webgl, group all rects into one array, so buffer is only set once and drawArrays is called once
                setRect(x, y, rects);
            }
        }
    }
    gameCanvasContext.bufferData(
        gameCanvasContext.ARRAY_BUFFER, new Float32Array(rects), gameCanvasContext.STATIC_DRAW,
    );
    drawScene(rects.length / 2);
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
    }
}

// Main loop
export function draw(time) {
    if (generation === 1000) {
        stop();
        return;
    }
    // Draw life
    animationRequestId = undefined;
    let nextGeneration = null;
    if (last === null) {
        last = time;
    }
    const progress = time - last;
    if (progress > step) {
        const len = board.length;
        const inputPtr = module._malloc(len * bytesPerElement);
        const outputPtr = module._malloc(len * bytesPerElement);

        module.HEAP32.set(board, inputPtr / bytesPerElement);
        module._calculateNextGeneration(inputPtr, outputPtr, gridCountY, gridCountX);
        nextGeneration = new Int32Array(module.HEAP32.buffer, outputPtr, len);

        // deallocate memory
        module._free(inputPtr);
        module._free(outputPtr);
        last = time;
        board = nextGeneration;
        generation += 1;
        if (generation % 200 === 0) {
            console.log(`${generation}: snap`);
        }
    }
    drawLife(nextGeneration || board);
    start();
}

document.addEventListener('DOMContentLoaded', () => {
    gameCanvasContext = gameCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    initWebGL();

    const midPoint = parseInt(gridCountY / 2, 10);
    for (let y = 0; y < gridCountY; y++) {
        for (let x = 0; x < gridCountX; x++) {
            const i = x + gridCountX * y;
            const xIndex = i % gridCountX;
            const yIndex = ~~(i / gridCountX);
            if (yIndex === midPoint) {
                if (xIndex !== 0 && xIndex !== (gridCountX - 1)) {
                    board[i] = 1;
                }
            }
        }
    }

    drawLife();
    setTimeout(start, 2000);
});
