#include <emscripten.h>

#include <functional>

#include <SDL.h>

#define GL_GLEXT_PROTOTYPES 1
#include <SDL_opengles2.h>

#include <vector>

// Shader sources
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
    " vec2 clipSpace = zeroToTwo - 1.0;     \n"
    "  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);     \n"
    "}                                            \n";
const GLchar *fragmentSource =
    "void main()                                  \n"
    "{                                            \n"
    "  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);    \n"
    "}                                            \n";

SDL_Window *window;

const int gridWidth = 24;
const int gridHeight = 24;

int *gameBoard = (int *)malloc(sizeof(int *) * 2400);

GLint uniAttrib = 0;

int canvasWidth = 1440;
int canvasHeight = 960;

int gameGridCountY = 40;
int gameGridCountX = 60;

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
        // clearLife();
        // const GLfloat _x1 = (x * gridWidth) + 1.0f;
        // const GLfloat _x2 = (x * gridWidth) + gridWidth;
        // const GLfloat _y1 = (y * gridHeight) + 1.0f;
        // const GLfloat _y2 = (y * gridHeight) + gridHeight;
        // GLfloat vVertices[] = {
        //     _x1, _y1,
        //     _x2, _y1,
        //     _x1, _y2,
        //     _x1, _y2,
        //     _x2, _y1,
        //     _x2, _y2};

        // std::vector<GLfloat> arr;
        // arr.push_back(_x1);
        // arr.push_back(_y1);
        // arr.push_back(_x2);
        // arr.push_back(_y1);
        // arr.push_back(_x1);
        // arr.push_back(_y2);
        // arr.push_back(_x1);
        // arr.push_back(_y2);
        // arr.push_back(_x2);
        // arr.push_back(_y1);
        // arr.push_back(_x2);
        // arr.push_back(_y2);

        // GLfloat *wow = arr.data();


        // glBufferData(GL_ARRAY_BUFFER, sizeof(uwu), uwu, GL_STATIC_DRAW);

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
        GLfloat verticles[arr.size()];
        // printf("%d\n", arr.size());
        std::copy(arr.begin(), arr.end(), verticles);
        glBufferData(GL_ARRAY_BUFFER, sizeof(verticles), verticles, GL_STATIC_DRAW);
        //glBufferData(GL_ARRAY_BUFFER, sizeof(arr), &arr[0], GL_STATIC_DRAW);
        drawScene(arr.size());
    }

    EMSCRIPTEN_KEEPALIVE
    int getValue(int *array, int x, int y, int gridCountY, int gridCountX)
    {
        return array[(((x) % gridCountX + gridCountX) % gridCountX) + gridCountX * (((y) % gridCountY + gridCountY) % gridCountY)];
    }

    EMSCRIPTEN_KEEPALIVE
    int calculate1dNeighbors(int *board, int i, int gridCountY, int gridCountX)
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

    EMSCRIPTEN_KEEPALIVE
    void calculateNextGeneration(int *board, int *nextGeneration, int gridCountY, int gridCountX)
    {
        for (int y = 0; y < gridCountY; y++)
        {
            for (int x = 0; x < gridCountX; x++)
            {
                int i = x + gridCountX * y;
                nextGeneration[i] = 1;
                int neighbourCount = calculate1dNeighbors(board, i, gridCountY, gridCountX);
                int current = board[i];
                if (current == 1 && (neighbourCount <= 1 || neighbourCount > 3))
                {
                    nextGeneration[i] = 0;
                }
                else if (current == 0 && neighbourCount == 3)
                {
                    nextGeneration[i] = 1;
                }
                else
                {
                    nextGeneration[i] = current;
                }
            }
        }
    }

    EMSCRIPTEN_KEEPALIVE
    void draw()
    {
        int *nextGeneration = (int *)malloc(sizeof(int *) * 2400);
        calculateNextGeneration(gameBoard, nextGeneration, gameGridCountY, gameGridCountX);
        memcpy(gameBoard, nextGeneration, (sizeof(int *) * 2400));
        drawLife();
        free(nextGeneration);
        // free(nextGeneration);
    }

 EMSCRIPTEN_KEEPALIVE
    void initOpenGL(int width, int height)
    {
        for (int i = 0; i < gameGridCountX; i++) {
            gameBoard[i] = 1;
        }
        canvasWidth = width;
        canvasHeight = height;
        SDL_CreateWindowAndRenderer(width, height, 0, &window, nullptr);

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
        emscripten_set_main_loop(draw, 60, 1);
    }


    // int main()
    // {
    //     int *board = new int[2400];
    //     for (int i = 0; i < 50; i++)
    //     {

    //         int *nextGeneration = new int[2400];
    //         calculateNextGeneration(board, nextGeneration, 40, 60);
    //         board = nextGeneration;
    //     }

    //     return 0;
    // }
}
