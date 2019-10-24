# JavaScript WebAssembly split

em++ life.cpp -O2 -s ENVIRONMENT="web" -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -o ../life.js

npm run startJSWasm