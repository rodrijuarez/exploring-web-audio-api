// this is the main file that pulls in all other modules
// you can require() bower components too!
const $ = require('jquery'),
  THREE = require('three'),
  OrbitControls = require('three-orbit-controls')(THREE);

class Window {
  static get width() {
    return window.innerWidth;
  }

  static get height() {
    return window.innerHeight;
  }

  static get dimensions() {
    return { width: Window.width, height: Window.height };
  }

  static onResize(callback) {
    window.addEventListener('resize', callback);
  }

  static onDragOver(callback) {
    window.addEventListener('dragover', callback);
  }
}

class AudioVisualizer {
  //constants
  numberOfBars;

  //Rendering
  scene;
  camera;
  renderer;
  controls;

  //bars
  bars;

  //audio
  javascriptNode;
  audioContext;
  sourceBuffer;

  constructor(numberOfBars = 60) {
    this.numberOfBars = numberOfBars;
    this.bars = new Array();

    // Generate a ThreeJS Scene
    this.scene = new THREE.Scene();

    // Get the width and height
    const { width, height } = Window.dimensions;

    // Get the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);

    // Append the rederer to the body
    document.body.appendChild(this.renderer.domElement);

    // Create and add camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 20000);
    this.camera.position.set(0, 45, 0);
    this.scene.add(this.camera);

    // Update renderer size, aspect ratio and projection matrix on resize
    Window.onResize(this.updateSize.bind(this));

    // Background color of the scene
    this.renderer.setClearColor(0x333f47, 1);

    // Create a light and add it to the scene
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100, 200, 100);
    this.scene.add(light);

    // Add interation capability to the scene
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.createBars();
    this.handleDrop();
    this.setupAudioProcessing();
  }

  updateSize() {
    const { height, width } = Window.dimensions;

    this.renderer.setSize(width, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  createBars() {
    //iterate and create bars
    console.log('hello');
    this.bars = [];

    for (let index = 0; index < this.numberOfBars; index++) {
      //create a bar
      const barGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

      //create a material
      const material = new THREE.MeshPhongMaterial({ color: this.getRandomColor(), ambient: 0x808080, specular: 0xffffff });

      //create the geometry and set the initial position
      const bar = new THREE.Mesh(barGeometry, material);
      bar.position.set(index - this.numberOfBars / 2, 0, 0);

      //add the created bar to the scene
      this.scene.add(bar);

      this.bars.push(bar);
    }
  }

  handleDrop() {
    document.body.addEventListener(
      'drop',
      function(e) {
        console.log('here');
        e.stopPropagation();

        e.preventDefault();

        //get the file
        var file = e.dataTransfer.files[0];
        var fileName = file.name;

        $('#guide').text('Playing ' + fileName);

        var fileReader = new FileReader();

        fileReader.onload = function(e) {
          var fileResult = e.target.result;
          visualizer.start(fileResult); //We didn't implement start() yet!
        };

        fileReader.onerror = function(e) {
          debugger;
        };

        fileReader.readAsArrayBuffer(file);
      },
      false
    );
  }

  setupAudioProcessing() {
    //get the audio context
    this.audioContext = new AudioContext();

    //create the javascript node
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //create the source buffer
    this.sourceBuffer = this.audioContext.createBufferSource();

    //create the analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 512;

    //connect source to analyser
    this.sourceBuffer.connect(this.analyser);

    //analyser to speakers
    this.analyser.connect(this.javascriptNode);

    //connect source to analyser
    this.sourceBuffer.connect(this.audioContext.destination);

    var that = this;

    //this is where we animates the bars
    this.javascriptNode.onaudioprocess = function() {
      // get the average for the first channel
      var array = new Uint8Array(that.analyser.frequencyBinCount);
      that.analyser.getByteFrequencyData(array);

      //render the scene and update controls
      visualizer.renderer.render(visualizer.scene, visualizer.camera);

      var step = Math.round(array.length / visualizer.numberOfBars);

      //Iterate through the bars and scale the z axis
      for (var i = 0; i < visualizer.numberOfBars; i++) {
        var value = array[i * step] / 4;
        value = value < 1 ? 1 : value;
        visualizer.bars[i].scale.z = value;
      }
      visualizer.controls.update();
    };
  }

  //start the audio processing
  start(buffer) {
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    var that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
      that.sourceBuffer.buffer = decodedBuffer;
      that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
      debugger;
    }
  }

  //util method to get random colors to make stuff interesting
  getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}

const visualizer = new AudioVisualizer();

Window.onDragOver(event => event.preventDefault());
