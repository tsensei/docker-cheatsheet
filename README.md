# Docker Notes

## This analogy works :

A **DockerFile** is a source code.  
A **Image** is the binary that we compile from the source.  
A **Container** is the process that we spin up by executing the binary executable.

Technically :

A **Dockerfile** is a set of instructions to build a Docker image.  
An **Image** is a snapshot of the application and its dependencies, built from the Dockerfile.  
A **Container** is an instance of the Image, running as a separate process.

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
    container_name:
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

## Useful Commands :

- Build a image : `docker build -t <image_name> /path/to/dockerfile`
- List all images : `docker image ls`
- Remove a image : `docker image rm <image_id>`
- Run a named container from a image : `docker run -d -p localPort:dockerPort --name <container_name> <image_name>`
- List running containers : `docker ps` or `docker container ls`
- Shutting down a running container (and delete volume): `docker rm <container_name> -fv`
- Opening bash terminal on container : `docker exec -it <container_name> bash`
