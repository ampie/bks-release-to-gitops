# release-to-gitops

This is a GitHub Action that can be used to propagate a release to a GitOps repository. 

# Overview

It is a common requirement in environments that use a GitOps approach to continuous delivery to update some yaml file in some GitOps repository with a newly
cut release of an artifact. In cases where the artifact represents interpreted code as opposed to compiled code, such as Terraform or JavaScript, the release
in quesiton could simply represent a release in GitHub and the associated git tag. In cases where a specific container image is release, the release could 
represent the version segment of the image tag. In cases where a Helm chart is released, it could represent the version of a Helm chart. in a Gitops environment, in all of these cases, it is very likely that a single yaml file will be updated with this new release in a git repository that is being observed by a Gitops controller. This goal of this action is to do exactly that.

# Usage

This action would typically be used from a workflow involved in or triggered by the creation of a tag or a release. An example of a reusable workflow that can be used to generate a release, a tag and then create a PR to propose changes to the GitOps repo is available in [this repo](.github/.workflows/prepare-auto-release.yaml). 