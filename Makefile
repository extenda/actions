packages := $(dir $(wildcard */package.json))

install:
	@$(foreach dir, . $(packages), npm install --prefix $(dir);)

install-ci:
	@$(foreach dir, . $(packages), npm ci --prefix $(dir);)

lint:
	npm run lint:js

test:
	@$(foreach dir, $(packages), npm test --prefix $(dir);)

build:
	@$(foreach dir, $(packages), rm -rf $(dir)/dist && npm run build --prefix $(dir);)

.PHONY: install install-ci lint test build
