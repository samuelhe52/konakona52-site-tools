.PHONY: install dev build test lint preview check clean

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm test

lint:
	npm run lint

preview:
	npm run preview

check: lint test build

clean:
	rm -rf dist coverage output .playwright-cli
