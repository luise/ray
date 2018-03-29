# Distributed Ray with Kelda

This repository contains a blueprint for running distributed, containerized [Ray](https://github.com/ray-project/ray) -
a flexible, high-performance distributed execution framework.

## Prerequisites:
* Make sure you've [installed Kelda and set up cloud provider credentials](http://docs.kelda.io/#installing-kelda).

## Getting Started
1. Start Ray by running `kelda run ./rayExample.js`.
2. SSH into one of the nodes in the cluster, e.g.:
    ```console
    $ kelda ssh worker
    ```
3. Verify that the correct number of nodes have joined the cluster, by starting
up Python and running the following snippet. You should see an IP address for each
Ray container in the cluster.

    ```python
    import ray
    ray.init(redis_address="head:6379")
    import time

    @ray.remote
    def f():
        time.sleep(0.01)
        return ray.services.get_node_ip_address()

    set(ray.get([f.remote() for _ in range(1000)]))
    ```

4. Stop the cluster with `kelda stop`.

### Running Examples
A version of the [Ray examples image](https://ray.readthedocs.io/en/latest/install-on-docker.html#build-docker-images)
is pushed as `luise/ray-examples`. To deploy the example image:
1. Call `rayCluster.setImage('luise/ray-examples')` in the `rayExample.js` blueprint.
2. Call `rayCluster.allowExampleDownloads()` in `rayExample.js` to ensure that the Ray
cluster can download the sample data for the examples.
3. SSH into a container with `kelda ssh worker` for instance, and run one of the [examples](https://ray.readthedocs.io/en/latest/install-on-docker.html#hyperparameter-optimization)
listed in the Ray docs (but skip the first part about booting the container).

    Make sure to run the job on the entire cluster by adding the
  `--redis-address=head:6379` flag (e.g. `python /ray/examples/rl_pong/driver.py
  --redis-address=head:6379`). If this flag isn't supplied, the job will just run
  on `localhost` and not take advantage of the other nodes in the cluster.

2. To run your own workload, create [a customized Dockerfile](http://ray.readthedocs.io/en/master/using-ray-and-docker-on-a-cluster.html#creating-a-customized-dockerfile)
and call the `rayCluster.setImage(<image>)` function in `rayExample.js` to use
this image in your cluster.

## Images
Since Ray doesn't publish Docker images, the images used in this blueprint are
just built from the Ray source (as described [here](https://ray.readthedocs.io/en/latest/install-on-docker.html#build-docker-images))
and pushed to Luise's public DockerHub registry.
There is no guarantee that the images will have the latest version of Ray (in fact,
they most likely won't), but you can always [build your own image](https://ray.readthedocs.io/en/latest/install-on-docker.html#build-docker-images)
from the Ray source, push it your public Docker image registry, and change the
image used in `rayExample.js` using the `setImage` method.

## Notes
* The head node runs an extra Redis shard on a random port. Right now it
isn't possible to configure the random ports, and they don't fall within a certain
range, so we need to allow traffic on all possible ports.
* Robert's example of [Ray on Kubernetes](https://github.com/robertnishihara/ray-kubernetes/tree/instructions) (might be out of date).
