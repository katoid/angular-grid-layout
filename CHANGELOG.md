# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0](https://github.com/katoid/angular-grid-layout/compare/v0.1.3...v0.2.0) (2021-06-28)


### Features

* **grid:** grid scrollSpeed Input can be binded without the need of a variable ([8d74468](https://github.com/katoid/angular-grid-layout/commit/8d74468306d8047fde1ea04ea5e32515e066ae42))
* **grid:** number and Boolean input properties can be binded as string value in template ([1f436f6](https://github.com/katoid/angular-grid-layout/commit/1f436f691bea4412518c504f9cd0e89a979c1323))
* **grid:** added prevent collision flag ([62651ad](https://github.com/katoid/angular-grid-layout/commit/62651ad5aca65a5785c7af942b55921f8baa4c59)) ([1253849](https://github.com/katoid/angular-grid-layout/commit/1253849688a509188539a7fe9515daad78f9777e))


### [0.1.3](https://github.com/katoid/angular-grid-layout/compare/v0.1.2...v0.1.3) (2021-03-08)


### Features

* **grid:** added Input property 'scrollSpeed' to customize the speed of the autoscrolling ([9908940](https://github.com/katoid/angular-grid-layout/commit/99089405fc1f9527f151ca4bd2d0b0910a09fe61))


### Bug Fixes

* **grid:** fixed incorrect logic when re-calculating the layout render data when props change ([c0c943f](https://github.com/katoid/angular-grid-layout/commit/c0c943f26607149185d79f099b02fe0b2a06d041))

### [0.1.2](https://github.com/katoid/angular-grid-layout/compare/v0.1.1...v0.1.2) (2021-02-08)


### Bug Fixes

* **grid:** set grid height while performing a drag operation ([d9427a5](https://github.com/katoid/angular-grid-layout/commit/d9427a50ee081e12cde10769d5ef555874807d7a))

## [0.1.0](https://github.com/katoid/angular-grid-layout/releases/tag/v0.1.0) (2021-02-05)


### Features
* Added Auto Scroll vertical/horizontal if container is scrollable when dragging a grid item ([b9798d6](https://github.com/katoid/angular-grid-layout/commit/b9798d6f01227170f82b00642ce3045b3e629d7d))

### Bug Fixes

* Fixed DragStarted event emitter to always emit inside the zone ([51d7d76](https://github.com/katoid/angular-grid-layout/commit/51d7d764b9dbff8bdb55ad87e4536c4eff805381)), closes [#3](https://github.com/katoid/angular-grid-layout/issues/3)
