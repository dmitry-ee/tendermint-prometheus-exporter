app_version := `jq -r .version src/package.json`
app_name := `jq -r .name src/package.json`
docker_user_id := "dmi7ry"
docker_image_name := docker_user_id + "/" + app_name + ":" + app_version
build_date := `date -u +"%Y-%m-%dT%H:%M:%SZ"`
commit := `git rev-parse --short HEAD`
start_port := "9675"
start_cmd := "serve --target=https://api.minter.one --status --net-info --candidates -- --target http://api-01.minter.store:8841 --net-info --status --candidates"

alias rmi := images-clean-unused
alias rmis := remove-images
alias rmf := containers-clean-all
alias v := version
alias bump := increment-version

# tight everything up, commit, test and release
release +comment:
	@echo "{{comment}}"
	git add -A
	git commit -m "{{comment}}"
	just build-test
	git push origin

_build build_args="--squash --no-cache":
	docker build {{build_args}} -t {{docker_image_name}} \
	--build-arg EXPORTER_VERSION={{app_version}} \
	--build-arg BUILD_DATE={{build_date}} \
	--build-arg VCS_REF={{commit}} .
# docker build with cache with squash flag
build-c: (_build "--squash")
# docker build --no-cache
build-nc: (_build "--squash --no-cache")
# docker build & run image with autotests
build-test:
	docker build -t {{docker_image_name}}-test -f Dockerfile-test .
	docker rmi -f {{docker_image_name}}-test

_run mode="":
	docker run {{mode}} --rm --name {{app_name}} -p {{start_port}}:9675 {{docker_image_name}} {{start_cmd}}
# run in detached mode (-d)
run-d: (_run "-d")
# run in detached mode and perform smoke tests
run-test-d: build-nc run-d
	npm run test:mocha:ms:smoke
	docker rm -f {{app_name}}

# sh into container
bash:
  docker run -it --rm --name {{app_name}} {{docker_image_name}} sh
# start container with docker-compose
compose:
  docker-compose up -d
# stop container with docker-compose
compose-down:
  docker-compose down
# docker logs
logs:
  docker logs {{app_name}}
# get metrics (with curl)
metrics:
  curl http://localhost:{{start_port}}/metrics

# run coveralls report
coveralls:
	npm run coveralls

# push image to dockerhub
push IMAGE=(docker_image_name):
	docker push {{IMAGE}}
# build --no-cache then push
publish: build-nc push

# get full image info with DIVE tool
dive:
  dive {{docker_image_name}}


# clean everything after builds
clean: containers-clean-all images-clean-unused remove-images
	docker ps -a
	docker images
# clean unused images
images-clean-unused:
	docker images | grep none | awk '{ print $3 }' | xargs -I{} docker rmi {}
# remove all containers
containers-clean-all:
	docker ps -aq | xargs -I{} docker rm -f {}
# remove specific image
remove-image image=(docker_image_name):
	docker rmi {{image}}
# remove all linked images
remove-images:
	@docker images | grep {{app_name}} | awk '{ print $3 }' | xargs -I{} docker rmi {}


# print current image version
version:
	@echo {{docker_image_name}}

# increment version
increment-version ver="patch":
  @echo 'before: {{docker_image_name}}'
  cd src && npm version {{ver}} --no-git-tag-version
