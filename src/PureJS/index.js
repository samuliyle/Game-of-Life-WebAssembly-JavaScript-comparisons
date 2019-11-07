import '../style.css';

import { initShaderProgram, initBuffers } from '../webGLUtil';
import shaders from '../shaders';

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
let nextGeneration = new Int32Array(createEmptyBoard().flat());

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

function getValue(array, x, y) {
    const xIndex = ((x % gridCountX + gridCountX) % gridCountX);
    const yIndex = ((y % gridCountY + gridCountY) % gridCountY);
    const index = xIndex + gridCountX * yIndex;
    return array[index];
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
export function draw(time) {
    if (generation === 1000) {
        stop();
        return;
    }
    // Draw life
    animationRequestId = undefined;
    if (last === null) {
        last = time;
    }
    const progress = time - last;
    if (progress > step) {
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
        last = time;
        const tmp = board;
        board = nextGeneration;
        nextGeneration = tmp;
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
