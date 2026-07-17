.PHONY: install dev build lint preview check deploy deploy-static deploy-proxy clean

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
	./scripts/deploy-proxy.sh

deploy-static:
	./scripts/deploy.sh

deploy-proxy:
	./scripts/deploy-proxy.sh

clean:
	rm -rf dist coverage output .playwright-cli
