packages := $(dir $(wildcard */package.json))

install-ci:
	@$(foreach dir, $(packages), npm ci --prefix $(dir);)

install:
	@$(foreach dir, $(packages), npm install --prefix $(dir);)

lint:
	@$(foreach dir, $(packages), npm run lint:js --prefix $(dir);)

test:
	@$(foreach dir, $(packages), npm test --prefix $(dir);)

build:
	@$(foreach dir, $(packages), rm -rf $(dir)/dist && npm run build --prefix $(dir);)

VERSION ?= 0.0.0-local
set-version:
	@$(foreach dir, $(packages), npm version --no-git-tag-version $(VERSION) --prefix $(dir);)

.PHONY: install install-ci lint test build set-version
