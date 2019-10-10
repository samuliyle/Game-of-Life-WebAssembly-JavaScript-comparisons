#include <emscripten.h>

#include <functional>

#include <SDL.h>

#define GL_GLEXT_PROTOTYPES 1
#include <SDL_opengles2.h>

// Shader sources
const GLchar *vertexSource =
    "attribute vec4 position;                     \n"
    "void main()                                  \n"
    "{                                            \n"
    "  gl_Position = vec4(position.xyz, 1.0);     \n"
    "}                                            \n";
const GLchar *fragmentSource =
    "precision mediump float;\n"
    "void main()                                  \n"
    "{                                            \n"
    "  gl_FragColor[0] = gl_FragCoord.x/640.0;    \n"
    "  gl_FragColor[1] = gl_FragCoord.y/480.0;    \n"
    "  gl_FragColor[2] = 0.5;                     \n"
    "}                                            \n";

SDL_Window *window;
GLfloat vertices[] = {0.0f, 0.5f, 0.5f, -0.5f, -0.5f, -0.5f};

extern "C"
{
    EMSCRIPTEN_KEEPALIVE
    void drawScene()
    {
        // move a vertex
        const uint32_t milliseconds_since_start = SDL_GetTicks();
        const uint32_t milliseconds_per_loop = 3000;
        vertices[0] = (milliseconds_since_start % milliseconds_per_loop) / float(milliseconds_per_loop) - 0.5f;
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

        // Clear the screen
        glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        // Draw a triangle from the 3 vertices
        glDrawArrays(GL_TRIANGLES, 0, 3);

        SDL_GL_SwapWindow(window);
    }

    EMSCRIPTEN_KEEPALIVE
    void initOpenGL(int width, int height)
    {
        SDL_CreateWindowAndRenderer(width, height, 0, &window, nullptr);

        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 2);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);

        // Create a Vertex Buffer Object and copy the vertex data to it
        GLuint vbo;
        glGenBuffers(1, &vbo);

        glBindBuffer(GL_ARRAY_BUFFER, vbo);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

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
        GLint posAttrib = glGetAttribLocation(shaderProgram, "position");
        glEnableVertexAttribArray(posAttrib);
        glVertexAttribPointer(posAttrib, 2, GL_FLOAT, GL_FALSE, 0, 0);
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
    void addOne(int *input_ptr, int *output_ptr, int len)
    {
        int i;
        for (i = 0; i < len; i++)
            output_ptr[i] = input_ptr[i] + 1;
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
