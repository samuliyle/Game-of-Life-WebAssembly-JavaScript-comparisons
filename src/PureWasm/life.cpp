#include <emscripten.h>

#include <functional>

#include <SDL.h>

#define GL_GLEXT_PROTOTYPES 1
#include <SDL_opengles2.h>

#include <vector>
#include <iostream>
#include <numeric>
#include <array>

#include <chrono>

// Shader sources

const GLchar *vertexSourceTri =
    "attribute vec4 aVertexPosition;              \n"
    "void main()                                  \n"
    "{                                            \n"
    "  gl_Position = vec4(position.xyz, 1.0);     \n"
    "}                                            \n";
const GLchar *vertexSource =
    "attribute vec2 aVertexPosition;              \n"
    "uniform vec2 u_resolution;                   \n"
    "void main()                                  \n"
    "{                                            \n"
    "  vec2 zeroToOne = aVertexPosition / u_resolution;     \n"
    "  vec2 zeroToTwo = zeroToOne * 2.0;     \n"
    "  vec2 clipSpace = zeroToTwo - 1.0;     \n"
    "  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     \n"
    "}                                            \n";
const GLchar *fragmentSource =
    "void main()                                  \n"
    "{                                            \n"
    "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);    \n"
    "}                                            \n";

SDL_Window *window;

const int gridWidth = 2;
const int gridHeight = 2;

GLint uniAttrib = 0;

const int canvasWidth = 1440;
const int canvasHeight = 960;

const int gameGridCountX = canvasWidth / gridWidth;
const int gameGridCountY = canvasHeight / gridHeight;

const int boardSize = gameGridCountX * gameGridCountY;
// int *gameBoard = (int *)malloc(sizeof(int *) * boardSize);

std::array<int, boardSize> gameBoard{};

std::chrono::steady_clock::time_point last = std::chrono::steady_clock::now();

std::vector<float> performanceStamps;

int generation = 0;
// 2 seconds
const float step = 20;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void setRect(int x, int y, std::vector<float> &arr)
    {
        const GLfloat _x1 = (x * gridWidth) + 1.0f;
        const GLfloat _x2 = (x * gridWidth) + gridWidth;
        const GLfloat _y1 = (y * gridHeight) + 1.0f;
        const GLfloat _y2 = (y * gridHeight) + gridHeight;

        arr.push_back(_x1);
        arr.push_back(_y1);
        arr.push_back(_x2);
        arr.push_back(_y1);
        arr.push_back(_x1);
        arr.push_back(_y2);
        arr.push_back(_x1);
        arr.push_back(_y2);
        arr.push_back(_x2);
        arr.push_back(_y1);
        arr.push_back(_x2);
        arr.push_back(_y2);
    }

    EMSCRIPTEN_KEEPALIVE
    void clearLife()
    {
        // Clear the screen
        glClearColor(1.0f, 1.0f, 1.0f, 0.0f);
        // glClearDepthf(1.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        // glDisable(GL_DEPTH_TEST);
        // glEnable(GL_BLEND);
        // glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }

    EMSCRIPTEN_KEEPALIVE
    void drawScene(int count = 6)
    {
        glViewport(0, 0, canvasWidth, canvasHeight);

        glUniform2f(uniAttrib, canvasWidth, canvasHeight);
        // Draw a square from the 6 vertices
        glDrawArrays(GL_TRIANGLES, 0, count);

        SDL_GL_SwapWindow(window);
    }

    EMSCRIPTEN_KEEPALIVE
    void drawLife()
    {
        clearLife();
        std::vector<float> arr;
        for (int y = 0; y < gameGridCountY; y++)
        {
            for (int x = 0; x < gameGridCountX; x++)
            {
                int i = x + gameGridCountX * y;
                if (gameBoard[i] == 1)
                {
                    setRect(x, y, arr);
                }
            }
        }
        glBufferData(GL_ARRAY_BUFFER, arr.size() * sizeof(GLfloat), arr.data(), GL_STATIC_DRAW);
        drawScene(arr.size() / 2);
    }

    EMSCRIPTEN_KEEPALIVE
    int getValue(std::array<int, boardSize> &arr, int x, int y, int gridCountY, int gridCountX)
    {
        return arr[((x % gridCountX + gridCountX) % gridCountX) + gridCountX * ((y % gridCountY + gridCountY) % gridCountY)];
    }

    //     int calculate1dNeighbors(int *board, int i, int gridCountY, int gridCountX)
    EMSCRIPTEN_KEEPALIVE
    int calculate1dNeighbors(std::array<int, boardSize> &board, int i, int gridCountY, int gridCountX)
    {
        int xIndex = i % gridCountX;
        int neighbourCount = 0;
        int yIndex = i / gridCountX;
        neighbourCount += getValue(board, xIndex - 1, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex - 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex - 1, yIndex, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex - 1, yIndex + 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex, yIndex + 1, gridCountY, gridCountX);
        neighbourCount += getValue(board, xIndex + 1, yIndex + 1, gridCountY, gridCountX);
        return neighbourCount;
    }

    // void calculateNextGeneration(int *board, int *nextGeneration, int gridCountY, int gridCountX)
    EMSCRIPTEN_KEEPALIVE
    std::array<int, boardSize> calculateNextGeneration(std::array<int, boardSize> &board, int gridCountY, int gridCountX)
    {
        std::array<int, boardSize> nextGeneration{};
        for (int y = 0; y < gridCountY; y++)
        {
            for (int x = 0; x < gridCountX; x++)
            {
                int i = x + gridCountX * y;
                nextGeneration[i] = 1;
                int neighbourCount = calculate1dNeighbors(board, i, gridCountY, gridCountX);
                int current = board[i];
                // Rules 1 and 3
                if (current == 1 && (neighbourCount <= 1 || neighbourCount > 3))
                {
                    nextGeneration[i] = 0;
                }
                // Rule 4
                else if (current == 0 && neighbourCount == 3)
                {
                    nextGeneration[i] = 1;
                }
                // Rule 2
                else
                {
                    nextGeneration[i] = current;
                }
            }
        }
        return nextGeneration;
    }

    EMSCRIPTEN_KEEPALIVE
    void draw()
    {
        std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
        auto progress = std::chrono::duration_cast<std::chrono::milliseconds>(now - last).count();
        if (progress > step)
        {
            std::chrono::steady_clock::time_point performanceNow = std::chrono::steady_clock::now();
            auto newBoard = calculateNextGeneration(gameBoard, gameGridCountY, gameGridCountX);
            gameBoard = newBoard;
            drawLife();
            last = now;
            std::chrono::steady_clock::time_point performanceEnd = std::chrono::steady_clock::now();
            auto performance = std::chrono::duration_cast<std::chrono::milliseconds>(performanceEnd - performanceNow).count();
            std::cout << performance << "\n";
            performanceStamps.push_back(performance);
            generation++;
            if (generation % 100 == 0)
            {
                float average = std::accumulate(performanceStamps.begin(), performanceStamps.end(), 0.0) / performanceStamps.size();
                std::cout << average << "\n";
                performanceStamps.clear();
            }
        }
    }

    EMSCRIPTEN_KEEPALIVE
    void initOpenGL()
    {
        SDL_CreateWindowAndRenderer(canvasWidth, canvasHeight, 0, &window, nullptr);

        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
        // SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);

        // Create a Vertex Buffer Object and copy the vertex data to it
        GLuint vbo;
        glGenBuffers(1, &vbo);

        glBindBuffer(GL_ARRAY_BUFFER, vbo);

        // Create and compile the vertex shader
        GLuint vertexShader = glCreateShader(GL_VERTEX_SHADER);
        glShaderSource(vertexShader, 1, &vertexSource, nullptr);
        glCompileShader(vertexShader);

        // Create and compile the fragment shader
        GLuint fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
        glShaderSource(fragmentShader, 1, &fragmentSource, nullptr);
        glCompileShader(fragmentShader);

        // Link the vertex and fragment shader into a shader program
        GLuint shaderProgram = glCreateProgram();
        glAttachShader(shaderProgram, vertexShader);
        glAttachShader(shaderProgram, fragmentShader);
        glLinkProgram(shaderProgram);
        glUseProgram(shaderProgram);

        // Specify the layout of the vertex data
        GLint posAttrib = glGetAttribLocation(shaderProgram, "aVertexPosition");
        glEnableVertexAttribArray(posAttrib);
        glVertexAttribPointer(posAttrib, 2, GL_FLOAT, GL_FALSE, 0, 0);

        // Specify the layout of the vertex data
        uniAttrib = glGetUniformLocation(shaderProgram, "u_resolution");
        drawLife();
        emscripten_set_main_loop(draw, -1, 1);
    }

    int main()
    {
        for (int y = 0; y < gameGridCountY; y++)
        {
            for (int x = 0; x < gameGridCountX; x++)
            {
                int i = x + gameGridCountX * y;
                int xIndex = i % gameGridCountX;
                int yIndex = i / gameGridCountX;
                if (yIndex == 10)
                {
                    if (xIndex != 0 || xIndex != (gameGridCountX - 1))
                    {
                        gameBoard[i] = 1;
                    }
                }
            }
        }
        initOpenGL();

        return 0;
    }
}
