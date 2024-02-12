
//Dependencies
const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path')
const yaml = require('js-yaml');
const jp = require('jsonpath');
//Parameters
const gitRepository = core.getInput('git-repository').split('/');
const repoOwner = gitRepository.slice(-2);
const repoName = gitRepository.slice(-1);
const defaultBranchName =  core.getInput('default-branch');
const yamlFilePath = core.getInput('yaml-file-path');
const releaseIdentifier = core.getInput('release-identifier');
const githubToken = core.getInput('github-token');
const targetProperty = core.getInput('target-property');
const octokit = github.getOctokit(githubToken);

async function run() {
  try {
    //Get default branch
    const { data: defaultBranch } = await octokit.rest.repos.getBranch({
      owner: repoOwner,
      repo: repoName,
      branch: defaultBranchName
    });

    //Get GitRepository Manifest
    const fileResponse = await octokit.rest.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: yamlFilePath,
      ref: defaultBranchName
    });
    console.log(Object.getOwnPropertyNames(fileResponse).filter(item => typeof fileResponse[item] === 'function'));
    const gitRepository = yaml.load(Buffer.from(fileResponse.data.content, 'base64').toString());
    jp.apply(gitRepository, targetProperty, function(value){ return releaseIdentifier; });

    // Create a branch for the PR or reuse branch if it already exists
    const prBranchName = `update-${path.basename(yamlFilePath)}-${releaseIdentifier}`;
    try {
      await octokit.rest.repos.getBranch({
        owner: repoOwner,
        repo: repoName,
        branch: prBranchName
      });
    } catch (error) {
      await octokit.rest.git.createRef({
        owner: repoOwner,
        repo: repoName,
        ref: `refs/heads/${prBranchName}`,
        sha: defaultBranch.commit.sha
      });
    }
    // Update a manifest in the new branch
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: yamlFilePath,
      branch: prBranchName,
      sha: fileResponse.data.sha,
      message: `Released ${releaseIdentifier} of ${yamlFilePath} `,
      content: Buffer.from(yaml.dump(gitRepository)).toString('base64')
    });

    // Create a pull request
    const { data: pr } = await octokit.rest.pulls.create({
      owner: repoOwner,
      repo: repoName,
      title: `Released ${releaseIdentifier} of ${yamlFilePath} `,
      head: prBranchName,
      base: defaultBranchName,
      body: `This Pull Requests updates ${yamlFilePath} to point to the latest release ${releaseIdentifier}`
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();