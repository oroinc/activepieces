variable "ORO_PROJECT" { default = "harborio.oro.cloud/activepieces" }
variable "ORO_AP_IMAGE" { default = "${ORO_PROJECT}/activepieces" }
variable "ORO_AP_IMAGE_TAG" { default = "latest" }
variable "GIT_COMMIT" { default = null }
variable "GIT_URL" { default = null }
variable "BUILD_TIMESTAMP" { default = null }
variable "GIT_BRANCH" { default = null }
variable "TAG_NAME" { default = null }

variable "extra_tags" {
  default = concat(
    GIT_BRANCH == "integration/oro-apps" ? ["development"] : [],
    GIT_BRANCH == null ? [] : [for m in regexall("^release/(.+)$", GIT_BRANCH) : "test-release-${m[0]}"],
    TAG_NAME != null && length(regexall("-patched$", "${TAG_NAME}")) > 0 ? [TAG_NAME, "latest"] : [],
  )
}

function "labelList" {
  params = []
  result = {
    "org.opencontainers.image.revision" = "${GIT_COMMIT}"
    "org.opencontainers.image.source"   = "${GIT_URL}"
    "org.opencontainers.image.created"  = "${BUILD_TIMESTAMP}"
    "com.oroinc.orocloud.reference"     = "${GIT_BRANCH}"
    "org.opencontainers.image.version"  = "${TAG_NAME}"
  }
}

group "default" {
  targets = ["runtime"]
}

target "runtime" {
  target     = "runtime"
  dockerfile = "Dockerfile.oro"
  tags       = [for t in length(extra_tags) > 0 ? extra_tags : [ORO_AP_IMAGE_TAG] : "${ORO_AP_IMAGE}:${t}"]
  labels     = labelList()
  // platforms = ["linux/amd64", "linux/arm64"]
}
