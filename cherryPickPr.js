const { execSync } = require('child_process');
const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const gitApi = 'https://api.github.com/repos/MetaMask/metamask-extension'; // Configure your git remote URL here
const gitRemote = 'https://github.com/MetaMask/metamask-extension'; // Configure your git remote URL here

const argv = yargs(hideBin(process.argv)).option('push', {
  describe: 'Push the cherry-picked branch to the remote',
  type: 'boolean',
  default: false,
}).argv;

const getPrData = async (prNumber) => {
  const url = `${gitApi}/pulls/${prNumber}`;
  try {
    const response = await axios.get(url);
    // console.log('response',response)
    return {
      branchName: response.data.head.ref,
      mergeCommitHash: response.data.merge_commit_sha,
    };
  } catch (error) {
    console.error('Error fetching PR data:', error.message);
    process.exit(1);
  }
};

const cherryPickPr = async () => {
  const { pickTo, pickFrom } = argv;
  if (!pickTo || !pickFrom) {
    console.error('Both pickTo and pickFrom arguments are required');
    process.exit(1);
  }

  const pickToData = await getPrData(pickTo);
  const pickFromData = await getPrData(pickFrom);

  execSync(`git checkout ${pickToData.branchName}`, { stdio: 'inherit' });
  const newBranchName = `${pickFromData.mergeCommitHash}-picked-to-${pickToData.branchName}`;

  if (!argv.push) {
    execSync(`git checkout -b ${newBranchName}`, { stdio: 'inherit' });

    try {
      execSync(`git cherry-pick ${pickFromData.mergeCommitHash}`, { stdio: 'inherit' });
      console.log('Cherry-pick successful!');

    } catch (error) {
      console.error('Cherry-pick might have conflicts. Resolve them, and then run this command again without --push to continue.');
      process.exit(1);
    }
  }

  if (argv.push) {
    try {
      execSync(`git push --set-upstream origin ${newBranchName}`, { stdio: 'inherit' });
      const prTitle = encodeURIComponent(`Cherry picking ${pickFromData.mergeCommitHash} to ${pickToData.branchName}`);
      const prUrl = `${gitRemote}/compare/${pickToData.branchName}...${newBranchName}?title=${prTitle}`;
      console.log(`Branch pushed! Open the following URL to create a PR: ${prUrl}`);
    } catch (error) {
      console.error('Failed to push: ', error);
      process.exit(1);
    }
  }
};

cherryPickPr();