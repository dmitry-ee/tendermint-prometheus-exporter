.EXPORT_ALL_VARIABLES:
APP_VERSION 		= $(shell jq -r .version package.json)
APP_NAME        = $(shell jq -r .name package.json)
DOCKER_ID_USER  = dmi7ry

.ONESHELL:
.PHONY: build all test docker-test

all: docker-test build-nc run-test-d push

test:
	npm test

build-c:
	docker build --squash -t $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION) --build-arg EXPORTER_VERSION=$(APP_VERSION) .

build-nc:
	docker build --squash --no-cache -t $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION) --build-arg EXPORTER_VERSION=$(APP_VERSION) .

docker-build-test:
	docker build --squash -t $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION)-test -f Dockerfile-test .
docker-clean-test:
	docker rmi $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION)-test
docker-test: docker-build-test docker-clean-test

run:
	-docker rm -f $(APP_NAME)
	docker run --name $(APP_NAME) -p 9675:9675 --rm $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION) serve --target=https://api.minter.one --status --net-info --candidates -- --target http://api-01.minter.store:8841 --net-info --status --candidates
run-d:
	-docker rm -f $(APP_NAME)
	docker run -d --name $(APP_NAME) -p 9675:9675 --rm $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION) serve --target=https://api.minter.one --status --net-info --candidates -- --target http://api-01.minter.store:8841 --net-info --status --candidates
run-test-d: run-d
	npm run test:mocha:ms:smoke
	-docker rm -f $(APP_NAME)

coveralls:
	npm run coveralls

bash:
	docker run -it $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION) sh

publish: build-nc push

push:
	docker push $(DOCKER_ID_USER)/$(APP_NAME):$(APP_VERSION)
