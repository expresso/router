## [5.0.1](https://github.com/expresso/router/compare/v5.0.0...v5.0.1) (2022-08-18)

# [5.0.0](https://github.com/expresso/router/compare/v4.0.0...v5.0.0) (2022-08-18)

### Features

* type safety for reseponse status and body ([51ef0a0](https://github.com/expresso/router/commit/51ef0a05f557a538d20ea5d970acf6298e01bd2a))


### BREAKING CHANGES

* types will now require that you use the correct `body` for a given `status` when calling `res.json`

# [4.0.0](https://github.com/expresso/router/compare/v3.0.1...v4.0.0) (2022-02-06)


### Features

* add support for transforms ([2a3989a](https://github.com/expresso/router/commit/2a3989afd7e581525b15f8730e5e70cc65c768b0))
* automatic error recovery ([bcb3ea3](https://github.com/expresso/router/commit/bcb3ea3c998d16ce13583da0fac5e26222e8a244))
* cleaner error message ([b780945](https://github.com/expresso/router/commit/b7809458e220410b270766819013ac71435b50de))


### BREAKING CHANGES

* Remove `outputHeaders` from the `createEndpoint` params object. The `output`
property now requires you to specify, for each status code, an object which must have a `body`
property, containing the Zod schema for the body of the response for that status. Optionally, you
can also specify a `headers` property to each status code containing the response headers for that
status code

## [3.0.1](https://github.com/expresso/router/compare/v3.0.0...v3.0.1) (2021-10-26)


### Bug Fixes

* remove endpoint duplication ([5bc8234](https://github.com/expresso/router/commit/5bc82344d21ff06e04723293c0dae06d07932861))

# [3.0.0](https://github.com/expresso/router/compare/v2.0.6...v3.0.0) (2021-10-17)


### Features

* **createapp:** add new documentation types ([0fea68f](https://github.com/expresso/router/commit/0fea68fd1c8115abdff15b4e4421a4a0fd7d62d0))
* add input and output headers for documentation purposes ([55ce4e9](https://github.com/expresso/router/commit/55ce4e9a137c082f35d6f7fa40657b302126b6af))


### BREAKING CHANGES

* **createapp:** Options for documentation have completely changed and `createApp` input object is
not compatible with previous versions

## [2.0.6](https://github.com/expresso/router/compare/v2.0.5...v2.0.6) (2021-09-22)

## [2.0.5](https://github.com/expresso/router/compare/v2.0.4...v2.0.5) (2021-09-22)

## [2.0.4](https://github.com/expresso/router/compare/v2.0.3...v2.0.4) (2021-09-22)

## [2.0.3](https://github.com/expresso/router/compare/v2.0.2...v2.0.3) (2021-09-07)


### Bug Fixes

* **package.json:** add main field ([44d5681](https://github.com/expresso/router/commit/44d56819407fc6707ad2809a816c9168d421fac0))

## [2.0.2](https://github.com/expresso/router/compare/v2.0.1...v2.0.2) (2021-09-07)
