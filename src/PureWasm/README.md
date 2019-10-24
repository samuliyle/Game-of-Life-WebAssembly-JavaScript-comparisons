# Pure WebAssembly

em++ life.cpp -std=c++11 -s TOTAL_MEMORY=512MB -s WASM=1 -s USE_SDL=2 -O3 -o index.js

python -m SimpleHTTPServer 8080

