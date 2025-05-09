# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.0.2](https://github.com/katoid/angular-grid-layout/compare/v3.0.1...v3.0.2) (2025-04-28)


### Features

* **grid:** use Angular injected document to allow Server Side Rendering ([a4fdee8](https://github.com/katoid/angular-grid-layout/commit/a4fdee84e189d73435bb55486b7dd1de36072f93)), closes [#124](https://github.com/katoid/angular-grid-layout/issues/124)


### Bug Fixes

* **grid:** correctly calculate x coordinate when dragging in a one colum grid ([26626fb](https://github.com/katoid/angular-grid-layout/commit/26626fb52765aefcc776febb65a802f554f8716e)), closes [#128](https://github.com/katoid/angular-grid-layout/issues/128)

### [3.0.1](https://github.com/katoid/angular-grid-layout/compare/v3.0.0...v3.0.1) (2025-04-25)


### Bug Fixes

* **grid-item:** touch-action should be set to auto when grid item isn't draggable ([#131](https://github.com/katoid/angular-grid-layout/issues/131)) ([3e4d6b0](https://github.com/katoid/angular-grid-layout/commit/3e4d6b056d16cf1af5fa8f177ea82cfeb8304c62))

## [3.0.0](https://github.com/katoid/angular-grid-layout/compare/v2.2.0...v3.0.0) (2024-08-19)


### Features

* **demo-app:** added a drag handle in the real-life-example table ([850f5df](https://github.com/katoid/angular-grid-layout/commit/850f5df7dd519a0c5e99dc0e11150297a62af616))
* update to angular v15 ([#117](https://github.com/katoid/angular-grid-layout/issues/117)) ([e7c0ae1](https://github.com/katoid/angular-grid-layout/commit/e7c0ae14b81e439c04f4e586c91160cd4dfcbc62))
* update to angular v16 ([#118](https://github.com/katoid/angular-grid-layout/issues/118)) ([bce1287](https://github.com/katoid/angular-grid-layout/commit/bce128794c3853e3f88e2bcf7b0acf117e321287))
* added support for hybrid devices (touch and mouse) ([a1a40a5](https://github.com/katoid/angular-grid-layout/commit/a1a40a5150691aa9ddff5d7422217e57ba2d16a0))

### Bug Fixes

* **grid-component:** improve end of drag events of the grid elements, animate over other elements ([251c1bb](https://github.com/katoid/angular-grid-layout/commit/251c1bbebb96f3482e4eba6ca2eeeebe3c8ca5fb))
* **grid:** fix edge case crash in ngOnDestroy when subscriptions array is undefined ([f74824f](https://github.com/katoid/angular-grid-layout/commit/f74824fdf5672cfca413cdcadf5b16244da4cd8f)), closes [#79](https://github.com/katoid/angular-grid-layout/issues/79)
* prevent browser drag event in custom handles example ([7f6426e](https://github.com/katoid/angular-grid-layout/commit/7f6426e3dfd48d8115771f0ab1876ac26a71f04d))

## [2.2.0](https://github.com/katoid/angular-grid-layout/compare/v2.1.0...v2.2.0) (2023-07-03)


### Features

* add manual drag event handler ([#87](https://github.com/katoid/angular-grid-layout/issues/87)) ([a1c0e96](https://github.com/katoid/angular-grid-layout/commit/a1c0e96151638a1621244d979763fdfe9c8c9c11))
* **grid:** added grid background ([fe9c71f](https://github.com/katoid/angular-grid-layout/commit/fe9c71ffa7a70511ca3605568b14c6c371d060e1))

## [2.1.0](https://github.com/katoid/angular-grid-layout/compare/v1.2.0...v2.1.0) (2023-01-04)

### Features

* added support for rowHeight = 'fit', also added Input() height ([fe7d0e7](https://github.com/katoid/angular-grid-layout/commit/fe7d0e7af9e5ede885a34a9c4700df23012cd1a9)), closes [#1](https://github.com/katoid/angular-grid-layout/issues/1) [#51](https://github.com/katoid/angular-grid-layout/issues/51) [#58](https://github.com/katoid/angular-grid-layout/issues/58)
* **custom-drag-placeholders:** added custom drag placeholders ([ce78265](https://github.com/katoid/angular-grid-layout/commit/ce7826522f67333359afcac4f10cb3cd4b76f7b0))
* **gap:** added gap functionality to grid component ([a8b129d](https://github.com/katoid/angular-grid-layout/commit/a8b129d76cb7bf12a63ff92beee5d5bbb28046b3))
* update angular to 14 ([065889e](https://github.com/katoid/angular-grid-layout/commit/065889e0d1d27494be9555095d023f860450e690))


### Bug Fixes

* **compact-horizontal:** fixed compact horizontal bug that was compacting also vertically ([806a2f8](https://github.com/katoid/angular-grid-layout/commit/806a2f8f5d09ce00668165f1c32155a435deadc5))
* **demo-app:** fixed Row height fit example not saving the updated layout ([bb3886b](https://github.com/katoid/angular-grid-layout/commit/bb3886b02788585d13062e0575134585bb367d1d))
* **grid:** fixed compact horizontal method not moving items to the left sometimes ([5420a6f](https://github.com/katoid/angular-grid-layout/commit/5420a6f6c2b4e2fc26b975803acd285a7ee9b471)), closes [#21](https://github.com/katoid/angular-grid-layout/issues/21)

## [2.0.0](https://github.com/katoid/angular-grid-layout/compare/v1.2.0...v2.0.0) (2022-09-22)


### Features

* **custom-placeholder:** added custom placeholder ([ce78265](https://github.com/katoid/angular-grid-layout/commit/ce7826522f67333359afcac4f10cb3cd4b76f7b0))
* **gap:** added gap functionality to grid component ([a8b129d](https://github.com/katoid/angular-grid-layout/commit/a8b129d76cb7bf12a63ff92beee5d5bbb28046b3))
* **Angular v14:** Update Angular to version 14 ([065889e](https://github.com/katoid/angular-grid-layout/commit/065889e0d1d27494be9555095d023f860450e690))

## [1.2.0](https://github.com/katoid/angular-grid-layout/compare/v1.1.0...v1.2.0) (2022-02-07)


### Features

* **grid-item:** grid item accepts minW, minH maxW and maxH as @Input properties ([273d62c](https://github.com/katoid/angular-grid-layout/commit/273d62c4a08579908791bcd41160433662bf99ce))

## [1.1.0](https://github.com/katoid/angular-grid-layout/compare/v0.2.0...v1.1.0) (2022-02-04)

### Chore

* Upgraded from Angular v11 to Angular v12 ([57b7591](https://github.com/katoid/angular-grid-layout/commit/57b7591f52e0aeb0b2283230a3ab76ff30c91a54))


### Features

* added Grid support for min and max sizes on grid items ([06051f6](https://github.com/katoid/angular-grid-layout/commit/06051f67b904b37c068c906998100961a104c18d))
* **demo-app:** added github link & enhanced meta tags data with description and image ([a51cc26](https://github.com/katoid/angular-grid-layout/commit/a51cc26c22c4864778d24b70a2e1508604386ecc))
* **grid:** grid scrollSpeed Input can be binded without the need of a variable ([8d74468](https://github.com/katoid/angular-grid-layout/commit/8d74468306d8047fde1ea04ea5e32515e066ae42))
* **grid:** number and Boolean input properties can be binded as string value in template ([1f436f6](https://github.com/katoid/angular-grid-layout/commit/1f436f691bea4412518c504f9cd0e89a979c1323))

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
