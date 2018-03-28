const kelda = require('kelda');
const ray = require('./ray');

const numberOfRayWorkers = 3;

const machine = new kelda.Machine({ provider: 'Amazon', size: 'm4.large' });
const infrastructure = new kelda.Infrastructure({
  masters: machine,
  workers: machine.replicate(numberOfRayWorkers + 1),
});

const rayCluster = new ray.Ray(numberOfRayWorkers);

// Uncomment the below two lines to run the Ray examples Docker image.
// rayCluster.setImage('luise/ray-examples');
// rayCluster.allowExampleDownloads();

rayCluster.deploy(infrastructure);
