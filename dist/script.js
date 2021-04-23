// Question Reference: discourse.threejs.org/t/refracting-glass-sphere-how-to-add-some-reflection/20326
// Reflection and refraction textures from pexels.com

let camera, scene, renderer, controls, mesh, sun, orbiter, composer;

const palette = [
  new THREE.Color(0x000000),
  new THREE.Color(0xFFFFFF),
  new THREE.Color(0xBADBDC),
  new THREE.Color(0xe209ac),
  new THREE.Color(0x8b4ed5),
  new THREE.Color(0xbad0dc),
  new THREE.Color(0x60DBFB),
  new THREE.Color(0xc800ff),
]

function constrainedPaletteShader(palette) {
  return new THREE.ShaderMaterial({
    uniforms: {
      /* EffectComposer compatibility, the input image */
      "tDiffuse": { value: null },
      /*
       * The palette, an array of THREE.Color. you can change the palette
       * uniform at runtime only if the size remains the same, as the size
       * gets compiled into the shader. it is usually easiest to just call
       * constrainedPaletteShader again and get a new shader if you're changing
       * the palette
       */
      "palette":   { value: palette },
      /* The threshold under which to perform a dither */
      "threshold": {value:0.03}
    },
    /* standard vert shader */
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
        "vUv = uv;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
      "}"
    ].join( "\n" ),
    fragmentShader: [
      "uniform vec3 palette[" + palette.length + "];",
      "uniform sampler2D tDiffuse;",
      "uniform float threshold;",
      "varying vec2 vUv;",
      "void main() {",
        /* the input pixel */
        "vec3 color = texture2D( tDiffuse, vUv ).rgb;",
        "float total = gl_FragCoord.x + gl_FragCoord.y;",
        "bool isEven = mod(total,2.0)==0.0;",
        "float closestDistance = 1.0;",
        "vec3 closestColor = palette[0];",
        "int firstIndex = 0;",
        "int secondIndex = 0;",
        "float secondClosestDistance = 1.0;",
        "vec3 secondClosestColor = palette[1];",
        /*
         * loop through the palette colors and compute the two closest colors
         * to the input pixel color
         */
        "for(int i=0;i<" + palette.length +"; i++) {",
          "float d = distance(color, palette[i]);",
          "if(d <= closestDistance) {",
            "secondIndex = firstIndex;",
            "secondClosestDistance = closestDistance;",
            "secondClosestColor = closestColor;",
            "firstIndex = i;",
            "closestDistance = d;",
            "closestColor = palette[i];",
          "} else if (d <= secondClosestDistance) {",
            "secondIndex = i;",
            "secondClosestDistance = d;",
            "secondClosestColor = palette[i];",
          "}",
        "}",
        /* 
         * if the two closest colors are within the threshold of each other
         * preform a dither
         */
        "if(distance(closestDistance, secondClosestDistance) < threshold) {",
            "vec3 a = firstIndex < secondIndex ? closestColor : secondClosestColor;",
            "vec3 b = firstIndex < secondIndex ? secondClosestColor : closestColor;",
           "gl_FragColor = vec4(isEven ? a : b, 1.0);",
        /* otherwise use the closest color */
        "} else {",
          "gl_FragColor = vec4(closestColor, 1);",
        "}",
      "}"
    ].join( "\n" )
  });
}


const textures = {
  refraction: 'https://i.imgur.com/pDDpypM.png',
  reflection: 'https://i.imgur.com/pDDpypM.png'
};

const createEnvMap = (type = 'reflection', onReady = () => {}) => {
  return new THREE.TextureLoader().load(textures[type], (texture) => {
    if (type === 'reflection') {
      texture.mapping = THREE.EquirectangularReflectionMapping;
    } else {
      texture.mapping = THREE.EquirectangularRefractionMapping;
    }

    texture.encoding = THREE.sRGBEncoding;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.NearestFilter;
    
    onReady(texture);
  });
}

const createWorld = () => {
  mesh = new THREE.Group();

  // Add refraction (inner sphere)
  
  // Add reflection (half-transparent outer sphere)
  
  mesh.add(new THREE.Mesh(
    new THREE.SphereBufferGeometry(2 - Number.MIN_VALUE, 64, 64),
    new THREE.MeshStandardMaterial( { color: 0x000000, roughness: 7, metalness: 0.8 } )
  ));
  mesh.add(new THREE.Mesh(
    new THREE.SphereBufferGeometry(2, 64, 64),
    new THREE.MeshStandardMaterial({
      envMap: createEnvMap('refraction'),
       metalness: 1.0,
      roughness: 0.8,
      transmission: 0.9,
      transparent: true,
      ior: 2.5,
      //blending: THREE.MultiplyBlending,
    })
  ));
  mesh.add(new THREE.Mesh(
    new THREE.SphereBufferGeometry(2 + Number.MIN_VALUE, 64, 64),
    new THREE.MeshPhysicalMaterial({
      envMap: createEnvMap('reflection'),
      envMapIntensity: 2.0,
      roughness: 0.3,
      transmission: .9,
      transparent: true,
      clearCoat: 0.5,
      ior: 2.5,
      reflectivity: 0.2,
    })
  ));
  
  let outlineMesh = new THREE.Mesh(
    new THREE.SphereBufferGeometry(2 + Number.MIN_VALUE, 64, 64),
    new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.BackSide } )
  );
	outlineMesh.scale.multiplyScalar(1.1);
  mesh.add(outlineMesh);
  
  scene.add(mesh);
  
  
  
  
  // new THREE.MeshStandardMaterial( { color: 0xffffff, roughness: 0, metalness: 0 } );


  camera.lookAt(mesh.position);
};

const init = () => {
  camera = new THREE.PerspectiveCamera(60, 400 / 400, 0.1, 1000.0);
  camera.position.set(-2, 1, 7);

  scene = new THREE.Scene();
  //scene.background = createEnvMap('reflection');
  scene.environment = createEnvMap('reflection');

  scene.add(new THREE.HemisphereLight(0xffffcc, 0x19bbdc, 1));

  sun = new THREE.PointLight(0xffff99, .5, 0, 2);
  sun.position.set(10, 6, -10);
  scene.add(sun);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.domElement.id = 'canvas';
  renderer.setSize(128, 128);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor( 0xffffff );
  
  
  //renderer.domElement.style.imageRendering = "pixelated"
  renderer.domElement.style.width = (1024) + 'px';
  renderer.domElement.style.height = (1024) + 'px';

  
  composer = new THREE.EffectComposer(renderer);
  let renderPass = new THREE.RenderPass(scene, camera);
  let shaderPass = new THREE.ShaderPass(constrainedPaletteShader(palette));

  composer.addPass(renderPass);
  composer.addPass(shaderPass);

  document.body.appendChild(renderer.domElement);
  
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.autoRotate = true;
  
  createWorld();
}

const animate = () => { 
  requestAnimationFrame(animate);
  
  controls.update();

  composer.render(); 
}

init();
animate();