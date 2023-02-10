# Docker Notes

## This analogy works :

A **DockerFile** is a source code.  
A **Image** is the binary that we compile from the source.  
A **Container** is the process that we spin up by executing the binary executable.

Technically :

A **Dockerfile** is a set of instructions to build a Docker image.  
An **Image** is a snapshot of the application and its dependencies, built from the Dockerfile, it provides the isolated custom filesystem.  
A **Container** is a running instance of the Image, running as a separate process from all other processes of the host machine.

## A word on Dockerfile :

<pre>
1 FROM node:15  
2 WORKDIR /app  
3 COPY package.json .  
4 RUN npm install  
5 COPY . ./  
6 ENV PORT 3000  
7 EXPOSE $PORT  
8 CMD ["npm", "run", "dev"]
</pre>

In our Dockerfile, we copy the `package.json` in a early step (3), then we run npm install and copy all the content from our development folder to the WORKDIR (5), only to copy the `package.json` again.
<br/><br/>
_Why did we do this ? Why not copy all the content before `npm install` is run in step 3 ?_
<br/> <br/>
The answer is caching, the build process is done in such a way that can be visualized as layers in a pyramid. If a layer is changed, all the layer on top of it has to be re-done, and the layers below remains as it was. When building the image from the Dockerfile, with each layer is processed, the result is cached. But when a layer is modified, all the layer that is built on top of it has to be processed again. If no modification is made, the cached result for that layer is used to ensure a faster buildtime.

The base image and work directory are not changed very often. `package.json` is modified whenever a new package is added, which then requires the `npm install` to install the dependency during the build as well. But the most change happens on our code. So, if we copy all the content on step 3 using `COPY . ./` , with every change our code, `npm install` will run again, which isn't necessary if the `package.json` hasn't changed.

## Making Container accessible to the internet :

A container is not accessible outside its network by default. For it to be accessible, we need to _publish_ it. Publishing a container can be done in two ways :

- With docker run : `docker run -p localPort:dockerPort --name <container_name> <image_name>`
- With docker compose :
<pre>
  services:
    service_name:
      ports:
        -"localPort:dockerPort"  
</pre>

## Docker bind mount :

In a bind mount, a file or directory is mounted into a container. Any changes made on the local file outside the container will be reflected inside docker container and vice versa.

Running container with a bind mount :  
`docker run -d -v pathToLocalFolder:pathToContainerFolder:ro -p localPort:dockerPort --name <container_name> <image_name>`

**Must use absolute path in paths**  
**Path to local shortcut : $(pwd)**

Limiting bind mount from overwriting specific folders :
`-v /app/node_modules` _append this in the above command_

## Passing Environment Variables :

In our dockerignore file, we exclude the environment file from pushing to our image due to multiple reasons such as security - we are probably gonna push this image to a registry.  
We can include our environment variables in our `Dockerfile` in this syntax : `ENV NAME VALUE`  
Or, with the build command `--env NAME=VAL`  
Or, load your environment file `--env-file /path/to/.env`

## Enter Docker Compose :

With all the options, our `docker run` command is getting pretty built up, again this is only for one container, in a more complex application we would have multiple containers, and starting them all with multiple options can be a hassle. Docker Compose solves this problem.

Our previous build and run commands with all the options :  
`docker build -t <image-name> /path/to/dockerfile`  
`docker run -d -v (pwd):/app:ro -v /app/node_modules --env NAME=VAL -p localPort:dockerPort --name <container_name> <image_name>`

Now we create a `docker-compose.yml` :

<pre>
  version: 'version_number'
  services:
    service_name:
      build: /path/to/Dockerfile
      ports: 
        - localPort:dockerPort
      volumes:
        -  pathToLocalFolder:pathToContainerFolder:ro
        -  /app/node_modules
      environment:
        - PORT=3000
</pre>

Now the docker compose file has all the necessary options for building the image and running the container.

To start the container : `docker compose up -d`

_For the first time, we see the image is build from scratch and the container is spin up, but if we make any fundamental change with the image and run the command again, a new build is not longer made and the container is run as long as the image is there._

To force a new build : `docker compose up -d --build`

Also, to take down the container : `docker compose down -v`

## Development and Production Environments :

You can have multiple Dockerfile for development and production environment. In our case the difference is we need to run `npm run dev` in development and `node index.js` in development in the last line of Dockerfile. We can solve this by having multiple docker-compose files.

We create multiple docker compose :

- docker-compose.yml : for the shared configurations
- docker-compose.dev.yml : for the dev configurations
- docker-compose.prod.yml : for production comfigurations

Then we run multiple compose files in the following syntax and they will merge and cascade the configs in the order they are written :  
For dev : `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d [--build]`  
For prod : `docker compose -f docker-compose.yml -f docker.compose.prod.yml up --build`

We will also have to modify the Dockerfile to be smart enough to run `npm install --only=production` during production build, not to install any dev dependencies in the production build.

We modify the RUN command to reference our argument from docker-compose :

In `docker-compose.dev.yml` :

<pre>
service_name:
  build:
    context:.
    args:
      NODE_ENV: developement
</pre>

In `docker-compose.prod.yml` :

<pre>
service_name:
  build:
    context:.
    args:
      NODE_ENV: production
</pre>

In Dockerfile :

<pre>
ARG NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; \
          then npm install; \
          else npm install --only=production; \
          fi
</pre>

## Persisting data :

When we use services like mongodb, every time we re-run the container, the data stored is lost. For persisting our databases, we use **named volume**.

**Volume** provide a way to connect a specific filesystem paths of the container to the host machine. Docker fully manages the volume, including where it is stored on the disk, we just name it.

To use a volume mount :  
 In `docker-compose.yml`

 <pre>
    services:
      mongo:
        volumes: mongo-db:/data/db
 </pre>

_We shouldnt use the `-v` flag with docker compose down as it removes the named volumes as well, we can use `docker prune` separately to delete unused volumes_

\* A named volume can be used by multiple containers, so in `docker-compose.yml` we write in the bottom:

<pre>
  volumes:
    mongo-db:
</pre>

## Docker Network :

As we use multiple containers in a project like a mongo database container with mongoose, we see the need to use ip address to connect to the db container from our node one. While we can find out the ip of a container by doing:  
`docker inspect <container_name> | grep 'IPAddress'`

While there's also the possibility of ip address changing, finding the ip address is a hassle when Docker provides a more intuitive way to solve this.

_Enter Docker Networks._

Docker provides us with DNS resolution out of the box.

A mongoose connect command :

<pre>
mongoose.connect('mongodb://username:password@host_ip:port/database?options...');
</pre>

If we want to connect to a mongo container, we can always do `docker inspect <service_name> | grep 'IPAddress'`, and placing the ip address, but as docker supports DNS resolution, we can **replace the ip address with the service name** :

<pre>
mongoose.connect('mongodb://username:password@service_name:port/database?options...');
</pre>

To inspect a network :

<pre>
docker network ls // Get the network name
docker network inspect network_name
</pre>

We can see all the available commands using :

<pre>docker network --help</pre>

## Container Bootup Order :

Suppose we have a mongo container on which our node container depends on. If you node container starts first, It may try to make a connection while our mongo container is not up yet. We can use the following under node services in `docker-compose.yml` to solve the issue :

<pre>
  services:
    node:
      ...
      depends_on:mongo
    mongo:
      ...
</pre>

It ensures that mongo will start up before our node container. But it still doesn't solve the problem that- while our mongo container might spin up first, the mongo service may still not be running and accepting connections. We need to implement a handling method for this scenario as well.

## Useful Commands :

- Build a image : `docker build -t <image_name> /path/to/dockerfile`
- List all images : `docker image ls`
- Remove a image : `docker image rm <image_id>`
- Run a named container from a image : `docker run -d -p localPort:dockerPort --name <container_name> <image_name>`
- List running containers : `docker ps` or `docker container ls`
- Getting detailed data on a container : `docker inspect <container_name>`
- Shutting down a running container (and delete volume): `docker rm <container_name> -fv`
- Opening bash terminal on container : `docker exec -it <container_name> bash`
