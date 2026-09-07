# assessy — build helpers. Mirrors the Hive prototype's preflight so the two
# repos share one muscle memory.

.PHONY: typecheck lint test build preflight

typecheck:
	npx tsc --noEmit

lint:
	npm run lint

test:
	npm run test

build:
	npm run build

preflight: typecheck lint test build
