
//Dependencies
const core = require('@actions/core');
const github = require('@actions/github');
const path = require('path')
const yaml = require('js-yaml');
const jp = require('jsonpath');
//Parameters
const gitRepositoryManifestPath = core.getInput('git-repository-manifest');
const release = core.getInput('release');
const githubToken = core.getInput('github-token');
const targetProperty = core.getInput('target-property');
const octokit = github.getOctokit(githubToken);
const { context = {} } = github;

async function run() {
  try {
    //Get default branch
    const { data: defaultBranch } = await octokit.rest.repos.getBranch({
      owner: context.repo.owner,
      repo: context.repo.repo,
      branch: 'main'
    });

    //Get GitRepository Manifest
    const fileResponse = await octokit.rest.repos.getContent({
      owner: context.repo.owner,
      repo: context.repo.repo,
      path: gitRepositoryManifestPath,
      ref: 'main'
    });
    console.log(Object.getOwnPropertyNames(fileResponse).filter(item => typeof fileResponse[item] === 'function'));
    const gitRepository = yaml.load(Buffer.from(fileResponse.data.content, 'base64').toString());
    jp.apply(gitRepository, targetProperty, function(value){ return release; });

    // Create a branch for the PR
    const prBranchName = `update-${path.basename(gitRepositoryManifestPath)}-${release}`;
    try {
      await octokit.rest.repos.getBranch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        branch: prBranchName
      });
    } catch (error) {
      await octokit.rest.git.createRef({
        owner: context.repo.owner,
        repo: context.repo.repo,
        ref: `refs/heads/${prBranchName}`,
        sha: defaultBranch.commit.sha
      });
    }
    // Update a manifest in the new branch
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: context.repo.owner,
      repo: context.repo.repo,
      path: gitRepositoryManifestPath,
      branch: prBranchName,
      sha: fileResponse.data.sha,
      message: `Released ${release} of ${gitRepositoryManifestPath} `,
      content: Buffer.from(yaml.dump(gitRepository)).toString('base64')
    });

    // Create a pull request
    const { data: pr } = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: `Released ${release} of ${gitRepositoryManifestPath} `,
      head: prBranchName,
      base: 'main',
      body: `This Pull Requests updates ${gitRepositoryManifestPath} to point to the latest release ${release}`
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();