const kelda = require('kelda');

// Ray requires a large amount of shared memory because each object store
// keeps all of its objects in shared memory, so the amount of shared memory
// will limit the size of the object store. The shared memory size is the same
// as that of the host machine, so to increase the amount of shared memory,
// increase the size of the worker machines.

const image = 'luise/ray-deploy';
const objManagerPort = 8076;
const redisPort = 6379;

class Ray {
  constructor(numberOfWorkers) {
    const shmVolume = new kelda.Volume({
      name: 'shm',
      type: 'hostPath',
      path: '/dev/shm',
    });

    this.head = new kelda.Container({
      name: 'head',
      image,
      command: ['/bin/bash', '-c', `ray start --head --object-manager-port=${objManagerPort} --redis-port=${redisPort} --num-workers=${numberOfWorkers} && while true; do sleep 30; done;`],
      volumeMounts: [
        new kelda.VolumeMount({
          volume: shmVolume,
          mountPath: shmVolume.path,
        }),
      ],
    });

    this.workers = [];
    for (let i = 0; i < numberOfWorkers; i += 1) {
      this.workers.push(new kelda.Container({
        name: 'worker',
        image,
        command: ['/bin/bash', '-c', `ray start --object-manager-port=${objManagerPort} --redis-address=${this.head.getHostname()}:${redisPort} --num-workers=${numberOfWorkers} && while true; do sleep 30; done;`],
        volumeMounts: [
          new kelda.VolumeMount({
            volume: shmVolume,
            mountPath: shmVolume.path,
          }),
        ],
      }));
    }

    // All nodes run an object manager, and they must all be able to communicate
    // with each other.
    kelda.allowTraffic(this.workers, this.head, objManagerPort);
    kelda.allowTraffic(this.workers, this.workers, objManagerPort);
    kelda.allowTraffic(this.head, this.workers, objManagerPort);

    // The head node runs the Redis store, which functions as Ray's centralized
    // control plane.
    kelda.allowTraffic(this.workers, this.head, redisPort);
    kelda.allowTraffic(this.head, this.head, redisPort);

    // TODO: The head runs an extra Redis shard on a random port. Right now it
    // isn't possible to configure the random ports, so we need to allow traffic
    // on all possible ports.
    kelda.allowTraffic(this.workers, this.head, new kelda.PortRange(0, 65535));
    kelda.allowTraffic(this.head, this.head, new kelda.PortRange(0, 65535));
  }

  deploy(infrastructure) {
    this.head.deploy(infrastructure);
    this.workers.forEach(worker => worker.deploy(infrastructure));
  }

  /**
   * Allow all Ray nodes to talk to the public internet on port 443.
   * This is needed for downloading the sample data for the examples contained
   * in the `luise/ray-examples` image.
   */
  allowExampleDownloads() {
    kelda.allowTraffic(this.head, kelda.publicInternet, 443);
    kelda.allowTraffic(this.workers, kelda.publicInternet, 443);
  }

  /**
   * Change the Ray Docker image used to run the cluster. This is meant for users
   * who want to for instance clone a project repository, add extra dependencies,
   * and add a custom run script.
   *
   * @param {string} newImage The Docker image used to run the cluster.
   */
  setImage(newImage) {
    const newKeldaImage = new kelda.Image({ name: newImage });
    this.head.image = newKeldaImage;
    this.workers.forEach((worker) => {
      worker.image = newKeldaImage; // eslint-disable-line no-param-reassign
    });
  }
}

exports.Ray = Ray;
