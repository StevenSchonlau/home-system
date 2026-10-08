# Readme

## Versions: (what I installed)
- docker desktop 4.94.0 (latest download from website)
- node.js 24.21.0 (latest download from website) - this will install npm  11.19.0
	- npm install -g @angular/cli - for me this installed 22.2.2

## To run locally:

TODO

## To run on a Pi:

Connect via ssh to the pi

Run these commands:
- sudo apt update && sudo apt upgrade -y
- curl -sSL https://get.docker.com | sh
- sudo usermod -aG docker $USER
- newgrp docker
- docker run hello-world
- git clone https://github.com/StevenSchonlau/home-system.git
- cd home-system
- docker build -t angular-pi5-app:latest .
- docker run -d -p 8080:80 --name home-system-app angular-pi5-app:latest

Go to \<local ip of the pi\>:8080

To see docker containers running on the pi: docker ps

To stop the container: docker stop home-system-app

Any time you make a change, pull the repo on the pi and run the last 2 docker commands: 
- docker build -t angular-pi5-app:latest .
- docker run -d -p 8080:80 --name home-system-app angular-pi5-app:latest

<br>
<hr>
<br>



# Boilerplate Angular README:




# HomeSystem

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
