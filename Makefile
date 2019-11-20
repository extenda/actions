packages := $(dir $(wildcard */package.json))

install:
	@$(foreach dir, . $(packages), npm install --prefix $(dir) || exit 1;)

install-ci:
	@$(foreach dir, . $(packages), npm ci --prefix $(dir) || exit 1;)

lint:
	npm run lint:js

test:
	@$(foreach dir, $(packages), npm test --prefix $(dir) || exit 1;)

build: $(packages)

$(packages):
	@rm -rf $(@)dist
	@docker run --rm -t -v $(shell pwd):/work -w /work node:12-alpine sh -c "npm run build --prefix $(@)"

.PHONY: install install-ci lint test build $(packages)
