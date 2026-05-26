.PHONY: install dev build lint preview check deploy clean

install:
	npm install

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

preview:
	npm run preview

check: lint build

deploy:
	./scripts/deploy.sh

clean:
	rm -rf dist coverage output .playwright-cli
