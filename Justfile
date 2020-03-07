app_version := `jq -r .version package.json`
app_name := `jq -r .name package.json`
docker_user_id := "dmi7ry"
docker_image_name := docker_user_id + "/" + app_name + ":" + app_version
build_date := `date -u +"%Y-%m-%dT%H:%M:%SZ"`
commit := `git rev-parse --short HEAD`
start_port := "9675"
start_cmd := "serve --target=https://api.minter.one --status --net-info --candidates -- --target http://api-01.minter.store:8841 --net-info --status --candidates"

default := 'all'

alias rmi := images_clean_unused
alias rmis := remove_images
alias rmf := containers_clean_all
alias v := version
alias iv := increment_version

release comment:
	@echo {{comment}}
	git add -A
	git commit -m "{{comment}}"
	build_test
	git push origin

clean: containers_clean_all images_clean_unused remove_images
	docker ps -a
	docker images

_build build_args="--squash --no-cache":
	docker build {{build_args}} -t {{docker_image_name}} \
	--build-arg EXPORTER_VERSION={{app_version}} \
	--build-arg BUILD_DATE={{build_date}} \
	--build-arg VCS_REF={{commit}} .
build_c: (_build "--squash")
build_nc: (_build "--squash --no-cache")
build_test:
	docker build -t {{docker_image_name}}-test -f Dockerfile-test .
	docker rmi -f {{docker_image_name}}-test

_run mode="":
	docker run {{mode}} --rm --name {{app_name}} -p {{start_port}}:9675 {{docker_image_name}} {{start_cmd}}
run_d: (_run "-d")
run_test_d: build_nc run_d
	npm run test:mocha:ms:smoke
	docker rm -f {{app_name}}

coveralls:
	npm run coveralls

push IMAGE=(docker_image_name):
	docker push {{IMAGE}}
publish: build_nc push

images_clean_unused:
	docker images | grep none | awk '{ print $3 }' | xargs -I{} docker rmi {}
containers_clean_all:
	docker ps -aq | xargs -I{} docker rm -f {}
remove_image image=(docker_image_name):
	docker rmi {{image}}
remove_images:
	@docker images | grep {{app_name}} | awk '{ print $3 }' | xargs -I{} docker rmi {}

version:
	@echo {{docker_image_name}}

increment_version ver="patch":
	@echo 'before: {{docker_image_name}}'
	npm version {{ver}} --no-git-tag-version
