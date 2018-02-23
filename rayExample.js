const kelda = require('kelda');
const ray = require('./ray');

// Uncomment the below line to run the Ray examples Docker image.
// ray.setImage('luise/ray-examples');

const numberOfRayWorkers = 3;

const machine = new kelda.Machine({ provider: 'Amazon', size: 'm4.large' });
const infrastructure = new kelda.Infrastructure({
  masters: machine,
  workers: machine.replicate(numberOfRayWorkers + 1),
});

const rayCluster = new ray.Ray(numberOfRayWorkers);
rayCluster.deploy(infrastructure);
