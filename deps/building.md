# Building With Emscripten

1. install emscripten: `sudo apt-get install emscripten`
2. configure: `./emconfigure ./configure`.
3. make: `emmake make`.
4. build: `emcc -O3 binding.c .libs/libonig.a -o binding.js`
