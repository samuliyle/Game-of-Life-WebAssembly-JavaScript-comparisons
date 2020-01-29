const vsSource = `
    attribute vec2 aVertexPosition;
    uniform vec2 u_resolution;

    void main() {
        // convert the position from pixels to 0.0 to 1.0
        vec2 zeroToOne = aVertexPosition / u_resolution;
    
        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;
    
        // convert from 0->2 to -1->+1 (clip space)
        vec2 clipSpace = zeroToTwo - 1.0;
    
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
  `;

const fsSource = `
  void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

export default { vsSource, fsSource };
